---
name: Calm Culinary Operations
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#42474c'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#73787d'
  outline-variant: '#c2c7cc'
  surface-tint: '#466275'
  primary: '#042436'
  on-primary: '#ffffff'
  primary-container: '#1e3a4c'
  on-primary-container: '#88a4b9'
  inverse-primary: '#aecae1'
  secondary: '#44617b'
  on-secondary: '#ffffff'
  secondary-container: '#c2e0fe'
  on-secondary-container: '#47647d'
  tertiary: '#321e00'
  on-tertiary: '#ffffff'
  tertiary-container: '#4f3100'
  on-tertiary-container: '#d1953e'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cae6fd'
  primary-fixed-dim: '#aecae1'
  on-primary-fixed: '#001e2e'
  on-primary-fixed-variant: '#2e4a5c'
  secondary-fixed: '#cce5ff'
  secondary-fixed-dim: '#accae7'
  on-secondary-fixed: '#001d31'
  on-secondary-fixed-variant: '#2c4962'
  tertiary-fixed: '#ffddb5'
  tertiary-fixed-dim: '#fcba60'
  on-tertiary-fixed: '#2a1800'
  on-tertiary-fixed-variant: '#643f00'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
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
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.03em
  numeric-timer:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 22px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.875rem
  space-lg: 1.25rem
  space-xl: 2rem
---

> **NO NORMATIVO.** Exporte original de Stitch, conservado solo como inspiración de tono. Contiene valores contradictorios y tokens erróneos. La fuente de verdad es `DESIGN.md` en la raíz del repo.

## Brand & Style

The design system establishes an environment of serene authority and sustained operational clarity across busy commercial kitchens (KDS), service passes, and back-office management. Hospitality software often overwhelms teams with high-saturation sirens, aggressive alerts, and erratic contrast; this system replaces anxiety with quiet precision, deliberate hierarchy, and ergonomic comfort under high-stress, variable-lighting environments.

The visual direction combines **Minimalism** with subtle **Tactile Precision**:
- **Demeanor**: Poised, trustworthy, and measured. High cognitive speed without visual hysteria.
- **Audience**: Line chefs managing peak ticket surges, floor managers balancing covers, and restaurant owners reviewing food cost analytics.
- **Emotional Intent**: Control, calm under pressure, reliability, and mental breathing room.
- **Critical Visual Principle**: Reserve saturated chromatic warnings strictly for zero-compromise emergencies (severe anaphylactic allergen conflicts, line stops, or catastrophic delays). Normal operations, ticket progression, and inventory flows rely on deep petrol blues, soft slates, muted ambers, and neutral structures.

## Colors

The chromatic architecture replaces alarms with semantic balance. Deep petrol `#1E3A4C` anchors primary directives and active navigation, conveying composure and authority. Slate blue `#3D5A73` handles structural boundaries, secondary interactive elements, and grouped category divisions. Warm amber `#C88D37` manages passive pacing (such as prep warm-ups or moderate wait-time thresholds) without raising systemic panic.

### Semantic Rules
- **Critical Red Exclusivity (`#C0392B`)**: Strictly forbidden for common time metrics or standard cancellations. It is unlocked solely for life-critical allergen flags (e.g., celiac cross-contamination risks, peanut allergies) or severe ticket bottlenecks exceeding double standard prep time.
- **Surface Foundations**: Light slate neutrals (`#F8FAFC`, `#F1F5F9`, `#E2E8F0`) prevent glare under stainless-steel pass warmers and overhead fluorescent strip lights. Darker Slate/Charcoal `#0F172A` provides crisp typographic contrast without harsh pure black.
- **Status Progression**:
  - *New / In Queue*: Balanced Slate (`#475569` on `#F1F5F9`).
  - *Firing / Active*: Petrol Blue (`#1E3A4C` on `#E2E8F0`).
  - *Ready / Plated*: Soft Moss/Sage (`#2D6A4F` on `#E8F5E9`), quiet and clear.
  - *Elapsed*: Warm Amber (`#C88D37`), never flashing red.

## Typography

Plus Jakarta Sans provides geometric legibility with humanist warmth. The open counters, distinct aperture widths, and clean geometric proportions guarantee error-free readability at arm's length on kitchen-mounted touchscreen panels, POS handhelds, and desktop accounting tables.

### Typographic Hierarchy Guidelines
- **Modifications & Allergens**: Must use `label-lg` with medium to bold weights, distinguished by background encapsulation rather than excessive font size.
- **Tabular Figures**: Numeric quantities, seat assignments, course ordering, and stopwatch counters must leverage tabular numerals (`font-feature-settings: "tnum" 1`) to preserve vertical scanning alignment across busy ticket columns.
- **Caps Policy**: Avoid full-caps for body descriptions and modifier notes to prevent cognitive fatigue. Uppercase is strictly limited to compact metadata tags using `label-sm` with slight positive tracking.

## Layout & Spacing

