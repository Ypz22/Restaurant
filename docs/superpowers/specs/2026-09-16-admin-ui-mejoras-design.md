# Diseño: Mejoras de UI en admin y KDS (mesas, solicitudes, KDS con checklist, dashboard con gráficas)

**Fecha:** 2026-09-16
**Estado:** Aprobado para pasar a plan de implementación

## Contexto y alcance

Continúa `2026-09-15-admin-kds-design.md` (admin y KDS sin login). Cuatro cambios pedidos por el usuario, implementados en este orden:

- **A.** Card de mesas: rediseño porque los botones se cortan.
- **B.** Solicitudes de mesa (`llamar_mesero` / `agua`) con prioridad visible en todo el admin.
- **C.** KDS con checklist por plato y resumen agregado de lo pendiente.
- **D.** Dashboard de ventas con gráficas y selector de periodo.

**Aprobaciones explícitas del usuario que amplían reglas de `AGENTS.md`:**

- Dashboard de ventas (regla dura 1 lo excluía): aprobado y ya existente desde el commit `1ba227d`. Se mantienen fuera NPS, costo de insumos y margen.
- Nueva dependencia `recharts` (vía el componente `chart` de shadcn/ui): aprobada.

### Fuera de alcance

- NPS, métodos de pago, exportar PDF/CSV, turnos y personal (no hay datos o están excluidos por `AGENTS.md`).
- Estaciones de cocina, bump bars, atajos de teclado y "llamar garzón" desde el KDS (regla dura 1).
- Mostrar solicitudes de mesa en el KDS (el KDS es para cocina; las atiende el staff desde el admin).
- Realtime en admin y KDS: ver "Actualización de datos".

## Actualización de datos (restricción de esta fase)

`20260916000300_private_table_access.sql` revocó la lectura `anon` de `order_rounds`, `cart_items` y `table_requests`. Supabase Realtime (`postgres_changes`) respeta RLS, así que sin Auth el admin no recibe eventos. No se reabre esa lectura.

**Decisión:** consulta periódica cada **5 s** a las RPC `security definer` (mismo patrón que el KDS actual), pausada con `document.visibilityState === 'hidden'` y reanudada con consulta inmediata al volver. Cuando llegue Auth se reemplaza por Realtime filtrado por `restaurant_id`; el intervalo vive en una constante `POLL_INTERVAL_MS` para facilitar el cambio.

Si una consulta falla, se mantiene lo último cargado y se muestra el banner `warning-soft` "Sin conexión, reintentando…" (`DESIGN.md` §8.3); el error de pantalla completa solo aparece si falla la **primera** carga.

## A. Card de mesas (`/admin/[restaurante]/mesas`)

**Problema:** grilla con `minmax(220px,1fr)` y dos botones `flex-1` en el footer; "Cerrar mesa" se corta.

**Diseño:**

- Grilla `grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4`.
- Cabecera: `Armchair` + nombre de la mesa (`text-title-md`) a la izquierda, `Badge` de estado a la derecha (`success` "Abierta" / `muted` "Sin sesión").
- Cuerpo: "Abierta hace **N** min" (`tabular-nums`) o "Lista para un nuevo escaneo de QR.".
- Footer en una fila:
  - Botón `variant="outline" size="icon"` con `QrCode` y `aria-label="Ver QR de {mesa}"`, con `title` como tooltip nativo.
  - Botón `variant="outline"` "Cerrar mesa", `flex-1`, deshabilitado sin sesión. El estilo destructivo queda solo en la acción del `AlertDialog` de confirmación.
- **Solicitudes pendientes de la mesa:** se listan y atienden dentro de la card (ver B).

## B. Solicitudes de mesa con prioridad

*Revisado el 2026-09-16 a pedido del usuario: la barra global se reemplazó por toast + contador en la navegación.*

