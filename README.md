# MyeCommerce Cloud — Super Admin Multi-Tenant

## Descripcion del Sistema

**MyeCommerce Cloud** es la version online del sistema POS MyeCommerce, construida como una plataforma **multi-tenant (multi-negocio)** desplegada en **Cloudflare Workers + D1 + KV + R2**. El sistema permite gestionar multiples negocios (tiendas, ferreterias, bodegas, etc.) desde un unico panel de administracion, donde cada negocio tiene su propia base de datos, almacenamiento, configuracion y usuarios independientes.

La arquitectura esta disenada para que el **Super Administrador** cree negocios completos con un solo click, y cada negocio funcione de forma totalmente aislada con su propio sistema de punto de venta.

---

## Arquitectura

```
Super Admin Worker (este repo)
https://myecommerce-admin.sismtema.workers.dev
|
+-- Crea negocios (tenants) con recursos Cloudflare automaticos
|   +-- D1 Database por negocio (SQLite serverless)
|   +-- KV Namespace por negocio (sesiones, cache)
|   +-- R2 Bucket por negocio (fotos, media)
|   +-- Worker API por negocio (endpoints POS)
|   +-- Pages Login por negocio (pagina de login independiente)
|
+-- Cada negocio es 100% independiente:
    +-- Base de datos aislada
    +-- Usuarios y permisos propios
    +-- Configuracion de tienda propia (nombre, tasa BCV, impuestos, colores)
    +-- Catalogo de productos propio
    +-- Historial de ventas propio
    +-- URL de acceso propia
```

## Stack Tecnologico

| Componente | Tecnologia | Detalle |
|---|---|---|
| **Runtime** | Cloudflare Workers | Edge computing global, cold start ~17ms |
| **Framework API** | Hono v4 | TypeScript, ligero, rapido |
| **Base de Datos** | Cloudflare D1 | SQLite serverless, ACID compliant |
| **Cache/Sesiones** | Cloudflare KV | Key-value de baja latencia |
| **Almacenamiento** | Cloudflare R2 | S3-compatible, sin costo de egreso |
| **Frontend** | Vanilla JS + Tailwind CSS CDN | Servido inline desde el Worker |
| **Auth** | JWT (HMAC-SHA256) + PBKDF2 | Web Crypto API, sin dependencias |
| **Infraestructura** | Cloudflare API REST | Provisioning automatico de recursos |

---

## Estructura del Proyecto

```
myecommerce-cloud/
+-- src/
|   +-- index.ts              # Entry point + Frontend HTML inline
|   +-- types.ts              # TypeScript types
|   +-- lib/
|   |   +-- auth.ts           # JWT, PBKDF2, password hashing (Web Crypto)
|   |   +-- cloudflare-api.ts # Crear/eliminar D1, KV, Pages via API
|   |   +-- logger.ts         # Activity log en D1
|   +-- middleware/
|   |   +-- auth.ts           # JWT verification middleware (Hono)
|   +-- routes/
|       +-- auth.ts           # POST /login, /change-password, /logout
|       +-- tenants.ts        # CRUD tenants, settings, admins, activity
|       +-- activity.ts       # GET activity log global
+-- migrations/
|   +-- 001_schema.sql         # Schema completo D1 (6 tablas)
|   +-- 002_seed.sql          # Super admin por defecto
+-- package.json
+-- wrangler.toml              # Config Cloudflare Workers
+-- tsconfig.json
+-- README.md
```

---

## Base de Datos (6 Tablas)

### Tabla: super_admins
Usuarios con acceso al panel de administracion. Credenciales por defecto: `superadmin` / `admin123`

### Tabla: tenants
Negocios creados. Cada tenant tiene su propio D1, KV, R2, Worker y Pages. Campos: nombre, slug, plan, estado, colores, dueho, limites, IDs de recursos Cloudflare.

### Tabla: tenant_settings
Configuracion clave-valor de cada negocio. Categorias: tienda (nombre, direccion, telefono, RIF), finanzas (tasa BCV, impuesto, moneda), apariencia (tema), ventas (descuento, stock cero), impresion (ticket).

### Tabla: tenant_admins
Administradores de cada negocio. Cada negocio puede tener multiples admins con usuario y contrasena propios.

### Tabla: activity_log
Registro de todas las acciones del sistema: login, crear/actualizar/eliminar negocio, crear admin, cambiar configuracion, etc.

### Tabla: admin_sessions
Sesiones activas del super admin con token, IP, user agent y fecha de expiracion.

---

## API Endpoints

### Autenticacion
| Metodo | Ruta | Descripcion |
|---|---|---|
| POST | /api/auth/login | Iniciar sesion (retorna JWT) |
| POST | /api/auth/change-password | Cambiar contrasena |
| POST | /api/auth/logout | Cerrar sesion |

