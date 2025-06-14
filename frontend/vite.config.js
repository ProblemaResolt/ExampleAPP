import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['fsevents'],
    force: false,
    include: ['react', 'react-dom', 'react-router-dom']
  },  server: {
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
    },
    // Dockerネットワーク内での接続を許可
    hmr: {
      protocol: 'ws',
      host: 'localhost',  // ← Docker 外から見たアドレス。必要なら実IPなどに変更
      port: 80,
      path: '/ws'
    },
    watch: {
      usePolling: true,
      interval: 500,
      binaryInterval: 1000,
      ignored: ['**/node_modules/**', '**/.git/**'],
      followSymlinks: false,
    },
    fs: {
      strict: false,
      allow: ['..']
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