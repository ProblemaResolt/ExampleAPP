import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 無限リロード問題の解決のための最小限の設定
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    // HMRとファイル監視を完全に無効化
    hmr: false,
    watch: false,
    cors: true,
    strictPort: true,
    origin: 'http://localhost'
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: false
  },
  // 依存関係の最適化も無効化
  optimizeDeps: {
    disabled: true
  },
  define: {
    'process.env.NODE_ENV': '"development"'
  },
  clearScreen: false
})
