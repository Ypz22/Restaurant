# DESIGN.md — Sistema de diseño

Fuente de verdad visual del proyecto. Si algo no está aquí, **no se inventa**: se pregunta.
Los prototipos de Stitch y `docs/referencias-stitch/` son inspiración; donde contradigan este archivo, gana este archivo.

---

## 1. Principios

1. **Un solo sistema, varios temas.** Tipografía, radios, spacing, elevación, iconos y anatomía de componentes son idénticos para todos los tenants. Lo único que cambia entre temas es la **tonalidad** (matiz y croma) de los colores.
2. **Solo tokens.** Ningún componente usa hex, `rgb()`, `oklch()` literal ni colores de la paleta de Tailwind (`slate-500`, `amber-100`, `red-50`…). Solo clases semánticas (`bg-primary`, `text-muted-foreground`…).
3. **El color comunica rol, no decoración.** Un mismo rol se ve igual de "fuerte" en todos los temas porque su luminosidad es fija.
4. **Admin tranquilo.** Admin y KDS usan una paleta casi neutra ("Calma Operativa"). El rojo solo aparece para lo crítico (alérgenos graves, retraso crítico, acciones destructivas).
5. **Solo modo claro** en esta fase. No se agregan variantes `dark:`.

---

## 2. Superficies y temas

| Superficie | Ruta | Tema |
|---|---|---|
| Cliente (menú QR) | `/r/[restaurante]/...` | Tema del tenant: `brasa`, `mar`, `cafe` o `huerta` |
| Admin del restaurante | `/admin/[restaurante]/...` | `admin` (fijo, no depende del tenant) |
| KDS cocina | `/admin/[restaurante]/kitchen` | `admin` (fijo) |

- En admin/KDS la identidad del tenant se muestra solo con **logo y nombre**, nunca con su color.
- Catálogo cerrado: el tenant elige uno de los temas; no puede ingresar colores propios.

| Tema | Rubros | Prototipo Stitch de referencia |
|---|---|---|
| `brasa` (rojo) | Comida rápida, parrilladas, asaderos | "Sabor & Brasa" |
| `mar` (azul) | Pescadería, marisquería, cevichería | "Mar & Marea" |
| `cafe` (marrón) | Cafetería, panadería, pastelería | "Origen Café" |
| `huerta` (verde) | Saludable, vegetariano, ensaladas | Sin prototipo: usar los de `brasa` con este tema |

El tema se guarda en `restaurants.theme` (enum `brasa | mar | cafe | huerta`, ver spec del núcleo).

---

## 3. Arquitectura de color (OKLCH, luminosidad fija)

### 3.1 Cómo funciona

Cada rol tiene una **luminosidad (L) fija** compartida por todos los temas. Un tema solo define 6 parámetros:

| Parámetro | Significado |
|---|---|
| `--brand-h`, `--brand-c` | Matiz y croma del color de marca (botones, activos, precios) |
| `--accent-h`, `--accent-c` | Matiz y croma del acento (promos, "Sugerencia del chef", ratings) |
| `--neutral-h`, `--neutral-c` | Tinte de fondos, bordes y textos |

Como L está fija, el contraste de un rol es prácticamente el mismo en todos los temas.

### 3.2 Implementación (Tailwind v4 + shadcn/ui)

`admin` vive en `:root`; cada tema de tenant solo sobrescribe parámetros bajo `[data-theme]`.
El layout de `/r/[restaurante]` pone `data-theme={restaurant.theme}`; el layout de `/admin` no pone nada.

