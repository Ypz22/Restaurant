# Diseño: Autenticación y autorización multi-tenant

**Fecha:** 2026-09-17
**Estado:** Aprobado para pasar a plan de implementación

## Contexto y alcance

El panel de administración (`/admin/[slug]`) y el KDS (`/kitchen/[slug]`) funcionan hoy sin login (ver `2026-09-15-admin-kds-design.md`). Los `rpc_admin_*` son `security definer`, están concedidos a `anon` y confían en el `p_restaurant_id` que envía el navegador: cualquiera que conozca el id de un restaurante puede mutar su menú, cerrar mesas o avanzar tickets. Este documento agrega un login unificado para el staff y cierra ese hueco en la base de datos.

### Decisiones tomadas

- **Una sola base de datos compartida.** Las tablas globales (plataforma) viven junto a las tablas de tenant (con `restaurant_id`), y el aislamiento se hace por RLS y RPCs. Se descartaron un schema por restaurante y un proyecto de Supabase por restaurante: multiplican migraciones y costo, y complican Realtime y el login unificado sin que un restaurante necesite ese nivel de aislamiento.
- **Roles:** `admin` y `kitchen` por restaurante, más `platform_admin` global (el "root"). Se elimina el rol `mesero` del spec del núcleo, y `cocina` pasa a llamarse `kitchen` en código; en pantalla sigue diciendo "Cocina".
- **El comensal no cambia.** No tiene cuenta ni pasa por Supabase Auth: entra con el `qr_token` de la mesa, escribe su apodo y se identifica con su `device_token`. Todo lo de este documento aplica solo al staff.
- **Cuentas creadas directamente** con contraseña temporal y cambio obligatorio en el primer ingreso. No se envían correos.
- **Login con correo y contraseña** para todos los roles.
- **Admin ve todo** (menú, mesas, dashboard, KDS, equipo); **kitchen solo el KDS**.
- **Baja lógica:** un restaurante suspendido bloquea al staff y a los comensales; no se borran datos y se puede reactivar.
- **Rol consultado en cada RPC** desde la tabla `restaurant_staff`, no guardado en el JWT, para que quitar un rol o suspender un restaurante tenga efecto inmediato.
- **Dependencia nueva aprobada:** `@supabase/ssr`, para la sesión en cookies, `proxy.ts` y la lectura del usuario en Server Components y Server Actions.

### Fuera de alcance

- Registro público de restaurantes.
- Invitaciones o recuperación de contraseña por correo (SMTP).
- Login con nombre de usuario en lugar de correo.
- Borrado definitivo de restaurantes.
- Rol `mesero` y cualquier vista propia para él.
- Admins de restaurante gestionando a otros admins.
- Renombrar valores existentes en español (por ejemplo `llamar_mesero`).

## Nombres

| Concepto (UI en español) | Nombre en código | Login | Dónde vive |
|---|---|---|---|
| Comensal | `diner` | No, solo apodo | `diners` (tenant, ya existe) |
| Cuenta de staff | staff account | Sí | `auth.users` (global) |
| Administrador del restaurante | rol `admin` | Sí | `restaurant_staff` (global) |
| Cocina | rol `kitchen` | Sí | `restaurant_staff` (global) |
| Administración de la plataforma | `platform_admin` | Sí | `platform_admins` (global) |

El código, los identificadores y los códigos de error van en inglés. Las URLs y todo el texto visible van en español.

## Modelo de datos

### Nivel plataforma (global)

```sql
alter table restaurants
  add column status text not null default 'active'
  check (status in ('active', 'suspended'));

create table platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table restaurant_staff (
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'kitchen')),
  created_at timestamptz not null default now(),
  primary key (restaurant_id, user_id)
);
create index restaurant_staff_user_id_idx on restaurant_staff(user_id);
```