- `components/admin/requests-context.tsx` — `RequestsProvider` + `useTableRequests()`, montado en `AdminShell`. Polling de `rpc_admin_get_pending_requests` (ver "Actualización de datos"); `acknowledge(request)` optimista con reversión y toast si falla.
- **Toast (Sonner, ya instalado):** por cada solicitud nueva (no en la primera carga) se muestra un toast de 6 s con "{mesa} · {motivo}", las notas como descripción y la acción "Ver mesas" (omitida si ya se está en Mesas). Suena un tono corto con Web Audio (requiere una interacción previa con la página).
- **Contador en la navegación:** el item "Mesas" (sidebar y barra inferior) muestra un círculo `bg-destructive text-destructive-foreground` con el total pendiente (pedido explícito del usuario; excepción a "rojo solo para lo crítico").
- **Atender en Mesas:** cada card lista sus solicitudes (`bg-warning-soft`, motivo, "Hace N min", notas) con botón "Atender" por solicitud; la card lleva `ring-2 ring-primary`. Las mesas con solicitudes se ordenan primero, la más antigua arriba.
- Banner "Sin conexión, reintentando…" en el shell si falla el polling.

## C. KDS con checklist (`/kitchen/[restaurante]`)

### Modelo de datos (migración nueva)

```sql
alter table cart_items add column prepared_at timestamptz;
```

**RPC nueva** `rpc_admin_set_item_prepared(p_restaurant_id uuid, p_item_id uuid, p_prepared boolean)`, `security definer`, `set search_path = public`, `grant execute ... to anon, authenticated`, en una sola transacción:

1. Bloquea (`for update`) el `order_round` del ítem, verificando que el ítem pertenece a `p_restaurant_id` (join `cart_items → order_rounds → table_sessions → tables`). Si no pertenece: error.
2. Si el round está en `ready` o `delivered`: error (no se desmarca un pedido ya listo).
3. Actualiza `prepared_at = case when p_prepared then now() else null end`.
4. Si `p_prepared` y el round está en `pending`: lo pasa a `preparing`.
5. Devuelve el `status` resultante del round.

**RPC modificada** `rpc_admin_get_active_tickets`: agrega `prepared_at` por ítem (vía `create or replace` en la migración nueva, con `drop function` previo porque cambia el tipo de retorno).

**Validación de "Todo listo":** `rpc_admin_advance_order_round` rechaza `preparing → ready` si queda algún ítem con `prepared_at is null`.

### Capa de datos (`lib/data/admin-kitchen.ts`)

- `KitchenTicketItem` suma `preparedAt: string | null`.
- Nueva `setItemPrepared(restaurantId, itemId, prepared)`.
- Nueva función pura `summarizePending(tickets): PendingDish[]` con `PendingDish = { dishName: string; quantity: number; tables: { label: string; quantity: number }[] }`. Suma los ítems sin `preparedAt` de tickets en `pending`/`preparing`, agrupa por `dishName`, ordena por cantidad descendente y luego por nombre.

### Layout

- **Filtros** (`Tabs` arriba): Todas · Nuevas (`pending`) · En preparación · Listas, cada una con su contador `tabular-nums`.
- **Dos columnas** desde `lg`: columna izquierda `w-72` "Por hacer" (sticky) + grilla de comandas `grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4`. Bajo `lg`, "Por hacer" pasa a un bloque colapsable arriba de la grilla.
- **"Por hacer":** una fila por `PendingDish`: cantidad total (`text-title-md tabular-nums`), nombre, y debajo las mesas con cantidad (`M04 ×2 · M07 ×3`, `text-label-sm text-muted-foreground`). Vacío: "Nada pendiente".
- **Comanda** (componente "Ticket KDS" de `DESIGN.md` §8.2):
  - Cabecera `bg-muted border-b`: mesa (`text-title-md`), `Badge` de estado (tabla `DESIGN.md` §3.4) y cronómetro `mm:ss` `tabular-nums` desde `submitted_at`. El cronómetro usa `text-warning-soft-foreground` desde `KDS_WARN_MINUTES = 10` y `text-destructive` desde `KDS_LATE_MINUTES = 20`.
  - Checklist: cada ítem es un `label` con checkbox nativo (área táctil ≥44 px), "N× plato" y notas debajo. Marcado: nombre con `line-through text-muted-foreground`.
  - Notas de cocina de la ronda con `border-l-4 border-warning-soft-foreground/40`.
  - Progreso: "X de N listos" + barra `h-1.5 rounded-full bg-muted` con relleno `bg-primary`.
  - Botón de avance `h-11 w-full`: en `pending`/`preparing` "Todo listo" (deshabilitado hasta marcar todo); en `ready` "Entregado".