```css
/* Parámetros: admin por defecto */
:root {
  --brand-h: 250; --brand-c: 0.04;
  --accent-h: 70;  --accent-c: 0.10;
  --neutral-h: 250; --neutral-c: 0.006;
}
[data-theme="brasa"]  { --brand-h: 28;  --brand-c: 0.15; --accent-h: 55;  --accent-c: 0.11; --neutral-h: 60;  --neutral-c: 0.008; }
[data-theme="mar"]    { --brand-h: 240; --brand-c: 0.11; --accent-h: 190; --accent-c: 0.08; --neutral-h: 230; --neutral-c: 0.008; }
[data-theme="cafe"]   { --brand-h: 50;  --brand-c: 0.06; --accent-h: 65;  --accent-c: 0.11; --neutral-h: 70;  --neutral-c: 0.010; }
[data-theme="huerta"] { --brand-h: 145; --brand-c: 0.10; --accent-h: 100; --accent-c: 0.09; --neutral-h: 110; --neutral-c: 0.008; }

/* Roles: la receta es la misma para todos los temas. NO editar por tema. */
:root, [data-theme] {
  --background:           oklch(0.985 var(--neutral-c) var(--neutral-h));
  --foreground:           oklch(0.22  calc(var(--neutral-c) * 2) var(--neutral-h));
  --card:                 oklch(1 0 0);
  --card-foreground:      var(--foreground);
  --popover:              oklch(1 0 0);
  --popover-foreground:   var(--foreground);
  --muted:                oklch(0.955 var(--neutral-c) var(--neutral-h));
  --muted-foreground:     oklch(0.50  calc(var(--neutral-c) * 2) var(--neutral-h));
  --border:               oklch(0.905 var(--neutral-c) var(--neutral-h));
  --input:                var(--border);
  --primary:              oklch(0.50 var(--brand-c) var(--brand-h));
  --primary-foreground:   oklch(0.99 0 0);
  --ring:                 var(--primary);
  --secondary:            oklch(0.945 calc(var(--brand-c) * 0.15) var(--brand-h));
  --secondary-foreground: oklch(0.40  calc(var(--brand-c) * 0.8)  var(--brand-h));
  --accent:               var(--muted);            /* shadcn: hover de items de menú */
  --accent-foreground:    var(--foreground);
  --highlight:            oklch(0.94 calc(var(--accent-c) * 0.3) var(--accent-h));
  --highlight-foreground: oklch(0.42 calc(var(--accent-c) * 0.8) var(--accent-h));
  --inverse:              oklch(0.25 calc(var(--neutral-c) * 2) var(--neutral-h));
  --inverse-foreground:   oklch(0.97 var(--neutral-c) var(--neutral-h));
  /* Gráficas (dashboard): series en orden --chart-1..5. --chart-4 es neutro, para comparación (periodo anterior). */
  --chart-1:              var(--primary);
  --chart-2:              oklch(0.72 calc(var(--accent-c) * 1.1) var(--accent-h));
  --chart-3:              oklch(0.68 calc(var(--brand-c) * 1.5) var(--brand-h));
  --chart-4:              oklch(0.62 calc(var(--neutral-c) * 2) var(--neutral-h));
  --chart-5:              oklch(0.84 calc(var(--brand-c) * 0.6) var(--brand-h));
}
```

Registrar cada rol en `@theme inline` (`--color-primary: var(--primary);`, etc.) para obtener las utilidades `bg-primary`, `text-highlight-foreground`, `bg-inverse`…

> Ojo: en shadcn `accent` es el fondo de hover de menús, **no** el color de acento del tema. El acento del tema es `highlight`.

### 3.3 Valores resultantes (referencia, verificados)

Contraste WCAG mínimo entre pares texto/fondo: **5.25:1 en todos los temas** (AA exige 4.5). Todos dentro de gamut sRGB.

| Rol | admin | brasa | mar | cafe | huerta |
|---|---|---|---|---|---|
| `background` | `#f7fafe` | `#fef9f5` | `#f5fbff` | `#fff9f3` | `#fafbf5` |
| `card` | `#ffffff` | `#ffffff` | `#ffffff` | `#ffffff` | `#ffffff` |
| `muted` | `#edf0f4` | `#f4efeb` | `#ebf1f4` | `#f5efe9` | `#f0f1eb` |
| `border` | `#dde0e3` | `#e4deda` | `#dbe1e4` | `#e4dfd9` | `#e0e0da` |
| `foreground` | `#161b20` | `#201913` | `#131c21` | `#211910` | `#1b1b13` |
| `muted-foreground` | `#5e646a` | `#6a615a` | `#5a656b` | `#6b6157` | `#63645a` |
| `primary` | `#52657a` | `#a8372e` | `#0e6a9b` | `#7f5944` | `#3b723e` |
| `secondary` | `#eaedf1` | `#fce8e4` | `#e3eff7` | `#f2ebe8` | `#e7f0e7` |
| `secondary-foreground` | `#3b4959` | `#7c2620` | `#074d72` | `#5d4030` | `#29532b` |
| `highlight` | `#f9e8d6` | `#fee6d7` | `#daf1ef` | `#fbe7d5` | `#efecd8` |
| `highlight-foreground` | `#694413` | `#713e17` | `#165855` | `#6d410b` | `#564e19` |

Estos hex son **solo para verificar**; en código se usan siempre los tokens.

### 3.4 Colores semánticos fijos (no cambian por tema)

Definidos en `:root` con valores literales; ningún `[data-theme]` los toca.

