# AGENTS.md

Instrucciones para agentes de IA (Claude Code, Codex, OpenCode, Cursor…) que trabajen en este repositorio.
Idioma del proyecto: **español** (UI, docs, commits y comentarios de dominio).

## Proyecto

Plataforma SaaS multi-tenant de pedidos para restaurantes: el comensal escanea un QR en la mesa, comparte un carrito grupal en tiempo real y envía rondas a cocina (KDS). El staff gestiona menú, mesas y sesiones.

**Estado:** la experiencia del comensal para Sabor & Brasa está implementada; el panel de staff y el KDS siguen pendientes. Los comandos de desarrollo y pruebas están en `README.md`.

## Stack decidido

- **Next.js** (App Router) — un solo proyecto con tres superficies:
  - `/r/[restaurante]/mesa/[tableId]` — cliente (sin login, pide apodo)
  - `/admin/[restaurante]/...` — panel del staff (Supabase Auth, roles `admin` / `mesero` / `cocina`)
  - `/admin/[restaurante]/kitchen` — KDS
- **Supabase**: Postgres + RLS, Auth, Realtime, Storage.
- **UI**: Tailwind CSS v4 + shadcn/ui + `lucide-react`. Fuente Plus Jakarta Sans vía `next/font`.

No agregar dependencias (UI, estado, animación, fechas, formularios, etc.) sin aprobación explícita del usuario.

## Jerarquía de fuentes de verdad

Cuando dos fuentes se contradicen, gana la de más arriba:

1. **Instrucción explícita del usuario** en la conversación.
2. **Spec del núcleo**: `docs/superpowers/specs/2026-09-09-nucleo-plataforma-restaurantes-design.md` — alcance funcional, modelo de datos, flujos y casos borde.
3. **`DESIGN.md`** — todo lo visual: tokens, temas, tipografía, componentes.
4. **Prototipos de Stitch** — referencia de layout y jerarquía visual. No son fuente de colores, clases ni funcionalidades.
5. **`docs/referencias-stitch/*`** y el **PRD generado en Stitch** — solo inspiración, no normativos.

Si algo no está en 1–3: **preguntar, no inventar**.

## Reglas duras

1. **Alcance = spec del núcleo.** Los prototipos y el PRD de Stitch muestran funciones que están **fuera de alcance** y no se implementan sin aprobación:
   - pagos en línea, propina y división de cuenta
   - modo "orden individual" (el pedido siempre es grupal por mesa)
   - avatares emoji del comensal (solo apodo)
   - estaciones de cocina, bump bars y atajos de teclado en KDS
   - dashboard de ventas, NPS, costo de insumos y margen
   - KDS offline por LAN
   - notificar al cliente el estado del pedido
   - previsualización 3D/AR (fase 2)
   - cierre automático de sesión por inactividad (el cierre es manual)
2. **Colores solo con tokens semánticos** (`bg-primary`, `text-muted-foreground`…). Prohibido: hex, `rgb()`, `oklch()` literal y paleta de Tailwind (`slate-*`, `amber-*`, `red-*`…) en componentes.
3. **Los temas solo cambian color.** Nada de variantes, clases ni lógica condicional por tenant (`theme === "mar"`). El tema se aplica con `data-theme` en el layout de `/r/[restaurante]`; admin y KDS no llevan tema de tenant.
4. **Solo modo claro.** No escribir clases `dark:`.
5. **Multi-tenant seguro:** toda tabla del lado staff se filtra por `restaurant_id` con RLS. El cliente accede solo con `qr_token` y `device_token`. Nunca desactivar RLS ni usar la service role key en el cliente.
6. **Operaciones críticas atómicas:** el paso `in_cart → submitted` se hace en una función de Postgres (ver spec, "Manejo de errores").
7. No crear archivos de documentación, `README`s ni specs nuevos salvo pedido explícito.

## Trabajo de UI

Antes de tocar UI, leer `DESIGN.md` completo. En resumen:

- Roles de color: `background`, `foreground`, `card`, `muted`, `muted-foreground`, `border`, `input`, `ring`, `primary`, `secondary`, `highlight`, `inverse`, más semánticos fijos (`destructive`, `danger-soft`, `success-soft`, `warning-soft`, `info-soft`, `diet-*`).
- Temas de tenant: `brasa`, `mar`, `cafe`, `huerta`. Admin/KDS: tema `admin` en `:root`.
- Tipografía por tokens (`text-title-md`, `text-label-sm`…); `tabular-nums` en precios y tiempos.
- Radios: `rounded-xl` botones e inputs, `rounded-2xl` cards, `rounded-full` chips.
- Iconos: solo `lucide-react`.
- Terminar con el checklist de la sección 11 de `DESIGN.md`.

### Prototipos en Stitch (MCP `stitch`)

| Proyecto | ID | Contenido |
|---|---|---|
| Menú Móvil Material Design | `2902375022011597632` | Bienvenida QR, menú de los 3 tenants, confirmación, KDS, gestión de menú, crear productos, dashboard (versiones "Calma Operativa" = admin) |
| Remix of Remix of Menú Móvil Material Design | `7947096128967911866` | Menú, categoría, buscador, detalle de plato, mi orden (con y sin ítems), llamar mesero y pedido confirmado para Sabor & Brasa, Mar & Marea y Origen Café; PRD |

Cómo usarlos:

- Usar `list_screens` y `get_screen` para ver layout, jerarquía y contenido de una vista.
- Para KDS y admin, tomar como referencia **solo** las pantallas "(Calma Operativa)".
- **Portar la estructura, no el código:** traducir clases M3 a tokens con la tabla de la sección 4 de `DESIGN.md`. Nunca copiar la `tailwind.config`, los scripts, los `<link>` de fuentes ni las URLs de imágenes de Stitch.
- No crear, editar ni borrar proyectos o pantallas de Stitch sin pedido explícito.

## Skills

- **`impeccable`** — única skill de diseño del proyecto. Lee `DESIGN.md` (y `PRODUCT.md` si existe) e instala un hook que revisa la UI después de cada edición. Si una sugerencia contradice `DESIGN.md`, gana `DESIGN.md`.
- Las skills de estilo genérico (brutalist, GSAP, "high-end", generación de imágenes, generadores de `DESIGN.md`) **no se usan** en este proyecto: imponen estéticas propias.

La skill **está versionada** en `.claude/skills/` (Claude Code), `.agents/skills/` (Codex y otros) y `.opencode/skills/` (OpenCode). Son copias del mismo paquete que solo cambian las rutas internas: no editarlas a mano; se actualizan con el instalador.

- El binario nativo (`scripts/bin/`) **no** se versiona: el launcher lo descarga solo la primera vez a `~/.impeccable/bin/`.
- El hook de Claude Code vive en `.claude/settings.local.json`, que no se versiona. Cada desarrollador lo activa una vez:

```bash
npx impeccable install --project -y   # skills + hooks locales (usar --force para reinstalar/actualizar)
npx impeccable check                  # ver si hay actualizaciones
```

## Git

- No commitear `.env*`, claves de Supabase ni binarios de `scripts/bin/`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
