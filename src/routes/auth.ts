import { Hono } from 'hono';
import type { Env } from '../types';
import { hashPassword, verifyPassword, generateSalt, createJWT, initSuperAdmin } from '../lib/auth';
import { logActivity } from '../lib/logger';

const app = new Hono<{ Bindings: Env }>();

// POST /api/auth/login
app.post('/login', async (c) => {
  const { username, password } = await c.req.json<{ username: string; password: string }>();

  if (!username || !password) {
    return c.json({ error: 'Usuario y contraseña requeridos' }, 400);
  }

  // Asegurar que el super admin tiene contraseña real
  await initSuperAdmin(c.env.DB, 'admin123');

  const admin = await c.env.DB.prepare(
    'SELECT id, username, password_hash, salt, name, is_active FROM super_admins WHERE username = ?'
  ).bind(username).first<{ id: string; username: string; password_hash: string; salt: string; name: string; is_active: number }>();

  if (!admin) {
    return c.json({ error: 'Credenciales inválidas' }, 401);
  }

  if (!admin.is_active) {
    return c.json({ error: 'Cuenta desactivada' }, 403);
  }

  const valid = await verifyPassword(password, admin.salt, admin.password_hash);
  if (!valid) {
    return c.json({ error: 'Credenciales inválidas' }, 401);
  }

  const secret = c.env.JWT_SECRET || 'myecommerce-admin-secret-change-me';
  const token = await createJWT(
    { adminId: admin.id, username: admin.username, name: admin.name, role: 'super_admin' },
    secret,
    86400000 // 24h
  );

  // Actualizar último login
  await c.env.DB.prepare('UPDATE super_admins SET last_login = datetime(\'now\') WHERE id = ?').bind(admin.id).run();

  // Guardar sesión
  await c.env.DB.prepare(
    'INSERT INTO admin_sessions (admin_id, token, user_agent, ip_address, expires_at) VALUES (?, ?, ?, ?, datetime(\'now\', \'24 hours\'))'
  ).bind(admin.id, token, c.req.header('User-Agent') || '', c.req.header('CF-Connecting-IP') || '').run();

  await logActivity(c.env.DB, {
    adminId: admin.id,
    adminUsername: admin.username,
    action: 'LOGIN',
    ip: c.req.header('CF-Connecting-IP') || '',
  });

  return c.json({
    token,
    admin: { id: admin.id, username: admin.username, name: admin.name },
  });
});

// POST /api/auth/change-password
app.post('/change-password', async (c) => {
  const secret = c.env.JWT_SECRET || 'myecommerce-admin-secret-change-me';
  // Simplificado - se puede agregar el middleware JWT si se desea
  const authHeader = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!authHeader) return c.json({ error: 'Token requerido' }, 401);

  const { verifyJWT } = await import('../lib/auth');
  const payload = await verifyJWT(authHeader, secret);
  if (!payload) return c.json({ error: 'Token inválido' }, 401);

  const { currentPassword, newPassword } = await c.req.json<{ currentPassword: string; newPassword: string }>();

  const admin = await c.env.DB.prepare(
    'SELECT id, password_hash, salt, username FROM super_admins WHERE id = ?'
  ).bind(payload.adminId).first<{ id: string; password_hash: string; salt: string; username: string }>();

  if (!admin) return c.json({ error: 'Admin no encontrado' }, 404);

  const valid = await verifyPassword(currentPassword, admin.salt, admin.password_hash);
  if (!valid) return c.json({ error: 'Contraseña actual incorrecta' }, 400);

  const salt = await generateSalt();
  const hash = await hashPassword(newPassword, salt);
  await c.env.DB.prepare('UPDATE super_admins SET password_hash = ?, salt = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .bind(hash, salt, admin.id).run();

  await logActivity(c.env.DB, {
    adminId: admin.id,
    adminUsername: admin.username,
    action: 'CHANGE_PASSWORD',
    ip: c.req.header('CF-Connecting-IP') || '',
  });

  return c.json({ success: true, message: 'Contraseña actualizada' });
});

// POST /api/auth/logout
app.post('/logout', async (c) => {
  const authHeader = c.req.header('Authorization')?.replace('Bearer ', '');
  if (authHeader) {
    await c.env.DB.prepare('DELETE FROM admin_sessions WHERE token = ?').bind(authHeader).run();
  }
  return c.json({ success: true });
});

export default app;