| Token | OKLCH | Hex | Uso |
|---|---|---|---|
| `destructive` / `destructive-foreground` | `0.52 0.18 27` / `0.99 0 0` | `#ba2b28` / `#fcfcfc` | Eliminar, anular comanda, confirmar override de alérgeno |
| `danger-soft` / `danger-soft-foreground` | `0.95 0.025 27` / `0.45 0.15 27` | `#ffe9e6` / `#972622` | Alérgeno grave, retraso crítico en KDS |
| `success-soft` / `success-soft-foreground` | `0.95 0.035 150` / `0.42 0.09 150` | `#dff6e2` / `#225a31` | "Listo", pedido confirmado |
| `warning-soft` / `warning-soft-foreground` | `0.95 0.05 85` / `0.45 0.09 70` | `#feedc9` / `#754b10` | "En preparación", tiempo elevado (nunca rojo) |
| `info-soft` / `info-soft-foreground` | `0.95 0.025 240` / `0.42 0.08 240` | `#e0f1fe` / `#1b5274` | Mensajes informativos |
| `diet-vegan` / `diet-vegan-foreground` | `0.95 0.04 135` / `0.42 0.10 135` | `#e3f5da` / `#34591b` | Badge "Vegano" |
| `diet-gluten-free` / `diet-gluten-free-foreground` | `0.95 0.05 90` / `0.45 0.09 80` | `#fbeec9` / `#6f4f07` | Badge "Sin gluten" |
| `diet-spicy` / `diet-spicy-foreground` | `0.95 0.024 35` / `0.48 0.16 35` | `#fee9e4` / `#a42e0c` | Badge "Picante" |

Contraste mínimo de estos pares: 5.87:1.

**Estados de pedido (KDS y cliente):**

| Estado (`order_rounds.status`) | Estilo |
|---|---|
| `pending` | `bg-muted text-muted-foreground` |
| `preparing` | `bg-warning-soft text-warning-soft-foreground` |
| `ready` | `bg-success-soft text-success-soft-foreground` |
| `delivered` | `bg-muted text-muted-foreground` + icono `CheckCheck` |

---

## 4. Traducción desde prototipos Stitch (Material 3 → tokens)

Los HTML de Stitch usan nombres M3. Al portar, traducir así; **nunca** copiar la `tailwind.config` de Stitch.

| Clase en Stitch | Token del proyecto |
|---|---|
| `bg-surface`, `bg-background`, `bg-surface-bright` | `bg-background` |
| `bg-surface-container-lowest`, `bg-white` | `bg-card` |
| `bg-surface-container-low`, `bg-surface-container` | `bg-muted` (cards de menú en cliente: `bg-card` + `border`) |
| `bg-surface-container-high`, `-highest`, `bg-surface-variant` | `bg-muted` (hover: `bg-border`) |
| `text-on-surface`, `text-on-background` | `text-foreground` |
| `text-on-surface-variant` | `text-muted-foreground` |
| `border-outline-variant`, `border-surface-container-high` | `border-border` |
| `border-outline` | `border-input` |
| `bg-primary`, `bg-primary-container` | `bg-primary` |
| `text-on-primary`, `text-on-primary-container` | `text-primary-foreground` |
| `text-primary`, `text-primary-container` | `text-primary` |
| `bg-secondary-container`, `bg-secondary-fixed`, `bg-primary-fixed` | `bg-secondary` |
| `text-secondary`, `text-on-secondary-container`, `text-on-secondary-fixed` | `text-secondary-foreground` |
| `bg-tertiary-*` / `text-tertiary*` | `bg-highlight` / `text-highlight-foreground` |
| `bg-inverse-surface` / `text-inverse-on-surface` | `bg-inverse` / `text-inverse-foreground` |
| `bg-error`, `text-error` | `bg-destructive` / `text-destructive` |
| `bg-red-50 text-red-700`, `bg-error-container` | `bg-danger-soft text-danger-soft-foreground` |
| `bg-amber-100 text-amber-800` | `bg-warning-soft text-warning-soft-foreground` |
| `text-emerald-700`, `bg-emerald-*` | `success-soft` |
| `slate-*`, `stone-*`, `gray-*` (admin) | `background` / `card` / `muted` / `border` / `foreground` / `muted-foreground` según el rol |
| Cualquier hex (`#0369a1`, `#78350f`, `bg-[#f8f9fc]`…) | El rol equivalente de esta tabla. Si no hay equivalente: **preguntar** |
| `brand-cream`, `brand-borderLight`, `shadow-soft` (pantalla "Mi Orden") | `background`, `border`, `shadow-sm` |

