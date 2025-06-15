import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [
    react({
      // Fast Refreshを最適化
      fastRefresh: true,
      // 部分更新のためのオプション
      include: "**/*.{jsx,tsx}",
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['fsevents'],
    force: false,
    include: ['react', 'react-dom', 'react-router-dom']
  },  
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,    // Docker環境での詳細なCORS設定
    cors: {
      origin: [
        'http://localhost', 
        'http://localhost:80', 
        'http://localhost:3000',
        'http://frontend:3000',    // Docker内部ネットワーク
        'http://nginx'             // Nginxコンテナからのアクセス
      ],
      credentials: true
    },   logLevel: 'debug', // または 'debug' // HMR設定をDockerに最適化 - 部分更新に対応
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 24678,  // Docker exposeされているHMRポート
      path: '/ws', 
      clientPort: 80,
      // 部分更新を有効化
      overlay: true
    },    watch: {
      usePolling: true,
      interval: 1000,  // 1秒から500msに短縮してより迅速に変更を検知
      binaryInterval: 1000,
      ignored: [
        '**/node_modules/**', 
        '**/.git/**',
        '**/dist/**',
        '**/build/**',
        '**/.vite/**',
        '**/coverage/**'
      ],
      followSymlinks: true,
      awaitWriteFinish: {
        stabilityThreshold: 300,  // さらに短縮してレスポンシブに
        pollInterval: 100
      },
      ignoreInitial: true
    },
    proxy: {
      '/api': {
        target: 'http://backend:4000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    copyPublicDir: true,
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  },
  publicDir: 'public'
})