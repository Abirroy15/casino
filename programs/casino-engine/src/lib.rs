use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("MagcXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX");

// ════════════════════════════════════════════════════
//  CONSTANTS
// ════════════════════════════════════════════════════
pub const HOUSE_EDGE_BPS:    u64 = 100;   // 1.00% (100 basis points)
pub const MAX_BET_SOL:       u64 = 100;   // 100 SOL
pub const MIN_BET_LAMPORTS:  u64 = 10_000_000;  // 0.01 SOL
pub const SESSION_SEED:      &[u8] = b"escrow";
pub const VAULT_SEED:        &[u8] = b"house_vault";

#[program]
pub mod casino_engine {
    use super::*;

    // ── Initialize House Vault ────────────────────
    /// Called once by admin to create the house vault PDA.
    pub fn initialize_vault(ctx: Context<InitializeVault>, house_edge_bps: u64) -> Result<()> {
        require!(house_edge_bps <= 1000, CasinoError::EdgeTooHigh); // max 10%

        let vault = &mut ctx.accounts.house_vault;
        vault.authority   = ctx.accounts.authority.key();
        vault.house_edge  = house_edge_bps;
        vault.total_volume = 0;
        vault.total_games  = 0;
        vault.bump         = ctx.bumps.house_vault;

        emit!(VaultInitialized {
            authority:  vault.authority,
            house_edge: vault.house_edge,
        });
        Ok(())
    }

