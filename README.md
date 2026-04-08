# MagicPlay 🎰 — Web3 Casino on Solana

> High-performance, provably fair casino platform powered by **Solana** + **MagicBlock Ephemeral Rollups**.

![MagicPlay Banner](./public/banner.png)

---

## 🏗️ Architecture Overview

```
Player → Phantom Wallet → Solana Devnet (Escrow PDA)
                              ↓ delegate
                     MagicBlock Ephemeral Rollup  ← game logic (private, fast)
                              ↓ commit result
                     Solana Devnet (settle payout)
                              ↓
                         Player Wallet
```

**Key Design Choices:**
- **MagicBlock ER** executes game moves off-chain (<50ms) for instant UX
- **Switchboard VRF** provides on-chain randomness (provably fair)
- **Escrow PDA** ensures funds never leave the smart contract until settlement
- **1% house edge** — industry leading rate

---

## 📁 Project Structure

```
magicplay/
├── app/                     # Next.js 14 app router
│   ├── layout.tsx            # Root layout + wallet providers
│   ├── page.tsx              # Main lobby page
│   └── games/[id]/           # Individual game pages
├── components/
│   ├── layout/               # Navbar, Hero, Feed, Stats
│   ├── games/                # Game cards + modals
│   └── ui/                   # Shared UI primitives
├── games/                    # Game logic (dice, coinflip, mines, ...)
├── lib/
│   ├── solana.ts             # Web3.js + RPC utilities
│   ├── store.ts              # Zustand global state
│   └── anchor-client.ts      # Anchor program client
├── magicblock/
│   └── ephemeral-rollup.ts   # MagicBlock ER integration layer
├── programs/
│   └── casino-engine/        # Anchor smart contract (Rust)
│       ├── Cargo.toml
│       └── src/lib.rs
├── hooks/                    # Custom React hooks
└── styles/
    └── globals.css
```

---

## ⚡ Quick Start

### Prerequisites
```bash
node >= 18
pnpm >= 8
Rust (rustup)
Solana CLI >= 1.18
Anchor CLI >= 0.29
Phantom Wallet browser extension
```

### 1. Install dependencies
```bash
git clone https://github.com/your-org/magicplay
cd magicplay
pnpm install
```

### 2. Configure Solana CLI for Devnet
```bash
solana config set --url devnet
solana-keygen new --outfile ~/.config/solana/id.json   # skip if you have a keypair
solana airdrop 5                                         # get devnet SOL
```

### 3. Build & Deploy Anchor Program
```bash
cd programs/casino-engine
anchor build

# Update Program ID in lib.rs + Anchor.toml
solana address -k target/deploy/casino_engine-keypair.json

anchor deploy --provider.cluster devnet
```

### 4. Initialize House Vault
```bash
# Run initialization script
pnpm ts-node scripts/init-vault.ts
```

### 5. Run Frontend
```bash
pnpm dev         # http://localhost:3000
```

---

## 🎮 Games

| Game | Max Payout | House Edge | ER Execution |
|------|-----------|------------|-------------|
| Tower X | 1000x | 1% | ✅ MagicBlock ER |
| Dice | 1.98x | 1% | ✅ MagicBlock ER |
| Coin Flip | 1.98x | 1% | ✅ MagicBlock ER |
| Mines | 200x | 1% | ✅ MagicBlock ER |
| Slots | 500x | 2% | ✅ MagicBlock ER |
| Hi-Lo | 12x | 1% | ✅ MagicBlock ER |
| Roulette | 35x | 2.7% | ✅ MagicBlock ER |
| Plinko | 100x | 1% | ✅ MagicBlock ER |

---

## 🔐 Security Model

### Smart Contract Security
- **Escrow PDA**: All bets locked in program-owned PDAs (no custodial risk)
- **No double-spend**: Session status checked before every settlement
- **Overflow protection**: Rust checked math + explicit BN handling
- **Admin only**: House withdraw protected by authority pubkey check

### MagicBlock ER Security
- Game state delegated to ER (not accessible by operator)
- Result committed with cryptographic hash of (seed + outcome)
- VRF proof verifiable by anyone on-chain

### Provably Fair
Every game result can be independently verified:
```ts
import { verifyGameResult } from '@/magicblock/ephemeral-rollup'

const verified = verifyGameResult(
  sessionId,
  clientSeed,   // chosen by player before game
  serverSeed,   // revealed after game (Switchboard VRF)
  vrfProof,
  outcome
)
```

---

## 🔧 Environment Variables

```env
# .env.local
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_RPC_ENDPOINT=https://api.devnet.solana.com
NEXT_PUBLIC_CASINO_PROGRAM_ID=MagcXXX...
NEXT_PUBLIC_HOUSE_WALLET=HouseXXX...
NEXT_PUBLIC_MAGICBLOCK_RPC=https://devnet.magicblock.app

# Server-side
HOUSE_KEYPAIR_PATH=~/.config/solana/id.json
SWITCHBOARD_QUEUE=F8ce7MsckeZAbAGmxjJNetxYXQa9mKZfPVzNKNxnGzeA
```

---

## 🚀 Mainnet Checklist

- [ ] Audit Anchor program (Sec3, OtterSec, or Halborn)
- [ ] Switch VRF to Switchboard mainnet queue
- [ ] Increase house vault funding (min 10 SOL per game)
- [ ] Add rate limiting (max 1 session per wallet at a time)
- [ ] Enable transaction fee subsidy (gas abstraction)
- [ ] Set up monitoring (Helius webhooks + Datadog)
- [ ] Legal compliance review (jurisdiction-specific)

---

## 📜 License

MIT — built for educational purposes. Always gamble responsibly.
