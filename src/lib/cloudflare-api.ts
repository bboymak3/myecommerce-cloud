import type { Env } from '../types';

// ============================================================
// Crear recursos Cloudflare para un nuevo tenant
// Usando la Cloudflare API REST
// ============================================================

const CF_API = 'https://api.cloudflare.com/client/v4';

interface CfResponse<T> {
  success: boolean;
  result: T;
  errors: Array<{ code: number; message: string }>;
}

async function cfRequest<T>(env: Env, method: string, path: string, body?: object): Promise<T> {
  const token = env.CLOUDFLARE_API_TOKEN || '';
  const accountId = env.CLOUDFLARE_ACCOUNT_ID || '';
  const url = `${CF_API}/accounts/${accountId}${path}`;
  
  const opts: RequestInit = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
  if (body) opts.body = JSON.stringify(body);
  
  const res = await fetch(url, opts);
  const data: CfResponse<T> = await res.json();
  if (!data.success) {
    throw new Error(`CF API Error: ${data.errors.map(e => e.message).join(', ')}`);
  }
  return data.result;
}

export async function createD1Database(env: Env, name: string) {
  return cfRequest<{ uuid: string; name: string }>(env, 'POST', '/d1/database', { name });
}

export async function createKVNamespace(env: Env, title: string) {
  return cfRequest<{ id: string; title: string }>(env, 'POST', '/storage/kv/namespaces', { title });
}

export async function createPagesProject(env: Env, name: string, productionBranch = 'main') {
  return cfRequest<{ id: string; name: string; subdomain: string; domains: Array<{ name: string }> }>(
    env, 'POST', '/pages/projects', 
    { name, production_branch: productionBranch }
  );
}

export async function getWorkerSubdomain(env: Env): Promise<string> {
  const account = await cfRequest<{ id: string; name: string }>(env, 'GET', '');
  // Los workers usan workers.dev subdomain
  return 'workers.dev';
}

export async function deleteD1Database(env: Env, databaseId: string) {
  return cfRequest<null>(env, 'DELETE', `/d1/database/${databaseId}`);
}

export async function deleteKVNamespace(env: Env, namespaceId: string) {
  return cfRequest<null>(env, 'DELETE', `/storage/kv/namespaces/${namespaceId}`);
}