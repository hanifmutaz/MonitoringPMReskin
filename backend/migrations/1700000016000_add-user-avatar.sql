-- 1700000016000_add-user-avatar.sql
--
-- Foto profil OPSIONAL - user boleh upload atau enggak (fitur self-service
-- profile, lihat profileService.js). NULL kalau belum pernah upload -
-- frontend fallback ke inisial nama (pola yang udah dipakai di footer
-- Sidebar/kartu identitas ProfilePage).
--
-- Nyimpen PATH RELATIF (mis. "/uploads/avatars/3-a1b2c3d4.jpg"), bukan file
-- binary di kolom DB - filenya sendiri di disk lokal server
-- (backend/uploads/avatars/, lihat app.js buat static serving-nya). App ini
-- gak punya integrasi cloud storage (S3/dst) sama sekali di config manapun,
-- jadi disk lokal itu keputusan paling KISS buat scope sekarang, bukan
-- dia-diain lupa.

ALTER TABLE users ADD COLUMN avatar_url VARCHAR(255);
COMMENT ON COLUMN users.avatar_url IS 'Path relatif ke foto profil (mis. /uploads/avatars/<file>), NULL kalau belum upload/opsional. Disk lokal, bukan cloud storage.';
