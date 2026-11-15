import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'; // 2026/11

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),tailwindcss()],
})