- **Un rol por cuenta por restaurante** (garantizado por la PK). Como `admin` incluye el KDS, no hacen falta dos roles en el mismo restaurante. Una misma cuenta puede tener roles en restaurantes distintos.
- **Cambio de contraseña obligatorio:** marca `must_change_password: true` en `app_metadata` de `auth.users`. La pone el servidor al crear la cuenta o resetear la contraseña, y la quita cuando el usuario la cambia. Solo afecta la navegación; no es un control de seguridad.
- **Primer `platform_admin`:** se crea a mano (el usuario en el dashboard de Supabase y el `insert` en `platform_admins` por SQL). El seed local crea uno de prueba.

### RLS de las tablas nuevas

- `platform_admins` y `restaurant_staff` con RLS habilitado. Única política: `select` de las propias filas (`user_id = auth.uid()`) para `authenticated`.
- Sin `insert/update/delete` para `anon` ni `authenticated`: se escribe solo desde RPCs `security definer` o desde Server Actions con service role.

### Helpers de autorización

En el schema `private` (no expuesto por la API de Supabase), `security definer`, `set search_path = ''`:

- `private.is_platform_admin() returns boolean`: si `auth.uid()` está en `platform_admins`.
- `private.require_staff_role(p_restaurant_id uuid, p_roles text[]) returns void`:
  - sin `auth.uid()` → `raise exception 'not_authenticated'`
  - restaurante suspendido → `raise exception 'restaurant_suspended'`
  - sin fila en `restaurant_staff` con un rol de `p_roles` → `raise exception 'forbidden'`
- `private.require_platform_admin() returns void`: `not_authenticated` o `forbidden`.

Un `platform_admin` **no** pasa `require_staff_role` automáticamente: administra restaurantes, no opera su cocina ni su menú.

### Nivel tenant

- Las tablas existentes no cambian de estructura.
- Todos los `rpc_admin_*` llaman primero a `private.require_staff_role(p_restaurant_id, '{admin}')`.
- Los RPC del KDS (`rpc_admin_get_active_tickets`, `rpc_admin_get_delivered_tickets`, `rpc_admin_advance_order_round`, `rpc_admin_set_item_prepared`) usan `'{admin,kitchen}'`.
- Se revoca `execute` a `anon` en todos ellos; quedan concedidos solo a `authenticated`.
- **Suspensión para el comensal:** los RPC del cliente (`rpc_get_table`, los de sesión, carrito, envío de ronda y solicitudes de mesa) lanzan `restaurant_suspended` si `restaurants.status <> 'active'`. Las políticas `public read` de `menu_categories` y `dishes` agregan la condición de restaurante activo.

### RPCs de plataforma

Todos llaman a `private.require_platform_admin()` y se conceden solo a `authenticated`:

- `rpc_platform_list_restaurants()` → id, nombre, slug, tema, estado, fecha de creación.
- `rpc_platform_create_restaurant(p_name, p_slug, p_theme, p_admin_user_id)` → inserta el restaurante y su fila `admin` en `restaurant_staff` en una transacción. `slug_taken` si el slug existe.
- `rpc_platform_add_restaurant_admin(p_restaurant_id, p_user_id)`.
- `rpc_platform_set_restaurant_status(p_restaurant_id, p_status)`.

### RPCs de equipo (admin del restaurante)

Con `require_staff_role(p_restaurant_id, '{admin}')`:

- `rpc_admin_list_staff(p_restaurant_id)` → cuentas del restaurante con correo y rol.
- `rpc_admin_add_kitchen_staff(p_restaurant_id, p_user_id)`.
- `rpc_admin_remove_kitchen_staff(p_restaurant_id, p_user_id)` → solo borra filas con rol `kitchen`.

## Arquitectura en Next.js

### Clientes de Supabase

- `lib/supabase/client.ts`: pasa a usar `createBrowserClient` de `@supabase/ssr`, manteniendo la misma firma `createClient()` para no tocar `lib/data/*`.
- `lib/supabase/server.ts`: `createServerClient` con las cookies de `next/headers`, para Server Components y Server Actions.
- `lib/supabase/admin.ts`: cliente con `SUPABASE_SERVICE_ROLE_KEY`, marcado `import 'server-only'`. Solo lo usan las Server Actions de creación de cuentas y reseteo de contraseñas. Nunca se importa desde un componente cliente.

