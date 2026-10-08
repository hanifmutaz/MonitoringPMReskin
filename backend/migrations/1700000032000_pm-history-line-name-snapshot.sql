-- 1700000032000_pm-history-line-name-snapshot.sql
--
-- History PM Monthly/Weekly adalah CATATAN MASA LALU: tidak boleh menghalangi
-- penghapusan permanen Line, dan harus tetap terbaca setelah Line-nya hilang.
--
-- Sebelumnya: line_id NOT NULL + FK ON DELETE RESTRICT -> Line tidak bisa
-- dihapus permanen selama masih punya history.
--
-- Sekarang:
--   * line_name_snapshot menyimpan nama Line (identitas historis).
--   * line_id boleh NULL; FK jadi ON DELETE SET NULL.
--   * Selama Line masih ada, aplikasi menampilkan nama TERBARU dari lines
--     (COALESCE(l.line_name, h.line_name_snapshot)); snapshot dipakai kalau
--     Line sudah dihapus permanen.
--   * Trigger mengisi snapshot otomatis saat INSERT, dan menyegarkannya
--     tepat sebelum Line dihapus (supaya yang tersimpan nama terakhir).
--
-- PM Part TIDAK diubah: Part memang membutuhkan Line (FK tetap RESTRICT).

ALTER TABLE pm_monthly_history ADD COLUMN line_name_snapshot VARCHAR(50);

UPDATE pm_monthly_history h
SET line_name_snapshot = l.line_name
FROM lines l
WHERE l.id = h.line_id;

ALTER TABLE pm_monthly_history ALTER COLUMN line_name_snapshot SET NOT NULL;
ALTER TABLE pm_monthly_history ALTER COLUMN line_id DROP NOT NULL;

ALTER TABLE pm_monthly_history DROP CONSTRAINT pm_monthly_history_line_id_fkey;
ALTER TABLE pm_monthly_history
  ADD CONSTRAINT pm_monthly_history_line_id_fkey
  FOREIGN KEY (line_id) REFERENCES lines(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION pm_monthly_history_fill_line_name()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.line_name_snapshot IS NULL AND NEW.line_id IS NOT NULL THEN
    SELECT line_name INTO NEW.line_name_snapshot FROM lines WHERE id = NEW.line_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pm_monthly_history_fill_line_name
  BEFORE INSERT ON pm_monthly_history
  FOR EACH ROW EXECUTE PROCEDURE pm_monthly_history_fill_line_name();

CREATE OR REPLACE FUNCTION lines_refresh_history_snapshot()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE pm_monthly_history SET line_name_snapshot = OLD.line_name WHERE line_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lines_refresh_history_snapshot
  BEFORE DELETE ON lines
  FOR EACH ROW EXECUTE PROCEDURE lines_refresh_history_snapshot();

COMMENT ON COLUMN pm_monthly_history.line_name_snapshot IS 'Nama Line saat history dibuat / saat Line dihapus. Dipakai kalau line_id sudah NULL (Line dihapus permanen).';
