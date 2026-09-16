---
name: Mar & Marea
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#40474f'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#707881'
  outline-variant: '#c0c7d1'
  surface-tint: '#006399'
  primary: '#00507d'
  on-primary: '#ffffff'
  primary-container: '#0369a1'
  on-primary-container: '#cbe4ff'
  inverse-primary: '#94ccff'
  secondary: '#006781'
  on-secondary: '#ffffff'
  secondary-container: '#8fdfff'
  on-secondary-container: '#00647d'
  tertiary: '#00564d'
  on-tertiary: '#ffffff'
  tertiary-container: '#007165'
  on-tertiary-container: '#70f7e3'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cde5ff'
  primary-fixed-dim: '#94ccff'
  on-primary-fixed: '#001d32'
  on-primary-fixed-variant: '#004b74'
  secondary-fixed: '#b9eaff'
  secondary-fixed-dim: '#81d1f0'
  on-secondary-fixed: '#001f29'
  on-secondary-fixed-variant: '#004d62'
  tertiary-fixed: '#71f8e4'
  tertiary-fixed-dim: '#4fdbc8'
  on-tertiary-fixed: '#00201c'
  on-tertiary-fixed-variant: '#005048'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 56px
    fontWeight: '800'
    lineHeight: 64px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 3rem
  margin-mobile: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

> **NO NORMATIVO.** Exporte original de Stitch, conservado solo como inspiración de tono. Contiene valores contradictorios y tokens erróneos. La fuente de verdad es `DESIGN.md` en la raíz del repo.

## Brand & Style

This design system establishes the visual tone for an artisanal seafood restaurant and market (*pescadería*). The brand identity bridges maritime craftsmanship with contemporary dining, balancing maritime authenticity and gastronomic sophistication.

The emotional signature is clean, salinity-infused, and inviting: evoking salt air, pristine catches on crushed ice, and the disciplined craft of coastal wood-fired seafood. The design movement is anchored in **Material Design 3 (M3) Modernism**, adapted with tactile coastal restraint. Instead of stark sterile blues or heavy corporate layouts, surfaces utilize warm sun-bleached culinary backdrops paired with deep nautical blues, seafoam tones, and crisp translucent water effects.

Target audiences include epicures, neighborhood seafood market patrons, reservation seekers, and coastal lifestyle enthusiasts who value ingredient provenance and unpretentious elegance.

## Colors

The palette derives strictly from oceanic depths, tidal shallows, and coastal mineral textures, completely shedding rustic terracotta in favor of crisp maritime clarity.

### Color Logic & Roles
- **Primary (`#0369a1`)**: Deep oceanic blue. Commands attention across primary navigation, active state pills, hero CTAs, and elevated market badges. Communicates deep-sea provenance and operational authority.
- **Secondary (`#0e7490`)**: Abyssal teal. Provides rhythmic support for secondary actions, interactive toggles, container borders, and informational accents.
- **Tertiary (`#14b8a6`)**: Fresh seafoam cyan. Reserved for catch-of-the-day tags, freshness status indicators, live availability trackers, and delicate interactive micro-highlights.
- **Neutral Surface & Background (`#f8fafc` / `#ffffff`)**: Crisp, sun-washed sea-salt tones. Ensures culinary food photography remains vibrant and uncompromised.
- **Surface Containers**:
  - `surface-container-lowest`: `#ffffff` (Pure, clean canvas for cards and dialogue sheets)
  - `surface-container-low`: `#f1f5f9` (Subtle off-white backdrop for table menus and order summaries)
  - `surface-container`: `#e2e8f0` (Section divider backgrounds and neutral grouping)
  - `surface-container-high`: `#cbd5e1` (Input inactive borders and disabled pill surfaces)
- **On-Colors & Text**:
  - `on-surface`: `#0f172a` (Deep ocean slate for high-contrast, effortless legibility)
  - `on-surface-variant`: `#475569` (Muted brine gray for metadata, prep notes, and tasting notes)

## Typography

The typography relies entirely on **Plus Jakarta Sans** across all roles. Its geometric underpinnings provide modern structure, while its wide apertures and rounded joints create a warm, hospitable demeanor suited for high-end dining and market menus.

- Use tighter letter tracking on display and headline tiers to convey tight craft and density.
- Use tabular numbering for market catch pricing, market weights (kg/lb), and reservation time pickers.
- Apply `label-sm` with slight uppercase styling only for seasonal freshness stamps (e.g., "WILD CAUGHT", "DAILY ARRIVAL").

## Layout & Spacing

The layout is built on an adaptable 12-column responsive fluid grid (desktop) scaling down to 8 columns (tablet) and 4 columns (mobile).

- **Desktop (1024px+)**: Max content container constrained to 1280px with 3rem outer margins. The desktop layout accommodates side-by-side market inventories, tasting menus, and booking flows.
- **Tablet (768px - 1023px)**: 8-column layout with 2rem margins. Filters collapse into sliding bottom-sheets.
- **Mobile (< 767px)**: 4-column layout with 1.25rem outer margins. Cards snap horizontally for featured catches, with sticky bottom action bars for ordering and reservations.
- Spacing rhythm maintains an 8px base unit. Internal component padding favors generous breathing room (`space-md` to `space-lg`) to mirror open coastal horizon spaces.

## Elevation & Depth

Visual hierarchy employs Material Design 3 surface tiers augmented by ambient, ocean-tinted shadows rather than heavy drop shadows:

- **Surface Tonal Elevation**: Most structural depth is communicated through shifts between `surface-container-lowest` (#ffffff) and `surface-container-low` (#f1f5f9), reducing visual noise.
- **Shadow Tinting**: Shadows utilize deep oceanic blue undertones (`rgba(14, 116, 144, 0.08)` and `rgba(15, 23, 42, 0.06)`) rather than neutral pitch black, giving the UI an airy, light-refracting water quality.
- **Elevation Steps**:
  - **Level 0 (Flat)**: Background and static layout containers.
  - **Level 1 (Resting Cards & List Items)**: 1px outline in `#e2e8f0` plus a faint ambient shadow `0 2px 8px -2px rgba(14, 116, 144, 0.06)`.
  - **Level 2 (Hover & Floating Controls)**: Shadow `0 8px 24px -4px rgba(3, 105, 161, 0.12)`.
  - **Level 3 (Modals, Floating Reservation Bars, Drawers)**: Shadow `0 16px 40px -8px rgba(15, 23, 42, 0.16)`.
- **Glass Accents**: Sticky navigation bars and floating bottom order tabs use 12px backdrop-filter blur with 85% opacity `#ffffff` to retain connection with underlying culinary photography.

## Shapes

The design system implements a rounded shape geometry that balances architectural rigor with organic aquatic fluidity:

- **Base Radius (`rounded-md` / 0.5rem - 8px)**: Applied to input fields, table data rows, compact badges, and standard functional chips.
- **Container Radius (`rounded-2xl` / 1rem to 1.5rem - 16px to 24px)**: Applied to dish presentation cards, modal sheets, hero containers, and seasonal promo callouts.
- **Pill Radius (`rounded-full`)**: Strictly reserved for primary buttons, quantity selectors, status pills (e.g., "Fresh Catch"), and category chips to evoke smooth sea-pebbles.

## Components

### Buttons
- **Primary**: Full pill shape, background `#0369a1`, text `#ffffff`. On hover: `#0284c7` with `elevation-2`. Padding: `12px 24px` (`label-lg`).
- **Secondary**: Pill shape, transparent background with 1.5px solid border in `#0e7490`, text `#0e7490`. On hover: surface background `rgba(14, 116, 144, 0.06)`.
- **Tonal / Tertiary**: Background `#f0fdfa`, text `#0f766e`, borderless. Used for supplementary culinary actions (e.g., "View Wine Pairing").

### Chips & Badges
- **Market Filter Chips**: Rounded pill (`rounded-full`), height 36px, `surface-container-low` background, border `1px solid #cbd5e1`. Active state switches to `#0369a1` with crisp white text.
- **Provenance / Origin Badges**: Tiny capsule shape (`rounded-full`), padding `4px 10px`, background `#e0f2fe`, text `#0369a1` (`label-sm`), featuring catch methods (e.g., "Line Caught", "Galician Rías").

### Cards
- **Seafood & Dish Cards**: Corner radius of `rounded-2xl` (16px). White base (`surface-container-lowest`), subtle 1px border `#e2e8f0`. Image container aspect ratio 4:3 with overflow hidden and smooth zoom on hover. Bottom content area padded with `space-md`. Contains dish name, provenance subtitle, price formatted in bold tabular figures, and an embedded quick-order icon button.

### Form Inputs & Selectors
- **Text Fields**: Height 52px, radius `rounded-md` (8px), background `#f8fafc`, border `1.5px solid #cbd5e1`. Focus state transitions to `2px solid #0369a1` with zero drop shadow to preserve M3 clarity.
- **Date & Party Size Pickers**: Integrated segmented controls enclosed in a pill frame with smooth cyan/blue slider highlights.

### Selection Controls
- **Checkboxes & Radios**: 20px controls with a 2px stroke in `#0e7490`. Filled state utilizes `#0369a1` with white indicators.
- **Toggles / Switches**: Smooth 28px pill track with high-contrast thumb indicating market preferences (e.g., "Show Raw Bar Only").

### Domain-Specific Components
- **Daily Catch Board**: High-contrast tabular card with live availability indicators (`#14b8a6` green-cyan pulse dot for "Available", `#94a3b8` for "Sold Out").
- **Weight & Cut Selector**: Incremental stepper counter pill in `surface-container-low` with distinct tactile `+` and `–` touch targets.