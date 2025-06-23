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
      // JSX Runtimeを明示的に設定
      jsxRuntime: 'automatic'
    })
  ],
  // テスト設定
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: []
  },
  // 開発サーバーの設定
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
    port: 5173,
    strictPort: true,
    origin: 'http://0.0.0.0:5173',
    // 全てのホストからのアクセスを許可
    cors: true,
    // ホスト設定を追加
    allowedHosts: 'all',// HMR設定（シンプル化）
    hmr: {
      port: 5173,
      overlay: true
    },
    // ファイル監視を強化
    watch: {
      usePolling: true,
      interval: 300,      // より頻繁にチェック
      ignored: ['!**/node_modules/**']
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