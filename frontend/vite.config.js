import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['fsevents']
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
      '**/*.spec.js' // Playwright E2Eテストを除外
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
    }  },  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    cors: true,
    watch: {
      usePolling: false,
      ignored: ['**/node_modules/**', '**/dist/**', '**/coverage/**']
    },
    hmr: {
      port: 3000,
      host: '0.0.0.0',
      clientPort: 80
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
  },build: {
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
