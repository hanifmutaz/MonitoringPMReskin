-- 1700000003000_add-login-audit-log.sql
--
-- SECURITY_REVIEW.md Finding #2: login (sukses/gagal) tidak dicatat.
--
-- Tabel terpisah dari `audit_log` (bukan diperluas ke situ) karena:
--   1. `audit_log.action` di-CHECK ke ('CREATE','UPDATE','DELETE') — event
--      login bukan perubahan record, melainkan authentication event.
--   2. `audit_log` didesain untuk "jejak perubahan Master Data/User/Settings"
--      (lihat komentar di 1700000000000_initial-schema.sql) — beda tujuan.
--   3. Volume login attempt jauh lebih tinggi daripada perubahan data,
--      lebih rapi kalau retention/indexing-nya bisa diatur independen.
--
-- username_attempted disimpan apa adanya (bukan hanya user_id) supaya
-- percobaan login dengan username yang TIDAK ADA di sistem tetap tercatat
-- (user_id akan NULL untuk kasus ini) — penting untuk deteksi enumeration
-- attempt / brute-force terhadap username acak.

create table login_audit_log (
   id                 bigserial primary key,
   event_type         varchar(40) not null check ( event_type in ( 'LOGIN_SUCCESS',
                                                           'LOGIN_FAILED_USER_NOT_FOUND',
                                                           'LOGIN_FAILED_INVALID_PASSWORD',
                                                           'LOGIN_FAILED_ACCOUNT_DISABLED',
                                                           'LOGOUT' ) ),
   username_attempted varchar(50) not null,
   user_id            int
      references users ( id )
         on delete set null,
   ip_address         varchar(45),
   user_agent         text,
   created_at         timestamptz not null default now()
);

create index idx_login_audit_log_username on
   login_audit_log (
      username_attempted
   );
create index idx_login_audit_log_user_id on
   login_audit_log (
      user_id
   );
create index idx_login_audit_log_created_at on
   login_audit_log (
      created_at
   desc );
create index idx_login_audit_log_event_type on
   login_audit_log (
      event_type
   );

comment on table login_audit_log is
   'Jejak percobaan login & logout — dicatat dari Service layer (authService.js), bukan trigger DB.';