import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
export default defineConfig({
  root: path.resolve(__dirname),
  plugins: [react()],
  server: { port: 5174, proxy: { '/api': 'http://localhost:4001' } },
  build: { outDir: 'dist', emptyOutDir: true }
});