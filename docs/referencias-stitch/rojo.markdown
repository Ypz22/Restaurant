---
name: Savor & Spice M3
colors:
  surface: '#fbf9f5'
  surface-dim: '#dbdad6'
  surface-bright: '#fbf9f5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3ef'
  surface-container: '#efeeea'
  surface-container-high: '#eae8e4'
  surface-container-highest: '#e4e2de'
  on-surface: '#1b1c1a'
  on-surface-variant: '#574141'
  inverse-surface: '#30312e'
  inverse-on-surface: '#f2f0ed'
  outline: '#8a7170'
  outline-variant: '#debfbe'
  surface-tint: '#a7373b'
  primary: '#9c2f33'
  on-primary: '#ffffff'
  primary-container: '#bc4749'
  on-primary-container: '#ffefee'
  inverse-primary: '#ffb3b0'
  secondary: '#8c4e35'
  on-secondary: '#ffffff'
  secondary-container: '#ffad8f'
  on-secondary-container: '#793f27'
  tertiary: '#84460b'
  on-tertiary: '#ffffff'
  tertiary-container: '#a15e23'
  on-tertiary-container: '#fff0e7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad8'
  primary-fixed-dim: '#ffb3b0'
  on-primary-fixed: '#410007'
  on-primary-fixed-variant: '#861f25'
  secondary-fixed: '#ffdbce'
  secondary-fixed-dim: '#ffb59a'
  on-secondary-fixed: '#380d00'
  on-secondary-fixed-variant: '#6f3720'
  tertiary-fixed: '#ffdcc4'
  tertiary-fixed-dim: '#ffb780'
  on-tertiary-fixed: '#2f1400'
  on-tertiary-fixed-variant: '#6f3800'
  background: '#fbf9f5'
  on-background: '#1b1c1a'
  surface-variant: '#e4e2de'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
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
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 30px
  title-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 26px
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: 0.01em
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
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.02em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.04em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

> **NO NORMATIVO.** Exporte original de Stitch, conservado solo como inspiración de tono. Contiene valores contradictorios y tokens erróneos. La fuente de verdad es `DESIGN.md` en la raíz del repo.

## Brand & Style

This design system expresses an inviting, sensory-rich culinary atmosphere through the lens of modern Material Design 3 (Material You). Built specifically for mobile-first interactive dining and digital menus, it combines the tactile warmth of sun-baked terracotta, smoked paprika, and honeyed amber with the systematic clarity of expressive tonal surfaces.

### Design Aesthetic
- **Warm Contemporary Materiality:** Blends M3 container elevation with organic, earthy undertones to avoid the clinical sterility of generic software interfaces.
- **Sensory & Appetizing:** Rich spice accents direct hunger and highlight featured selections without overwhelming readability.
- **Intuitive Touch Ergonomics:** Expansive touch targets, rounded-2xl/rounded-3xl edge profiles, and distinct dietary micro-signifiers ensure stress-free ordering at the table or on the go.

## Colors

The color palette is rooted in culinary craftsmanship, drawing from paprika, roasted clay, and toasted spices. Surfaces rely on warm tonal shifts rather than pure stark whites or sterile grays.

### Functional Roles
- **Primary (`#BC4749` / Terracotta Paprika):** Primary action buttons ("Add to Order", "View Bill"), active navigation indicators, and primary price accents. Its deeper counterpart (`#A7333B`) provides high-contrast press states and focused emphasis.
- **Secondary (`#E29578` / Toasted Amber):** Secondary buttons, category tabs, and selection rings.
- **Tertiary (`#F4A261` / Warm Saffron):** Promotional banners, "Recomendación del Chef" highlights, and interactive star ratings.
- **Surface & Background (`#FDFBF7` to `#F4F1EA`):** Gentle, parchment-inspired tonal canvas that softens screen glare under restaurant lighting.
- **Dark Neutral Container (`#2C2523` / Espresso Bean):** Deep, organic brown utilized for floating bottom sheets, persistent order bars, and contrasting callouts instead of harsh pitch-black (`#1A1514` reserved for deep scrims and dark-mode base canvases).

### Dietary & Micro-Feedback Tokens
- **Vegano:** Soft botanical green (`#4F772D`) on tinted matcha container (`#EDF4E5`).
- **Sin Gluten:** Corn silk ochre (`#B58300`) on subtle golden wash (`#FFF8E1`).
- **Picante:** Vivid cayenne (`#D9381E`) paired with soft paprika tint (`#FDECE8`).
- **Recomendación del Chef:** Burnished saffron (`#E76F51`) on light honey container (`#FEF2E8`).

## Typography

The typography leverages **Plus Jakarta Sans** across all roles to achieve a clean, welcoming, and contemporary geometric balance. Its humanist nuances maintain warmth, while crisp terminal cuts ensure dish names, prices, and complex ingredient lists remain effortlessly legible on mobile screens under varying ambient light conditions.

