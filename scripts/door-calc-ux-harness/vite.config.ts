import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../../src'),
      'next/link': path.resolve(__dirname, 'next-link-shim.tsx'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5198,
    strictPort: true,
  },
});