'use client'
import { ReactNode, useMemo, useEffect } from 'react'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletAdapterNetwork }               from '@solana/wallet-adapter-base'
import { PhantomWalletAdapter }               from '@solana/wallet-adapter-phantom'
import { WalletModalProvider }                from '@solana/wallet-adapter-react-ui'
import { clusterApiUrl }                      from '@solana/web3.js'
import { Toaster }                            from 'react-hot-toast'
import '@solana/wallet-adapter-react-ui/styles.css'
import '../styles/globals.css'
import { liveFeed } from '@/services/live-feed'

export default function RootLayout({ children }: { children: ReactNode }) {
  const network  = WalletAdapterNetwork.Devnet
  const endpoint = useMemo(() => clusterApiUrl(network), [network])
  const wallets  = useMemo(() => [new PhantomWalletAdapter()], [])
  useEffect(() => { liveFeed.connect(); return () => liveFeed.disconnect() }, [])
  return (
    <html lang="en">
      <head>
        <title>MagicPlay — Web3 Casino on Solana</title>
        <meta name="description" content="Provably fair casino on Solana, powered by MagicBlock." />
        <meta name="viewport"    content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#050508" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="pb-16 md:pb-0">
        <ConnectionProvider endpoint={endpoint}>
          <WalletProvider wallets={wallets} autoConnect>
            <WalletModalProvider>
              {children}
              <Toaster position="bottom-right" toastOptions={{ duration:3000,
                style:{ background:'#0d0d1a', color:'#f0f0ff', border:'1px solid rgba(168,85,247,0.3)',
                        borderRadius:'12px', fontSize:'13px', boxShadow:'0 8px 32px rgba(0,0,0,0.5)' },
                success:{ iconTheme:{ primary:'#10b981', secondary:'#0d0d1a' } },
                error:{   iconTheme:{ primary:'#ef4444', secondary:'#0d0d1a' } } }} />
            </WalletModalProvider>
          </WalletProvider>
        </ConnectionProvider>
      </body>
    </html>
  )
}
