import { Hono } from 'hono';
import type { Env, JwtPayload } from '../types';
import { authMiddleware } from '../middleware/auth';

const app = new Hono<{ Bindings: Env; Variables: { jwt: JwtPayload } }>();

app.use('/*', authMiddleware);

// GET /api/activity — Historial general de actividad
app.get('/', async (c) => {
  const { limit = '50', offset = '0', action, entity_type } = c.req.query();

  let where = 'WHERE 1=1';
  const binds: any[] = [];

  if (action) { where += ' AND action = ?'; binds.push(action); }
  if (entity_type) { where += ' AND entity_type = ?'; binds.push(entity_type); }

  const total = await c.env.DB.prepare(`SELECT COUNT(*) as c FROM activity_log ${where}`).bind(...binds).first<{ c: number }>();

  const logs = await c.env.DB.prepare(
    `SELECT * FROM activity_log ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).bind(...binds, parseInt(limit), parseInt(offset)).all();

  return c.json({
    activity: logs.results,
    total: total?.c || 0,
  });
});

// GET /api/activity/stats — Estadísticas de actividad
app.get('/stats', async (c) => {
  const actions = await c.env.DB.prepare(
    'SELECT action, COUNT(*) as count FROM activity_log GROUP BY action ORDER BY count DESC LIMIT 20'
  ).all();

  const today = new Date().toISOString().split('T')[0];
  const todayCount = await c.env.DB.prepare(
    "SELECT COUNT(*) as c FROM activity_log WHERE created_at >= ?"
  ).bind(today).first<{ c: number }>();

  return c.json({
    byAction: actions.results,
    todayCount: todayCount?.c || 0,
  });
});

export default app;
