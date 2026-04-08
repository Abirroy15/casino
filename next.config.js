/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  webpack: (config, { isServer }) => {
    // Solana/Anchor require these fallbacks in browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs:     false,
        net:    false,
        tls:    false,
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        url:    require.resolve('url'),
        zlib:   require.resolve('browserify-zlib'),
        http:   require.resolve('stream-http'),
        https:  require.resolve('https-browserify'),
        assert: require.resolve('assert'),
        os:     require.resolve('os-browserify'),
        path:   require.resolve('path-browserify'),
      }
    }
    return config
  },

  // Allow images from common crypto/NFT sources
  images: {
    domains: [
      'arweave.net',
      'www.arweave.net',
      'nftstorage.link',
      'ipfs.io',
      'cloudflare-ipfs.com',
    ],
  },

  // Transpile Solana packages that ship ESM
  transpilePackages: [
    '@solana/wallet-adapter-base',
    '@solana/wallet-adapter-react',
    '@solana/wallet-adapter-react-ui',
    '@solana/wallet-adapter-phantom',
    '@solana/wallet-adapter-wallets',
  ],

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',           value: 'DENY' },
          { key: 'X-Content-Type-Options',     value: 'nosniff' },
          { key: 'Referrer-Policy',            value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',         value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