---

## 5. Tipografía

- **Única familia:** Plus Jakarta Sans vía `next/font/google` (pesos 400, 500, 600, 700). No se agregan otras fuentes.
- **Números:** precios, cantidades, mesas y cronómetros llevan `tabular-nums`.
- **Mayúsculas:** solo en `label-sm` (badges, metadatos). Nunca en descripciones ni notas.

| Token | Tamaño / interlineado | Peso | Tracking | Uso |
|---|---|---|---|---|
| `display-lg` | 40 / 48 px | 700 | -0.02em | Hero de bienvenida |
| `headline-lg` | 32 / 40 px (móvil 26 / 32) | 700 | -0.01em | Títulos de página admin |
| `headline-md` | 24 / 30 px | 600 | 0 | Precio destacado, número de ticket KDS |
| `title-lg` | 20 / 26 px | 600 | 0 | Nombre de plato en detalle, secciones |
| `title-md` | 16 / 22 px | 600 | 0.01em | Nombre de plato en card, nombre del restaurante |
| `body-lg` | 16 / 24 px | 400 | 0 | Texto de lectura |
| `body-md` | 14 / 20 px | 400 | 0 | Descripciones, texto por defecto |
| `label-lg` | 14 / 18 px | 600 | 0.02em | Botones |
| `label-md` | 12 / 16 px | 600 | 0.04em | Chips, metadatos |
| `label-sm` | 11 / 14 px | 700 | 0.05em | Badges en mayúsculas |

Definir cada token como utilidad en `@theme` (`--text-title-md`, etc.). No usar `text-lg`, `text-xl`… sueltos.

---

## 6. Forma, espacio y elevación

### Radios (escala por defecto de Tailwind)

| Clase | Valor | Uso |
|---|---|---|
| `rounded-lg` | 8 px | Inputs pequeños, número de ticket, badges de admin |
| `rounded-xl` | 12 px | Botones, inputs, icon containers |
| `rounded-2xl` | 16 px | Cards de plato, tickets KDS, KPI cards, opciones de radio/checkbox grandes |
| `rounded-t-3xl` | 24 px arriba | Bottom sheets |
| `rounded-full` | pill | Chips, badges, stepper, avatares, toasts |

No usar valores arbitrarios (`rounded-[28px]`).

### Espaciado

Base de 4 px. Usar la escala estándar de Tailwind (`gap-2`, `p-4`…). Equivalencias con Stitch: `space-xs` = 1 (4 px), `space-sm` = 2 (8 px), `space-md` = 4 (16 px), `space-lg` = 6 (24 px), `space-xl` = 8 (32 px), `margin` móvil = 4 (16 px).

- Cliente: columna única, `px-4`, `max-w-screen-sm mx-auto`. Zona de acciones principal en el tercio inferior (barra fija).
- Admin: sidebar `w-64` desde `xl`, header `h-16`, contenido `max-w-[1440px]`.
- KDS: grilla de tickets `grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6`.
- Área táctil mínima **44 × 44 px** (`h-11`) en cliente y KDS.

### Elevación

Se comunica con **cambio de superficie + borde**, sombras mínimas y neutras.

| Nivel | Estilo | Uso |
|---|---|---|
| 0 | `bg-background` | Lienzo |
| 1 | `bg-card border border-border shadow-sm` | Cards, tickets, KPI |
| 2 | `shadow-md` | Hover de card, dropdowns, popovers |
| 3 | `shadow-xl` + overlay `bg-foreground/40` | Bottom sheet, diálogo, barra de carrito |

Headers fijos: `bg-background/90 backdrop-blur` + `border-b border-border`. No sombras de color ni glows.

---

## 7. Iconos

- **Librería única:** `lucide-react`, tamaño 16 / 20 / 24 px, `strokeWidth` por defecto. No usar Material Symbols ni emojis como iconos.
- Equivalencias con los prototipos:

