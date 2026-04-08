/**
 * hooks/useAnchorProgram.ts
 *
 * Returns a typed Anchor Program instance for the casino-engine.
 * Replace the IDL import with the generated one after `anchor build`.
 */
import { useMemo }   from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Program, AnchorProvider, Idl } from '@coral-xyz/anchor'
import { getConnection, CASINO_PROGRAM_ID } from '@/lib/solana'

// Import generated IDL after `anchor build`:
// import IDL from '@/programs/casino-engine/target/idl/casino_engine.json'

// Placeholder IDL shape (replace with generated)
const PLACEHOLDER_IDL: Idl = {
  version: '0.1.0',
  name:    'casino_engine',
  instructions: [
    { name:'initializeVault', accounts:[
        { name:'houseVault', isMut:true,  isSigner:false },
        { name:'authority',  isMut:true,  isSigner:true  },
        { name:'systemProgram', isMut:false, isSigner:false },
      ], args:[{ name:'houseEdgeBps', type:'u64' }] },
    { name:'startSession', accounts:[
        { name:'session',      isMut:true,  isSigner:false },
        { name:'player',       isMut:true,  isSigner:true  },
        { name:'systemProgram',isMut:false, isSigner:false },
      ], args:[
        { name:'sessionId',  type:'u64' },
        { name:'gameType',   type:'u8'  },
        { name:'betAmount',  type:'u64' },
      ] },
    { name:'settleGame', accounts:[
        { name:'session',      isMut:true,  isSigner:false },
        { name:'houseVault',   isMut:true,  isSigner:false },
        { name:'player',       isMut:true,  isSigner:false },
        { name:'settler',      isMut:false, isSigner:true  },
        { name:'systemProgram',isMut:false, isSigner:false },
      ], args:[
        { name:'sessionId',      type:'u64'  },
        { name:'playerWon',      type:'bool' },
        { name:'multiplierBps',  type:'u64'  },
        { name:'vrfProof',       type:{ array:['u8', 64] } },
      ] },
  ],
  accounts: [
    { name:'HouseVault',  type:{ kind:'struct', fields:[
        { name:'authority',    type:'publicKey' },
        { name:'houseEdge',    type:'u64' },
        { name:'totalVolume',  type:'u64' },
        { name:'totalGames',   type:'u64' },
        { name:'bump',         type:'u8'  },
      ] } },
    { name:'GameSession', type:{ kind:'struct', fields:[
        { name:'player',     type:'publicKey' },
        { name:'sessionId',  type:'u64' },
        { name:'gameType',   type:'u8'  },
        { name:'betAmount',  type:'u64' },
        { name:'status',     type:'u8'  },
        { name:'result',     type:'u8'  },
        { name:'erTxId',     type:{ array:['u8', 64] } },
        { name:'createdAt',  type:'i64' },
        { name:'settledAt',  type:'i64' },
        { name:'bump',       type:'u8'  },
      ] } },
  ],
  errors: [
    { code:6000, name:'BetTooSmall',          msg:'Bet amount is below the minimum' },
    { code:6001, name:'BetTooLarge',          msg:'Bet amount exceeds the maximum'  },
    { code:6002, name:'InsufficientFunds',    msg:'Insufficient wallet funds'       },
    { code:6003, name:'InvalidGameType',      msg:'Invalid game type specified'     },
    { code:6004, name:'SessionMismatch',      msg:'Session ID mismatch'             },
    { code:6005, name:'InvalidSessionStatus', msg:'Session is not in active status' },
    { code:6006, name:'PlayerMismatch',       msg:'Player key does not match'       },
    { code:6007, name:'Unauthorized',         msg:'Caller is not authorized'        },
    { code:6008, name:'EdgeTooHigh',          msg:'House edge cannot exceed 10%'    },
    { code:6009, name:'MathOverflow',         msg:'Math overflow in payout calc'    },
  ],
}

export function useAnchorProgram() {
  const wallet = useWallet()

  const program = useMemo(() => {
    if (!wallet.publicKey || !wallet.signTransaction) return null
    const conn     = getConnection()
    const provider = new AnchorProvider(
      conn,
      wallet as any,
      { preflightCommitment: 'confirmed' }
    )
    return new Program(PLACEHOLDER_IDL, CASINO_PROGRAM_ID, provider)
  }, [wallet.publicKey, wallet.signTransaction])

  return program
}

// ── Helper: fetch session account ────────────────────────────
export async function fetchGameSession(
  program: Program,
  sessionPDA: import('@solana/web3.js').PublicKey
) {
  return (program.account as any).gameSession.fetch(sessionPDA)
}

// ── Helper: fetch house vault ─────────────────────────────────
export async function fetchHouseVault(
  program: Program,
  vaultPDA: import('@solana/web3.js').PublicKey
) {
  return (program.account as any).houseVault.fetch(vaultPDA)
}