### Módulo de auth (`lib/auth/`)

- `get-staff-access.ts`: lee en el servidor el usuario actual, si es `platform_admin` y sus filas de `restaurant_staff` junto con el slug y el estado de cada restaurante. Devuelve `StaffAccess`.
- `resolve-staff-home.ts`: función pura `resolveStaffHome(access: StaffAccess): string | LoginError`. Sin I/O.
- `safe-next-path.ts`: valida el parámetro `next` (solo rutas internas que empiezan con `/` y no con `//`).
- `error-messages.ts`: mapa de código de error → mensaje en español.
- `temporary-password.ts`: genera la contraseña temporal con `crypto.randomBytes` o `crypto.getRandomValues` (sin dependencias).

### Rutas

| URL | Tipo | Acceso |
|---|---|---|
| `/login` | pública | sin sesión |
| `/cambiar-contrasena` | protegida | cualquier cuenta con sesión |
| `/elegir-restaurante` | protegida | cuentas con más de un destino |
| `/plataforma` | protegida | `platform_admin` |
| `/admin/[slug]/...` | protegida | `admin` del restaurante |
| `/admin/[slug]/equipo` | protegida | `admin` del restaurante (nueva) |
| `/kitchen/[slug]` | protegida | `admin` o `kitchen` del restaurante |
| `/r/[slug]/mesa/[tableId]` | pública | comensal (sin cambios de acceso) |

### Protección en tres capas

1. **`proxy.ts`** (Next 16): refresca la sesión de Supabase en cada request. Si no hay sesión en `/admin`, `/kitchen`, `/plataforma`, `/elegir-restaurante` o `/cambiar-contrasena`, redirige a `/login?next=<ruta>`. No consulta roles (es un chequeo optimista, como recomienda la guía de autenticación de Next).
2. **Layouts como Server Components** (hoy `app/admin/[restaurantSlug]/layout.tsx` y `app/kitchen/[restaurantSlug]/layout.tsx` son `'use client'`): llaman a `getStaffAccess()` y:
   - `/admin/[slug]`: si es `admin` renderiza; si es `kitchen` redirige a `/kitchen/[slug]`; si no tiene rol muestra "No tienes acceso a este restaurante".
   - `/kitchen/[slug]`: acepta `admin` o `kitchen`.
   - `/plataforma`: exige `platform_admin`.
   - Restaurante suspendido → pantalla "Restaurante suspendido".
   - `must_change_password` → redirige a `/cambiar-contrasena`.
   El restaurante resuelto se sigue pasando a `RestaurantProvider`, de modo que las páginas cliente existentes no cambian.
3. **Base de datos:** `require_staff_role` y `require_platform_admin` en cada RPC. Es la única capa que protege los datos; las dos anteriores son navegación y UX.

## Flujos

### 1. Login unificado (`/login`)

Formulario de correo y contraseña → `signInWithPassword`. Si el login es correcto, el servidor calcula `resolveStaffHome(access)` en este orden:

1. `must_change_password` → `/cambiar-contrasena`
2. Sin `platform_admin` y sin filas en `restaurant_staff` → cierra la sesión y muestra "Tu cuenta no tiene acceso a ningún restaurante".
3. Sin `platform_admin` y todos sus restaurantes suspendidos → cierra la sesión y muestra "Tu restaurante está suspendido".
4. Solo `platform_admin` (sin restaurantes activos) → `/plataforma`.
5. Un único restaurante activo y sin `platform_admin` → `admin` va a `/admin/[slug]`; `kitchen` va a `/kitchen/[slug]`.
6. Más de un destino → `/elegir-restaurante`, con cada restaurante activo y su rol y, si corresponde, "Administración de la plataforma".