The layout adopts a high-density, modular fluid grid capable of adapting across wall-mounted KDS monitors (horizontal orientation), counter POS units, and handheld waitstaff tablets.

### Responsive Rules
- **Kitchen Display System (KDS)**: Horizontal multi-column rail (auto-fit columns with a strict min-width of 280px and max-width of 340px). Columns flex to use available viewport space with consistent `gutter-desktop` (24px) spacing, preventing visual overlap.
- **Back-Office / Administration**: 12-column responsive layout with fixed 240px collapsable navigation rail. Max content container is 1440px to ensure data density remains within human comfortable eye-tracking range.
- **Touch Targets**: While internal padding within cards can be dense (`space-xs` to `space-sm`), interactive boundaries for kitchen staff (touchable modifiers, ticket bumps) must uphold a minimum tap area of 44x44px.

## Elevation & Depth

Visual depth is achieved through **Tonal Layers** and **Low-Contrast Outlines** rather than heavy drop shadows. High-glare kitchen environments render subtle ambient drop shadows invisible or muddy; clean planar shifts are superior for rapid scanning.

- **Level 0 (Canvas Base)**: Cool Slate `#F8FAFC`. Background layer for all administrative and KDS views.
- **Level 1 (Card & Ticket Surface)**: Pure White `#FFFFFF` bound by a delicate 1px border of Slate Gray `#E2E8F0`.
- **Level 2 (Active/Floating Panels & Dropdowns)**: White `#FFFFFF` elevated by an understated ambient shadow: `0 4px 12px -2px rgba(30, 58, 76, 0.08)`, edged by a 1px border of `#CBD5E1`.
- **Level 3 (Modal Confirmation & Emergency Allergen Dialogue)**: Layered over a soft Petrol backdrop overlay (`rgba(15, 23, 42, 0.4)` with `backdrop-filter: blur(4px)`). Shadow: `0 12px 28px -4px rgba(15, 23, 42, 0.14)`.

## Shapes

The shape system employs roundedness level **2** (`0.5rem` / 8px for standard components, `1rem` / 16px for larger cards and modal containers). 

This curvature softens the hard industrial look of kitchen hardware and terminal screens, reducing visual fatigue while remaining structurally disciplined enough for dense tabular layouts. Status pills, course markers, and counter chips use fully circular radius (`9999px`) to distinguish categorical indicators from structural UI boxes immediately.

## Components

### 1. KDS Ticket Card
- **Structure**: White container, 8px radius, 1px `#E2E8F0` border.
- **Header**: Petrol blue top accent (`#1E3A4C`) containing order ID, server name, and a discreet elapsed-time counter in `numeric-timer` styling.
- **Body**: Items separated by hairline dividers (`#F1F5F9`). Special prep notes use an indented block with soft amber left border (`#C88D37`, 3px).
- **Bump Action**: A solid, full-width slate-petrol touch bar along the bottom with `label-lg` centered typography.

### 2. Emergency Allergen Badge
- **Style**: High-priority pill, solid `#FDF2F2` fill, `#C0392B` crisp border (1.5px), `#991B1B` bold text.
- **Usage**: Only placed when medical or severe food safety flags exist. Never used for regular modifier changes (e.g., "no onions" uses neutral gray pills).

### 3. Buttons
- **Primary**: Solid `#1E3A4C` petrol fill, white text, 8px corner radius. No gradient. Pressed state shifts to `#132633`.
- **Secondary**: Light slate background `#F1F5F9`, text `#3D5A73`, borderless. Hover shifts to `#E2E8F0`.
- **Tertiary / Ghost**: Transparent base with `#3D5A73` text and a subtle 1px `#CBD5E1` border.
- **Critical Action**: Deep brick crimson (`#C0392B`) reserved exclusively for voiding tickets, line shutdowns, or allergen-override confirmations.

### 4. Chips & Course Pills
- **Active Course (e.g., Entrée)**: `#1E3A4C` text on `#E2E8F0` badge.
- **Pending Course (e.g., Dessert)**: `#64748B` text on `#F8FAFC` badge with subtle `#E2E8F0` border.
- **Completed**: `#2D6A4F` text on `#E8F5E9` badge.

### 5. Input Fields & Search Bars
- **Surface**: White background, 8px radius, 1px border in `#CBD5E1`.
- **Focus State**: Border switches to Petrol `#1E3A4C` with a soft 2px ring at 20% opacity (`rgba(30, 58, 76, 0.2)`).
- **Touch Ergonomics**: Minimum height of 42px on desktop, 48px on mobile/tablet KDS inputs.

### 6. Data Tables (Admin & Reporting)
- **Header**: Slate tint `#F8FAFC` with `#475569` text in `label-sm` uppercase.
- **Rows**: Alternating subtle hover states (`#F8FAFC`), single line separator `#F1F5F9`.
- **Metrics**: Numerical columns right-aligned, monospaced tabular figures for instant revenue and inventory reconciliation.