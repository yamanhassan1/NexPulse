import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // Vite 8 (rolldown) requires manualChunks to be a function.
        // Split heavy, rarely-changing vendor packages into separate chunks so
        // that the main application bundle stays small and browser caches for
        // the vendor chunks survive app-only updates.
        manualChunks(id) {
          if (id.includes('node_modules/firebase/')) return 'vendor-firebase'
          if (id.includes('node_modules/motion/')) return 'vendor-motion'
          if (id.includes('node_modules/@reduxjs/') || id.includes('node_modules/react-redux/')) {
            return 'vendor-redux'
          }
          if (id.includes('node_modules/react-router')) return 'vendor-router'
          // Monaco is lazy-loaded via a dynamic import in CodeEditor.jsx;
          // rolldown already emits it as its own async chunk.
        },
      },
    },
  },
})