- Orden de comandas: por `submitted_at` ascendente (la más antigua primero).

### Interacción y errores

- Marcar/desmarcar: update optimista del ítem (y del estado `pending → preparing` localmente); si la RPC falla, se revierte y se muestra un toast.
- El polling no debe pisar un cambio optimista en vuelo: se ignora el resultado de una consulta iniciada antes de la última mutación confirmada.
- Doble click en "Todo listo": la RPC valida la transición; el segundo click falla silenciosamente al estado real tras la siguiente consulta.

## D. Dashboard (`/admin/[restaurante]/dashboard`)

### Dependencias

- `recharts` + componente `chart` de shadcn (`components/ui/chart.tsx`, generado con el CLI de shadcn).
- Tokens nuevos en `app/globals.css` (`:root`, tema admin) y registrados en `@theme inline`: `--chart-1` … `--chart-5`, en OKLCH derivados de `primary`, `highlight`, `secondary` y `muted-foreground`. Documentarlos en la tabla de roles de `DESIGN.md`. Las gráficas los consumen con `var(--chart-n)` en el `ChartConfig`; sin colores literales.

### RPC nueva `rpc_admin_get_sales_report(p_restaurant_id uuid, p_period text)`

`p_period in ('day', 'week', 'month', 'year')`; cualquier otro valor: error. Límites en la zona horaria del servidor (`now()`):

| Periodo | Rango actual | Rango anterior | Granularidad de la serie |
|---|---|---|---|
| `day` | hoy | ayer | hora (0–23) |
| `week` | últimos 7 días incluyendo hoy | los 7 días previos | día |
| `month` | últimos 30 días incluyendo hoy | los 30 días previos | día |
| `year` | últimos 12 meses incluyendo el actual | los 12 meses previos | mes |

Devuelve un único `jsonb`:

```json
{
  "kpis": {
    "revenue": 0, "prev_revenue": 0,
    "orders": 0, "prev_orders": 0,
    "avg_ticket": 0, "prev_avg_ticket": 0,
    "avg_table_minutes": 0, "prev_avg_table_minutes": 0,
    "open_tables": 0
  },
  "series": [{ "bucket": "2026-09-16T12:00:00Z", "revenue": 0, "prev_revenue": 0 }],
  "by_category": [{ "category": "Parrilla", "revenue": 0 }],
  "top_dishes": [{ "dish": "Costillar", "quantity": 0, "revenue": 0 }],
  "tables": [{ "table": "Mesa 04", "sessions": 0, "revenue": 0, "avg_minutes": 0 }]
}
```

- Ingresos = `sum(quantity * unit_price_snapshot)` de `cart_items` con `order_round_id` cuyo `submitted_at` cae en el rango.
- Pedidos = número de `order_rounds` en el rango.
- Tiempo de mesa = promedio de `closed_at - opened_at` de sesiones **cerradas** con `closed_at` en el rango.
- `series` incluye todos los buckets del rango (con `generate_series`), también los vacíos en 0; `prev_revenue` es el bucket equivalente del periodo anterior.
- `top_dishes`: 5 por cantidad, **filtrado por el rango** (corrige el bug de `rpc_admin_get_top_dishes`, que no filtra por fecha).
- `by_category`: todas las categorías con ventas en el rango, ordenadas desc.
- `tables`: mesas con sesiones abiertas en el rango, ordenadas por ingresos desc.

