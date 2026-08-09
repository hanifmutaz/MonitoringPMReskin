ALTER TABLE audit_log
  DROP CONSTRAINT audit_log_user_id_fkey,
  ADD CONSTRAINT audit_log_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT;

ALTER TABLE login_audit_log
  DROP CONSTRAINT login_audit_log_user_id_fkey,
  ADD CONSTRAINT login_audit_log_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT;