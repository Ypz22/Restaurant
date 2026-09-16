# Diseño: Gestión de mesas y estados (disponible, ocupada, reservada, no disponible)

**Fecha:** 2026-09-16
**Estado:** Aprobado por el usuario, en implementación

## Contexto

Hasta ahora las mesas solo se creaban por SQL (`supabase/seed.sql`, migraciones de demo). El `qr_token` se genera por defecto al insertar y el QR es la URL `/r/[slug]/mesa/[qr_token]`, dibujada con el servicio externo `api.qrserver.com`. La única diferencia visible entre mesas era "Abierta" / "Sin sesión".

Este diseño agrega gestión de mesas desde el admin, QR generado localmente y cuatro estados de mesa. Sigue sin Auth (mismo nivel de riesgo que el resto del admin en esta fase).

### Decisiones del usuario

- Estados: Disponible, Ocupada, **Reservada**, No disponible.
- Reservada **no bloquea**: si un comensal escanea, se abre la sesión (pasa a Ocupada) y la reserva se libera sola.
- QR generado en el navegador con la librería `qrcode` (dependencia aprobada), con descarga PNG e impresión.

### Fuera de alcance

- Sistema de reservas (horarios, nombre del cliente, avisos). "Reservada" es solo una marca manual.
- Estado "Por limpiar".
- Plano visual del salón, zonas o capacidad de la mesa.

## Modelo de datos

```sql
alter table tables add column availability text not null default 'available'
  check (availability in ('available', 'reserved', 'unavailable'));
```

`availability` guarda solo lo que el staff marca. El **estado mostrado** se deriva:

| Estado mostrado | Condición | Badge | Al escanear el QR |
|---|---|---|---|
| Ocupada | hay `table_session` abierta (prioridad) | `info-soft` + minutos abierta | se une a la sesión |
| Reservada | `availability = 'reserved'`, sin sesión | `highlight` | abre sesión y pone `availability = 'available'` |
| No disponible | `availability = 'unavailable'` | `muted` | rechaza: "Mesa no disponible" |
| Disponible | `availability = 'available'`, sin sesión | `success-soft` | abre sesión |

**Nombres únicos:** no se agrega restricción `unique` (hay datos de prueba con nombres repetidos). Las RPC de crear y renombrar rechazan un nombre ya usado en el restaurante (comparación sin distinguir mayúsculas y sin espacios extremos).

## Funciones de Postgres

Todas `security definer`, `set search_path = public`, `grant execute ... to anon, authenticated`, y verifican que la mesa pertenezca a `p_restaurant_id`.

**Lado comensal (modificadas):**

- `rpc_start_session(p_qr_token, p_nickname)`: bloquea la fila de la mesa (`for update`); si `availability = 'unavailable'` lanza `table_unavailable`; si `reserved`, la pasa a `available`. El resto (insert con `on conflict`) no cambia.
- `rpc_get_table(p_qr_token)`: agrega la columna `availability` (drop + create por cambio de tipo de retorno).

**Admin (nuevas o modificadas):**

- `rpc_admin_get_tables`: agrega `availability`.
- `rpc_admin_create_table(p_restaurant_id, p_label)` → fila creada. Nombre vacío o de más de 40 caracteres: `invalid_label`. Repetido: `label_taken`.
- `rpc_admin_rename_table(p_restaurant_id, p_table_id, p_label)`: mismas validaciones, excluyendo la propia mesa.
- `rpc_admin_set_table_availability(p_restaurant_id, p_table_id, p_availability)`: rechaza con `table_occupied` si hay sesión abierta.
- `rpc_admin_regenerate_table_qr(p_restaurant_id, p_table_id)` → nuevo `qr_token`. Rechaza con `table_occupied` si hay sesión abierta (no expulsar comensales).
- `rpc_admin_delete_table(p_restaurant_id, p_table_id)`: rechaza con `table_has_history` si la mesa tuvo alguna sesión (borrarla eliminaría pedidos en cascada y alteraría el dashboard); en ese caso se usa "No disponible".

## Capa de datos (`lib/data/admin-tables.ts`)

- `TableAvailability = 'available' | 'reserved' | 'unavailable'`; `AdminTable` suma `availability`.
- `TableStatus = 'occupied' | 'reserved' | 'unavailable' | 'available'` y función pura `tableStatus(table)` que aplica la tabla de arriba.
- `createTable`, `renameTable`, `setTableAvailability`, `regenerateTableQr`, `deleteTable`, con errores traducidos a mensajes en español para la UI (`label_taken` → "Ya existe una mesa con ese nombre.", etc.).
- `lib/data/table.ts`: `TableInfo` suma `availability`.

## UI

### Admin `/admin/[restaurante]/mesas`

- Cabecera: título, botón "Nueva mesa" (abre `Dialog` con `Input` de nombre; Enter guarda; error inline).
- Filtros (`Tabs`): Todas · Disponibles · Ocupadas · Reservadas · No disponibles, con contador `tabular-nums`.
- Orden: mesas con solicitudes primero (como hoy); el resto por nombre.
- Card:
  - Cabecera: nombre + badge de estado.
  - Ocupada: "Abierta hace N min" y solicitudes con "Atender" (sin cambios).
  - Reservada / No disponible / Disponible: texto de apoyo ("Reservada: se libera al escanear", "Fuera de servicio: el QR no abre la mesa", "Lista para recibir comensales").
  - Footer: botón icono "Ver QR"; si está ocupada, "Cerrar mesa"; si no, `<select>` nativo "Disponible / Reservada / No disponible" (`h-11 rounded-xl border-input`); botón icono "Editar mesa".
- `Dialog` "Editar mesa": renombrar (input + Guardar), "Regenerar QR" (confirmación: el QR impreso deja de funcionar; deshabilitado si está ocupada) y "Eliminar mesa" (confirmación; muestra el error `table_has_history` con la sugerencia de marcarla No disponible).
- `Dialog` "QR": imagen generada con `qrcode` (`toDataURL`, 320 px, margen 2), nombre de la mesa, URL visible en texto pequeño, botones "Descargar PNG" (`qr-{mesa}.png`) e "Imprimir" (abre ventana con la imagen y el nombre y llama `print()`).
- Estado vacío: "Todavía no hay mesas" + botón "Crear primera mesa".
- Las mutaciones actualizan el estado local con la fila devuelta y muestran toast de error si fallan.

### Comensal `/r/[restaurante]/mesa/[qr]`

- Si `availability = 'unavailable'`: en lugar del formulario de apodo, mensaje "Esta mesa no está disponible en este momento. Pide ayuda al personal." (con el estilo `sb-*` existente de esa pantalla).
- Si `rpc_start_session` falla con `table_unavailable` (la mesa se desactivó entre cargar y enviar): mismo mensaje.

## Testing

Integración (`tests/integration/rpc-admin-tables.test.ts`):

- Crear mesa: devuelve `qr_token`; nombre repetido (distinto uso de mayúsculas) falla; nombre vacío falla.
- Renombrar: funciona; a un nombre de otra mesa falla; a su propio nombre funciona.
- No disponible: `rpc_start_session` falla con `table_unavailable`.
- Reservada: `rpc_start_session` abre sesión y deja `availability = 'available'`.
- Cambiar disponibilidad o regenerar QR con sesión abierta falla.
- Regenerar QR cambia el token y el anterior deja de resolver en `rpc_get_table`.
- Eliminar sin historial funciona; con una sesión (aunque cerrada) falla.
- Aislamiento: todas las RPC rechazan mesas de otro restaurante.

Unitario: `tableStatus` (prioridad de Ocupada sobre la marca guardada).