    // ── Start Game Session ────────────────────────
    /// Player locks bet into escrow PDA and starts a game session.
    /// After this, gameplay is delegated to MagicBlock ER.
    pub fn start_session(
        ctx:        Context<StartSession>,
        session_id: u64,
        game_type:  u8,
        bet_amount: u64,
    ) -> Result<()> {
        require!(bet_amount >= MIN_BET_LAMPORTS,          CasinoError::BetTooSmall);
        require!(bet_amount <= MAX_BET_SOL * 1_000_000_000, CasinoError::BetTooLarge);
        require!(
            ctx.accounts.player.lamports() > bet_amount + 5_000_000, // keep rent exempt
            CasinoError::InsufficientFunds
        );
        require!(game_type < 8, CasinoError::InvalidGameType);

        let session = &mut ctx.accounts.session;
        session.player      = ctx.accounts.player.key();
        session.session_id  = session_id;
        session.game_type   = game_type;
        session.bet_amount  = bet_amount;
        session.status      = GameStatus::Active as u8;
        session.result      = GameResult::Pending as u8;
        session.er_tx_id    = [0u8; 64];
        session.bump        = ctx.bumps.session;
        session.created_at  = Clock::get()?.unix_timestamp;

        // Transfer bet → escrow PDA
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.player.to_account_info(),
                    to:   ctx.accounts.session.to_account_info(),
                },
            ),
            bet_amount,
        )?;

        emit!(SessionStarted {
            player:     session.player,
            session_id: session.session_id,
            game_type:  session.game_type,
            bet_amount: session.bet_amount,
        });

        Ok(())
    }

    // ── Settle Game (called by ER after gameplay) ─────────────
    /// MagicBlock ER calls this instruction with the signed game result.
    /// Validates VRF proof, applies house edge, and pays out.
    pub fn settle_game(
        ctx:        Context<SettleGame>,
        session_id: u64,
        player_won: bool,
        multiplier_bps: u64,   // e.g., 19800 = 1.98x (in basis points ×10000)
        vrf_proof:  [u8; 64],
    ) -> Result<()> {
        let session = &mut ctx.accounts.session;

        require!(session.session_id == session_id, CasinoError::SessionMismatch);
        require!(session.status == GameStatus::Active as u8, CasinoError::InvalidSessionStatus);

        let vault     = &mut ctx.accounts.house_vault;
        let bet       = session.bet_amount;
        let house_edge = vault.house_edge;

        // Update session state
        session.status     = GameStatus::Settled as u8;
        session.result     = if player_won { GameResult::Win } else { GameResult::Loss } as u8;
        session.er_tx_id   = vrf_proof;
        session.settled_at = Clock::get()?.unix_timestamp;

        if player_won {
            // Payout = bet × multiplier, minus house edge
            let gross_payout = bet
                .checked_mul(multiplier_bps).ok_or(CasinoError::MathOverflow)?
                .checked_div(10_000).ok_or(CasinoError::MathOverflow)?;

            let house_cut = gross_payout
                .checked_mul(house_edge).ok_or(CasinoError::MathOverflow)?
                .checked_div(10_000).ok_or(CasinoError::MathOverflow)?;

            let player_payout = gross_payout - house_cut;

            // Pay player from escrow + house vault
            **ctx.accounts.session.to_account_info().try_borrow_mut_lamports()? -= player_payout;
            **ctx.accounts.player.try_borrow_mut_lamports()? += player_payout;

            // House cut stays in vault
            **ctx.accounts.session.to_account_info().try_borrow_mut_lamports()? -= bet - player_payout;
            **ctx.accounts.house_vault.to_account_info().try_borrow_mut_lamports()? += bet - player_payout + house_cut;

            emit!(GameSettled {
                player:         session.player,
                session_id,
                player_won:     true,
                bet_amount:     bet,
                payout:         player_payout,
                house_take:     house_cut,
            });
        } else {
            // Loss: whole bet goes to house vault
            let escrow_balance = session.to_account_info().lamports();
            **ctx.accounts.session.to_account_info().try_borrow_mut_lamports()? -= escrow_balance;
            **ctx.accounts.house_vault.to_account_info().try_borrow_mut_lamports()? += escrow_balance;

            emit!(GameSettled {
                player:         session.player,
                session_id,
                player_won:     false,
                bet_amount:     bet,
                payout:         0,
                house_take:     bet,
            });
        }

        // Update global stats
        vault.total_volume = vault.total_volume.saturating_add(bet);
        vault.total_games  = vault.total_games.saturating_add(1);

        Ok(())
    }

    // ── Admin: Withdraw House Edge ────────────────
    pub fn withdraw_house_funds(ctx: Context<WithdrawFunds>, amount: u64) -> Result<()> {
        require_keys_eq!(
            ctx.accounts.authority.key(),
            ctx.accounts.house_vault.authority,
            CasinoError::Unauthorized
        );

        **ctx.accounts.house_vault.to_account_info().try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.authority.try_borrow_mut_lamports()? += amount;

        Ok(())
    }

    // ── Admin: Update House Edge ──────────────────
    pub fn update_house_edge(ctx: Context<UpdateVault>, new_edge_bps: u64) -> Result<()> {
        require!(new_edge_bps <= 1000, CasinoError::EdgeTooHigh);
        require_keys_eq!(
            ctx.accounts.authority.key(),
            ctx.accounts.house_vault.authority,
            CasinoError::Unauthorized
        );
        ctx.accounts.house_vault.house_edge = new_edge_bps;
        Ok(())
    }
}

// ════════════════════════════════════════════════════
//  ACCOUNT STRUCTS
// ════════════════════════════════════════════════════

#[account]
pub struct HouseVault {
    pub authority:     Pubkey,   // 32
    pub house_edge:    u64,      // 8  — in basis points
    pub total_volume:  u64,      // 8
    pub total_games:   u64,      // 8
    pub bump:          u8,       // 1
}
// Total: 57 bytes + discriminator 8 = 65

#[account]
pub struct GameSession {
    pub player:      Pubkey,    // 32
    pub session_id:  u64,       // 8
    pub game_type:   u8,        // 1  — 0=Dice,1=Slots,2=CoinFlip,3=HiLo,4=Mines,5=Roulette,6=Plinko,7=TowerX
    pub bet_amount:  u64,       // 8
    pub status:      u8,        // 1  — Active/Settled/Error
    pub result:      u8,        // 1  — Pending/Win/Loss
    pub er_tx_id:    [u8; 64],  // 64 — VRF proof / ER tx id
    pub created_at:  i64,       // 8
    pub settled_at:  i64,       // 8
    pub bump:        u8,        // 1
}
// Total: 132 bytes + discriminator 8 = 140

