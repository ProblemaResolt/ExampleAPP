import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// IOエラー回避 + ライブリロード対応設定
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
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    css: true,
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/e2e/**',
      '**/src/test/e2e/**',
      '**/*.e2e.{test,spec}.{js,jsx,ts,tsx}',
      '**/*.spec.js'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.js',
        '**/*.config.ts',
        'dist/',
        'coverage/',
        'public/',
        '**/e2e/**'
      ]
    }
  },  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    cors: true,
    hmr: false,
    watch: {
      usePolling: false,
      interval: 300,
      binaryInterval: 1000,
      ignored: [
        '**/node_modules/**',
        '**/dist/**',
        '**/.git/**',
        '**/coverage/**',
        '**/build/**',
        '**/tmp/**',
        '**/.env*'
      ]
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
