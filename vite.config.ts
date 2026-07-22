import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@contracts': path.resolve(__dirname, './src/contracts'),
    },
  },
  server: {
    // NOTE: e_payroll (the real backend) also defaults to port 3000
    // (configuration.ts: PORT || 3000). Keeping the frontend's dev server on
    // 3000 too meant whichever process started first won the port, and the
    // backend would crash on startup with EADDRINUSE if Vite grabbed it
    // first - which is exactly what was happening (curl to :3000/api/* was
    // hitting Vite's SPA fallback, not the NestJS backend, hence every API
    // call 404ing). Frontend now uses Vite's default port instead.
    port: 5173,
  },
});
