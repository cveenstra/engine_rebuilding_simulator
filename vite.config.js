import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Relative asset paths so dist/ works from any sub-path (GitHub Pages
  // project sites, a static bucket, or opened from disk). HashRouter handles routes.
  base: './',
  plugins: [react(), tailwindcss()],
  // All study content is bundled on purpose so the app works offline once
  // loaded; the bundle grows with the content, so the default 500 kB warning
  // is noise here.
  build: { chunkSizeWarningLimit: 4000 },
  // host: true exposes the dev server on the LAN so a phone on the same Wi-Fi can open it.
  server: { port: 5181, host: true, open: true },
  preview: { port: 4181, host: true },
});
