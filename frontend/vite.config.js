import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [
    react({
      // Fast Refreshを有効化
      fastRefresh: true,
      // HMR対象ファイルを指定
      include: "**/*.{jsx,tsx,js,ts}",
    })
  ],  // 開発サーバーの設定
  define: {
    'process.env.NODE_ENV': '"development"',
    // HMRを有効化
    '__HMR__': true
  },
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
    strictPort: true,
    // Docker環境での詳細なCORS設定
    cors: {
      origin: [
        'http://localhost', 
        'http://localhost:80', 
        'http://localhost:3000',
        'http://frontend:3000',      // Docker内部ネットワーク
        'http://nginx'               // Nginxコンテナからのアクセス
      ],
      credentials: true
    },    // HMRを有効化（Nginx経由）
    hmr: {
      port: 3000,        // 開発サーバーと同じポートを使用
      host: 'localhost', // ブラウザからはlocalhostでアクセス
      clientPort: 80     // ブラウザからはNginx経由でアクセス
    },
    // ファイル監視を有効化
    watch: {
      usePolling: true,
      interval: 1000
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