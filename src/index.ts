import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';
import { initSuperAdmin } from './lib/auth';
import authRoutes from './routes/auth';
import tenantRoutes from './routes/tenants';
import activityRoutes from './routes/activity';

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors({
  origin: ['http://localhost:8787', 'https://myecommerce-admin.sismtema.workers.dev', 'https://myecommerce-admin.pages.dev'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.route('/api/auth', authRoutes);
app.route('/api/tenants', tenantRoutes);
app.route('/api/activity', activityRoutes);

app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.get('*', async (c) => {
  const path = new URL(c.req.url).pathname;
  if (path === '/' || path.startsWith('/admin') || !path.includes('.')) {
    return c.html(getAdminHTML());
  }
  return c.notFound();
});

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    ctx.waitUntil(initSuperAdmin(env.DB, 'admin123'));
    return app.fetch(request, env, ctx);
  },
};

function getAdminHTML(): string {
  return `<!DOCTYPE html>
<html lang="es" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MyeCommerce Cloud - Super Admin</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>&#127978;</text></svg>">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config={darkMode:'class',theme:{extend:{colors:{brand:{50:'#eef2ff',100:'#e0e7ff',200:'#c7d2fe',300:'#a5b4fc',400:'#818cf8',500:'#6366f1',600:'#4f46e5',700:'#4338ca',800:'#3730a3',900:'#312e81'}}}}}
  </script>
  <style>
    *{scrollbar-width:thin;scrollbar-color:#4f46e5 transparent}
    .fade-in{animation:fadeIn .3s ease-in}
    @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    .card-hover{transition:all .2s}.card-hover:hover{transform:translateY(-2px);box-shadow:0 8px 25px rgba(0,0,0,.15)}
    .sdot{width:8px;height:8px;border-radius:50%;display:inline-block}
    .s-activo{background:#22c55e;box-shadow:0 0 6px #22c55e}
    .s-suspendido{background:#f59e0b;box-shadow:0 0 6px #f59e0b}
    .s-cancelado{background:#ef4444;box-shadow:0 0 6px #ef4444}
    .p-trial{background:linear-gradient(135deg,#6366f1,#8b5cf6)}
    .p-basico{background:linear-gradient(135deg,#06b6d4,#3b82f6)}
    .p-profesional{background:linear-gradient(135deg,#f59e0b,#ef4444)}
    .p-empresarial{background:linear-gradient(135deg,#f59e0b,#22c55e)}
    .modal-bg{background:rgba(0,0,0,.6);backdrop-filter:blur(4px)}
    .tab-active{border-bottom:2px solid #6366f1;color:#fff}
    .tab-inactive{border-bottom:2px solid transparent;color:#9ca3af}
    .tab-inactive:hover{color:#d1d5db}
  </style>
</head>
<body class="bg-gray-950 text-gray-100 min-h-screen">

<!-- LOGIN -->
<div id="loginScreen" class="min-h-screen flex items-center justify-center p-4">
  <div class="w-full max-w-md fade-in">
    <div class="text-center mb-8">
      <div class="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-brand-600 mb-4 shadow-lg shadow-brand-600/30">
        <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
      </div>
      <h1 class="text-3xl font-bold text-white">MyeCommerce <span class="text-brand-400">Cloud</span></h1>
      <p class="text-gray-400 mt-2">Panel de Administracion Multi-Negocio</p>
    </div>
    <div class="bg-gray-900 rounded-2xl p-8 border border-gray-800 shadow-xl">
      <div id="loginError" class="hidden mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm"></div>
      <div class="space-y-5">
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Usuario</label>
          <input id="loginUser" type="text" value="superadmin" placeholder="Usuario"
            class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Contrasena</label>
          <input id="loginPass" type="password" placeholder="Contrasena"
            class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
            onkeydown="if(event.key==='Enter')doLogin()">
        </div>
        <button onclick="doLogin()" id="loginBtn" class="w-full py-3 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl transition shadow-lg shadow-brand-600/20">Iniciar Sesion</button>
      </div>
      <p class="text-center text-xs text-gray-600 mt-6">v1.0.0 &middot; Cloudflare Workers + D1 + KV</p>
    </div>
  </div>
</div>

<!-- MAIN PANEL -->
<div id="mainPanel" class="hidden min-h-screen">
  <header class="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-xl border-b border-gray-800">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
        </div>
        <span class="text-lg font-bold text-white">MyeCommerce <span class="text-brand-400">Cloud</span></span>
      </div>
      <div class="flex items-center gap-3">
        <button onclick="showSection('activity')" class="px-3 py-2 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition" title="Activity Log">
          <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>Log
        </button>
        <button onclick="showPasswordModal()" class="px-3 py-2 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition" title="Cambiar contrasena">
          <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
        </button>
        <span id="adminName" class="text-sm text-gray-400 hidden sm:block"></span>
        <button onclick="doLogout()" class="px-4 py-2 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition">Salir</button>
      </div>
    </div>
  </header>

  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- SECTION: Dashboard -->
    <div id="sectionDashboard">
      <div class="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div class="bg-gray-900 rounded-2xl p-5 border border-gray-800 card-hover">
          <p class="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Negocios</p>
          <p class="text-3xl font-bold text-white" id="statTotal">0</p>
        </div>
        <div class="bg-gray-900 rounded-2xl p-5 border border-gray-800 card-hover">
          <p class="text-xs text-gray-500 uppercase tracking-wider mb-1">Activos</p>
          <p class="text-3xl font-bold text-green-400" id="statActive">0</p>
        </div>
        <div class="bg-gray-900 rounded-2xl p-5 border border-gray-800 card-hover">
          <p class="text-xs text-gray-500 uppercase tracking-wider mb-1">Trial</p>
          <p class="text-3xl font-bold text-purple-400" id="statTrial">0</p>
        </div>
        <div class="bg-gray-900 rounded-2xl p-5 border border-gray-800 card-hover">
          <p class="text-xs text-gray-500 uppercase tracking-wider mb-1">Suspendidos</p>
          <p class="text-3xl font-bold text-amber-400" id="statSuspended">0</p>
        </div>
        <div class="bg-gray-900 rounded-2xl p-5 border border-gray-800 card-hover">
          <p class="text-xs text-gray-500 uppercase tracking-wider mb-1">Ventas Totales</p>
          <p class="text-3xl font-bold text-cyan-400" id="statSales">0</p>
        </div>
      </div>

      <div class="flex flex-col sm:flex-row gap-4 mb-6">
        <div class="flex-1 relative">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input id="searchInput" type="text" placeholder="Buscar negocios por nombre, slug o email..." oninput="loadTenants()"
            class="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition">
        </div>
        <select id="filterStatus" onchange="loadTenants()" class="px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-gray-300 focus:outline-none focus:border-brand-500">
          <option value="">Todos los estados</option><option value="activo">Activo</option><option value="suspendido">Suspendido</option><option value="cancelado">Cancelado</option>
        </select>
        <select id="filterPlan" onchange="loadTenants()" class="px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-gray-300 focus:outline-none focus:border-brand-500">
          <option value="">Todos los planes</option><option value="trial">Trial</option><option value="basico">Basico</option><option value="profesional">Profesional</option><option value="empresarial">Empresarial</option>
        </select>
        <button onclick="openCreateModal()" class="px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl transition shadow-lg shadow-brand-600/20 whitespace-nowrap">+ Crear Negocio</button>
      </div>

      <div class="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-800/50">
              <tr>
                <th class="text-left px-5 py-3.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Negocio</th>
                <th class="text-left px-5 py-3.5 text-xs font-medium text-gray-400 uppercase tracking-wider hidden md:table-cell">Slug</th>
                <th class="text-left px-5 py-3.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Plan</th>
                <th class="text-left px-5 py-3.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Estado</th>
                <th class="text-left px-5 py-3.5 text-xs font-medium text-gray-400 uppercase tracking-wider hidden lg:table-cell">Dueno</th>
                <th class="text-left px-5 py-3.5 text-xs font-medium text-gray-400 uppercase tracking-wider hidden sm:table-cell">Creado</th>
                <th class="text-left px-5 py-3.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody id="tenantsTable" class="divide-y divide-gray-800"></tbody>
          </table>
        </div>
        <div id="pagination" class="px-5 py-3 border-t border-gray-800 flex items-center justify-between text-sm text-gray-400"></div>
      </div>
    </div>

    <!-- SECTION: Activity Log -->
    <div id="sectionActivity" class="hidden fade-in">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-2xl font-bold text-white">Historial de Actividad</h2>
          <p class="text-gray-400 text-sm mt-1">Registro de todas las acciones del sistema</p>
        </div>
        <div class="flex gap-2">
          <select id="activityFilter" onchange="loadActivity()" class="px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-gray-300 text-sm focus:outline-none focus:border-brand-500">
            <option value="">Todas las acciones</option>
            <option value="LOGIN">Login</option><option value="CREATE_TENANT">Crear Negocio</option>
            <option value="UPDATE_TENANT">Actualizar Negocio</option><option value="DELETE_TENANT">Eliminar Negocio</option>
            <option value="CREATE_TENANT_ADMIN">Crear Admin</option><option value="UPDATE_TENANT_SETTINGS">Actualizar Config</option>
            <option value="CHANGE_PASSWORD">Cambiar Clave</option>
          </select>
          <button onclick="showSection('dashboard')" class="px-4 py-2 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition">Volver</button>
        </div>
      </div>
      <div class="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-800/50">
              <tr>
                <th class="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase">Fecha</th>
                <th class="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase">Admin</th>
                <th class="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase">Accion</th>
                <th class="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase hidden md:table-cell">Detalle</th>
                <th class="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase hidden lg:table-cell">IP</th>
              </tr>
            </thead>
            <tbody id="activityTable" class="divide-y divide-gray-800"></tbody>
          </table>
        </div>
      </div>
    </div>
  </main>
</div>

<!-- MODAL: Crear Negocio -->
<div id="createModal" class="hidden fixed inset-0 z-[100] flex items-center justify-center p-4 modal-bg">
  <div class="bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto fade-in">
    <div class="p-6 border-b border-gray-800 flex items-center justify-between">
      <h2 class="text-xl font-bold text-white">Crear Nuevo Negocio</h2>
      <button onclick="closeModal('createModal')" class="text-gray-400 hover:text-white text-xl">&times;</button>
    </div>
    <div class="p-6 space-y-5">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div><label class="block text-sm font-medium text-gray-300 mb-1.5">Nombre del Negocio *</label><input id="cName" type="text" placeholder="Mi Tienda" class="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500"></div>
        <div><label class="block text-sm font-medium text-gray-300 mb-1.5">Slug (URL)</label><input id="cSlug" type="text" placeholder="mi-tienda" class="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500"></div>
        <div><label class="block text-sm font-medium text-gray-300 mb-1.5">Plan</label><select id="cPlan" class="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500"><option value="trial">Trial (30 dias)</option><option value="basico">Basico</option><option value="profesional">Profesional</option><option value="empresarial">Empresarial</option></select></div>
        <div><label class="block text-sm font-medium text-gray-300 mb-1.5">Pais</label><select id="cCountry" class="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500"><option value="VE">Venezuela</option><option value="CO">Colombia</option><option value="PE">Peru</option><option value="CL">Chile</option><option value="MX">Mexico</option><option value="PA">Panama</option><option value="EC">Ecuador</option></select></div>
      </div>
      <div><label class="block text-sm font-medium text-gray-300 mb-1.5">Descripcion</label><textarea id="cDesc" rows="2" placeholder="Descripcion del negocio..." class="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500 resize-none"></textarea></div>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div><label class="block text-sm font-medium text-gray-300 mb-1.5">Nombre Dueno</label><input id="cOwnerName" type="text" placeholder="Juan Perez" class="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500"></div>
        <div><label class="block text-sm font-medium text-gray-300 mb-1.5">Email Dueno</label><input id="cOwnerEmail" type="email" placeholder="juan@tienda.com" class="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500"></div>
        <div><label class="block text-sm font-medium text-gray-300 mb-1.5">Telefono Dueno</label><input id="cOwnerPhone" type="tel" placeholder="+58 412 1234567" class="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500"></div>
      </div>
      <div class="grid grid-cols-2 gap-5">
        <div><label class="block text-sm font-medium text-gray-300 mb-1.5">Color Principal</label><div class="flex gap-2 items-center"><input id="cColor" type="color" value="#6366f1" class="w-10 h-10 rounded cursor-pointer bg-transparent border-0" oninput="document.getElementById('cColorLbl').textContent=this.value"><span id="cColorLbl" class="text-sm text-gray-400 font-mono">#6366f1</span></div></div>
        <div><label class="block text-sm font-medium text-gray-300 mb-1.5">Color Acento</label><div class="flex gap-2 items-center"><input id="cAccent" type="color" value="#06b6d4" class="w-10 h-10 rounded cursor-pointer bg-transparent border-0" oninput="document.getElementById('cAccentLbl').textContent=this.value"><span id="cAccentLbl" class="text-sm text-gray-400 font-mono">#06b6d4</span></div></div>
      </div>
      <div class="border-t border-gray-800 pt-5">
        <h3 class="text-sm font-semibold text-gray-300 mb-3">Administrador del Negocio</h3>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div><label class="block text-xs text-gray-400 mb-1">Usuario *</label><input id="cAdminUser" type="text" placeholder="admin" class="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500"></div>
          <div><label class="block text-xs text-gray-400 mb-1">Contrasena *</label><input id="cAdminPass" type="password" placeholder="Contrasena" class="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500"></div>
          <div><label class="block text-xs text-gray-400 mb-1">Nombre</label><input id="cAdminName" type="text" placeholder="Nombre completo" class="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500"></div>
        </div>
      </div>
    </div>
    <div class="p-6 border-t border-gray-800 flex justify-end gap-3">
      <button onclick="closeModal('createModal')" class="px-5 py-2.5 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition text-sm">Cancelar</button>
      <button onclick="createTenant()" id="createBtn" class="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-lg transition text-sm shadow-lg shadow-brand-600/20">Crear Negocio</button>
    </div>
  </div>
</div>

<!-- MODAL: Detalle Tenant -->
<div id="detailModal" class="hidden fixed inset-0 z-[100] flex items-center justify-center p-4 modal-bg">
  <div class="bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto fade-in">
    <div class="p-6 border-b border-gray-800 flex items-center justify-between">
      <h2 class="text-xl font-bold text-white" id="detailTitle">Detalle</h2>
      <button onclick="closeModal('detailModal')" class="text-gray-400 hover:text-white text-xl">&times;</button>
    </div>
    <!-- Tabs -->
    <div class="px-6 border-b border-gray-800 flex gap-6">
      <button onclick="showDetailTab('info')" id="tabInfo" class="pb-3 text-sm font-medium tab-active">Informacion</button>
      <button onclick="showDetailTab('settings')" id="tabSettings" class="pb-3 text-sm font-medium tab-inactive">Configuracion</button>
      <button onclick="showDetailTab('admins')" id="tabAdmins" class="pb-3 text-sm font-medium tab-inactive">Admins</button>
      <button onclick="showDetailTab('resources')" id="tabResources" class="pb-3 text-sm font-medium tab-inactive">Recursos CF</button>
      <button onclick="showDetailTab('log')" id="tabLog" class="pb-3 text-sm font-medium tab-inactive">Actividad</button>
    </div>
    <div id="detailContent" class="p-6"></div>
    <!-- Edit bar -->
    <div class="p-6 border-t border-gray-800 flex justify-between">
      <div class="flex gap-2">
        <button onclick="editTenantStatus()" id="btnToggleStatus" class="px-4 py-2 text-sm bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition">Suspender</button>
        <button onclick="deleteCurrentTenant()" class="px-4 py-2 text-sm bg-red-600 hover:bg-red-500 text-white rounded-lg transition">Eliminar</button>
      </div>
      <button onclick="saveTenantEdit()" class="px-6 py-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-lg transition text-sm">Guardar Cambios</button>
    </div>
  </div>
</div>

<!-- MODAL: Cambiar Contrasena -->
<div id="passModal" class="hidden fixed inset-0 z-[100] flex items-center justify-center p-4 modal-bg">
  <div class="bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl w-full max-w-md fade-in">
    <div class="p-6 border-b border-gray-800"><h2 class="text-xl font-bold text-white">Cambiar Contrasena</h2></div>
    <div class="p-6 space-y-4">
      <div><label class="block text-sm text-gray-300 mb-1">Contrasena Actual</label><input id="passCurrent" type="password" class="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500"></div>
      <div><label class="block text-sm text-gray-300 mb-1">Nueva Contrasena</label><input id="passNew" type="password" class="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500"></div>
      <div><label class="block text-sm text-gray-300 mb-1">Confirmar Nueva</label><input id="passConfirm" type="password" class="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500"></div>
    </div>
    <div class="p-6 border-t border-gray-800 flex justify-end gap-3">
      <button onclick="closeModal('passModal')" class="px-5 py-2.5 text-gray-400 bg-gray-800 hover:bg-gray-700 rounded-lg transition text-sm">Cancelar</button>
      <button onclick="changePassword()" class="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-lg transition text-sm">Cambiar</button>
    </div>
  </div>
</div>

<!-- MODAL: Agregar Admin al Tenant -->
<div id="addAdminModal" class="hidden fixed inset-0 z-[110] flex items-center justify-center p-4 modal-bg">
  <div class="bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl w-full max-w-md fade-in">
    <div class="p-6 border-b border-gray-800"><h2 class="text-lg font-bold text-white">Agregar Administrador</h2></div>
    <div class="p-6 space-y-4">
      <div><label class="block text-sm text-gray-300 mb-1">Usuario *</label><input id="aaUser" type="text" class="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500"></div>
      <div><label class="block text-sm text-gray-300 mb-1">Contrasena *</label><input id="aaPass" type="password" class="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500"></div>
      <div><label class="block text-sm text-gray-300 mb-1">Nombre</label><input id="aaName" type="text" class="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500"></div>
      <div><label class="block text-sm text-gray-300 mb-1">Email</label><input id="aaEmail" type="email" class="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500"></div>
    </div>
    <div class="p-6 border-t border-gray-800 flex justify-end gap-3">
      <button onclick="closeModal('addAdminModal')" class="px-5 py-2.5 text-gray-400 bg-gray-800 hover:bg-gray-700 rounded-lg transition text-sm">Cancelar</button>
      <button onclick="addTenantAdmin()" class="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-lg transition text-sm">Crear Admin</button>
    </div>
  </div>
</div>

<!-- CONFIRM DIALOG -->
<div id="confirmDialog" class="hidden fixed inset-0 z-[120] flex items-center justify-center p-4 modal-bg">
  <div class="bg-gray-900 rounded-2xl border border-red-900/50 shadow-2xl w-full max-w-sm p-6 text-center fade-in">
    <svg class="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/></svg>
    <h3 class="text-lg font-bold text-white mb-2" id="confirmTitle">Confirmar</h3>
    <p class="text-gray-400 text-sm mb-6" id="confirmMsg">Esta accion no se puede deshacer.</p>
    <div class="flex gap-3 justify-center">
      <button onclick="closeModal('confirmDialog')" class="px-5 py-2.5 text-gray-400 bg-gray-800 hover:bg-gray-700 rounded-lg transition text-sm">Cancelar</button>
      <button onclick="confirmAction()" id="confirmBtn" class="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg transition text-sm">Eliminar</button>
    </div>
  </div>
</div>

<!-- TOAST -->
<div id="toast" class="hidden fixed bottom-6 right-6 z-[200] px-5 py-3 rounded-xl text-white text-sm font-medium shadow-xl fade-in max-w-sm"></div>

<script>
let TOKEN=localStorage.getItem('admin_token')||'';
let ADMIN=JSON.parse(localStorage.getItem('admin_data')||'null');
let currentTenant=null;
let currentDetailTab='info';
let pendingConfirmFn=null;
let currentPage=1;

const PLANS={trial:{label:'Trial',maxP:100,maxU:3,maxS:50},basico:{label:'Basico',maxP:500,maxU:5,maxS:200},profesional:{label:'Profesional',maxP:5000,maxU:20,maxS:2000},empresarial:{label:'Empresarial',maxP:99999,maxU:999,maxS:99999}};

async function api(path,opts={}){
  const h={'Content-Type':'application/json'};
  if(TOKEN)h['Authorization']='Bearer '+TOKEN;
  try{const r=await fetch('/api'+path,{...opts,headers:{...h,...(opts.headers||{})}});const d=await r.json();if(r.status===401){doLogout();return null;}return{ok:r.ok,status:r.status,data:d};}
  catch(e){showToast('Error de conexion','red');return null;}
}

async function doLogin(){
  const u=document.getElementById('loginUser').value.trim(),p=document.getElementById('loginPass').value;
  const err=document.getElementById('loginError'),btn=document.getElementById('loginBtn');
  if(!u||!p){err.textContent='Completa todos los campos';err.classList.remove('hidden');return;}
  btn.textContent='Ingresando...';btn.disabled=true;
  const r=await api('/auth/login',{method:'POST',body:JSON.stringify({username:u,password:p})});
  btn.textContent='Iniciar Sesion';btn.disabled=false;
  if(!r||!r.ok){err.textContent=r?.data?.error||'Error al iniciar sesion';err.classList.remove('hidden');return;}
  TOKEN=r.data.token;ADMIN=r.data.admin;
  localStorage.setItem('admin_token',TOKEN);localStorage.setItem('admin_data',JSON.stringify(ADMIN));
  err.classList.add('hidden');showPanel();
}

function doLogout(){if(TOKEN)api('/auth/logout',{method:'POST'});TOKEN='';ADMIN=null;localStorage.removeItem('admin_token');localStorage.removeItem('admin_data');document.getElementById('loginScreen').classList.remove('hidden');document.getElementById('mainPanel').classList.add('hidden');}

function showPanel(){document.getElementById('loginScreen').classList.add('hidden');document.getElementById('mainPanel').classList.remove('hidden');document.getElementById('adminName').textContent=ADMIN?.name||'';loadStats();loadTenants();}

function showSection(s){document.getElementById('sectionDashboard').classList.toggle('hidden',s!=='dashboard');document.getElementById('sectionActivity').classList.toggle('hidden',s!=='activity');if(s==='activity')loadActivity();}

async function loadStats(){const r=await api('/tenants/stats');if(!r?.ok)return;const s=r.data;document.getElementById('statTotal').textContent=s.total;document.getElementById('statActive').textContent=s.active;document.getElementById('statTrial').textContent=s.trial;document.getElementById('statSuspended').textContent=s.suspended;document.getElementById('statSales').textContent=(s.totalSales||0).toLocaleString();}

async function loadTenants(){
  const q=new URLSearchParams({search:document.getElementById('searchInput').value,status:document.getElementById('filterStatus').value,plan:document.getElementById('filterPlan').value,page:String(currentPage),limit:'20'});
  const r=await api('/tenants?'+q.toString());if(!r?.ok)return;
  const{tenants,pagination}=r.data;const tbody=document.getElementById('tenantsTable');
  if(!tenants.length){tbody.innerHTML='<tr><td colspan="7" class="px-5 py-12 text-center text-gray-500">No hay negocios. Crea el primero.<\/td><\/tr>';document.getElementById('pagination').innerHTML='';return;}
  tbody.innerHTML=tenants.map(t=>\`<tr class="hover:bg-gray-800/50 transition">
    <td class="px-5 py-4"><div class="flex items-center gap-3"><div class="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0" style="background:\${t.primary_color||'#6366f1'}">\${(t.name||'?')[0].toUpperCase()}<\/div><div><p class="font-medium text-white">\${t.name}<\/p><p class="text-xs text-gray-500 hidden sm:block">\${t.description?.substring(0,35)||''}<\/p><\/div><\/div><\/td>
    <td class="px-5 py-4 hidden md:table-cell"><code class="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">\${t.slug}<\/code><\/td>
    <td class="px-5 py-4"><span class="p-\${t.plan} text-xs font-semibold text-white px-2.5 py-1 rounded-full">\${t.plan}<\/span><\/td>
    <td class="px-5 py-4"><span class="s-\${t.status} sdot"><\/span> <span class="text-sm text-gray-300 ml-1">\${t.status}<\/span><\/td>
    <td class="px-5 py-4 hidden lg:table-cell"><p class="text-sm text-gray-300">\${t.owner_name||'-'}<\/p><p class="text-xs text-gray-500">\${t.owner_email||''}<\/p><\/td>
    <td class="px-5 py-4 text-sm text-gray-400 hidden sm:table-cell">\${fmtDate(t.created_at)}<\/td>
    <td class="px-5 py-4"><div class="flex gap-1">
      <button onclick="viewTenant('\${t.id}')" class="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition" title="Ver detalle">&#128065;<\/button>
      \${t.d1_database_id?\`<button onclick="window.open('https://myecommerce-\${t.slug}.workers.dev','_blank')" class="p-2 text-gray-400 hover:text-green-400 hover:bg-green-400/10 rounded-lg transition" title="Ir al POS">&#128722;<\/button>\`:''}
      <button onclick="confirmDelete('\${t.id}','\${t.name}')" class="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition" title="Eliminar">&#128465;<\/button>
    <\/div><\/td>
  <\/tr>\`).join('');
  // Pagination
  const pg=document.getElementById('pagination');
  if(pagination.totalPages>1){
    let btns='';
    for(let i=1;i<=pagination.totalPages&&i<=10;i++){
      btns+=\`<button onclick="currentPage=\${i};loadTenants()" class="px-3 py-1 rounded \${i===currentPage?'bg-brand-600 text-white':'bg-gray-800 text-gray-400 hover:bg-gray-700'} transition">\${i}<\/button>\`;
    }
    pg.innerHTML=\`<span>\${pagination.total} negocio(s) - Pagina \${pagination.page} de \${pagination.totalPages}<\/span><div class="flex gap-1">\${btns}<\/div>\`;
  } else { pg.innerHTML=\`<span>\${pagination.total} negocio(s)<\/span>\`; }
}

function openCreateModal(){['cName','cSlug','cDesc','cOwnerName','cOwnerEmail','cOwnerPhone','cAdminUser','cAdminPass','cAdminName'].forEach(id=>document.getElementById(id).value='');document.getElementById('cPlan').value='trial';document.getElementById('cCountry').value='VE';document.getElementById('cColor').value='#6366f1';document.getElementById('cAccent').value='#06b6d4';document.getElementById('cColorLbl').textContent='#6366f1';document.getElementById('cAccentLbl').textContent='#06b6d4';document.getElementById('createModal').classList.remove('hidden');}

async function createTenant(){
  const name=document.getElementById('cName').value.trim();
  if(!name){showToast('El nombre es requerido','red');return;}
  const btn=document.getElementById('createBtn');btn.textContent='Creando...';btn.disabled=true;
  const body={name,slug:document.getElementById('cSlug').value.trim()||undefined,description:document.getElementById('cDesc').value.trim(),plan:document.getElementById('cPlan').value,primary_color:document.getElementById('cColor').value,accent_color:document.getElementById('cAccent').value,country:document.getElementById('cCountry').value,owner_name:document.getElementById('cOwnerName').value.trim(),owner_email:document.getElementById('cOwnerEmail').value.trim(),owner_phone:document.getElementById('cOwnerPhone').value.trim()};
  const au=document.getElementById('cAdminUser').value.trim(),ap=document.getElementById('cAdminPass').value;
  if(au&&ap){body.admin_username=au;body.admin_password=ap;body.admin_name=document.getElementById('cAdminName').value.trim();}
  const r=await api('/tenants',{method:'POST',body:JSON.stringify(body)});
  btn.textContent='Crear Negocio';btn.disabled=false;
  if(!r?.ok){showToast(r?.data?.error||'Error al crear','red');return;}
  closeModal('createModal');showToast(r.data.message||'Negocio creado',r.data.warnings?'yellow':'green');loadStats();loadTenants();
}

async function viewTenant(id){
  const r=await api('/tenants/'+id);if(!r?.ok)return;
  currentTenant=r.data;currentDetailTab='info';
  document.getElementById('detailTitle').textContent=r.data.tenant.name;
  renderDetailTab();
  // Update toggle button
  const btn=document.getElementById('btnToggleStatus');
  if(r.data.tenant.status==='activo'){btn.textContent='Suspender';btn.className='px-4 py-2 text-sm bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition';}
  else{btn.textContent='Activar';btn.className='px-4 py-2 text-sm bg-green-600 hover:bg-green-500 text-white rounded-lg transition';}
  document.getElementById('detailModal').classList.remove('hidden');
}

function showDetailTab(tab){currentDetailTab=tab;renderDetailTab();['info','settings','admins','resources','log'].forEach(t=>{document.getElementById('tab'+t.charAt(0).toUpperCase()+t.slice(1)).className='pb-3 text-sm font-medium '+(t===tab?'tab-active':'tab-inactive');});}

function renderDetailTab(){
  if(!currentTenant)return;const{tenant,settings,admins}=currentTenant;const el=document.getElementById('detailContent');
  if(currentDetailTab==='info'){
    el.innerHTML=\`
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div class="bg-gray-800 rounded-xl p-4 text-center"><p class="text-2xl font-bold text-white">\${tenant.total_sales_count||0}<\/p><p class="text-xs text-gray-400">Ventas<\/p><\/div>
        <div class="bg-gray-800 rounded-xl p-4 text-center"><p class="text-2xl font-bold text-green-400">$\${(tenant.total_revenue||0).toFixed(2)}<\/p><p class="text-xs text-gray-400">Ingresos<\/p><\/div>
        <div class="bg-gray-800 rounded-xl p-4 text-center"><p class="text-2xl font-bold text-purple-400">\${settings?.length||0}<\/p><p class="text-xs text-gray-400">Configs<\/p><\/div>
        <div class="bg-gray-800 rounded-xl p-4 text-center"><p class="text-2xl font-bold text-cyan-400">\${admins?.length||0}<\/p><p class="text-xs text-gray-400">Admins<\/p><\/div>
      <\/div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="space-y-3">
          <div><label class="text-xs text-gray-500">Nombre</label><input id="eName" value="\${tenant.name}" class="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500"><\/div>
          <div><label class="text-xs text-gray-500">Descripcion</label><textarea id="eDesc" rows="2" class="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500 resize-none">\${tenant.description||''}<\/textarea><\/div>
          <div><label class="text-xs text-gray-500">Plan</label><select id="ePlan" class="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500"><option value="trial" \${tenant.plan==='trial'?'selected':''}>Trial<\/option><option value="basico" \${tenant.plan==='basico'?'selected':''}>Basico<\/option><option value="profesional" \${tenant.plan==='profesional'?'selected':''}>Profesional<\/option><option value="empresarial" \${tenant.plan==='empresarial'?'selected':''}>Empresarial<\/option><\/select><\/div>
          <div><label class="text-xs text-gray-500">Pais</label><select id="eCountry" class="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500"><option value="VE" \${tenant.country==='VE'?'selected':''}>Venezuela<\/option><option value="CO" \${tenant.country==='CO'?'selected':''}>Colombia<\/option><option value="PE" \${tenant.country==='PE'?'selected':''}>Peru<\/option><option value="CL" \${tenant.country==='CL'?'selected':''}>Chile<\/option><option value="MX" \${tenant.country==='MX'?'selected':''}>Mexico<\/option><option value="PA" \${tenant.country==='PA'?'selected':''}>Panama<\/option><option value="EC" \${tenant.country==='EC'?'selected':''}>Ecuador<\/option><\/select><\/div>
          <div><label class="text-xs text-gray-500">Moneda</label><select id="eCurrency" class="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500"><option value="USD" \${tenant.currency==='USD'?'selected':''}>USD<\/option><option value="EUR" \${tenant.currency==='EUR'?'selected':''}>EUR<\/option><option value="COP" \${tenant.currency==='COP'?'selected':''}>COP<\/option><option value="CLP" \${tenant.currency==='CLP'?'selected':''}>CLP<\/option><option value="VES" \${tenant.currency==='VES'?'selected':''}>VES<\/option><\/select><\/div>
        <\/div>
        <div class="space-y-3">
          <div><label class="text-xs text-gray-500">Dueno</label><input id="eOwnerName" value="\${tenant.owner_name||''}" class="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500"><\/div>
          <div><label class="text-xs text-gray-500">Email Dueno</label><input id="eOwnerEmail" value="\${tenant.owner_email||''}" class="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500"><\/div>
          <div><label class="text-xs text-gray-500">Telefono Dueno</label><input id="eOwnerPhone" value="\${tenant.owner_phone||''}" class="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500"><\/div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="text-xs text-gray-500">Color Principal</label><input id="eColor" type="color" value="\${tenant.primary_color||'#6366f1'}" class="w-full mt-1 h-10 rounded cursor-pointer bg-transparent border border-gray-700"><\/div>
            <div><label class="text-xs text-gray-500">Color Acento</label><input id="eAccent" type="color" value="\${tenant.accent_color||'#06b6d4'}" class="w-full mt-1 h-10 rounded cursor-pointer bg-transparent border border-gray-700"><\/div>
          <\/div>
          <div><label class="text-xs text-gray-500">Zona Horaria</label><select id="eTimezone" class="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500"><option value="America/Caracas" \${tenant.timezone==='America/Caracas'?'selected':''}>Venezuela (ET)<\/option><option value="America/Bogota" \${tenant.timezone==='America/Bogota'?'selected':''}>Colombia (CT)<\/option><option value="America/Lima" \${tenant.timezone==='America/Lima'?'selected':''}>Peru (PET)<\/option><option value="America/Santiago" \${tenant.timezone==='America/Santiago'?'selected':''}>Chile (CLT)<\/option><option value="America/Mexico_City" \${tenant.timezone==='America/Mexico_City'?'selected':''}>Mexico (CST)<\/option><option value="America/Panama" \${tenant.timezone==='America/Panama'?'selected':''}>Panama (ET)<\/option><\/select><\/div>
        <\/div>
      <\/div>\`;
  } else if(currentDetailTab==='settings'){
    const cats=[...new Set(settings.map(s=>s.categoria))];
    el.innerHTML=\`<div class="space-y-4">\${cats.map(cat=>\`
      <div><h4 class="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-2">\${cat}<\/h4><div class="space-y-2">\${settings.filter(s=>s.categoria===cat).map(s=>\`
        <div class="flex items-center justify-between py-2 border-b border-gray-800"><label class="text-sm text-gray-400">\${s.clave}<\/label>
        <input data-key="\${s.clave}" data-cat="\${s.categoria}" value="\${s.valor}" class="w-48 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm text-right focus:outline-none focus:border-brand-500">\`  ).join('')}<\/div><\/div>\`).join('')}
      <button onclick="saveTenantSettings()" class="mt-4 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-lg transition text-sm">Guardar Configuraciones<\/button>
    <\/div>\`;
  } else if(currentDetailTab==='admins'){
    el.innerHTML=\`
      <button onclick="document.getElementById('addAdminModal').classList.remove('hidden')" class="mb-4 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold rounded-lg transition">+ Agregar Admin<\/button>
      <div class="space-y-2">\${(admins||[]).map(a=>\`
        <div class="bg-gray-800 rounded-xl p-4 flex items-center justify-between">
          <div><p class="text-white font-medium">\${a.name||a.username}<\/p><p class="text-xs text-gray-500">\${a.username} &middot; \${a.role} &middot; \${a.is_active?'&#9989; Activo':'&#10060; Inactivo'}<\/p><p class="text-xs text-gray-600">\${a.email||''} &middot; Creado: \${fmtDate(a.created_at)}<\/p><\/div>
          <span class="text-xs px-2 py-1 rounded \${a.role==='admin'?'bg-brand-600/20 text-brand-400':'bg-gray-700 text-gray-400'}">\${a.role}<\/span>
        <\/div>\`).join('')}
      \${!admins?.length?'<p class="text-gray-500 text-sm">No hay administradores.<\/p>':''}
    <\/div>\`;
  } else if(currentDetailTab==='resources'){
    el.innerHTML=\`
      <div class="space-y-3 text-sm font-mono">
        <div class="bg-gray-800 rounded-xl p-4 space-y-2">
          <h4 class="text-xs font-sans font-semibold text-gray-400 uppercase tracking-wider mb-2">Base de Datos D1<\/h4>
          <div><span class="text-gray-500">Nombre:</span> <span class="text-cyan-400">\${tenant.d1_database_name}<\/span><\/div>
          <div><span class="text-gray-500">ID:</span> <span class="text-gray-300">\${tenant.d1_database_id||'No creado'}<\/span><\/div>
          <div><span class="text-gray-500">Estado:</span> \${tenant.d1_database_id?'<span class="text-green-400">&#9989; Creado<\/span>':'<span class="text-red-400">&#10060; Pendiente<\/span>'}<\/div>
        <\/div>
        <div class="bg-gray-800 rounded-xl p-4 space-y-2">
          <h4 class="text-xs font-sans font-semibold text-gray-400 uppercase tracking-wider mb-2">Almacenamiento KV<\/h4>
          <div><span class="text-gray-500">ID:</span> <span class="text-green-400">\${tenant.kv_namespace_id?.substring(0,20)||'Pendiente'}...<\/span><\/div>
          <div><span class="text-gray-500">Estado:</span> \${tenant.kv_namespace_id?'<span class="text-green-400">&#9989; Creado<\/span>':'<span class="text-amber-400">&#9888; Pendiente<\/span>'}<\/div>
        <\/div>
        <div class="bg-gray-800 rounded-xl p-4 space-y-2">
          <h4 class="text-xs font-sans font-semibold text-gray-400 uppercase tracking-wider mb-2">Almacenamiento R2 (Media)<\/h4>
          <div><span class="text-gray-500">Bucket:</span> <span class="text-amber-400">\${tenant.r2_bucket_name}<\/span><\/div>
          <div><span class="text-gray-500">Estado:</span> <span class="text-amber-400">&#9888; Requiere activar R2 en Dashboard<\/span><\/div>
        <\/div>
        <div class="bg-gray-800 rounded-xl p-4 space-y-2">
          <h4 class="text-xs font-sans font-semibold text-gray-400 uppercase tracking-wider mb-2">Worker & Pages<\/h4>
          <div><span class="text-gray-500">Worker:</span> <span class="text-purple-400">\${tenant.worker_name}<\/span><\/div>
          <div><span class="text-gray-500">Pages Login:</span> <span class="text-blue-400">\${tenant.pages_project_name}<\/span><\/div>
          \${tenant.login_url?\`<div><span class="text-gray-500">URL Login:</span> <a href="\${tenant.login_url}" target="_blank" class="text-brand-400 hover:underline">\${tenant.login_url}<\/a><\/div>\`:'<div><span class="text-gray-500">URL Login:</span> <span class="text-gray-600">Pendiente deploy<\/span><\/div>'}
        <\/div>
        <div class="bg-gray-800 rounded-xl p-4">
          <h4 class="text-xs font-sans font-semibold text-gray-400 uppercase tracking-wider mb-2">Limites del Plan<\/h4>
          <div class="grid grid-cols-3 gap-4 text-center">
            <div><p class="text-lg font-bold text-white">\${tenant.max_products}<\/p><p class="text-xs text-gray-500">Max Productos<\/p><\/div>
            <div><p class="text-lg font-bold text-white">\${tenant.max_users}<\/p><p class="text-xs text-gray-500">Max Usuarios<\/p><\/div>
            <div><p class="text-lg font-bold text-white">\${tenant.max_daily_sales}<\/p><p class="text-xs text-gray-500">Ventas/Dia<\/p><\/div>
          <\/div>
        <\/div>
      <\/div>\`;
  } else if(currentDetailTab==='log'){
    loadTenantActivity();
    el.innerHTML='<div id="tenantActivityContent" class="space-y-2">Cargando...<\/div>';
  }
}

async function saveTenantEdit(){
  if(!currentTenant)return;
  const body={name:document.getElementById('eName').value,description:document.getElementById('eDesc').value,plan:document.getElementById('ePlan').value,country:document.getElementById('eCountry').value,currency:document.getElementById('eCurrency').value,timezone:document.getElementById('eTimezone').value,owner_name:document.getElementById('eOwnerName').value,owner_email:document.getElementById('eOwnerEmail').value,owner_phone:document.getElementById('eOwnerPhone').value,primary_color:document.getElementById('eColor').value,accent_color:document.getElementById('eAccent').value};
  const r=await api('/tenants/'+currentTenant.tenant.id,{method:'PUT',body:JSON.stringify(body)});
  if(!r?.ok){showToast(r?.data?.error||'Error al guardar','red');return;}
  currentTenant.tenant={...currentTenant.tenant,...body};
  showToast('Negocio actualizado','green');loadStats();loadTenants();
}

async function saveTenantSettings(){
  if(!currentTenant)return;
  const inputs=document.querySelectorAll('#detailContent input[data-key]');
  const settings=Array.from(inputs).map(i=>({clave:i.dataset.key,valor:i.value,categoria:i.dataset.cat}));
  const r=await api('/tenants/'+currentTenant.tenant.id+'/settings',{method:'PUT',body:JSON.stringify({settings})});
  if(!r?.ok){showToast(r?.data?.error||'Error','red');return;}
  showToast(r.data.message,'green');
}

async function editTenantStatus(){
  if(!currentTenant)return;
  const newStatus=currentTenant.tenant.status==='activo'?'suspendido':'activo';
  const r=await api('/tenants/'+currentTenant.tenant.id,{method:'PUT',body:JSON.stringify({status:newStatus})});
  if(!r?.ok){showToast(r?.data?.error||'Error','red');return;}
  currentTenant.tenant.status=newStatus;
  const btn=document.getElementById('btnToggleStatus');
  if(newStatus==='activo'){btn.textContent='Suspender';btn.className='px-4 py-2 text-sm bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition';}
  else{btn.textContent='Activar';btn.className='px-4 py-2 text-sm bg-green-600 hover:bg-green-500 text-white rounded-lg transition';}
  showToast('Estado cambiado a '+newStatus,'green');loadStats();loadTenants();
}

async function addTenantAdmin(){
  if(!currentTenant)return;
  const u=document.getElementById('aaUser').value.trim(),p=document.getElementById('aaPass').value;
  if(!u||!p){showToast('Usuario y contrasena requeridos','red');return;}
  const r=await api('/tenants/'+currentTenant.tenant.id+'/admins',{method:'POST',body:JSON.stringify({username:u,password:p,name:document.getElementById('aaName').value.trim(),email:document.getElementById('aaEmail').value.trim()})});
  if(!r?.ok){showToast(r?.data?.error||'Error','red');return;}
  closeModal('addAdminModal');showToast('Admin creado','green');viewTenant(currentTenant.tenant.id);
}

async function loadTenantActivity(){
  if(!currentTenant)return;
  const r=await api('/tenants/'+currentTenant.tenant.id+'/activity');
  const el=document.getElementById('tenantActivityContent');if(!el)return;
  if(!r?.ok){el.innerHTML='Error al cargar';return;}
  if(!r.data.activity.length){el.innerHTML='<p class="text-gray-500 text-sm">Sin actividad registrada.<\/p>';return;}
  el.innerHTML=r.data.activity.map(a=>\`<div class="bg-gray-800 rounded-lg p-3 flex items-center justify-between"><div><span class="text-xs px-2 py-0.5 rounded \${actionColor(a.action)}">\${a.action}<\/span><span class="text-sm text-gray-300 ml-2">\${a.admin_username}<\/span><\/div><span class="text-xs text-gray-500">\${fmtDate(a.created_at)}<\/span><\/div>\`).join('');
}

function confirmDelete(id,name){document.getElementById('confirmTitle').textContent='Eliminar Negocio';document.getElementById('confirmMsg').textContent='Se eliminara \''+name+'\' y todos sus recursos (D1, KV). Esta accion no se puede deshacer.';pendingConfirmFn=async()=>{const r=await api('/tenants/'+id,{method:'DELETE'});if(!r?.ok){showToast(r?.data?.error||'Error','red');return;}showToast(r.data.message,'green');closeModal('detailModal');loadStats();loadTenants();};document.getElementById('confirmDialog').classList.remove('hidden');}

function deleteCurrentTenant(){if(!currentTenant)return;confirmDelete(currentTenant.tenant.id,currentTenant.tenant.name);}

function confirmAction(){if(pendingConfirmFn){pendingConfirmFn();pendingConfirmFn=null;}closeModal('confirmDialog');}

function showPasswordModal(){document.getElementById('passCurrent').value='';document.getElementById('passNew').value='';document.getElementById('passConfirm').value='';document.getElementById('passModal').classList.remove('hidden');}

async function changePassword(){
  const c=document.getElementById('passCurrent').value,n=document.getElementById('passNew').value,co=document.getElementById('passConfirm').value;
  if(!c||!n){showToast('Completa todos los campos','red');return;}
  if(n!==co){showToast('Las contrasenas no coinciden','red');return;}
  if(n.length<6){showToast('Minimo 6 caracteres','red');return;}
  const r=await api('/auth/change-password',{method:'POST',body:JSON.stringify({currentPassword:c,newPassword:n})});
  if(!r?.ok){showToast(r?.data?.error||'Error','red');return;}
  closeModal('passModal');showToast('Contrasena actualizada','green');
}

async function loadActivity(){
  const f=document.getElementById('activityFilter').value;const params=new URLSearchParams({limit:'50'});if(f)params.set('action',f);
  const r=await api('/activity?'+params.toString());if(!r?.ok)return;
  const tbody=document.getElementById('activityTable');
  if(!r.data.activity.length){tbody.innerHTML='<tr><td colspan="5" class="px-5 py-8 text-center text-gray-500">Sin actividad<\/td><\/tr>';return;}
  tbody.innerHTML=r.data.activity.map(a=>\`<tr class="hover:bg-gray-800/30">
    <td class="px-5 py-3 text-sm text-gray-400">\${fmtDate(a.created_at)}<\/td>
    <td class="px-5 py-3 text-sm text-white">\${a.admin_username}<\/td>
    <td class="px-5 py-3"><span class="text-xs px-2 py-0.5 rounded \${actionColor(a.action)}">\${a.action}<\/span><\/td>
    <td class="px-5 py-3 text-xs text-gray-500 hidden md:table-cell max-w-xs truncate">\${a.details?a.details.substring(0,80):''}<\/td>
    <td class="px-5 py-3 text-xs text-gray-600 font-mono hidden lg:table-cell">\${a.ip_address||'-'}<\/td>
  <\/tr>\`).join('');
}

function closeModal(id){document.getElementById(id).classList.add('hidden');}
function fmtDate(d){if(!d)return'-';try{return new Date(d+'Z'||d).toLocaleDateString('es-VE',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});}catch{return d;}}
function actionColor(a){const m={LOGIN:'bg-green-900/50 text-green-400',CREATE_TENANT:'bg-blue-900/50 text-blue-400',UPDATE_TENANT:'bg-amber-900/50 text-amber-400',DELETE_TENANT:'bg-red-900/50 text-red-400',CREATE_TENANT_ADMIN:'bg-purple-900/50 text-purple-400',UPDATE_TENANT_SETTINGS:'bg-cyan-900/50 text-cyan-400',CHANGE_PASSWORD:'bg-pink-900/50 text-pink-400'};return m[a]||'bg-gray-800 text-gray-400';}
function showToast(msg,color='green'){const t=document.getElementById('toast');t.textContent=msg;t.style.background=color==='red'?'#dc2626':color==='yellow'?'#d97706':'#16a34a';t.classList.remove('hidden');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.add('hidden'),4000);}

document.addEventListener('DOMContentLoaded',()=>{if(TOKEN&&ADMIN)showPanel();});
['createModal','detailModal','passModal','addAdminModal','confirmDialog'].forEach(id=>{document.getElementById(id)?.addEventListener('click',e=>{if(e.target===e.currentTarget)closeModal(id);});});
</script>
</body>
</html>`;
}
