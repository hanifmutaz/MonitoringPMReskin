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
  build: {
    rollupOptions: {
      output: {
        // Pisahkan vendor library dari kode aplikasi sendiri jadi chunk
        // terpisah. Library ini jarang berubah dibanding kode src/ kita,
        // jadi browser bisa cache chunk vendor ini lama-lama - user gak
        // perlu re-download React/Radix/dll tiap kali kita deploy fix kecil
        // di kode aplikasi. Dikombinasikan dengan React.lazy() per-halaman
        // di App.jsx untuk code-splitting route.
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-radix': [
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-dialog',
            '@radix-ui/react-label',
            '@radix-ui/react-select',
            '@radix-ui/react-slot',
            '@radix-ui/react-tooltip',
          ],
          'vendor-query': ['@tanstack/react-query'],
        },
      },
    },
  },
});