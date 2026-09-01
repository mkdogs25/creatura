import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  // GitHub Pages serves this repo from /creatura/, not root, so the deploy
  // workflow builds with VITE_BASE_PATH=/creatura/. Local dev and preview
  // keep the default '/' so nothing else about the setup has to change.
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
  },
});
