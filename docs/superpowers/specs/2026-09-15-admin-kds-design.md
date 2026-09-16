# Diseño: Panel de administrador y KDS (sin login)

**Fecha:** 2026-09-15
**Estado:** Aprobado para pasar a plan de implementación

## Contexto y alcance

El spec del núcleo (`2026-09-09-nucleo-plataforma-restaurantes-design.md`) define `/admin/[restaurante]/...` (panel de staff) y `/admin/[restaurante]/kitchen` (KDS) como pendientes. Este documento cubre su primera versión, **sin Supabase Auth todavía** (se agrega en una fase posterior). El restaurante se identifica por el slug de la URL, igual que en `/r/[restaurante]/...`.

### Dentro de alcance

- **Fundación visual**: sistema de tokens OKLCH multi-tema de `DESIGN.md` §3 (hoy no existe en `globals.css`) e instalación de shadcn/ui.
- **Menú** (`/admin/[restaurante]/menu`): CRUD de categorías y platos, subir foto, marcar disponible/agotado.
- **Mesas** (`/admin/[restaurante]/mesas`): listado de mesas con QR, estado de sesión (abierta hace cuánto tiempo), cerrar sesión manualmente, ver y atender solicitudes (`llamar_mesero` / `agua`) pendientes.
- **KDS** (`/admin/[restaurante]/kitchen`): grid de tickets (`order_rounds`) en tiempo real, avance de estado `pending → preparing → ready → delivered`.
- Escritura desde admin/KDS vía funciones Postgres `security definer`, mismo patrón que ya usan los RPC del cliente (`rpc_submit_order_round`, etc.), sin verificación de identidad todavía (se agrega cuando llegue Auth).

### Fuera de alcance (confirmado con el usuario)

- Login / roles (`admin` / `mesero` / `cocina`) — fase futura de Auth.
- "Turnos y Personal" y "Configuración" del prototipo Stitch — dependen de Auth o no están en el spec del núcleo.
- "Menú del Día" del prototipo Stitch — no existe en el modelo de datos del núcleo.
- Dashboard de Ventas y Métricas, NPS, costo de insumos y margen (regla dura de `AGENTS.md`).
- Estaciones de cocina, bump bars, atajos de teclado en KDS (regla dura de `AGENTS.md`). Un solo listado de tickets, sin columnas por estación.
- Migrar las páginas de cliente existentes al nuevo sistema de tokens — quedan con sus clases actuales (`bg-surface`, `text-onSurface`...); es deuda a resolver en una migración aparte.

## Arquitectura

Mismo proyecto Next.js (App Router). Nuevas rutas bajo `app/admin/[restaurantSlug]/`:

```
app/admin/[restaurantSlug]/
  layout.tsx              # resuelve restaurant por slug, sin data-theme (tema admin fijo en :root)
  menu/page.tsx            # catálogo: categorías + platos
  mesas/page.tsx           # mesas, sesiones, solicitudes
  kitchen/page.tsx         # KDS
```

Capa de datos: se sigue el patrón de `lib/data/*.ts` ya usado por el cliente (funciones async que usan `createClient()` y devuelven tipos camelCase). Nuevos archivos: `lib/data/admin-menu.ts`, `lib/data/admin-tables.ts`, `lib/data/admin-kitchen.ts`.

Realtime: mismo mecanismo que ya usa el carrito del cliente (`supabase.channel(...).on('postgres_changes', ...)`), suscrito por `restaurant_id` en vez de `table_session_id`.

## Fundación visual

