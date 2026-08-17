-- ============================================================
-- MyeCommerce Cloud - Admin Multi-Tenant Schema
-- ============================================================

-- Super Administradores del sistema
CREATE TABLE IF NOT EXISTS super_admins (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  avatar TEXT NOT NULL DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1,
  last_login TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Negocios (Tenants)
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  logo TEXT NOT NULL DEFAULT '',
  favicon TEXT NOT NULL DEFAULT '',
  primary_color TEXT NOT NULL DEFAULT '#6366f1',
  accent_color TEXT NOT NULL DEFAULT '#06b6d4',
  -- Plan: trial, basico, profesional, empresarial
  plan TEXT NOT NULL DEFAULT 'trial',
  plan_expires_at TEXT,
  -- Estado: activo, suspendido, cancelado
  status TEXT NOT NULL DEFAULT 'activo',
  -- Contacto del dueño
  owner_name TEXT NOT NULL DEFAULT '',
  owner_email TEXT NOT NULL DEFAULT '',
  owner_phone TEXT NOT NULL DEFAULT '',
  -- Configuración regional
  country TEXT NOT NULL DEFAULT 'VE',
  currency TEXT NOT NULL DEFAULT 'USD',
  timezone TEXT NOT NULL DEFAULT 'America/Caracas',
  -- URLs del tenant (se generan al crear)
  worker_domain TEXT NOT NULL DEFAULT '',
  pages_domain TEXT NOT NULL DEFAULT '',
  login_url TEXT NOT NULL DEFAULT '',
  -- Configuración Cloudflare del tenant
  d1_database_id TEXT NOT NULL DEFAULT '',
  d1_database_name TEXT NOT NULL DEFAULT '',
  r2_bucket_name TEXT NOT NULL DEFAULT '',
  kv_namespace_id TEXT NOT NULL DEFAULT '',
  worker_name TEXT NOT NULL DEFAULT '',
  pages_project_name TEXT NOT NULL DEFAULT '',
  -- Límites del plan
  max_products INTEGER NOT NULL DEFAULT 100,
  max_users INTEGER NOT NULL DEFAULT 3,
  max_daily_sales INTEGER NOT NULL DEFAULT 50,
  -- Estadísticas
  total_sales_count INTEGER NOT NULL DEFAULT 0,
  total_revenue REAL NOT NULL DEFAULT 0,
  -- Auditoría
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_plan ON tenants(plan);

-- Configuración individual de cada tenant (clave-valor)
CREATE TABLE IF NOT EXISTS tenant_settings (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  tenant_id TEXT NOT NULL,
  clave TEXT NOT NULL,
  valor TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT 'texto',
  categoria TEXT NOT NULL DEFAULT 'general',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  UNIQUE(tenant_id, clave)
);
CREATE INDEX IF NOT EXISTS idx_tenant_settings_tenant ON tenant_settings(tenant_id);

-- Usuarios administradores de cada tenant
CREATE TABLE IF NOT EXISTS tenant_admins (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  tenant_id TEXT NOT NULL,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'admin',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  UNIQUE(tenant_id, username)
);
CREATE INDEX IF NOT EXISTS idx_tenant_admins_tenant ON tenant_admins(tenant_id);

-- Historial de actividad del admin
CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  admin_id TEXT,
  admin_username TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT '',
  entity_id TEXT NOT NULL DEFAULT '',
  details TEXT NOT NULL DEFAULT '{}',
  ip_address TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_activity_log_admin ON activity_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_date ON activity_log(created_at);

-- Sesiones del super admin (KV fallback en tabla)
CREATE TABLE IF NOT EXISTS admin_sessions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  admin_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  user_agent TEXT NOT NULL DEFAULT '',
  ip_address TEXT NOT NULL DEFAULT '',
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (admin_id) REFERENCES super_admins(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);
