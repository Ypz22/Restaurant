# Diseño: Núcleo de plataforma de pedidos para restaurantes (Fase 1)

**Fecha:** 2026-09-09
**Estado:** Aprobado para pasar a plan de implementación

## Contexto y alcance del proyecto completo

La idea original es una plataforma web para restaurantes que cubre:

1. Cuentas multi-restaurante (SaaS)
2. Gestión de menú
3. Pedidos del cliente vía QR en la mesa, con carrito grupal
4. Sistema de cocina (KDS) en tiempo real
5. Solicitudes de mesa (llamar mesero, pedir agua, etc.)
6. Previsualización 3D/AR de los platos

Dado el tamaño del proyecto, se decidió dividirlo en sub-proyectos independientes. **Este documento cubre únicamente las piezas 1–5 (el "núcleo").** La previsualización 3D/AR (pieza 6) queda como una fase 2 con su propio diseño posterior, ya que requiere resolver un pipeline de modelos 3D (fotogrametría de los platos) que es independiente del resto del sistema.

### Fuera de alcance en esta fase (explícitamente pospuesto)

- Previsualización 3D/AR de platos (fase 2)
- Pagos en línea / integración con pasarela de pago
- División de cuenta entre comensales
- Cierre automático de sesión de mesa por inactividad (se descartó a favor de cierre manual por el staff, ver más abajo)
- Notificación al cliente del estado del pedido en tiempo real (ej. "tu pedido está en camino") — deseable pero no crítico para el MVP

## Decisiones de producto clave

- **Multi-tenant SaaS**: cualquier restaurante puede registrarse y usar la plataforma con su propio menú, mesas y personal.
- **Origen del pedido**: el cliente pide desde su propio celular escaneando un QR en la mesa (no un mesero con tablet).
- **Destino del pedido**: una pantalla/tablet en cocina (KDS) que muestra los pedidos entrantes en tiempo real.
- **Carrito grupal por mesa**: todos los que escanean el QR de una misma mesa comparten un solo carrito, sincronizado en tiempo real entre sus celulares. Cada persona escribe un apodo al unirse, para saber quién agregó qué (sin cuenta ni registro).
- **Rondas de pedido**: la mesa puede enviar varias rondas durante la misma visita (bebidas, luego comida, luego postre), no solo un pedido único.
- **Cierre de sesión de mesa**: manual, por el staff desde el panel del restaurante, cuando los clientes se van.
- **Modelos 3D (fase 2, para referencia futura)**: se obtendrán por fotogrametría a partir de fotos del plato real.

## Arquitectura general

Un solo proyecto **Next.js** (App Router) con tres superficies:

1. `/r/[restaurante]/mesa/[tableId]` — vista del cliente. Sin login; solo pide un apodo al entrar. Aquí vive el menú y el carrito grupal.
2. `/admin/[restaurante]/...` — panel del restaurante: gestión de menú, mesas y staff. Requiere login (Supabase Auth) con rol (`admin` / `mesero` / `cocina`).
3. `/admin/[restaurante]/kitchen` — KDS: pantalla optimizada para una tablet de cocina, en tiempo real.

**Backend: Supabase**
- **Postgres** para todos los datos relacionales (restaurantes, mesas, menús, pedidos).
- **Auth** para el staff (login con rol por restaurante).
- **Realtime** (WebSockets sobre Postgres) para sincronizar el carrito entre celulares de la misma mesa, avisar al KDS de pedidos nuevos, y notificar al mesero de llamadas/solicitudes.
- **Storage** para las fotos de los platos.

**Por qué este stack**: los datos (menús, pedidos, mesas) son claramente relacionales, por lo que Postgres encaja mejor que una base NoSQL. Supabase evita construir desde cero un servidor de WebSockets, un sistema de auth y una capa de aislamiento multi-tenant.

## Modelo de datos

**Cuentas y estructura del restaurante**
- `restaurants` (id, name, slug)
- `staff_users` (id, restaurant_id, role: `admin` / `mesero` / `cocina`, vinculado a Supabase Auth)
- `tables` (id, restaurant_id, label/número, qr_token único)

**Sesión de mesa y carrito grupal**
- `table_sessions` (id, table_id, status: `open` / `closed`, opened_at, closed_at) — se crea al primer escaneo de un QR sin sesión abierta, y se cierra manualmente por el staff.
- `diners` (id, table_session_id, nickname, device_token) — identifica a cada persona de la mesa. El `device_token` se guarda en localStorage del celular para volver a entrar a la sesión sin re-preguntar el nombre si recarga la página, mientras la sesión siga abierta.
- `cart_items` (id, table_session_id, dish_id, diner_id, quantity, notes, unit_price_snapshot, status: `in_cart` / `submitted`) — el carrito compartido es esta tabla filtrada por `status = in_cart`. Todos los dispositivos de la mesa están suscritos por Realtime a los cambios de su `table_session_id`. `unit_price_snapshot` guarda el precio del plato al momento de agregarlo, para que cambios de precio posteriores no afecten pedidos ya enviados.

