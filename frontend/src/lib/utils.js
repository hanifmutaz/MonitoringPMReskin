// src/lib/utils.js
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Gabung className kondisional (clsx) + resolve konflik utility Tailwind
// (twMerge, misal "px-2 px-4" -> cuma "px-4" yang kepake). Standar di semua
// komponen shadcn/ui - dipanggil di HAMPIR SETIAP komponen di ui/.
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