| Material Symbols (Stitch) | lucide-react |
|---|---|
| `add` / `remove` | `Plus` / `Minus` |
| `shopping_bag`, `add_shopping_cart` | `ShoppingBag` |
| `receipt_long` | `ReceiptText` |
| `restaurant_menu`, `menu_book` | `BookOpen` |
| `table_restaurant` | `Armchair` |
| `room_service` | `ConciergeBell` |
| `local_fire_department`, `whatshot` | `Flame` |
| `eco` | `Leaf` |
| `grain` | `WheatOff` |
| `schedule`, `timer`, `hourglass_top` | `Clock` / `Timer` |
| `star` | `Star` |
| `favorite` | `Heart` |
| `check`, `check_circle`, `done_all` | `Check` / `CircleCheck` / `CheckCheck` |
| `close` | `X` |
| `arrow_back` / `arrow_forward` | `ArrowLeft` / `ArrowRight` |
| `notifications` | `Bell` |
| `person`, `groups` | `User` / `Users` |
| `priority_high` | `TriangleAlert` |
| `delete_outline` | `Trash2` |
| `settings` | `Settings` |
| `query_stats` | `ChartLine` |
| `search` | `Search` |

Si falta una equivalencia, elegir el icono lucide más literal y agregarlo a esta tabla.

---

## 8. Componentes

Base: componentes de shadcn/ui (`Button`, `Badge`, `Card`, `Sheet`, `Dialog`, `Input`, `Textarea`, `RadioGroup`, `Checkbox`, `Switch`, `Tabs`, `Table`, `Sonner`). Se personalizan **solo con tokens**; no se crean variantes de color por tema.

### 8.1 Cliente (menú QR)

| Componente | Anatomía (de los prototipos) |
|---|---|
| **Header de menú** | Fijo. Logo `h-8` + nombre (`title-md`) + subtítulo `label-sm`. Derecha: badge de mesa (`bg-secondary text-secondary-foreground rounded-full`, icono `Armchair`) y botón carrito 44 px con punto `bg-primary`. Debajo, tabs de categorías con scroll horizontal. |
| **Tab de categoría** | Pill `px-3.5 py-1 label-md`. Activa: `bg-primary text-primary-foreground`. Inactiva: `bg-muted text-muted-foreground`. |
| **Chip de filtro** | Pill `px-3 py-1.5 label-md` con icono 16 px. Activo: `bg-secondary text-secondary-foreground`. Inactivo: `bg-card border border-border`. |
| **Card de plato** | `rounded-2xl bg-card border border-border p-4 shadow-sm`. Izquierda: badges, nombre `title-md`, descripción `body-md text-muted-foreground line-clamp-2`, precio `title-md text-primary tabular-nums`. Derecha: foto cuadrada 88–104 px `rounded-xl`. Abajo: stepper o botón agregar. |
| **Card "Sugerencia del chef"** | `rounded-2xl` con foto `h-48`, gradiente `from-black/80` para legibilidad, badge `bg-highlight text-highlight-foreground` con icono `Flame`, precio `headline-md text-primary`. |
| **Plato agotado** | Card con `opacity-60`, foto en escala de grises, badge "Agotado" `bg-muted text-muted-foreground`, acción deshabilitada. |
| **Stepper de cantidad** | Pill `bg-muted rounded-full p-0.5`, botones circulares 44 px (`Minus` / `Plus`), número `label-lg tabular-nums`. |
| **Botón primario** | `h-11 px-5 rounded-xl bg-primary text-primary-foreground label-lg`, `active:scale-[0.98]`. |
| **Botón tonal** | `h-11 rounded-xl bg-secondary text-secondary-foreground`. |
| **Barra de carrito** | Fija abajo `px-4`: `bg-inverse text-inverse-foreground rounded-2xl px-4 py-3 shadow-xl`. Contador circular `bg-primary`, total `title-md tabular-nums`, CTA "Ver pedido". |
| **Bottom sheet (detalle / personalización)** | `Sheet side="bottom"`, `rounded-t-3xl bg-background p-6`, handle `w-12 h-1.5 bg-border rounded-full`. Opciones de término y guarniciones como filas `rounded-2xl bg-muted p-3.5` con radio/checkbox; seleccionada: `ring-2 ring-primary`. Notas: `Textarea rounded-2xl bg-muted`. CTA fijo abajo. |
| **Badge dietético** | Pill `h-6 px-2 label-sm uppercase` + icono 14 px, colores `diet-*` (sección 3.4). |
| **Fila de "Mi pedido"** | Miniatura 56 px `rounded-xl`, nombre, apodo del comensal `label-md text-muted-foreground`, notas, stepper y `Trash2`. Agrupable por comensal. |
| **Llamar mesero / pedir agua** | Botones grandes `rounded-2xl bg-card border` con icono `ConciergeBell`. Si ya hay solicitud `pending`: estado "Solicitado" `bg-success-soft`, botón deshabilitado. |
| **Toast** | Sonner, `bg-inverse text-inverse-foreground rounded-full`. |

