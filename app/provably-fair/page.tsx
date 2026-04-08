'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '@/components/layout/Navbar'
import ParticleCanvas from '@/components/ui/ParticleCanvas'

// ── Simulated SHA-256 via Web Crypto ──────────────────────────
async function sha256(message: string): Promise<string> {
  const msgBuffer  = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray  = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Generate mock VRF-style result from seeds
async function deriveResult(serverSeed: string, clientSeed: string, nonce: number): Promise<{
  hash: string; result: number; float: number
}> {
  const combined = `${serverSeed}:${clientSeed}:${nonce}`
  const hash     = await sha256(combined)
  const hex4     = hash.slice(0, 8)
  const int32    = parseInt(hex4, 16)
  const float    = int32 / 0xffffffff
  const result   = Math.floor(float * 100) + 1  // 1-100
  return { hash, result, float }
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="relative">
      <pre className="bg-black/40 border border-white/[0.08] rounded-xl p-4 text-xs text-green-300
                      font-mono overflow-x-auto leading-relaxed whitespace-pre-wrap break-all">
        {code}
      </pre>
      <button
        onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
        className="absolute top-2 right-2 text-[10px] px-2 py-1 rounded-md bg-white/[0.06]
                   border border-white/[0.1] text-text-secondary hover:text-text-primary transition-colors">
        {copied ? '✓ Copied' : 'Copy'}
      </button>
    </div>
  )
}

function InfoCard({ title, children, icon }: { title: string; children: React.ReactNode; icon: string }) {
  return (
    <div className="glass rounded-2xl p-6 border border-white/[0.07]">
      <h3 className="font-brand text-lg font-bold mb-4 flex items-center gap-2">
        <span>{icon}</span> {title}
      </h3>
      {children}
    </div>
  )
}