Si hay un `next` válido (según `safeNextPath`) y la cuenta tiene acceso a esa ruta, se usa `next` en lugar del destino calculado.

### 2. Cambio de contraseña (`/cambiar-contrasena`)

Formulario de contraseña nueva y su confirmación → `supabase.auth.updateUser({ password })` → Server Action que verifica la sesión y quita `must_change_password` con el cliente admin → `refreshSession()` → redirige al destino de `resolveStaffHome`.

### 3. Equipo de cocina (`/admin/[slug]/equipo`)

- **Listar:** correo y fecha de alta de las cuentas `kitchen` del restaurante.
- **Crear:** el admin ingresa un correo. La Server Action:
  1. verifica en el servidor que quien llama es `admin` de ese restaurante;
  2. si el correo ya existe en `auth.users` → `email_already_registered`;
  3. genera la contraseña temporal y crea el usuario con `auth.admin.createUser` (`email_confirm: true`, `app_metadata.must_change_password: true`);
  4. llama a `rpc_admin_add_kitchen_staff`; si falla, borra el usuario recién creado;
  5. devuelve la contraseña temporal, que la UI **muestra una sola vez** con un botón para copiar.
- **Resetear contraseña:** solo para cuentas `kitchen` de ese restaurante. Genera una nueva contraseña temporal, la asigna con `auth.admin.updateUserById`, reactiva `must_change_password` y la muestra una sola vez.
- **Quitar:** `rpc_admin_remove_kitchen_staff`, con diálogo de confirmación. La cuenta de Auth no se borra; sin filas en `restaurant_staff` ya no tiene acceso.

### 4. Plataforma (`/plataforma`)

- **Listado de restaurantes:** nombre, slug, tema, estado y fecha de creación.
- **Crear restaurante:** nombre, slug, tema y correo del primer admin. La Server Action:
  1. verifica en el servidor que quien llama es `platform_admin`;
  2. si el correo ya existe, reutiliza esa cuenta (caso: dueño con dos restaurantes) y no toca su contraseña; si no existe, crea el usuario con contraseña temporal como en el flujo 3;
  3. llama a `rpc_platform_create_restaurant`; si falla y el usuario se creó en este paso, lo borra;
  4. muestra la contraseña temporal una sola vez, si se creó una.
- **Agregar otro admin** a un restaurante: mismo manejo de correo existente que en "crear restaurante", luego `rpc_platform_add_restaurant_admin`.
- **Resetear la contraseña de un admin:** como en el flujo 3, pero lo ejecuta el `platform_admin`.
- **Suspender / reactivar:** `rpc_platform_set_restaurant_status`, con diálogo de confirmación que explica el efecto ("El staff y los comensales dejarán de tener acceso").

### 5. Efecto inmediato de una baja

- Un admin o KDS con la página abierta recibe `restaurant_suspended` o `forbidden` en su siguiente RPC y muestra la pantalla correspondiente.
- Un comensal con la mesa abierta recibe "Restaurante no disponible" en su siguiente acción. Al escanear el QR de un restaurante suspendido ve esa misma pantalla.

### 6. Cerrar sesión

Botón "Cerrar sesión" en el shell de admin, en el KDS y en `/plataforma` → `supabase.auth.signOut()` → `/login`.

## Manejo de errores

La DB lanza `raise exception '<code>'` en inglés (mismo patrón que `invalid_device_token`). La UI traduce el código con `lib/auth/error-messages.ts`.

| Código | Origen | Mensaje en pantalla |
|---|---|---|
| `invalid_credentials` | Supabase Auth | "Correo o contraseña incorrectos" |
| `not_authenticated` | helpers | redirige a `/login` |
| `forbidden` | helpers | "No tienes permiso para esta acción" |
| `restaurant_suspended` | helper y RPCs del comensal | staff: "Restaurante suspendido" · comensal: "Restaurante no disponible" |
| `email_already_registered` | alta de cuenta de cocina | "Ese correo ya tiene una cuenta" |
| `slug_taken` | alta de restaurante | "Ese identificador ya está en uso" |
| `weak_password` | Supabase Auth | "La contraseña debe tener al menos 8 caracteres" |
| `rate_limited` | Supabase Auth | "Demasiados intentos, espera un momento" |

