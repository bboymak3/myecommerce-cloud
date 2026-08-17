import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';
import { initSuperAdmin } from './lib/auth';
import authRoutes from './routes/auth';
import tenantRoutes from './routes/tenants';
import activityRoutes from './routes/activity';

const app = new Hono<{ Bindings: Env }>();

// ============================================================
// Middleware global
// ============================================================
app.use('*', cors({
  origin: ['http://localhost:8787', 'https://myecommerce-admin.pages.dev'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ============================================================
// API Routes
// ============================================================
app.route('/api/auth', authRoutes);
app.route('/api/tenants', tenantRoutes);
app.route('/api/activity', activityRoutes);

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ============================================================
// Servir el frontend estático (desde /public o el HTML inline)
// ============================================================
app.get('*', async (c) => {
  // Intentar servir archivo estático primero
  const path = new URL(c.req.url).pathname;
  
  // Si es la raíz o una ruta de SPA, servir el HTML principal
  if (path === '/' || path.startsWith('/admin') || !path.includes('.')) {
    return c.html(getAdminHTML());
  }
  
  // Para archivos estáticos (iconos, manifest, etc.)
  try {
    const file = await c.env.DB?.prepare('SELECT 1').first(); // solo check DB works
  } catch {}
  
  return c.notFound();
});

// ============================================================
// Inicialización al arrancar el Worker
// ============================================================
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Inicializar super admin en cada cold start
    ctx.waitUntil(initSuperAdmin(env.DB, 'admin123'));
    return app.fetch(request, env, ctx);
  },
};

// ============================================================
// HTML del Panel de Administración (inline)
// ============================================================
function getAdminHTML(): string {
  return `<!DOCTYPE html>
<html lang="es" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MyeCommerce Cloud - Admin</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏪</text></svg>">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: { 50:'#eef2ff',100:'#e0e7ff',200:'#c7d2fe',300:'#a5b4fc',400:'#818cf8',500:'#6366f1',600:'#4f46e5',700:'#4338ca',800:'#3730a3',900:'#312e81' }
          }
        }
      }
    }
  </script>
  <style>
    * { scrollbar-width: thin; scrollbar-color: #4f46e5 transparent; }
    .fade-in { animation: fadeIn 0.3s ease-in; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .card-hover { transition: all 0.2s; }
    .card-hover:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,0,0,0.15); }
    .status-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
    .status-activo { background: #22c55e; box-shadow: 0 0 6px #22c55e; }
    .status-suspendido { background: #f59e0b; box-shadow: 0 0 6px #f59e0b; }
    .status-cancelado { background: #ef4444; box-shadow: 0 0 6px #ef4444; }
    .plan-trial { background: linear-gradient(135deg, #6366f1, #8b5cf6); }
    .plan-basico { background: linear-gradient(135deg, #06b6d4, #3b82f6); }
    .plan-profesional { background: linear-gradient(135deg, #f59e0b, #ef4444); }
    .plan-empresarial { background: linear-gradient(135deg, #f59e0b, #22c55e); }
    .modal-overlay { background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); }
  </style>
</head>
<body class="bg-gray-950 text-gray-100 min-h-screen">

  <!-- ====== PANTALLA DE LOGIN ====== -->
  <div id="loginScreen" class="min-h-screen flex items-center justify-center p-4">
    <div class="w-full max-w-md fade-in">
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-brand-600 mb-4 shadow-lg shadow-brand-600/30">
          <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
        </div>
        <h1 class="text-3xl font-bold text-white">MyeCommerce <span class="text-brand-400">Cloud</span></h1>
        <p class="text-gray-400 mt-2">Panel de Administración Multi-Negocio</p>
      </div>
      <div class="bg-gray-900 rounded-2xl p-8 border border-gray-800 shadow-xl">
        <div id="loginError" class="hidden mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm"></div>
        <div class="space-y-5">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Usuario</label>
            <input id="loginUser" type="text" value="superadmin" placeholder="Ingresa tu usuario"
              class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Contraseña</label>
            <input id="loginPass" type="password" placeholder="Ingresa tu contraseña"
              class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
              onkeydown="if(event.key==='Enter')doLogin()">
          </div>
          <button onclick="doLogin()" id="loginBtn"
            class="w-full py-3 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl transition shadow-lg shadow-brand-600/20">
            Iniciar Sesión
          </button>
        </div>
        <p class="text-center text-xs text-gray-600 mt-6">v1.0.0 · Cloudflare Workers</p>
      </div>
    </div>
  </div>

  <!-- ====== PANEL PRINCIPAL ====== -->
  <div id="mainPanel" class="hidden min-h-screen">
    <!-- Top Bar -->
    <header class="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-xl border-b border-gray-800">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
          </div>
          <span class="text-lg font-bold text-white">MyeCommerce <span class="text-brand-400">Cloud</span></span>
        </div>
        <div class="flex items-center gap-4">
          <span id="adminName" class="text-sm text-gray-400 hidden sm:block"></span>
          <button onclick="doLogout()" class="px-4 py-2 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition">Salir</button>
        </div>
      </div>
    </header>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Stats Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8" id="statsCards">
        <div class="bg-gray-900 rounded-2xl p-5 border border-gray-800 card-hover">
          <p class="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Negocios</p>
          <p class="text-3xl font-bold text-white" id="statTotal">0</p>
        </div>
        <div class="bg-gray-900 rounded-2xl p-5 border border-gray-800 card-hover">
          <p class="text-xs text-gray-500 uppercase tracking-wider mb-1">Activos</p>
          <p class="text-3xl font-bold text-green-400" id="statActive">0</p>
        </div>
        <div class="bg-gray-900 rounded-2xl p-5 border border-gray-800 card-hover">
          <p class="text-xs text-gray-500 uppercase tracking-wider mb-1">En Prueba</p>
          <p class="text-3xl font-bold text-purple-400" id="statTrial">0</p>
        </div>
        <div class="bg-gray-900 rounded-2xl p-5 border border-gray-800 card-hover">
          <p class="text-xs text-gray-500 uppercase tracking-wider mb-1">Ventas Totales</p>
          <p class="text-3xl font-bold text-cyan-400" id="statSales">0</p>
        </div>
      </div>

      <!-- Actions Bar -->
      <div class="flex flex-col sm:flex-row gap-4 mb-6">
        <div class="flex-1 relative">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input id="searchInput" type="text" placeholder="Buscar negocios..." oninput="loadTenants()"
            class="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition">
        </div>
        <select id="filterStatus" onchange="loadTenants()" class="px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-gray-300 focus:outline-none focus:border-brand-500">
          <option value="">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="suspendido">Suspendido</option>
          <option value="cancelado">Cancelado</option>
        </select>
        <select id="filterPlan" onchange="loadTenants()" class="px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-gray-300 focus:outline-none focus:border-brand-500">
          <option value="">Todos los planes</option>
          <option value="trial">Trial</option>
          <option value="basico">Básico</option>
          <option value="profesional">Profesional</option>
        </select>
        <button onclick="openCreateModal()"
          class="px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl transition shadow-lg shadow-brand-600/20 whitespace-nowrap">
          + Crear Negocio
        </button>
      </div>

      <!-- Tenants Table -->
      <div class="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-800/50">
              <tr>
                <th class="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Negocio</th>
                <th class="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Slug</th>
                <th class="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Plan</th>
                <th class="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Estado</th>
                <th class="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Dueño</th>
                <th class="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Creado</th>
                <th class="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody id="tenantsTable" class="divide-y divide-gray-800">
              <tr><td colspan="7" class="px-6 py-12 text-center text-gray-500">Cargando negocios...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <!-- ====== MODAL CREAR NEGOCIO ====== -->
  <div id="createModal" class="hidden fixed inset-0 z-[100] flex items-center justify-center p-4 modal-overlay">
    <div class="bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto fade-in">
      <div class="p-6 border-b border-gray-800 flex items-center justify-between">
        <h2 class="text-xl font-bold text-white">Crear Nuevo Negocio</h2>
        <button onclick="closeCreateModal()" class="text-gray-400 hover:text-white p-1">✕</button>
      </div>
      <div class="p-6 space-y-5">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1.5">Nombre del Negocio *</label>
            <input id="cName" type="text" placeholder="Mi Tienda"
              class="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1.5">Slug (URL)</label>
            <input id="cSlug" type="text" placeholder="mi-tienda (auto-generado)"
              class="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1.5">Plan</label>
            <select id="cPlan" class="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500">
              <option value="trial">Trial (30 días)</option>
              <option value="basico">Básico</option>
              <option value="profesional">Profesional</option>
              <option value="empresarial">Empresarial</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1.5">País</label>
            <select id="cCountry" class="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500">
              <option value="VE">Venezuela</option>
              <option value="CO">Colombia</option>
              <option value="PE">Perú</option>
              <option value="CL">Chile</option>
              <option value="MX">México</option>
              <option value="PA">Panamá</option>
              <option value="EC">Ecuador</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1.5">Descripción</label>
          <textarea id="cDesc" rows="2" placeholder="Descripción del negocio..."
            class="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500 resize-none"></textarea>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1.5">Nombre Dueño</label>
            <input id="cOwnerName" type="text" placeholder="Juan Pérez"
              class="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1.5">Email Dueño</label>
            <input id="cOwnerEmail" type="email" placeholder="juan@tienda.com"
              class="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1.5">Teléfono Dueño</label>
            <input id="cOwnerPhone" type="tel" placeholder="+58 412 1234567"
              class="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500">
          </div>
        </div>

        <!-- Colores -->
        <div class="grid grid-cols-2 gap-5">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1.5">Color Principal</label>
            <div class="flex gap-2 items-center">
              <input id="cColor" type="color" value="#6366f1" class="w-10 h-10 rounded cursor-pointer bg-transparent border-0">
              <span id="cColorLabel" class="text-sm text-gray-400 font-mono">#6366f1</span>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1.5">Color Acento</label>
            <div class="flex gap-2 items-center">
              <input id="cAccent" type="color" value="#06b6d4" class="w-10 h-10 rounded cursor-pointer bg-transparent border-0">
              <span id="cAccentLabel" class="text-sm text-gray-400 font-mono">#06b6d4</span>
            </div>
          </div>
        </div>

        <!-- Admin del negocio -->
        <div class="border-t border-gray-800 pt-5">
          <h3 class="text-sm font-semibold text-gray-300 mb-3">Administrador del Negocio</h3>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label class="block text-xs text-gray-400 mb-1">Usuario *</label>
              <input id="cAdminUser" type="text" placeholder="admin"
                class="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500">
            </div>
            <div>
              <label class="block text-xs text-gray-400 mb-1">Contraseña *</label>
              <input id="cAdminPass" type="password" placeholder="Contraseña"
                class="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500">
            </div>
            <div>
              <label class="block text-xs text-gray-400 mb-1">Nombre</label>
              <input id="cAdminName" type="text" placeholder="Nombre completo"
                class="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500">
            </div>
          </div>
        </div>
      </div>
      <div class="p-6 border-t border-gray-800 flex justify-end gap-3">
        <button onclick="closeCreateModal()" class="px-5 py-2.5 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition text-sm">Cancelar</button>
        <button onclick="createTenant()" id="createBtn"
          class="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-lg transition text-sm shadow-lg shadow-brand-600/20">
          Crear Negocio
        </button>
      </div>
    </div>
  </div>

  <!-- ====== MODAL DETALLE ====== -->
  <div id="detailModal" class="hidden fixed inset-0 z-[100] flex items-center justify-center p-4 modal-overlay">
    <div class="bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto fade-in">
      <div class="p-6 border-b border-gray-800 flex items-center justify-between">
        <h2 class="text-xl font-bold text-white" id="detailTitle">Detalle del Negocio</h2>
        <button onclick="closeDetailModal()" class="text-gray-400 hover:text-white p-1">✕</button>
      </div>
      <div id="detailContent" class="p-6"></div>
    </div>
  </div>

  <!-- ====== TOAST ====== -->
  <div id="toast" class="hidden fixed bottom-6 right-6 z-[200] px-5 py-3 rounded-xl text-white text-sm font-medium shadow-xl fade-in"></div>

  <script>
    // ====== STATE ======
    let TOKEN = localStorage.getItem('admin_token') || '';
    let ADMIN = JSON.parse(localStorage.getItem('admin_data') || 'null');

    // ====== INIT ======
    document.addEventListener('DOMContentLoaded', () => {
      document.getElementById('cColor').addEventListener('input', e => document.getElementById('cColorLabel').textContent = e.target.value);
      document.getElementById('cAccent').addEventListener('input', e => document.getElementById('cAccentLabel').textContent = e.target.value);
      if (TOKEN && ADMIN) {
        showPanel();
      }
    });

    // ====== API HELPER ======
    async function api(path, opts = {}) {
      const headers = { 'Content-Type': 'application/json' };
      if (TOKEN) headers['Authorization'] = 'Bearer ' + TOKEN;
      try {
        const res = await fetch('/api' + path, { ...opts, headers: { ...headers, ...opts.headers } });
        const data = await res.json();
        if (res.status === 401) { doLogout(); return null; }
        return { ok: res.ok, status: res.status, data };
      } catch(e) {
        showToast('Error de conexión', 'red');
        return null;
      }
    }

    // ====== AUTH ======
    async function doLogin() {
      const user = document.getElementById('loginUser').value.trim();
      const pass = document.getElementById('loginPass').value;
      const errEl = document.getElementById('loginError');
      const btn = document.getElementById('loginBtn');

      if (!user || !pass) { errEl.textContent = 'Completa todos los campos'; errEl.classList.remove('hidden'); return; }

      btn.textContent = 'Ingresando...'; btn.disabled = true;
      const r = await api('/auth/login', { method: 'POST', body: JSON.stringify({ username: user, password: pass }) });
      btn.textContent = 'Iniciar Sesión'; btn.disabled = false;

      if (!r || !r.ok) {
        errEl.textContent = r?.data?.error || 'Error al iniciar sesión';
        errEl.classList.remove('hidden'); return;
      }

      TOKEN = r.data.token;
      ADMIN = r.data.admin;
      localStorage.setItem('admin_token', TOKEN);
      localStorage.setItem('admin_data', JSON.stringify(ADMIN));
      errEl.classList.add('hidden');
      showPanel();
    }

    function doLogout() {
      if (TOKEN) api('/auth/logout', { method: 'POST' });
      TOKEN = ''; ADMIN = null;
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_data');
      document.getElementById('loginScreen').classList.remove('hidden');
      document.getElementById('mainPanel').classList.add('hidden');
    }

    function showPanel() {
      document.getElementById('loginScreen').classList.add('hidden');
      document.getElementById('mainPanel').classList.remove('hidden');
      document.getElementById('adminName').textContent = ADMIN?.name || '';
      loadStats();
      loadTenants();
    }

    // ====== STATS ======
    async function loadStats() {
      const r = await api('/tenants/stats');
      if (!r?.ok) return;
      const s = r.data;
      document.getElementById('statTotal').textContent = s.total;
      document.getElementById('statActive').textContent = s.active;
      document.getElementById('statTrial').textContent = s.trial;
      document.getElementById('statSales').textContent = (s.totalSales || 0).toLocaleString();
    }

    // ====== TENANTS LIST ======
    async function loadTenants() {
      const search = document.getElementById('searchInput').value;
      const status = document.getElementById('filterStatus').value;
      const plan = document.getElementById('filterPlan').value;
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      if (plan) params.set('plan', plan);
      params.set('limit', '50');

      const r = await api('/tenants?' + params.toString());
      if (!r?.ok) return;

      const { tenants } = r.data;
      const tbody = document.getElementById('tenantsTable');

      if (!tenants.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="px-6 py-12 text-center text-gray-500">No hay negocios. Crea el primero.</td></tr>';
        return;
      }

      tbody.innerHTML = tenants.map(t => \`
        <tr class="hover:bg-gray-800/50 transition">
          <td class="px-6 py-4">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm" style="background:\${t.primary_color || '#6366f1'}">
                \${(t.name || '?')[0].toUpperCase()}
              </div>
              <div>
                <p class="font-medium text-white">\${t.name}</p>
                <p class="text-xs text-gray-500">\${t.description?.substring(0, 40) || 'Sin descripción'}</p>
              </div>
            </div>
          </td>
          <td class="px-6 py-4"><code class="text-sm text-gray-400 bg-gray-800 px-2 py-1 rounded">\${t.slug}</code></td>
          <td class="px-6 py-4"><span class="plan-\${t.plan} text-xs font-semibold text-white px-2.5 py-1 rounded-full">\${t.plan}</span></td>
          <td class="px-6 py-4"><span class="status-\${t.status} status-dot"></span> <span class="text-sm text-gray-300 ml-1">\${t.status}</span></td>
          <td class="px-6 py-4">
            <p class="text-sm text-gray-300">\${t.owner_name || '-'}</p>
            <p class="text-xs text-gray-500">\${t.owner_email || ''}</p>
          </td>
          <td class="px-6 py-4 text-sm text-gray-400">\${formatDate(t.created_at)}</td>
          <td class="px-6 py-4">
            <div class="flex gap-2">
              <button onclick="viewTenant('\${t.id}')" class="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition" title="Ver detalle">👁</button>
              <button onclick="window.open('\${t.login_url || '#'}','_blank')" class="p-2 text-gray-400 hover:text-green-400 hover:bg-green-400/10 rounded-lg transition" title="Ir al login">🔗</button>
              \${t.login_url ? '' : ''}
            </div>
          </td>
        </tr>
      \`).join('');
    }

    // ====== CREATE TENANT ======
    function openCreateModal() { document.getElementById('createModal').classList.remove('hidden'); }
    function closeCreateModal() { document.getElementById('createModal').classList.add('hidden'); }

    async function createTenant() {
      const name = document.getElementById('cName').value.trim();
      if (!name) { showToast('El nombre es requerido', 'red'); return; }

      const btn = document.getElementById('createBtn');
      btn.textContent = 'Creando...'; btn.disabled = true;

      const body = {
        name,
        slug: document.getElementById('cSlug').value.trim() || undefined,
        description: document.getElementById('cDesc').value.trim(),
        plan: document.getElementById('cPlan').value,
        primary_color: document.getElementById('cColor').value,
        accent_color: document.getElementById('cAccent').value,
        country: document.getElementById('cCountry').value,
        owner_name: document.getElementById('cOwnerName').value.trim(),
        owner_email: document.getElementById('cOwnerEmail').value.trim(),
        owner_phone: document.getElementById('cOwnerPhone').value.trim(),
      };

      const adminUser = document.getElementById('cAdminUser').value.trim();
      const adminPass = document.getElementById('cAdminPass').value;
      if (adminUser && adminPass) {
        body.admin_username = adminUser;
        body.admin_password = adminPass;
        body.admin_name = document.getElementById('cAdminName').value.trim();
      }

      const r = await api('/tenants', { method: 'POST', body: JSON.stringify(body) });
      btn.textContent = 'Crear Negocio'; btn.disabled = false;

      if (!r?.ok) { showToast(r?.data?.error || 'Error al crear negocio', 'red'); return; }

      closeCreateModal();
      showToast(r.data.message || 'Negocio creado exitosamente', r.data.warnings ? 'yellow' : 'green');
      loadStats();
      loadTenants();

      // Limpiar formulario
      ['cName','cSlug','cDesc','cOwnerName','cOwnerEmail','cOwnerPhone','cAdminUser','cAdminPass','cAdminName'].forEach(id => document.getElementById(id).value = '');
      document.getElementById('cPlan').value = 'trial';
      document.getElementById('cCountry').value = 'VE';
    }

    // ====== VIEW TENANT DETAIL ======
    async function viewTenant(id) {
      const r = await api('/tenants/' + id);
      if (!r?.ok) return;

      const { tenant, settings, admins } = r.data;
      document.getElementById('detailTitle').textContent = tenant.name;

      let html = \`
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div class="bg-gray-800 rounded-xl p-4 text-center">
            <p class="text-2xl font-bold text-white">\${tenant.total_sales_count || 0}</p>
            <p class="text-xs text-gray-400">Ventas</p>
          </div>
          <div class="bg-gray-800 rounded-xl p-4 text-center">
            <p class="text-2xl font-bold text-green-400">$\${(tenant.total_revenue || 0).toFixed(2)}</p>
            <p class="text-xs text-gray-400">Ingresos</p>
          </div>
          <div class="bg-gray-800 rounded-xl p-4 text-center">
            <p class="text-2xl font-bold text-purple-400">\${(settings?.length || 0)}</p>
            <p class="text-xs text-gray-400">Configuraciones</p>
          </div>
          <div class="bg-gray-800 rounded-xl p-4 text-center">
            <p class="text-2xl font-bold text-cyan-400">\${(admins?.length || 0)}</p>
            <p class="text-xs text-gray-400">Admins</p>
          </div>
        </div>

        <div class="space-y-4">
          <div>
            <h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Información General</h3>
            <div class="bg-gray-800 rounded-xl p-4 grid grid-cols-2 gap-3 text-sm">
              <div><span class="text-gray-500">Slug:</span> <span class="text-white">\${tenant.slug}</span></div>
              <div><span class="text-gray-500">Plan:</span> <span class="plan-\${tenant.plan} text-white px-2 py-0.5 rounded-full text-xs">\${tenant.plan}</span></div>
              <div><span class="text-gray-500">País:</span> <span class="text-white">\${tenant.country}</span></div>
              <div><span class="text-gray-500">Moneda:</span> <span class="text-white">\${tenant.currency}</span></div>
              <div><span class="text-gray-500">Zona Horaria:</span> <span class="text-white">\${tenant.timezone}</span></div>
              <div><span class="text-gray-500">Estado:</span> <span class="status-\${tenant.status} status-dot"></span> <span class="text-white">\${tenant.status}</span></div>
            </div>
          </div>

          <div>
            <h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Recursos Cloudflare</h3>
            <div class="bg-gray-800 rounded-xl p-4 space-y-2 text-sm font-mono">
              <div><span class="text-gray-500">D1 DB:</span> <span class="text-cyan-400">\${tenant.d1_database_name}</span> <span class="text-gray-600">(\${tenant.d1_database_id?.substring(0,12)}...)</span></div>
              <div><span class="text-gray-500">R2 Bucket:</span> <span class="text-amber-400">\${tenant.r2_bucket_name}</span></div>
              <div><span class="text-gray-500">KV NS:</span> <span class="text-green-400">\${tenant.kv_namespace_id?.substring(0,12) || 'Pendiente'}...</span></div>
              <div><span class="text-gray-500">Worker:</span> <span class="text-purple-400">\${tenant.worker_name}</span></div>
              <div><span class="text-gray-500">Pages:</span> <span class="text-blue-400">\${tenant.pages_project_name}</span></div>
              \${tenant.login_url ? \`<div><span class="text-gray-500">Login URL:</span> <a href="\${tenant.login_url}" target="_blank" class="text-brand-400 hover:underline">\${tenant.login_url}</a></div>\` : ''}
            </div>
          </div>

          \${admins?.length ? \`
          <div>
            <h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Administradores</h3>
            <div class="space-y-2">
              \${admins.map(a => \`
                <div class="bg-gray-800 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p class="text-white font-medium">\${a.name || a.username}</p>
                    <p class="text-xs text-gray-500">\${a.username} · \${a.role} · \${a.is_active ? '🟢 Activo' : '🔴 Inactivo'}</p>
                  </div>
                  <span class="text-xs text-gray-600">\${formatDate(a.created_at)}</span>
                </div>
              \`).join('')}
            </div>
          </div>
          \` : ''}

          \${settings?.length ? \`
          <div>
            <h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Configuraciones del Negocio</h3>
            <div class="bg-gray-800 rounded-xl p-4">
              <div class="space-y-2 max-h-60 overflow-y-auto">
                \${settings.map(s => \`
                  <div class="flex items-center justify-between py-1 border-b border-gray-700/50 last:border-0">
                    <span class="text-sm text-gray-400">\${s.clave}</span>
                    <span class="text-sm text-white font-mono">\${s.valor}</span>
                  </div>
                \`).join('')}
              </div>
            </div>
          </div>
          \` : ''}
        </div>
      \`;

      document.getElementById('detailContent').innerHTML = html;
      document.getElementById('detailModal').classList.remove('hidden');
    }

    function closeDetailModal() { document.getElementById('detailModal').classList.add('hidden'); }

    // ====== UTILS ======
    function formatDate(d) {
      if (!d) return '-';
      try { return new Date(d).toLocaleDateString('es-VE', { day:'2-digit', month:'short', year:'numeric' }); } catch { return d; }
    }

    function showToast(msg, color = 'green') {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.style.background = color === 'red' ? '#dc2626' : color === 'yellow' ? '#d97706' : '#16a34a';
      t.classList.remove('hidden');
      setTimeout(() => t.classList.add('hidden'), 4000);
    }

    // Close modals on overlay click
    document.getElementById('createModal')?.addEventListener('click', e => { if (e.target === e.currentTarget) closeCreateModal(); });
    document.getElementById('detailModal')?.addEventListener('click', e => { if (e.target === e.currentTarget) closeDetailModal(); });
  </script>
</body>
</html>`;
}
