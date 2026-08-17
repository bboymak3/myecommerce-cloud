import { createMiddleware } from 'hono/factory';
import { verifyJWT } from '../lib/auth';
import type { Env, JwtPayload } from '../types';

export const authMiddleware = createMiddleware<{ Bindings: Env; Variables: { jwt: JwtPayload } }>(
  async (c, next) => {
    const authHeader = c.req.header('Authorization');
    const queryToken = new URL(c.req.url).searchParams.get('token');
    const token = authHeader?.replace('Bearer ', '') || queryToken;

    if (!token) {
      return c.json({ error: 'Token requerido' }, 401);
    }

    const secret = c.env.JWT_SECRET || 'myecommerce-admin-secret-change-me';
    const payload = await verifyJWT(token, secret) as JwtPayload | null;

    if (!payload || payload.role !== 'super_admin') {
      return c.json({ error: 'Token inválido o expirado' }, 401);
    }

    c.set('jwt', payload);
    await next();
  }
);
