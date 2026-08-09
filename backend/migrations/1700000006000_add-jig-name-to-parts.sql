-- 1700000006000_add-jig-name-to-parts.sql
--
-- LATAR BELAKANG (hasil diskusi Master Data PM Part):
-- Drawing No SAJA tidak cukup unik untuk mengidentifikasi 1 unit Part fisik
-- dalam 1 Line. Ditemukan kasus real: 1 Line bisa punya lebih dari 1 station/
-- jig yang menjalankan proses sama, dengan tool/part yang desainnya identik
-- (Drawing No dasar sama persis), tapi merupakan 2 unit fisik terpisah yang
-- masing-masing punya siklus pakai & histori penggantian sendiri-sendiri.
-- Contoh nyata (dari Master Data existing):
--   Line 41HR101, Jig "Contact Cutting A", Drawing No "IPDP4-013831-2"
--   Line 41HR101, Jig "Contact Cutting C", Drawing No "IPDP4-013831-2"  <-- sama persis
-- Sebelumnya ini "diakali" dengan menempelkan suffix manual ke teks Drawing No
-- ("IPDP4-013831-2 A" / "IPDP4-013831-2 C") supaya lolos constraint unique
-- lama (line_id, drawing_no). Pendekatan ini kotor: Drawing No jadi tidak
-- konsisten dengan dokumen asli, menyulitkan pencarian/reporting, dan
-- menyulitkan integrasi Inventory di masa depan (join key jadi tidak murni).
--
-- PERUBAHAN:
--   1. Tambah kolom `jig_name` (NOT NULL) -- identitas station/jig fisik.
--   2. Drop constraint unique lama (line_id, drawing_no).
--   3. Tambah constraint unique baru (line_id, jig_name, drawing_no) --
--      inilah kombinasi yang benar-benar merepresentasikan 1 unit part fisik.
--
-- CATATAN MIGRASI DATA:
--   Jika tabel `parts` SUDAH berisi data lama dengan suffix manual di
--   drawing_no (mis. "IPDP4-013831-2 A"), data tersebut HARUS dibersihkan
--   secara manual (split jadi jig_name + drawing_no bersih) SEBELUM
--   menjalankan constraint NOT NULL di bawah, atau migration ini akan gagal.
--   Untuk kondisi saat ini project belum punya data Part production, jadi
--   tidak ada langkah backfill otomatis yang disertakan. Jika ternyata sudah
--   ada data manual yang perlu dibersihkan, beri tahu dulu sebelum deploy
--   migration ini ke environment yang sudah berisi data.

ALTER TABLE parts
    ADD COLUMN jig_name VARCHAR(150);

-- Isi sementara untuk baris lama (jika ada) supaya NOT NULL bisa diterapkan.
-- Nilai placeholder ini WAJIB diperbaiki manual oleh Admin lewat Master Data
-- setelah migration berjalan, jika memang ada data lama yang perlu dibenahi.
UPDATE parts SET jig_name = 'UNKNOWN - MOHON DIISI ULANG' WHERE jig_name IS NULL;

ALTER TABLE parts
    ALTER COLUMN jig_name SET NOT NULL;

ALTER TABLE parts
    DROP CONSTRAINT IF EXISTS uq_parts_line_drawing;

ALTER TABLE parts
    ADD CONSTRAINT uq_parts_line_jig_drawing UNIQUE (line_id, jig_name, drawing_no);

CREATE INDEX idx_parts_jig_name ON parts(jig_name);

COMMENT ON COLUMN parts.jig_name IS 'Nama station/jig fisik tempat part ini terpasang (mis. "Contact Cutting A"). Bersama line_id + drawing_no, membentuk identitas unik 1 unit part fisik -- karena 1 Line bisa punya >1 jig dengan Drawing No desain yang sama persis.';
COMMENT ON CONSTRAINT uq_parts_line_jig_drawing ON parts IS 'Menggantikan uq_parts_line_drawing (line_id, drawing_no). Drawing No saja tidak cukup unik karena bisa ada beberapa jig fisik berbeda dalam 1 Line yang memakai desain tool identik.';