/**
 * Recording-only dev server for the attorney overview video. Serves the same
 * React Router app as `next dev` (app/src via app/index.html) but transforms
 * modules on demand, which keeps memory low enough to film on a small machine.
 * The three Next-only imports in app/src are shimmed; nothing here ships.
 * Start it from app/ so Tailwind's relative content globs resolve.
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import os from 'os'
import path from 'path'

const APP = path.resolve(__dirname, '../../app')
const SHIMS = path.resolve(__dirname, 'shims')
const API = process.env.VIDEO_API_URL || 'http://127.0.0.1:4000'
const PORT = Number(process.env.VIDEO_WEB_PORT || 5174)

const FONT_HEAD = `
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz@9..144&family=Inter:wght@400;500;600;700&display=swap">
<style>:root{--font-sans:'Inter',system-ui,sans-serif;--font-display:'Fraunces',Georgia,serif;}</style>`

export default defineConfig({
  root: APP,
  cacheDir: path.join(os.tmpdir(), 'caseiq-video-vite-cache'),
  plugins: [
    react(),
    {
      name: 'video-fonts',
      transformIndexHtml: (html) => html.replace('</head>', `${FONT_HEAD}</head>`),
    },
  ],
  resolve: {
    alias: [
      { find: /^next\/dynamic$/, replacement: path.join(SHIMS, 'next-dynamic.tsx') },
      { find: /^next\/script$/, replacement: path.join(SHIMS, 'next-script.tsx') },
      { find: '@', replacement: path.join(APP, 'src') },
    ],
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('development'),
    'process.env': '{}',
  },
  server: {
    port: PORT,
    strictPort: true,
    fs: { allow: [path.resolve(__dirname, '../..')] },
    proxy: {
      '/v1': { target: API, changeOrigin: true },
      '/uploads': { target: API, changeOrigin: true },
      '/health': { target: API, changeOrigin: true },
    },
  },
})
