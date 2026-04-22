import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalized = id.replace(/\\/g, '/')

          if (normalized.includes('/node_modules/')) {
            if (
              normalized.includes('/react/') ||
              normalized.includes('/react-dom/') ||
              normalized.includes('/react-router/') ||
              normalized.includes('/react-router-dom/')
            ) {
              return 'framework'
            }
            if (
              normalized.includes('/react-hook-form/') ||
              normalized.includes('/@hookform/') ||
              normalized.includes('/zod/')
            ) {
              return 'forms-vendor'
            }
            if (normalized.includes('/lucide-react/')) {
              return 'icons-vendor'
            }
            if (normalized.includes('/dompurify/')) {
              return 'dompurify-vendor'
            }
            if (normalized.includes('/axios/')) {
              return 'api-vendor'
            }
          }

          if (normalized.includes('/src/i18n/locales/es.json')) {
            return 'locale-es'
          }

          if (normalized.includes('/src/i18n/locales/zh.json')) {
            return 'locale-zh'
          }

          if (
            normalized.includes('/src/components/Layout.tsx') ||
            normalized.includes('/src/components/AuthRoute.tsx') ||
            normalized.includes('/src/contexts/') ||
            normalized.includes('/src/lib/auth.ts') ||
            normalized.includes('/src/i18n/')
          ) {
            return 'app-shell'
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/v1': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.error('[Vite proxy] API connection failed. Is the API running on port 4000?', err.message)
          })
        }
      }
    }
  }
})
