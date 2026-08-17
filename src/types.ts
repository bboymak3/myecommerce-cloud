export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  // MEDIA: R2Bucket; // Pendiente activación R2
  ENVIRONMENT: string;
  JWT_SECRET: string;
  CLOUDFLARE_API_TOKEN: string;
  CLOUDFLARE_ACCOUNT_ID: string;
}

export interface JwtPayload {
  adminId: string;
  username: string;
  name: string;
  role: 'super_admin';
}

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  description: string;
  logo: string;
  favicon: string;
  primary_color: string;
  accent_color: string;
  plan: string;
  plan_expires_at: string | null;
  status: string;
  owner_name: string;
  owner_email: string;
  owner_phone: string;
  country: string;
  currency: string;
  timezone: string;
  worker_domain: string;
  pages_domain: string;
  login_url: string;
  d1_database_id: string;
  d1_database_name: string;
  r2_bucket_name: string;
  kv_namespace_id: string;
  worker_name: string;
  pages_project_name: string;
  max_products: number;
  max_users: number;
  max_daily_sales: number;
  total_sales_count: number;
  total_revenue: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TenantSetting {
  id: string;
  tenant_id: string;
  clave: string;
  valor: string;
  tipo: string;
  categoria: string;
  updated_at: string;
}

export interface TenantAdmin {
  id: string;
  tenant_id: string;
  username: string;
  password_hash: string;
  salt: string;
  name: string;
  email: string;
  role: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface SuperAdmin {
  id: string;
  username: string;
  password_hash: string;
  salt: string;
  name: string;
  email: string;
  avatar: string;
  is_active: number;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}