import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative paths so the built site works from any address,
  // e.g. https://<you>.github.io/chess-study/ (the app uses #/ links, so no server setup is needed).
  base: './',
})
