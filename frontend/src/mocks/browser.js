// src/mocks/browser.js
// Setup MSW worker buat browser (dev). Dipanggil dari main.jsx secara
// kondisional - lihat MSW-CARA-PAKAI.md.
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