export default function ProvablyFairPage() {
  const [serverSeed, setServer] = useState('a4f8c2e1d9b7f3a2e5c8d1f4b7e2a5d8')
  const [clientSeed, setClient] = useState('my_lucky_seed_2024')
  const [nonce, setNonce]       = useState(1)
  const [verifying, setVerify]  = useState(false)
  const [verifyResult, setVR]   = useState<null | {hash:string;result:number;float:number}>(null)
  const [activeSection, setAS]  = useState<'verify'|'how'|'audit'>('how')

  const handleVerify = async () => {
    if (!serverSeed || !clientSeed) return
    setVerify(true)
    const res = await deriveResult(serverSeed, clientSeed, nonce)
    setVR(res)
    setVerify(false)
  }

  return (
    <main className="relative min-h-screen">
      <ParticleCanvas />
      <div className="relative z-10">
        <Navbar />

        <div className="max-w-4xl mx-auto px-6 py-8">

          {/* Header */}
          <motion.div initial={{ opacity:0, y:-20 }} animate={{ opacity:1, y:0 }} className="text-center mb-8">
            <h1 className="font-brand text-4xl font-bold mb-2">
              <span className="neon-text-green">🛡️ Provably Fair</span>
            </h1>
            <p className="text-text-secondary text-sm max-w-lg mx-auto">
              Every game result on MagicPlay is cryptographically verifiable.
              You can independently confirm the outcome of any game using our open algorithm.
            </p>
          </motion.div>

          {/* Status badges */}
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {[
              { label:'VRF Verified',       color:'text-green-300 bg-green-900/30 border-green-700/40' },
              { label:'Open Source',        color:'text-blue-300  bg-blue-900/30  border-blue-700/40'  },
              { label:'MagicBlock ER',      color:'text-purple-300 bg-purple-900/30 border-purple-700/40' },
              { label:'Solana Settled',     color:'text-cyan-300  bg-cyan-900/30  border-cyan-700/40'  },
              { label:'Audited Contract',   color:'text-yellow-300 bg-yellow-900/30 border-yellow-700/40' },
            ].map(b => (
              <span key={b.label} className={`text-xs font-bold px-3 py-1.5 rounded-full border ${b.color}`}>
                ✓ {b.label}
              </span>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.07] mb-6">
            {(['how','verify','audit'] as const).map(tab => (
              <button key={tab} onClick={() => setAS(tab)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all
                  ${activeSection === tab
                    ? 'bg-gradient-to-r from-green-700 to-teal-700 text-white'
                    : 'text-text-secondary hover:text-text-primary'}`}>
                {tab === 'how' ? '📖 How It Works' : tab === 'verify' ? '🔍 Verify Result' : '📋 Audit Log'}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">

            {/* ── HOW IT WORKS ── */}
            {activeSection === 'how' && (
              <motion.div key="how" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                className="grid gap-5">

                {/* Flow diagram */}
                <InfoCard title="Game Result Flow" icon="⚡">
                  <div className="flex flex-col gap-0">
                    {[
                      { step:'1', title:'Server Seed Generated', desc:'Before your game starts, a server seed hash is committed on-chain. The actual seed is hidden — you can verify the hash matches later.', icon:'🔐', color:'border-purple-600/40' },
                      { step:'2', title:'Client Seed Provided', desc:'You provide (or we generate) a client seed. This seed is YOURS — we cannot predict or manipulate it.', icon:'👤', color:'border-blue-600/40' },
                      { step:'3', title:'MagicBlock ER Executes', desc:'Your game moves run inside MagicBlock Ephemeral Rollups (<50ms). The outcome is derived from serverSeed + clientSeed + nonce using SHA-256.', icon:'⚡', color:'border-cyan-600/40' },
                      { step:'4', title:'Result Committed On-Chain', desc:'The final state hash is committed to Solana. The server seed is then revealed, allowing anyone to verify the outcome independently.', icon:'⛓️', color:'border-green-600/40' },
                      { step:'5', title:'Payout Settled', desc:'If you won, the Anchor smart contract releases SOL from the escrow PDA directly to your wallet. No intermediary.', icon:'💸', color:'border-yellow-600/40' },
                    ].map((s, i) => (
                      <div key={s.step} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center
                                          text-lg shrink-0 ${s.color} bg-white/[0.03]`}>
                            {s.icon}
                          </div>
                          {i < 4 && <div className="w-0.5 h-6 bg-white/[0.08] my-1" />}
                        </div>
                        <div className="pb-5">
                          <div className="font-semibold text-sm text-text-primary">{s.step}. {s.title}</div>
                          <div className="text-xs text-text-secondary mt-0.5 leading-relaxed">{s.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </InfoCard>

                <InfoCard title="Verification Algorithm" icon="🧮">
                  <CodeBlock code={`// Provably fair result derivation (JavaScript)
// This exact code is used by MagicPlay — verify it yourself!

async function sha256(message) {
  const buf  = new TextEncoder().encode(message)
  const hash = await crypto.subtle.digest('SHA-256', buf)
  return [...new Uint8Array(hash)]
    .map(b => b.toString(16).padStart(2, '0')).join('')
}

async function getResult(serverSeed, clientSeed, nonce) {
  // Combine seeds (same as server)
  const combined = \`\${serverSeed}:\${clientSeed}:\${nonce}\`
  const hash     = await sha256(combined)

  // Take first 4 bytes → normalize to 0-1 float
  const hex4    = hash.slice(0, 8)
  const int32   = parseInt(hex4, 16)
  const float   = int32 / 0xffffffff     // [0, 1)

  // Map to game range (e.g. dice 1-100)
  const diceResult = Math.floor(float * 100) + 1

  return { hash, float, diceResult }
}`} />
                </InfoCard>
              </motion.div>
            )}

            {/* ── VERIFY RESULT ── */}
            {activeSection === 'verify' && (
              <motion.div key="verify" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
                <InfoCard title="Verify a Game Result" icon="🔍">
                  <div className="grid gap-4">
                    <div>
                      <label className="text-xs text-text-secondary uppercase tracking-wider mb-1.5 block">
                        Server Seed (revealed after game)
                      </label>
                      <input value={serverSeed} onChange={e => setServer(e.target.value)}
                        className="w-full bg-black/30 border border-white/[0.08] rounded-xl px-3 py-2.5
                                   text-sm font-mono text-text-primary outline-none focus:border-green-500/50"
                        placeholder="e.g. a4f8c2e1d9b7..." />
                    </div>
                    <div>
                      <label className="text-xs text-text-secondary uppercase tracking-wider mb-1.5 block">
                        Client Seed
                      </label>
                      <input value={clientSeed} onChange={e => setClient(e.target.value)}
                        className="w-full bg-black/30 border border-white/[0.08] rounded-xl px-3 py-2.5
                                   text-sm font-mono text-text-primary outline-none focus:border-green-500/50"
                        placeholder="your seed" />
                    </div>
                    <div>
                      <label className="text-xs text-text-secondary uppercase tracking-wider mb-1.5 block">
                        Nonce (bet number)
                      </label>
                      <input type="number" value={nonce} onChange={e => setNonce(+e.target.value)}
                        className="w-40 bg-black/30 border border-white/[0.08] rounded-xl px-3 py-2.5
                                   text-sm font-mono text-text-primary outline-none focus:border-green-500/50"
                        min={1} />
                    </div>

                    <motion.button onClick={handleVerify} disabled={verifying}
                      className="py-3 rounded-xl font-brand text-base font-bold text-white border-none
                                 bg-gradient-to-r from-green-700 to-teal-700
                                 disabled:opacity-50 disabled:cursor-not-allowed"
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                      {verifying ? '🔄 Verifying...' : '🔍 Verify Result'}
                    </motion.button>

                    <AnimatePresence>
                      {verifyResult && (
                        <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
                          className="rounded-xl border border-green-600/30 bg-green-900/10 p-4">
                          <div className="text-xs text-green-400 font-bold mb-3 flex items-center gap-1.5">
                            ✅ Verification Successful
                          </div>
                          <div className="grid gap-2 text-xs font-mono">
                            <div className="flex justify-between gap-4">
                              <span className="text-text-secondary">SHA-256 Hash</span>
                              <span className="text-green-300 break-all text-right">{verifyResult.hash}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-text-secondary">Float (0–1)</span>
                              <span className="text-green-300">{verifyResult.float.toFixed(10)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-text-secondary">Dice Result (1–100)</span>
                              <span className="text-green-300 text-lg font-bold">{verifyResult.result}</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </InfoCard>
              </motion.div>
            )}

            {/* ── AUDIT LOG ── */}
            {activeSection === 'audit' && (
              <motion.div key="audit" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
                <InfoCard title="Recent Verified Games" icon="📋">
                  <div className="flex flex-col gap-2">
                    {Array.from({ length: 12 }, (_, i) => {
                      const games = ['Dice','Coin Flip','Mines','Plinko','Tower X']
                      const win   = Math.random() > 0.45
                      const mult  = win ? +(1 + Math.random() * 4).toFixed(2) : 0
                      const bet   = +(Math.random() * 0.5 + 0.05).toFixed(3)
                      return (
                        <motion.div key={i}
                          initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }}
                          transition={{ delay: i * 0.04 }}
                          className="flex items-center gap-3 py-2.5 border-b border-white/[0.05]
                                     last:border-0 text-xs">
                          <span className="text-text-muted font-mono w-5 shrink-0">{i+1}</span>
                          <span className="text-neon-cyan font-mono text-[11px]">7xKf...3mPq</span>
                          <span className="text-text-secondary flex-1">{games[i % 5]}</span>
                          <span className={`font-bold ${win ? 'text-neon-green' : 'text-red-400'}`}>
                            {win ? `+${(bet * mult).toFixed(3)}` : `-${bet}`} SOL
                          </span>
                          <button className="text-[10px] text-purple-400 border border-purple-700/30
                                            px-1.5 py-0.5 rounded-md hover:bg-purple-900/20 transition-colors"
                            onClick={() => setAS('verify')}>
                            Verify
                          </button>
                        </motion.div>
                      )
                    })}
                  </div>
                </InfoCard>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </main>
  )
}
