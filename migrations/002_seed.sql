-- ============================================================
-- MyeCommerce Cloud - Seed Data
-- ============================================================

-- Hash y salt para contraseña: admin123 (se generará desde el Worker)
-- Por ahora insertamos placeholder que se actualizará al primer login
INSERT OR IGNORE INTO super_admins (id, username, password_hash, salt, name, email)
VALUES (
  'sa00000000000001',
  'superadmin',
  'PLACEHOLDER',
  'PLACEHOLDER',
  'Super Administrador',
  'admin@myecommerce.cloud'
);