1. **Tokens**: agregar a `app/globals.css` el sistema completo de `DESIGN.md` §3.2–3.4 (`:root` con receta de roles + `--brand-h/c`, `--accent-h/c`, `--neutral-h/c`; overrides `[data-theme="brasa|mar|cafe|huerta"]`; semánticos fijos `destructive`, `danger-soft`, `success-soft`, `warning-soft`, `info-soft`, `diet-*`). Se registran en `@theme inline` para las utilidades (`bg-primary`, `text-highlight-foreground`, etc.). Las variables `--color-*` actuales (hex planas) se dejan intactas para no romper el cliente existente; conviven en el mismo archivo hasta la migración futura.
2. **Tema admin**: `admin` vive en `:root` (valores de la tabla `DESIGN.md` §3.1). El layout de `/admin` no pone `data-theme`.
3. **shadcn/ui**: `npx shadcn@latest init` + agregar los componentes que pide `DESIGN.md` §8.2: `Button`, `Badge`, `Card`, `Sheet`, `Dialog`, `AlertDialog`, `Input`, `Textarea`, `Switch`, `Table`, `Tabs`, `Sonner`. Se configuran para leer los tokens de `globals.css` (no los suyos por defecto).
4. **Iconos**: `lucide-react` (ya es dependencia transitiva de nada — se agrega como paquete directo, es la librería única del proyecto).

## Modelo de datos y funciones nuevas

No se agregan columnas nuevas. Se agregan funciones `security definer` (mismo patrón que las de `rpc_*` existentes), todas con `set search_path = public` y `grant execute ... to anon, authenticated`:

**Menú**
- `rpc_admin_upsert_category(p_restaurant_id, p_id, p_name, p_sort_order)` → crea o actualiza.
- `rpc_admin_delete_category(p_restaurant_id, p_id)` → falla si tiene platos asociados (evita orfandad; el admin debe reasignar o borrar los platos primero).
- `rpc_admin_upsert_dish(p_restaurant_id, p_id, p_category_id, p_name, p_description, p_price, p_photo_url, p_is_available)`.
- `rpc_admin_delete_dish(p_restaurant_id, p_id)`.
- `rpc_admin_set_dish_availability(p_restaurant_id, p_dish_id, p_is_available)` → acción rápida del switch en la lista, sin pasar todo el payload del plato.

**Mesas y solicitudes**
- `rpc_admin_close_table_session(p_restaurant_id, p_table_session_id)` → valida que la mesa pertenezca al restaurante antes de cerrar.
- `rpc_admin_acknowledge_table_request(p_restaurant_id, p_request_id)` → marca `acknowledged`.

**KDS**
- `rpc_admin_advance_order_round(p_restaurant_id, p_round_id, p_next_status)` → valida transición válida (`pending→preparing→ready→delivered`, sin saltos ni retrocesos) y pertenencia al restaurante.

Todas reciben `p_restaurant_id` explícito y verifican que el recurso (`dish_id`, `table_session_id`, `round_id`...) pertenezca a ese restaurante antes de mutar — así, aunque no haya verificación de identidad todavía, no hay forma de mutar cruzando tenants solo con IDs adivinados de otro restaurante sin también saber su `restaurant_id`.

**Fotos de plato — Supabase Storage**: bucket `dish-photos` (público en lectura). Política de Storage: insert/update permitido en `anon`/`authenticated` solo si el path empieza con `{restaurant_id}/` — igual de "sin identidad" que las RPC de arriba, consistente con el resto de esta fase. El formulario de plato sube el archivo directo a Storage desde el cliente (`supabase.storage.from('dish-photos').upload(...)`) y guarda la URL pública en `photo_url` vía `rpc_admin_upsert_dish`.

**Código QR de mesa**: se muestra como `<img>` apuntando a un servicio público de generación de QR (`https://api.qrserver.com/v1/create-qr-code/?data=...`) con la URL completa `/r/[slug]/mesa/[tableId]` codificada — evita agregar una librería de generación de QR solo para esto. Si se prefiere no depender de un servicio externo, se puede generar con una librería (a valorar en revisión).

## Páginas

### Menú (`/admin/[restaurante]/menu`)

