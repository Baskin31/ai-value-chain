import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import yaml from '@modyfi/vite-plugin-yaml'

export default defineConfig({
  plugins: [react(), yaml()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-d3': ['d3'],
          'vendor-recharts': ['recharts'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-zustand': ['zustand'],
        },
      },
    },
  },
})
