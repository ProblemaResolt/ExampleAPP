import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],  server: {
    host: '0.0.0.0',
    port: 3000,
    hmr: {
      port: 80,
      host: 'localhost'
    },
    watch: {
      usePolling: true,
      interval: 1000
    },
    cors: true,
    strictPort: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: false
  },
  optimizeDeps: {
    force: true,
    include: []
  },  define: {
    __DEV__: true,
    'process.env.NODE_ENV': '"development"'
  },
  esbuild: {
    drop: ['console', 'debugger']
  }
})
