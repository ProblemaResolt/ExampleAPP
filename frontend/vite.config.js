import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    cors: true,
    hmr: {
      clientPort: 80,
      host: 'localhost'
    },
    watch: {
      usePolling: true
    },
    fs: {
      strict: false,
      allow: ['..']
    }
  }
})
