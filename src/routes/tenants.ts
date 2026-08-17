import { Hono } from 'hono';
import type { Env, JwtPayload } from '../types';
import { generateSalt, hashPassword } from '../lib/auth';
import { logActivity } from '../lib/logger';
import { createD1Database, createKVNamespace, createPagesProject } from '../lib/cloudflare-api';
import { authMiddleware } from '../middleware/auth';

const app = new Hono<{ Bindings: Env; Variables: { jwt: JwtPayload } }>();

// Todas las rutas requieren auth
app.use('/*', authMiddleware);

// ============================================================
// GET /api/tenants — Listar todos los tenants con filtros
// ============================================================
app.get('/', async (c) => {
  const { status, plan, search, page = '1', limit = '20' } = c.req.query();
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  let where = 'WHERE 1=1';
  const binds: any[] = [];

  if (status) { where += ' AND t.status = ?'; binds.push(status); }
  if (plan) { where += ' AND t.plan = ?'; binds.push(plan); }
  if (search) { where += ' AND (t.name LIKE ? OR t.slug LIKE ? OR t.owner_email LIKE ?)'; binds.push(`%${search}%`, `%${search}%`, `%${search}%`); }

  // Contar total
  const countResult = await c.env.DB.prepare(
    `SELECT COUNT(*) as total FROM tenants t ${where}`
  ).bind(...binds).first<{ total: number }>();

  // Obtener datos
  const tenants = await c.env.DB.prepare(
    `SELECT t.*,
       (SELECT COUNT(*) FROM tenant_admins WHERE tenant_id = t.id) as admin_count,
       (SELECT COUNT(*) FROM tenant_settings WHERE tenant_id = t.id) as settings_count
     FROM tenants t ${where}
     ORDER BY t.created_at DESC
     LIMIT ? OFFSET ?`
  ).bind(...binds, limitNum, offset).all();

  return c.json({
    tenants: tenants.results,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: countResult?.total || 0,
      totalPages: Math.ceil((countResult?.total || 0) / limitNum),
    },
  });
});

// ============================================================
// GET /api/tenants/stats — Estadísticas generales
// ============================================================
app.get('/stats', async (c) => {
  const total = await c.env.DB.prepare('SELECT COUNT(*) as c FROM tenants').first<{ c: number }>();
  const active = await c.env.DB.prepare("SELECT COUNT(*) as c FROM tenants WHERE status = 'activo'").first<{ c: number }>();
  const trial = await c.env.DB.prepare("SELECT COUNT(*) as c FROM tenants WHERE plan = 'trial'").first<{ c: number }>();
  const suspended = await c.env.DB.prepare("SELECT COUNT(*) as c FROM tenants WHERE status = 'suspendido'").first<{ c: number }>();
  const totalRevenue = await c.env.DB.prepare('SELECT COALESCE(SUM(total_revenue), 0) as r FROM tenants').first<{ r: number }>();
  const totalSales = await c.env.DB.prepare('SELECT COALESCE(SUM(total_sales_count), 0) as s FROM tenants').first<{ s: number }>();
  const recent = await c.env.DB.prepare(
    'SELECT id, name, slug, status, plan, created_at FROM tenants ORDER BY created_at DESC LIMIT 5'
  ).all();

  return c.json({
    total: total?.c || 0,
    active: active?.c || 0,
    trial: trial?.c || 0,
    suspended: suspended?.c || 0,
    totalRevenue: totalRevenue?.r || 0,
    totalSales: totalSales?.s || 0,
    recent: recent.results,
  });
});

// ============================================================
// GET /api/tenants/:id — Detalle de un tenant
// ============================================================
app.get('/:id', async (c) => {
  const { id } = c.req.param();
  const tenant = await c.env.DB.prepare('SELECT * FROM tenants WHERE id = ?').bind(id).first();
  if (!tenant) return c.json({ error: 'Negocio no encontrado' }, 404);

  const settings = await c.env.DB.prepare(
    'SELECT * FROM tenant_settings WHERE tenant_id = ? ORDER BY categoria, clave'
  ).bind(id).all();

  const admins = await c.env.DB.prepare(
    'SELECT id, username, name, email, role, is_active, created_at, updated_at FROM tenant_admins WHERE tenant_id = ?'
  ).bind(id).all();

  return c.json({ tenant, settings: settings.results, admins: admins.results });
});