**Pedidos y cocina**
- `order_rounds` (id, table_session_id, submitted_at, status: `pending` / `preparing` / `ready` / `delivered`) — una "ronda" de pedido. Al enviarse, los `cart_items` en `in_cart` de esa sesión pasan a `submitted` y quedan asociados al round creado, dentro de una única transacción atómica (ver Manejo de errores).

**Menú**
- `menu_categories` (id, restaurant_id, name, sort_order)
- `dishes` (id, restaurant_id, category_id, name, description, price, photo_url, is_available bool, `has_3d_model` bool — reservado para la fase 2)

**Solicitudes de mesa**
- `table_requests` (id, table_session_id, type: `llamar_mesero` / `agua` / ..., status: `pending` / `acknowledged`, created_at)

**Multi-tenencia**: todas las tablas del lado staff se filtran por `restaurant_id` con Row Level Security (RLS) de Postgres, comparado contra el `restaurant_id` del staff autenticado. El lado del cliente (sin login) no usa RLS por usuario — el acceso se controla por el `qr_token` de la mesa y el `device_token` del comensal, que actúan como una "capability" de acceso a esa mesa/sesión únicamente.

## Flujo de datos (visita típica)

1. El cliente escanea el QR de la mesa 5 → abre `/r/[restaurante]/mesa/[tableId]`.
2. El backend busca una `table_session` abierta para esa mesa; si no existe, crea una nueva.
3. El cliente escribe su apodo → se crea un registro en `diners` y se guarda un `device_token` en localStorage.
4. El cliente navega el menú y agrega platos → cada uno inserta una fila en `cart_items` (`status = in_cart`).
5. Los demás celulares de la mesa, suscritos por Realtime a esa `table_session_id`, ven el carrito actualizarse al instante, con el apodo de quién agregó qué.
6. Alguien de la mesa toca "Enviar pedido" → se crea un `order_round` y los `cart_items` en `in_cart` pasan a `submitted`, asociados a ese round. El carrito grupal queda vacío, listo para una nueva ronda.
7. El KDS, suscrito por Realtime a los `order_rounds` de su restaurante, recibe el pedido al instante y lo muestra con el número de mesa.
8. Cocina marca el round como `preparing` → `ready` → `delivered`.
9. En cualquier momento, un cliente puede tocar "Llamar mesero" o "Pedir agua" → se inserta una fila en `table_requests`, y el panel del mesero (suscrito por Realtime) recibe la notificación al instante y la marca como atendida.
10. Cuando la mesa se va, el staff cierra la `table_session` desde el panel — el siguiente escaneo del QR de esa mesa arranca una sesión limpia.

## Manejo de errores y casos borde

- **Envíos simultáneos del carrito**: el paso de `in_cart` → `submitted` se hace en una sola transacción atómica (función de Postgres) que mueve todos los `cart_items` en `in_cart` de la sesión a un solo `order_round`, evitando rondas duplicadas o ítems huérfanos.
- **Precio del plato al momento de pedir**: `cart_items.unit_price_snapshot` evita que cambios de precio posteriores afecten pedidos ya enviados.
- **Plato agotado ("86'd")**: al marcar un plato como `is_available = false`, el cambio se propaga por Realtime al cliente, que debe ver el plato tachado/deshabilitado en su carrito antes de poder enviarlo.
- **Pérdida de conexión al agregar al carrito**: UI optimista local (el ítem aparece de inmediato en el dispositivo que lo agregó) mientras el insert real se reintenta al recuperar conexión; si falla definitivamente, se revierte con un aviso.
- **Reconexión tras caída de red**: al reconectar el canal de Realtime, se vuelve a pedir el estado completo actual del carrito/pedidos (no solo escuchar eventos nuevos), porque pudieron perderse eventos mientras estuvo desconectado.
- **Solicitudes duplicadas** (ej. "Llamar mesero" repetido): si ya existe una `table_request` del mismo tipo en `pending` para esa sesión, no se crea otra — se resalta la existente en el panel del mesero.
- **Sesión de mesa que el staff olvida cerrar**: el panel de mesas muestra cuánto tiempo lleva abierta cada sesión, para que el staff note una mesa "abandonada" sin necesidad de cierre automático por inactividad.

## Testing

- **Transacción crítica**: tests de integración para la función atómica que mueve `cart_items` de `in_cart` a `submitted`.
- **Aislamiento multi-tenant (RLS)**: tests que verifiquen que un usuario staff de un restaurante nunca puede leer/escribir datos de otro restaurante.
- **E2E del camino feliz** (Playwright): simular 2+ "clientes" en la misma mesa agregando al carrito en paralelo, verificar sincronización, envío del pedido y su aparición en el KDS en tiempo real.
- **Casos borde puntuales**: plato marcado no disponible mientras está en un carrito abierto, reconexión tras desconexión de red, solicitudes duplicadas de mesero.

## Próximos pasos

1. Revisión de este spec por el usuario.
2. Invocar el skill `writing-plans` para generar el plan de implementación detallado de esta fase 1.
3. Una vez el núcleo esté funcionando, brainstorming independiente para la fase 2 (previsualización 3D/AR).