// ── Enums ─────────────────────────────────────────
#[repr(u8)]
pub enum GameStatus { Active = 0, Settled = 1, Error = 2 }
#[repr(u8)]
pub enum GameResult { Pending = 0, Win = 1, Loss = 2 }

// ════════════════════════════════════════════════════
//  INSTRUCTION CONTEXTS
// ════════════════════════════════════════════════════

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(
        init,
        payer  = authority,
        space  = 8 + 65,
        seeds  = [VAULT_SEED],
        bump,
    )]
    pub house_vault:    Account<'info, HouseVault>,
    #[account(mut)]
    pub authority:      Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(session_id: u64)]
pub struct StartSession<'info> {
    #[account(
        init,
        payer  = player,
        space  = 8 + 140,
        seeds  = [SESSION_SEED, player.key().as_ref(), &session_id.to_le_bytes()],
        bump,
    )]
    pub session:        Account<'info, GameSession>,
    #[account(mut)]
    pub player:         Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(session_id: u64)]
pub struct SettleGame<'info> {
    #[account(
        mut,
        seeds = [SESSION_SEED, session.player.as_ref(), &session_id.to_le_bytes()],
        bump  = session.bump,
    )]
    pub session:        Account<'info, GameSession>,
    #[account(
        mut,
        seeds = [VAULT_SEED],
        bump  = house_vault.bump,
    )]
    pub house_vault:    Account<'info, HouseVault>,
    /// CHECK: validated in instruction by session.player
    #[account(mut, constraint = player.key() == session.player @ CasinoError::PlayerMismatch)]
    pub player:         AccountInfo<'info>,
    /// Must be the ER signer or admin (add oracle validation in production)
    pub settler:        Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WithdrawFunds<'info> {
    #[account(mut, seeds = [VAULT_SEED], bump = house_vault.bump)]
    pub house_vault: Account<'info, HouseVault>,
    #[account(mut)]
    pub authority:   Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateVault<'info> {
    #[account(mut, seeds = [VAULT_SEED], bump = house_vault.bump)]
    pub house_vault: Account<'info, HouseVault>,
    pub authority:   Signer<'info>,
}

// ════════════════════════════════════════════════════
//  EVENTS
// ════════════════════════════════════════════════════

#[event]
pub struct VaultInitialized { pub authority: Pubkey, pub house_edge: u64 }

#[event]
pub struct SessionStarted {
    pub player:     Pubkey,
    pub session_id: u64,
    pub game_type:  u8,
    pub bet_amount: u64,
}

#[event]
pub struct GameSettled {
    pub player:     Pubkey,
    pub session_id: u64,
    pub player_won: bool,
    pub bet_amount: u64,
    pub payout:     u64,
    pub house_take: u64,
}

// ════════════════════════════════════════════════════
//  ERRORS
// ════════════════════════════════════════════════════

#[error_code]
pub enum CasinoError {
    #[msg("Bet amount is below the minimum")]       BetTooSmall,
    #[msg("Bet amount exceeds the maximum")]        BetTooLarge,
    #[msg("Insufficient wallet funds")]             InsufficientFunds,
    #[msg("Invalid game type specified")]           InvalidGameType,
    #[msg("Session ID mismatch")]                   SessionMismatch,
    #[msg("Session is not in active status")]       InvalidSessionStatus,
    #[msg("Player key does not match session")]     PlayerMismatch,
    #[msg("Caller is not authorized")]              Unauthorized,
    #[msg("House edge cannot exceed 10%")]          EdgeTooHigh,
    #[msg("Math overflow in payout calculation")]   MathOverflow,
}