`rpc_admin_get_sales_summary` y `rpc_admin_get_top_dishes` quedan sin uso: se eliminan en la misma migración, junto con sus funciones en `lib/data/admin-dashboard.ts`.

### Capa de datos

`lib/data/admin-dashboard.ts`: `getSalesReport(restaurantId, period): Promise<SalesReport>` con tipos camelCase y números convertidos con `Number()`. `period: 'day' | 'week' | 'month' | 'year'`.

### Layout

- Cabecera: título "Ventas" + `Tabs` Hoy · Semana · Mes · Año (se recuerda en `?periodo=` de la URL).
- **KPIs** (grilla `auto-fit minmax(200px,1fr)`): Ventas, Pedidos, Ticket promedio, Tiempo de mesa promedio. Cada tarjeta: etiqueta, valor `text-headline-md tabular-nums` y variación contra el periodo anterior (`TrendingUp`/`TrendingDown` + "%"; `bg-success-soft` si mejora, `bg-danger-soft` si empeora; en tiempo de mesa no se colorea, es neutro). Si el anterior es 0: "Sin datos previos".
- **Fila 2** (`lg:grid-cols-3`):
  - `AreaChart` (2 columnas): periodo actual con relleno degradado de `--chart-1`; periodo anterior como `Line` punteada `--chart-4` (`strokeDasharray`). Eje X formateado por granularidad (`14:00`, `lun 15`, `sep`). `ChartTooltip` con ambos valores en moneda. `ChartLegend`: "Actual" / "Anterior".
  - `PieChart` con agujero (1 columna): ventas por categoría, total en el centro, leyenda con %. Más de 5 categorías: las 4 mayores + "Otras".
- **Fila 3** (`lg:grid-cols-2`):
  - `BarChart` horizontal: top 5 platos por cantidad, ingresos en el tooltip.
  - Tabla de mesas: mesa, sesiones, ingresos, permanencia promedio (`tabular-nums`, alineado a la derecha).
- Cada gráfica en `rounded-2xl border bg-card`, alto fijo (`h-72`) para evitar saltos de layout.

### Estados

- Cargando: `Skeleton` con las mismas dimensiones de cada bloque.
- Periodo sin ventas: los KPIs en 0 y cada gráfica muestra, en su lugar, icono + "Sin ventas en este periodo".
- Error: bloque `danger-soft` + "Reintentar".
- Cambiar de periodo mantiene visible el reporte previo con opacidad reducida mientras carga el nuevo (sin skeleton de pantalla completa).
- Sin polling: el dashboard se recarga al cambiar de periodo o con el botón "Actualizar".

## Testing

- **Integración (`vitest.integration.config.mjs`):**
  - `rpc_admin_set_item_prepared`: marca y desmarca; primer ítem marcado pasa el round de `pending` a `preparing`; rechaza ítem de otro restaurante; rechaza sobre round `ready`.
  - `rpc_admin_advance_order_round`: rechaza `preparing → ready` con ítems sin marcar.
  - `rpc_admin_get_sales_report`: un pedido de hoy aparece en `day` y no en el periodo anterior; un pedido de ayer aparece como `prev`; `series` de `day` tiene 24 buckets; `top_dishes` excluye pedidos fuera del rango; periodo inválido falla; no mezcla restaurantes.
- **Unitario (`vitest`):** `summarizePending` (suma entre mesas, excluye ítems preparados y tickets `ready`, orden).
- **Manual/E2E:** crear una solicitud desde el cliente y verificar en ≤5 s el toast y el contador en otra página del admin, y que se atiende desde la card de la mesa.

## Checklist visual

Cerrar cada bloque con el checklist de `DESIGN.md` §11 (solo tokens, sin `dark:`, `tabular-nums` en precios y tiempos, radios, estados de carga/vacío/error).
