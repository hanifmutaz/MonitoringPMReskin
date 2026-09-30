-- 1700000027000_add-jenis-penggantian.sql
--
-- Jenis Penggantian PM Part sebelumnya di-hardcode (CHECK constraint di DB +
-- JENIS_ENUM di validator + daftar di frontend): TERJADWAL, PM_EARLY, BROKEN.
-- Ada kebutuhan jenis baru ("Aus") dan kemungkinan jenis lain ke depan, jadi
-- dipindah jadi master data yang bisa dikelola Admin.
--
--   counts_in_ketepatan = TRUE  -> penggantian jenis ini DIHITUNG di Ketepatan
--                                  PM Part (tepat kalau counter_saat_diganti
--                                  <= target_shot, telat kalau lewat).
--   counts_in_ketepatan = FALSE -> DIKECUALIKAN (on_time = NULL), sama seperti
--                                  perilaku BROKEN sebelumnya.
--
-- pm_part_history.on_time tetap dibekukan saat insert, jadi mengubah flag di
-- sini TIDAK mengubah riwayat lama, hanya penggantian yang diinput sesudahnya.
--
-- Data awal: 3 jenis lama (perilaku sama persis dengan sebelumnya) + AUS
-- (dikecualikan dari ketepatan, untuk saat ini).

CREATE TABLE jenis_penggantian (
    id                  SERIAL PRIMARY KEY,
    code                VARCHAR(20) NOT NULL UNIQUE,
    label               VARCHAR(50) NOT NULL,
    counts_in_ketepatan BOOLEAN NOT NULL DEFAULT TRUE,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order          INT NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO jenis_penggantian (code, label, counts_in_ketepatan, sort_order) VALUES
    ('TERJADWAL', 'Terjadwal', TRUE,  10),
    ('PM_EARLY',  'PM Early',  TRUE,  20),
    ('BROKEN',    'Broken',    FALSE, 30),
    ('AUS',       'Aus',       FALSE, 40);

COMMENT ON TABLE jenis_penggantian IS 'Master jenis penggantian PM Part. code dipakai sebagai nilai pm_part_history.jenis_penggantian (tidak boleh diubah setelah dibuat). Jenis yang sudah dipakai riwayat hanya bisa dinonaktifkan, bukan dihapus.';
COMMENT ON COLUMN jenis_penggantian.counts_in_ketepatan IS 'TRUE = ikut dihitung di Ketepatan PM Part. FALSE = dikecualikan (on_time NULL). Hanya berlaku untuk penggantian baru; riwayat lama tidak berubah.';

-- Ganti CHECK hardcode dengan FK ke master (nama constraint default Postgres
-- untuk CHECK level-kolom: <tabel>_<kolom>_check).
ALTER TABLE pm_part_history
    DROP CONSTRAINT IF EXISTS pm_part_history_jenis_penggantian_check;

ALTER TABLE pm_part_history
    ADD CONSTRAINT fk_pm_part_history_jenis
    FOREIGN KEY (jenis_penggantian) REFERENCES jenis_penggantian(code) ON UPDATE CASCADE;
