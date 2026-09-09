// src/hooks/useCountUp.js
//
// polish: A10 (motion, 08 Sep 2026) - motion pattern #4 (§6.3 di
// UI-CONSISTENCY-AUDIT.md): "Number count-up: angka KPI naik dari 0 ->
// nilai, `data` durasi (400ms)".
//
// KpiCard nerima `value` sebagai STRING YANG UDAH DIFORMAT oleh caller
// (mis. `summary.total_parts.toLocaleString('id-ID')` -> "1.234", atau
// `formatKetepatan(x)` -> "85.3%") - bukan angka mentah + formatter
// terpisah. Daripada ubah API KpiCard + SEMUA ~14 call site buat ngirim
// angka mentah (perubahan besar, resiko regresi tinggi buat fitur
// kosmetik), hook ini PARSE BALIK string yang udah diformat, animasiin
// angkanya, format ulang tiap frame, dan di akhir SNAP ke string asli
// PERSIS (jaminan hasil akhir 100% sama kayak yang caller maksud -
// animasi cuma efek visual di tengah jalan, nol resiko salah format).
//
// Disambiguasi format: value dengan suffix "%" (dari formatKetepatan)
// pakai "." sebagai DESIMAL (format default JS number->string, BUKAN
// locale id-ID - lihat DashboardPage.jsx formatKetepatan()). Value tanpa
// suffix (count/jumlah, dari .toLocaleString('id-ID')) pakai "." sebagai
// PEMISAH RIBUAN. Kalau value nggak keparse jadi angka (mis. "-" buat
// null/undefined), animasi di-skip, render apa adanya - fallback aman
// buat kasus yang nggak keantisipasi.
//
// Animasi CUMA jalan SEKALI pas value pertama kali kedefinisi (mount /
// initial load) - dashboard poll tiap 60 detik (lihat
// hooks/useDashboardExtras.js refetchInterval), refresh berkala TIDAK
// boleh re-trigger count-up (bakal ganggu: angka "reset ke 0 lalu naik
// lagi" tiap menit, bukan premium). Ini konsisten sama pembedaan
// "initial loading" vs "refreshing" yang udah ada di
// components/ui/skeleton.jsx (01-PRODUCT-UX-BRIEF.md §8).
//
// Easing: approximasi easeOutCubic (`1-(1-t)^3`) buat MENDEKATI kurva
// `--ease-decelerate` (cubic-bezier(0,0,0.2,1)) di tailwind.css - BUKAN
// solve bezier exact (butuh iterasi numerik, kompleksitas nggak sepadan
// buat animasi kosmetik ini). Kalau §6.2 easing token berubah, kurva di
// sini TIDAK otomatis ikut - trade-off yang disengaja, didokumentasiin
// di sini biar jelas kalau ada yang nanya "kenapa beda dari CSS".
//
// prefers-reduced-motion: WAJIB dicek manual di sini (bukan otomatis).
// Override CSS universal di global.css cuma nyentuh animation/transition
// CSS, BUKAN requestAnimationFrame yang di-drive JS murni kayak hook ini.
import { useEffect, useRef, useState } from 'react';

const DURATION_MS = 400; // --duration-data, lihat tailwind.css §Motion scale

function parseKpiValue(raw) {
  if (raw === null || raw === undefined) return null;
  const str = String(raw).trim();
  const match = str.match(/^(-?[\d.,]+)(.*)$/);
  if (!match || match[1] === '' || match[1] === '-') return null;
  const [, numPart, suffix] = match;

  if (suffix.startsWith('%')) {
    const target = parseFloat(numPart);
    if (Number.isNaN(target)) return null;
    const dotIdx = numPart.indexOf('.');
    const decimals = dotIdx === -1 ? 0 : numPart.length - dotIdx - 1;
    return { target, suffix, decimals, thousands: false };
  }

  const digitsOnly = numPart.replace(/[.,]/g, '');
  const target = parseInt(digitsOnly, 10);
  if (Number.isNaN(target)) return null;
  return { target, suffix, decimals: 0, thousands: true };
}

function formatFrame(value, parsed) {
  if (parsed.decimals > 0) {
    return value.toFixed(parsed.decimals) + parsed.suffix;
  }
  const rounded = Math.round(value);
  return (parsed.thousands ? rounded.toLocaleString('id-ID') : String(rounded)) + parsed.suffix;
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function useCountUp(value) {
  const [display, setDisplay] = useState(value);
  const frameRef = useRef(null);
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    const parsed = parseKpiValue(value);
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (hasAnimatedRef.current || !parsed || reduceMotion) {
      setDisplay(value);
      hasAnimatedRef.current = true;
      return undefined;
    }
    hasAnimatedRef.current = true;

    const start = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - start) / DURATION_MS);
      if (t >= 1) {
        setDisplay(value); // snap ke string asli persis
        return;
      }
      setDisplay(formatFrame(parsed.target * easeOutCubic(t), parsed));
      frameRef.current = requestAnimationFrame(tick);
    }
    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return display;
}

export default useCountUp;