Casos borde:

- **Error genérico en el login:** nunca se distingue entre correo inexistente y contraseña incorrecta.
- **Alta a medias:** si el RPC falla después de crear el usuario en Auth, se borra ese usuario (solo si se creó en esa misma acción). Si el borrado también falla, se registra en el log del servidor; la cuenta queda sin roles y por lo tanto sin acceso.
- **Rol quitado con la sesión abierta:** la siguiente llamada devuelve `forbidden` → pantalla sin acceso con el botón "Volver al inicio", que lleva a `resolveStaffHome`.
- **Open redirect:** `next` solo acepta rutas internas; cualquier otro valor se ignora.
- **Service role:** la clave solo existe en variables de entorno del servidor (`SUPABASE_SERVICE_ROLE_KEY`, sin prefijo `NEXT_PUBLIC_`) y `lib/supabase/admin.ts` importa `server-only`.

## Tests

Con las herramientas existentes: `vitest` (unit), `tests/integration` contra Supabase local y Playwright.

### Unit

- `resolveStaffHome`: los seis casos del orden de resolución, más una cuenta `platform_admin` con restaurantes y una cuenta con restaurantes activos y suspendidos mezclados.
- `safeNextPath`: acepta `/admin/brasa`; rechaza `https://x.com`, `//x.com` y valores vacíos.

### Integración (aislamiento entre tenants)

- `rpc-auth-isolation.test.ts`:
  - admin de Brasa → `forbidden` en todos los `rpc_admin_*` sobre otro restaurante;
  - `kitchen` → `forbidden` en los RPC exclusivos de admin, OK en los del KDS de su restaurante;
  - `anon` → sin permiso de ejecución en `rpc_admin_*` y `rpc_platform_*`;
  - `platform_admin` sin fila en `restaurant_staff` → `forbidden` en los RPC de admin y KDS;
  - admin → `forbidden` en `rpc_platform_*`.
- `restaurant-suspension.test.ts`: con el restaurante suspendido fallan con `restaurant_suspended` los RPC del staff y del comensal, y `dishes` y `menu_categories` devuelven cero filas; al reactivarlo todo vuelve a funcionar.
- `restaurant-staff-rls.test.ts`: una cuenta solo lee sus propias filas de `restaurant_staff` y `platform_admins`, y no puede insertar, modificar ni borrar filas.
- `rpc-admin.test.ts`, `rpc-admin-tables.test.ts` y `rpc-admin-dashboard.test.ts` se actualizan para usar una sesión de admin autenticada en lugar de `anon`.

### E2E (Playwright)

- Admin de Brasa inicia sesión → llega a `/admin/brasa`.
- Cuenta `kitchen` inicia sesión → llega a `/kitchen/brasa`; al abrir `/admin/brasa` la redirige al KDS.
- Cuenta con contraseña temporal → se le obliga a cambiarla antes de entrar.
- `platform_admin` crea un restaurante y luego lo suspende → el QR de una mesa de ese restaurante muestra "Restaurante no disponible".

### Seed local

Cuentas de prueba: un `platform_admin`, un `admin` y un `kitchen` de Brasa, y un `admin` de un segundo restaurante para las pruebas cruzadas. Las contraseñas del seed son solo para desarrollo local.

## Cambios a otros documentos

- El spec del núcleo (`2026-09-09-nucleo-plataforma-restaurantes-design.md`) define `staff_users` con roles `admin / mesero / cocina`. Este documento lo reemplaza con `restaurant_staff` (`admin / kitchen`) más `platform_admins`.
- `AGENTS.md` menciona el KDS en `/admin/[restaurante]/kitchen`; la ruta implementada es `/kitchen/[slug]` y se mantiene.
