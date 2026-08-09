import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // Konvensi shadcn/ui - import komponen lewat '@/components/ui/...'
      // daripada relative path panjang ('../../components/ui/...').
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
});