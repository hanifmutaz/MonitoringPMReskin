// src/hooks/useTabIndicator.js
//
// polish: A10 (motion, 08 Sep 2026) - motion pattern #5 (§6.3 di
// UI-CONSISTENCY-AUDIT.md): "Tab indicator slide: garis bawah tab geser,
// bukan muncul-hilang". Sebelum ini, tab underline (MasterDataPage.jsx &
// RecycleBinPage.jsx - 2 consumer, pola PERSIS sama) masing-masing tombol
// nyalain/matiin border-bottom-nya sendiri pas jadi aktif - keliatan
// "muncul-hilang" instan, bukan geser.
//
// Hook ini CUMA nanganin bagian yang tricky (ngukur posisi/lebar tombol
// aktif via DOM, reposition pas resize) - bukan komponen Tabs generik
// penuh. Sengaja gitu: 2 consumer ini punya render tiap-tab yang beda
// (MasterDataPage ada ikon Lock buat tab ter-gate paket, RecycleBinPage
// ada ikon Trash2 di semua tab) - maksain 1 komponen data-driven generik
// bakal kehilangan fleksibilitas itu atau butuh render-prop yang malah
// lebih ribet dari manfaatnya. Consumer tetap render tombolnya sendiri,
// cuma pasang `itemRef(key)` ke tiap tombol + render <span> indicator
// pakai `indicatorStyle` yang dihasilkan hook ini.
//
// Nol perubahan logic/data - murni presentational (posisi indicator),
// sesuai batasan di UI-POLISH-IMPLEMENTATION-PLAN.md ("Definition of
// Done": "Nol perubahan logic/data/permission").
import { useLayoutEffect, useRef, useState } from 'react';

function useTabIndicator(activeKey) {
  const containerRef = useRef(null);
  const nodesRef = useRef(new Map());
  const [style, setStyle] = useState({ left: 0, width: 0, ready: false });

  // Callback ref generator - dipasang ke tiap tombol tab lewat
  // `ref={itemRef(tab.key)}`. Map biar bisa lookup by key pas ngukur.
  function itemRef(key) {
    return (node) => {
      if (node) {
        nodesRef.current.set(key, node);
      } else {
        nodesRef.current.delete(key);
      }
    };
  }

  useLayoutEffect(() => {
    const node = nodesRef.current.get(activeKey);
    const container = containerRef.current;
    if (!node || !container) return;

    function measure() {
      const containerRect = container.getBoundingClientRect();
      const nodeRect = node.getBoundingClientRect();
      setStyle({ left: nodeRect.left - containerRect.left, width: nodeRect.width, ready: true });
    }

    measure();

    // Reposisi kalau lebar container berubah (resize window, sidebar
    // collapse/expand) - ResizeObserver, bukan window resize listener,
    // biar nangkep perubahan lebar dari sumber manapun.
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    return () => ro.disconnect();
  }, [activeKey]);

  return { containerRef, itemRef, indicatorStyle: style };
}

export default useTabIndicator;