- **Headlines & Titles:** Set with tighter tracking (`-0.01em` to `-0.02em`) and heavier weights (600–700) to anchor menu sections and item names with clear presence.
- **Body:** Calibrated line heights (1.5x font size) prevent dense descriptions of ingredients from fatiguing diners.
- **Labels & Badges:** Distinct uppercase or slightly expanded tracking (`+0.04em` to `+0.05em`) for dietary filters and badges ensures immediate recognition at small sizes.

## Layout & Spacing

This mobile-centric menu interface utilizes a single-column to 4-column responsive fluid grid designed for high-density thumb-reach ergonomics:

- **Mobile Viewport (up to 599px):** 4-column fluid layout with `1rem` margins and `1rem` gutters. Primary action zones are anchored within the thumb-accessible lower 40% of the screen.
- **Tablet / Countertop Kiosks (600px - 1024px):** 8-column layout with `1.5rem` margins and `1rem` gutters, allowing side-by-side category navigation alongside food item listings.
- **Vertical Rhythm:** A strict 4px/8px modular base scale governs all internal spacing, badge paddings, and card content gaps.

## Elevation & Depth

In accordance with Material Design 3 principles, elevation is primarily conveyed through warm **tonal color mapping** layered with soft, warm-tinted ambient shadows rather than cold grays.

- **Level 0 (Flat / Canvas):** Neutral surface `#FDFBF7`. Flat against viewport; used for overall page scaffolding.
- **Level 1 (Card / Resting Item):** Surface container `#F4F1EA` paired with shadow `0px 1px 3px 1px rgba(44, 37, 35, 0.06), 0px 1px 2px 0px rgba(44, 37, 35, 0.12)`.
- **Level 2 (Hover / Active Dish Card):** Elevated container `#EFECE3` with shadow `0px 2px 6px 2px rgba(44, 37, 35, 0.08), 0px 1px 2px 0px rgba(44, 37, 35, 0.14)`.
- **Level 3 (Modal / Persistent Order Drawer):** Tinted Dark Container `#2C2523` or elevated parchment `#EAE6DC` with shadow `0px 4px 8px 3px rgba(44, 37, 35, 0.12), 0px 1px 3px 0px rgba(44, 37, 35, 0.18)`.

## Shapes

The shape system adopts soft, organic geometry reflecting warm culinary hospitality. It relies heavily on generous corner curves to create an approachable touch experience:

- **Standard Elements (Buttons, Inputs, Small Badges):** 8px to 12px radius (`rounded-md` to `rounded-lg`).
- **Dish Cards & Content Containers:** 16px to 24px radius (`rounded-2xl` to `rounded-3xl`), mirroring modern M3 medium/large shapes.
- **Interactive Dietary Chips & Floating Badges:** Full pill-shaped radius (`9999px`) for quick tactile scanning.
- **Bottom Drawers & Sticky Order Bar:** 28px top-left and top-right radii (`rounded-t-[28px]`).

## Components

### Buttons
- **Filled Primary:** Background `#BC4749`, text `#FFFFFF`, 12px radius, min-height 48px for thumb interaction. Hover shifts to `#A7333B`; active state scales subtly (`0.98`) with a warm ripple effect.
- **Tonal Secondary:** Background `#F4E7E1`, text `#BC4749`, 12px radius. Ideal for item quantity adjustments (`+` / `-`) and non-destructive selections.
- **Floating Sticky Action Bar:** Surface `#2C2523` container with full pill or 24px rounded corners, containing current tray count and price in `#FDFBF7`, flanked by a primary `#BC4749` checkout trigger.

### Dietary & Filter Chips
- **Dietary Badges:** Pill-shaped (`rounded-full`), height 24px–28px, uppercase `label-sm` typography with leading micro-icon:
  - *Vegano:* `#EDF4E5` fill with `#4F772D` text/border.
  - *Sin Gluten:* `#FFF8E1` fill with `#B58300` text/border.
  - *Picante:* `#FDECE8` fill with `#D9381E` text/border.
  - *Chef:* `#FEF2E8` fill with `#E76F51` text/border.
- **Category Filter Chips:** Horizontal scrolling pills. Unselected: `#F4F1EA` surface, `#2C2523` text. Selected: `#BC4749` background, `#FFFFFF` text.

### Dish Cards
- **Structure:** 16px or 20px corner radius (`rounded-2xl`). Contained padding of `1rem`. Uses an asymmetrical layout: dish title, truncated culinary description, dietary micro-tags, and price in bold `title-md` (`#BC4749`) on the left, with an 88x88px or 104x104px square food photo with 16px border radius on the right.
- **States:** Default resting elevation (Level 1). Active touch gives a brief background transition to `#EFECE3` with tactile scale response.

### Modifiers & Quantity Selectors
- **Radio & Checkbox (Customizations):** Paprika-tinted check states (`#BC4749`). Unchecked borders use warm neutral outline `#D6CFC7`.
- **Inline Stepper:** Pill container with light terracotta background (`#F4E7E1`), housing circular `-` and `+` touch icons separated by high-contrast numeral counter.