- Tabs por categoría (shadcn `Tabs`) + botón "Nueva categoría".
- Lista de platos de la categoría activa: `Table` con foto miniatura, nombre, precio (`tabular-nums`), `Switch` de disponibilidad, acciones editar/eliminar.
- "Nuevo plato" / "Editar plato": `Sheet` lateral con formulario (nombre, categoría, descripción, precio, foto, disponible). Guardar llama `rpc_admin_upsert_dish`.
- Eliminar plato/categoría: `AlertDialog` de confirmación (regla dura de `DESIGN.md` §8.2, botón destructivo).
- Estados: cargando (`Skeleton`), vacío ("Sin categorías todavía" + CTA), error con reintentar.

### Mesas (`/admin/[restaurante]/mesas`)

- Grid de `Card` por mesa: número, estado de sesión (`Sin sesión` / `Abierta hace 42 min` con `tabular-nums`), botón "Ver QR" (`Dialog` con la imagen), botón "Cerrar mesa" (`AlertDialog`, deshabilitado si no hay sesión abierta).
- Sección "Solicitudes pendientes": lista de `table_requests` en `pending` de todo el restaurante, agrupadas por mesa, con botón "Atender" (`rpc_admin_acknowledge_table_request`). Suscrita a Realtime — nueva solicitud entra sin recargar.
- Tiempo de sesión abierta se recalcula en cliente cada minuto (no hace falta polling al servidor).

### KDS (`/admin/[restaurante]/kitchen`)

- Grid `grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6` de tickets, uno por `order_round` con estado `pending` o `preparing` (los `ready`/`delivered` se pueden ocultar tras un timeout corto o un filtro de tabs "Activos / Completados hoy").
- Ticket = componente `DESIGN.md` §8.2 "Ticket KDS": cabecera con número de mesa + cronómetro desde `submitted_at` (`tabular-nums`, actualizado cada segundo en cliente), items del round con cantidad y notas, nota general del round con borde ámbar si existe.
- Botón de avance único al pie (`bg-primary`, ancho completo): pending→"Empezar" (preparing), preparing→"Listo" (ready), ready→"Entregado" (delivered). Cada click llama `rpc_admin_advance_order_round`.
- Suscrito a Realtime por `restaurant_id` (join contra `table_sessions`→`tables`) para `order_rounds` nuevos y cambios de estado (por si dos pantallas de KDS están abiertas a la vez).
- Reconexión: al reconectar el canal, se vuelve a pedir el estado completo (mismo patrón ya documentado en el spec del núcleo para el carrito).

## Manejo de errores y casos borde

- **Transición de estado inválida en KDS** (ej. doble click rápido saltando de `pending` a `ready`): la RPC valida la transición server-side y devuelve error; el cliente revierte el optimistic update y muestra un toast.
- **Cerrar mesa con sesión ya cerrada por otra pantalla**: la RPC es idempotente (no falla si ya está `closed`, simplemente no hace nada) para evitar carreras entre dos admins.
- **Eliminar categoría con platos**: la RPC rechaza con un mensaje claro; la UI lo muestra en vez de un error genérico.
- **Carga de foto fallida**: se muestra error en el formulario del plato; no se guarda el plato sin foto si la foto era obligatoria en ese guardado (foto es opcional en general, solo bloquea si el usuario intentó subir una y falló).

## Testing

- **Transiciones del KDS**: test de integración para `rpc_admin_advance_order_round` (transiciones válidas, inválidas, pertenencia a restaurante).
- **Aislamiento multi-tenant**: test que confirma que las RPC de escritura rechazan cuando el recurso no pertenece al `p_restaurant_id` recibido.
- **E2E**: abrir KDS y Mesas en dos pestañas, confirmar que un pedido enviado desde el cliente aparece en tiempo real en el KDS, y que cerrar una mesa desde un admin se refleja en el otro.

## Próximos pasos

1. Revisión de este spec por el usuario.
2. Invocar `writing-plans` para el plan de implementación detallado.
