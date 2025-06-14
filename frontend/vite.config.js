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
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    cors: true,
    // Docker + nginx環境用のHMR設定
    hmr: {
      // nginxを通すためのWebSocket設定
      clientPort: 80, // ブラウザはポート80のnginx経由でWebSocketに接続
      port: 24678,    // コンテナ内のHMRポート
    },
    watch: {
      usePolling: true, // Dockerボリュームマウント用
      interval: 1000,
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