### Negocios (Tenants)
| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | /api/tenants | Listar todos (filtros: status, plan, search, paginacion) |
| GET | /api/tenants/stats | Estadisticas generales |
| GET | /api/tenants/:id | Detalle completo (settings + admins) |
| POST | /api/tenants/:id | Crear nuevo negocio (crea D1 + KV automaticamente) |
| PUT | /api/tenants/:id | Actualizar negocio (nombre, plan, estado, colores, etc.) |
| DELETE | /api/tenants/:id | Eliminar negocio (borra D1 + KV automaticamente) |
| GET | /api/tenants/:id/settings | Configuraciones del negocio |
| PUT | /api/tenants/:id/settings | Actualizar configuraciones (batch) |
| POST | /api/tenants/:id/admins | Crear admin del negocio |
| GET | /api/tenants/:id/activity | Historial de actividad del negocio |

### Actividad
| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | /api/activity | Log global de actividad (filtros por accion) |
| GET | /api/activity/stats | Estadisticas de actividad |

### Sistema
| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | /api/health | Health check |
| GET | /* | Frontend Admin (HTML inline) |

---

## Funcionalidades del Panel Admin (Frontend)

### Dashboard
- 5 tarjetas de estadisticas: total negocios, activos, trial, suspendidos, ventas totales
- Tabla de negocios con busqueda en tiempo real
- Filtros por estado (activo/suspendido/cancelado) y plan (trial/basico/profesional/empresarial)
- Paginacion

### Crear Negocio
- Nombre, slug auto-generado, descripcion
- Seleccion de plan, pais, colores personalizados
- Datos del dueno (nombre, email, telefono)
- Creacion de administrador del negocio en el mismo formulario
- Al crear se generan automaticamente: D1 database, KV namespace, URLs de worker y pages

### Detalle de Negocio (5 tabs)
1. **Informacion**: Editar nombre, descripcion, plan, pais, moneda, zona horaria, dueno, colores
2. **Configuracion**: Todas las settings del negocio editables (tienda, finanzas, apariencia, ventas, impresion)
3. **Admins**: Lista de administradores + agregar nuevos
4. **Recursos CF**: Estado de D1, KV, R2, Worker, Pages con IDs y links
5. **Actividad**: Historial de acciones relacionadas al negocio

### Acciones sobre Tenant
- **Suspender/Activar**: Toggle de estado con un click
- **Eliminar**: Con confirmacion, borra D1 + KV automaticamente
- **Ir al POS**: Link directo al worker del negocio (cuando este deployado)

### Activity Log Global
- Vista de todas las acciones del sistema
- Filtro por tipo de accion
- Colores por accion, IP registrada

### Seguridad
- Cambio de contrasena del super admin
- Sesiones con JWT de 24 horas
- Cierre de sesion

---

## Configuracion de Cloudflare

### Recursos Creados
| Recurso | Nombre | ID |
|---|---|---|
| Worker | myecommerce-admin | https://myecommerce-admin.sismtema.workers.dev |
| D1 Database | myecommerce-admin-db | 7b6a5074-3891-4c08-b7f1-cdcea635917d |
| KV Namespace | MYECOMMERCE_ADMIN_KV | b9835d384b0947e4b6511bf5643c54e2 |
| R2 Bucket | (pendiente activacion) | Requiere activar en Dashboard |

### Secrets (Wrangler)
| Secret | Descripcion |
|---|---|
| JWT_SECRET | Clave para firmar JWTs |
| CLOUDFLARE_API_TOKEN | Token API para crear recursos por tenant |
| CLOUDFLARE_ACCOUNT_ID | ID de cuenta Cloudflare |

---

## Planes de Negocio

| Plan | Max Productos | Max Usuarios | Ventas/Dia |
|---|---|---|---|
| Trial | 100 | 3 | 50 |
| Basico | 500 | 5 | 200 |
| Profesional | 5,000 | 20 | 2,000 |
| Empresarial | Ilimitado | Ilimitado | Ilimitado |

---

## Credenciales por Defecto

**Super Admin:**
- URL: https://myecommerce-admin.sismtema.workers.dev
- Usuario: `superadmin`
- Contrasena: `admin123`

**Importante:** Cambia la contrasena inmediatamente despues del primer login.

---

## Proximos Pasos

1. **Activar R2** en Cloudflare Dashboard para habilitar almacenamiento de imagenes
2. **Construir el Worker del POS** por tenant (productos, ventas, clientes, etc.)
3. **Crear las Pages de Login** independientes para cada negocio
4. **Aplicar schema del POS** (27 modelos) a las bases de datos D1 de cada tenant
5. **Implementar sistema de suscripcion/pago** para los planes
6. **Agregar dominios personalizados** por negocio

---

## Comandos de Desarrollo

```bash
# Instalar dependencias
npm install

# Desarrollo local
npm run dev

# Aplicar schema D1 (local)
npm run db:migrate

# Aplicar schema D1 (produccion)
npm run db:migrate:remote

# Seed datos iniciales
npm run db:seed:remote

# Desplegar
npm run deploy
```

---

## Licencia

Proyecto privado. Todos los derechos reservados.
