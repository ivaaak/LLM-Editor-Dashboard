import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Forward API calls (including the event stream) to the Express server started by `npm run dev`.
    proxy: {
      '/api': `http://localhost:${process.env.API_PORT ?? 3001}`,
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Keep the large charting library in its own long-lived cacheable chunk.
        manualChunks: {
          recharts: ['recharts'],
        },
      },
    },
  },
})