// ============================================================
// POST /api/tenants — Crear nuevo negocio (tenant)
// ============================================================
app.post('/', async (c) => {
  const jwt = c.get('jwt');
  const body = await c.req.json<{
    name: string;
    slug?: string;
    description?: string;
    primary_color?: string;
    accent_color?: string;
    plan?: string;
    owner_name?: string;
    owner_email?: string;
    owner_phone?: string;
    country?: string;
    currency?: string;
    timezone?: string;
    admin_username?: string;
    admin_password?: string;
    admin_name?: string;
  }>();

  if (!body.name?.trim()) {
    return c.json({ error: 'El nombre del negocio es requerido' }, 400);
  }

  // Generar slug
  const slug = (body.slug || body.name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')).substring(0, 50);

  // Verificar slug único
  const existing = await c.env.DB.prepare('SELECT id FROM tenants WHERE slug = ?').bind(slug).first();
  if (existing) {
    return c.json({ error: 'Ya existe un negocio con ese slug/identificador' }, 409);
  }

  const tenantId = crypto.randomUUID().replace(/-/g, '').substring(0, 16);
  const d1Name = `myecommerce-${slug}`;
  const r2Name = `myecommerce-${slug}-media`;
  const kvTitle = `MYECOMMERCE_KV_${slug.toUpperCase()}`;
  const workerName = `myecommerce-${slug}`;
  const pagesName = `myecommerce-${slug}-login`;

  // Intentar crear recursos en Cloudflare (puede fallar si R2 no está activo)
  let d1Id = '';
  let kvId = '';
  let cfError = '';

  try {
    const d1 = await createD1Database(c.env, d1Name);
    d1Id = d1.uuid;
  } catch (e: any) {
    cfError = `D1: ${e.message}`;
  }

  try {
    const kv = await createKVNamespace(c.env, kvTitle);
    kvId = kv.id;
  } catch (e: any) {
    cfError += (cfError ? ' | ' : '') + `KV: ${e.message}`;
  }

  // Crear tenant en BD
  await c.env.DB.prepare(
    `INSERT INTO tenants (
      id, slug, name, description, primary_color, accent_color, plan,
      owner_name, owner_email, owner_phone, country, currency, timezone,
      d1_database_id, d1_database_name, r2_bucket_name, kv_namespace_id,
      worker_name, pages_project_name, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    tenantId, slug, body.name.trim(), body.description || '',
    body.primary_color || '#6366f1', body.accent_color || '#06b6d4',
    body.plan || 'trial',
    body.owner_name || '', body.owner_email || '', body.owner_phone || '',
    body.country || 'VE', body.currency || 'USD', body.timezone || 'America/Caracas',
    d1Id, d1Name, r2Name, kvId, workerName, pagesName,
    jwt.adminId
  ).run();

  // Configuraciones por defecto del tenant
  const defaultSettings = [
    { clave: 'storeName', valor: body.name.trim(), tipo: 'texto', categoria: 'tienda' },
    { clave: 'storeAddress', valor: '', tipo: 'texto', categoria: 'tienda' },
    { clave: 'storePhone', valor: body.owner_phone || '', tipo: 'texto', categoria: 'tienda' },
    { clave: 'storeRif', valor: '', tipo: 'texto', categoria: 'tienda' },
    { clave: 'bcvRate', valor: '36.50', tipo: 'numero', categoria: 'finanzas' },
    { clave: 'taxRate', valor: '16', tipo: 'numero', categoria: 'finanzas' },
    { clave: 'taxMode', valor: 'included', tipo: 'texto', categoria: 'finanzas' },
    { clave: 'currency', valor: 'USD', tipo: 'texto', categoria: 'finanzas' },
    { clave: 'themeMode', valor: 'light', tipo: 'texto', categoria: 'apariencia' },
    { clave: 'allowZeroStock', valor: 'false', tipo: 'booleano', categoria: 'ventas' },
    { clave: 'enableDiscount', valor: 'false', tipo: 'booleano', categoria: 'ventas' },
    { clave: 'maxDiscountPct', valor: '20', tipo: 'numero', categoria: 'ventas' },
    { clave: 'ticketPaperWidth', valor: '58mm', tipo: 'texto', categoria: 'impresion' },
    { clave: 'ticketFontSize', valor: '8', tipo: 'numero', categoria: 'impresion' },
  ];

  const stmts = defaultSettings.map(s =>
    c.env.DB.prepare(
      'INSERT INTO tenant_settings (tenant_id, clave, valor, tipo, categoria) VALUES (?, ?, ?, ?, ?)'
    ).bind(tenantId, s.clave, s.valor, s.tipo, s.categoria)
  );
  await c.env.DB.batch(stmts);

  // Crear admin del tenant si se proporcionó
  if (body.admin_username && body.admin_password) {
    const salt = await generateSalt();
    const hash = await hashPassword(body.admin_password, salt);
    await c.env.DB.prepare(
      'INSERT INTO tenant_admins (tenant_id, username, password_hash, salt, name, role) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(
      tenantId, body.admin_username.trim(), hash, salt,
      body.admin_name || body.admin_username.trim(), 'admin'
    ).run();
  }

  await logActivity(c.env.DB, {
    adminId: jwt.adminId,
    adminUsername: jwt.username,
    action: 'CREATE_TENANT',
    entityType: 'tenant',
    entityId: tenantId,
    details: { name: body.name, slug, plan: body.plan || 'trial', cfError },
    ip: c.req.header('CF-Connecting-IP') || '',
  });

  // Actualizar URLs
  const loginUrl = `https://${pagesName}.pages.dev`;
  await c.env.DB.prepare(
    'UPDATE tenants SET login_url = ?, worker_domain = ?, pages_domain = ? WHERE id = ?'
  ).bind(loginUrl, `https://${workerName}.workers.dev`, loginUrl, tenantId).run();

  const tenant = await c.env.DB.prepare('SELECT * FROM tenants WHERE id = ?').bind(tenantId).first();

  return c.json({
    success: true,
    message: cfError ? `Negocio creado con advertencias: ${cfError}` : 'Negocio creado exitosamente',
    tenant,
    warnings: cfError || undefined,
  }, 201);
});

// ============================================================
// PUT /api/tenants/:id — Actualizar tenant
// ============================================================
app.put('/:id', async (c) => {
  const jwt = c.get('jwt');
  const { id } = c.req.param();
  const body = await c.req.json<Partial<{
    name: string; description: string; logo: string; favicon: string;
    primary_color: string; accent_color: string; plan: string;
    owner_name: string; owner_email: string; owner_phone: string;
    country: string; currency: string; timezone: string;
    status: string; max_products: number; max_users: number; max_daily_sales: number;
    plan_expires_at: string;
  }>>();

  const existing = await c.env.DB.prepare('SELECT id FROM tenants WHERE id = ?').bind(id).first();
  if (!existing) return c.json({ error: 'Negocio no encontrado' }, 404);

  const fields: string[] = [];
  const binds: any[] = [];

  for (const [key, value] of Object.entries(body)) {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      binds.push(value);
    }
  }
  if (fields.length === 0) return c.json({ error: 'No hay campos para actualizar' }, 400);

  fields.push("updated_at = datetime('now')");
  binds.push(id);

  await c.env.DB.prepare(`UPDATE tenants SET ${fields.join(', ')} WHERE id = ?`).bind(...binds).run();

  await logActivity(c.env.DB, {
    adminId: jwt.adminId,
    adminUsername: jwt.username,
    action: 'UPDATE_TENANT',
    entityType: 'tenant',
    entityId: id,
    details: body,
    ip: c.req.header('CF-Connecting-IP') || '',
  });

  const tenant = await c.env.DB.prepare('SELECT * FROM tenants WHERE id = ?').bind(id).first();
  return c.json({ success: true, tenant });
});

// ============================================================
// DELETE /api/tenants/:id — Eliminar tenant
// ============================================================
app.delete('/:id', async (c) => {
  const jwt = c.get('jwt');
  const { id } = c.req.param();

  const tenant = await c.env.DB.prepare('SELECT * FROM tenants WHERE id = ?').bind(id).first<any>();
  if (!tenant) return c.json({ error: 'Negocio no encontrado' }, 404);

  // Eliminar recursos Cloudflare (mejor esfuerzo)
  const errors: string[] = [];
  if (tenant.d1_database_id) {
    try { await (await import('../lib/cloudflare-api')).deleteD1Database(c.env, tenant.d1_database_id); } catch (e: any) { errors.push(e.message); }
  }
  if (tenant.kv_namespace_id) {
    try { await (await import('../lib/cloudflare-api')).deleteKVNamespace(c.env, tenant.kv_namespace_id); } catch (e: any) { errors.push(e.message); }
  }

  // Eliminar de BD (CASCADE elimina settings y admins)
  await c.env.DB.prepare('DELETE FROM tenants WHERE id = ?').bind(id).run();

  await logActivity(c.env.DB, {
    adminId: jwt.adminId,
    adminUsername: jwt.username,
    action: 'DELETE_TENANT',
    entityType: 'tenant',
    entityId: id,
    details: { name: tenant.name, slug: tenant.slug, errors },
    ip: c.req.header('CF-Connecting-IP') || '',
  });

  return c.json({
    success: true,
    message: errors.length ? `Negocio eliminado. Advertencias: ${errors.join(' | ')}` : 'Negocio eliminado completamente',
  });
});

// ============================================================
// GET /api/tenants/:id/settings — Configuraciones del tenant
// ============================================================
app.get('/:id/settings', async (c) => {
  const { id } = c.req.param();
  const { categoria } = c.req.query();

  let query = 'SELECT * FROM tenant_settings WHERE tenant_id = ?';
  const binds: any[] = [id];
  if (categoria) { query += ' AND categoria = ?'; binds.push(categoria); }
  query += ' ORDER BY categoria, clave';

  const settings = await c.env.DB.prepare(query).bind(...binds).all();
  return c.json({ settings: settings.results });
});

// ============================================================
// PUT /api/tenants/:id/settings — Actualizar configuraciones
// ============================================================
app.put('/:id/settings', async (c) => {
  const jwt = c.get('jwt');
  const { id } = c.req.param();
  const body = await c.req.json<{ settings: Array<{ clave: string; valor: string; tipo?: string; categoria?: string }> }>();

  const tenant = await c.env.DB.prepare('SELECT id FROM tenants WHERE id = ?').bind(id).first();
  if (!tenant) return c.json({ error: 'Negocio no encontrado' }, 404);

  const stmts = body.settings.map(s =>
    c.env.DB.prepare(
      `INSERT INTO tenant_settings (tenant_id, clave, valor, tipo, categoria, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(tenant_id, clave) DO UPDATE SET valor = excluded.valor, tipo = COALESCE(?, tipo), categoria = COALESCE(?, categoria), updated_at = datetime('now')`
    ).bind(id, s.clave, s.valor, s.tipo || 'texto', s.categoria || 'general')
  );

  await c.env.DB.batch(stmts);

  await logActivity(c.env.DB, {
    adminId: jwt.adminId,
    adminUsername: jwt.username,
    action: 'UPDATE_TENANT_SETTINGS',
    entityType: 'tenant',
    entityId: id,
    details: { count: body.settings.length },
    ip: c.req.header('CF-Connecting-IP') || '',
  });

  return c.json({ success: true, message: `${body.settings.length} configuraciones actualizadas` });
});

// ============================================================
// POST /api/tenants/:id/admins — Crear admin del tenant
// ============================================================
app.post('/:id/admins', async (c) => {
  const jwt = c.get('jwt');
  const { id } = c.req.param();
  const body = await c.req.json<{ username: string; password: string; name?: string; email?: string; role?: string }>();

  if (!body.username || !body.password) {
    return c.json({ error: 'Usuario y contraseña requeridos' }, 400);
  }

  const existing = await c.env.DB.prepare(
    'SELECT id FROM tenant_admins WHERE tenant_id = ? AND username = ?'
  ).bind(id, body.username.trim()).first();
  if (existing) return c.json({ error: 'Ya existe un admin con ese usuario en este negocio' }, 409);

  const salt = await generateSalt();
  const hash = await hashPassword(body.password, salt);

  await c.env.DB.prepare(
    'INSERT INTO tenant_admins (tenant_id, username, password_hash, salt, name, email, role) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, body.username.trim(), hash, salt, body.name || '', body.email || '', body.role || 'admin').run();

  await logActivity(c.env.DB, {
    adminId: jwt.adminId,
    adminUsername: jwt.username,
    action: 'CREATE_TENANT_ADMIN',
    entityType: 'tenant_admin',
    entityId: id,
    details: { username: body.username },
    ip: c.req.header('CF-Connecting-IP') || '',
  });

  return c.json({ success: true, message: 'Admin creado exitosamente' }, 201);
});

// ============================================================
// GET /api/tenants/:id/activity — Historial de actividad
// ============================================================
app.get('/:id/activity', async (c) => {
  const { id } = c.req.param();
  const { limit = '20', offset = '0' } = c.req.query();

  const logs = await c.env.DB.prepare(
    `SELECT * FROM activity_log
     WHERE (entity_type = 'tenant' AND entity_id = ?)
        OR details LIKE ?
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`
  ).bind(id, `"${id}"`, parseInt(limit), parseInt(offset)).all();

  return c.json({ activity: logs.results });
});

export default app;