### 8.2 Admin y KDS ("Calma Operativa")

| Componente | Anatomía |
|---|---|
| **Shell** | Header `h-16 bg-card/90 backdrop-blur border-b`. Sidebar `w-64 bg-card border-r` con items `rounded-xl`; activo: `bg-secondary text-secondary-foreground`. Lienzo `bg-background`. |
| **KPI card** | Nivel 1, `p-6`. Label `label-md text-muted-foreground`, icono en `rounded-xl bg-secondary p-2`, valor `headline-lg tabular-nums`, variación con `success-soft` / `danger-soft`. |
| **Ticket KDS** | `article rounded-2xl bg-card border shadow-sm overflow-hidden`. Cabecera `bg-muted px-4 py-2 border-b`: número `headline-md tabular-nums` en `rounded-lg bg-card border`, mesa `title-md`, cronómetro `tabular-nums`. Estado con la tabla de la sección 3.4. Items con checkbox 44 px separados por `border-b`. Notas de cocina con borde izquierdo `border-l-4 border-warning-soft-foreground/40`. Botón de avance `h-11 w-full bg-primary`. |
| **Alerta de alérgeno** | `rounded-lg bg-danger-soft text-danger-soft-foreground border border-danger-soft-foreground/30 label-sm font-bold` + `TriangleAlert`. Solo para alérgenos graves o retraso crítico. |
| **Tabla de datos** | shadcn `Table`. Header `bg-muted label-sm uppercase text-muted-foreground`, filas con `border-b` y `hover:bg-muted/50`. Números alineados a la derecha, `tabular-nums`. |
| **Disponibilidad de plato** | `Switch` (encendido = `bg-primary`) + texto "Disponible" / "Agotado". |
| **Botón destructivo** | `bg-destructive text-destructive-foreground` y siempre con confirmación (`AlertDialog`). |

### 8.3 Estados obligatorios

Todo componente con datos contempla: **cargando** (`Skeleton` con `bg-muted`), **vacío** (icono 24 px `text-muted-foreground` + texto + acción), **error** (`danger-soft` + reintentar) y **sin conexión** (banner `warning-soft`, ver spec: reconexión de Realtime).
Foco visible siempre: `focus-visible:ring-2 ring-ring ring-offset-2`.

---

## 9. Agregar un tema nuevo

1. Elegir **solo** los 6 parámetros de la sección 3.1. No se tocan las luminosidades ni la receta de roles.
2. Guía de croma: marca 0.04–0.15 (marrones y neutros bajos, rojos altos), acento 0.08–0.12, neutro 0.006–0.010.
3. Validar con `python3 scripts/check-theme-contrast.py <brand-h> <brand-c> <accent-h> <accent-c> <neutral-h> <neutral-c>`: debe salir `OK` (todos los pares **≥ 4.5:1** y ningún rol fuera de gamut). Luego agregar el tema a `THEMES` en el script y su columna a la tabla 3.3.
4. Agregar el valor al enum `restaurants.theme` y a la tabla de la sección 2.
5. Revisar las pantallas de cliente (menú, detalle, pedido, confirmación) con el nuevo `data-theme`.

---

## 10. Prohibido

- Hex, `rgb()`, `hsl()`, `oklch()` literales o colores de la paleta de Tailwind en componentes.
- Variantes de componente por tema (`if theme === "mar"`) o clases condicionales por tenant.
- Cambiar tipografía, radios, spacing o sombras según el tema.
- Nuevas fuentes, librerías de iconos, librerías de componentes o de animación sin aprobación.
- Gradientes decorativos, glows, glassmorphism fuera de headers fijos, animaciones de entrada por scroll.
- Rojo para tiempos normales, cancelaciones comunes o estados "en preparación".
- Clases `dark:`.
- Copiar la `tailwind.config`, los `<script>` o los `<link>` de fuentes de los HTML de Stitch.

## 11. Checklist antes de terminar una tarea de UI

- [ ] Solo tokens semánticos; cero hex o colores de Tailwind crudos.
- [ ] Se ve correcto con `data-theme` = `brasa`, `mar`, `cafe` y `huerta` (cliente) o sin atributo (admin).
- [ ] Tipografía con tokens de la sección 5; precios y tiempos con `tabular-nums`.
- [ ] Iconos `lucide-react`; áreas táctiles ≥ 44 px.
- [ ] Estados cargando / vacío / error presentes.
- [ ] Foco visible y `aria-label` en botones de solo icono.
