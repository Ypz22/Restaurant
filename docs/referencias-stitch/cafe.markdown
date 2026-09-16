---
name: Origen & Brasa
colors:
  surface: '#fdf9f4'
  surface-dim: '#ddd9d5'
  surface-bright: '#fdf9f4'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f7f3ee'
  surface-container: '#f1ede8'
  surface-container-high: '#ebe8e3'
  surface-container-highest: '#e6e2dd'
  on-surface: '#1c1c19'
  on-surface-variant: '#4f4440'
  inverse-surface: '#31302d'
  inverse-on-surface: '#f4f0eb'
  outline: '#817470'
  outline-variant: '#d3c3be'
  surface-tint: '#73584e'
  primary: '#070100'
  on-primary: '#ffffff'
  primary-container: '#2b1810'
  on-primary-container: '#9c7e73'
  inverse-primary: '#e2bfb2'
  secondary: '#8e4e00'
  on-secondary: '#ffffff'
  secondary-container: '#fda95a'
  on-secondary-container: '#723e00'
  tertiary: '#050100'
  on-tertiary: '#ffffff'
  tertiary-container: '#361100'
  on-tertiary-container: '#bd714b'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbcd'
  primary-fixed-dim: '#e2bfb2'
  on-primary-fixed: '#2a170f'
  on-primary-fixed-variant: '#5a4137'
  secondary-fixed: '#ffdcc1'
  secondary-fixed-dim: '#ffb778'
  on-secondary-fixed: '#2e1500'
  on-secondary-fixed-variant: '#6c3a00'
  tertiary-fixed: '#ffdbcb'
  tertiary-fixed-dim: '#ffb693'
  on-tertiary-fixed: '#351000'
  on-tertiary-fixed-variant: '#723614'
  background: '#fdf9f4'
  on-background: '#1c1c19'
  surface-variant: '#e6e2dd'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 56px
    fontWeight: '700'
    lineHeight: 64px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 38px
    fontWeight: '700'
    lineHeight: 46px
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
    letterSpacing: 0em
  title-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: 0em
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: 0.005em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: 0.01em
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: 0.01em
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.06em
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
  margin: 2rem
  margin-mobile: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

> **NO NORMATIVO.** Exporte original de Stitch, conservado solo como inspiración de tono. Contiene valores contradictorios y tokens erróneos. La fuente de verdad es `DESIGN.md` en la raíz del repo.

## Brand & Style

This design system expresses the sensory intimacy and craft of third-wave artisanal coffee roasting. The aesthetic bridges earthy tactility with clean, modern Material Design 3 surface philosophy. It evokes calm indulgence, precision, warmth, and grounded sophistication. 

The visual style pairs warm tonal surface layers with subtle amber glow accents, pill-form interactive elements, and sweeping `rounded-2xl` structural cards. It avoids sterile corporate minimalism in favor of rich, roasted depth—evoking ceramic cups, natural linen, steam, and sunlit roast labs.

## Colors

The palette is rooted in coffee bean extraction:
- **Primary (`#2B1810` - Deep Espresso):** Anchors high-emphasis typography, prominent navigation surfaces, and primary button containers.
- **Secondary (`#C87D32` - Roasted Amber):** Used for focal calls to action, active indicators, origin roast stamps, and rating highlights.
- **Tertiary (`#8C4A27` - Warm Caramel):** Used for accent badges, tasting notes tags, and subtle contextual borders.
- **Neutral Surface Palette:**
  - Base canvas: `#FDFBF7` (Steamed Milk)
  - Surface Container Low: `#F5EFEB` (Creamy Latte Beige)
  - Surface Container: `#EDE4DC` (Warm Oat Foam)
  - Surface Container High: `#E4D8CD` (Light Mocha)
  - Outline & Ghost Strokes: `#D7C7BA` (Subtle raw parchment)
  - Text Neutral: `#201A17` on light surfaces; `#FAF5EE` on dark espresso surfaces.

## Typography

Typography relies entirely on **Plus Jakarta Sans**, utilizing its geometric warmth and rounded terminal curves to reinforce friendliness without compromising editorial structure.

- **Headlines & Titles:** Set with tighter letter-spacing and heavier weights (600–700) to emulate artisan packaging and coffee bag typography.
- **Body:** Generous 1.6x line-height to ensure high legibility across long origin descriptions, tasting notes, and brewing instructions.
- **Labels & Tags:** Uppercase `label-sm` with widened tracking (+0.06em) is reserved for elevation tags, wash processes (e.g., "ANAEROBIC NATURAL"), and batch IDs.

## Layout & Spacing

The layout is built on a responsive 12-column grid on desktop (max content boundary: 1280px) transitioning to a 4-column fluid structure on mobile devices.

- **Rhythm:** An 8pt spatial grid anchors layouts. Generous vertical breathing room (`space-xl`) between catalog tiers creates an unhurried, luxury café atmosphere.
- **Breakpoints:**
  - `Mobile` (< 640px): 4 columns, 16px gutter, 20px edge margin. Single-column card stacking.
  - `Tablet` (640px - 1024px): 8 columns, 24px gutter, 32px edge margin. 2-column menu grids.
  - `Desktop` (> 1024px): 12 columns, 24px gutter, 32px-48px outer margin.

## Elevation & Depth

Visual hierarchy uses Material Design 3 tonal surface elevation layered with warm, ambient espresso-tinted drop shadows:

- **Level 0 (Flat):** Base canvas in `#FDFBF7`.
- **Level 1 (Cards & Tiles):** Tonal surface `#F5EFEB` with a featherweight warm shadow: `0 2px 8px -2px rgba(43, 24, 16, 0.06)`.
- **Level 2 (Hovered Cards, Dropdowns):** Surface `#EDE4DC` with elevated shadow: `0 8px 24px -4px rgba(43, 24, 16, 0.09)`.
- **Level 3 (Modals, Sticky Cart Bar, Drawers):** `#FAF5EE` with deep ambient lift: `0 16px 40px -6px rgba(43, 24, 16, 0.14)`.
- **Accents:** Active interactive elements carry an internal micro-stroke (`border: 1px solid rgba(200, 125, 50, 0.25)`) to replicate polished ceramic finishes.

## Shapes

The design uses distinct shape differentiation:
- **Cards & Surfaces:** Exclusively configured with `rounded-2xl` (16px / 1rem radius) to evoke the soft contour of tactile ceramic wares and roasted bean profiles.
- **Buttons & Filter Chips:** Fully rounded pill-shapes (`border-radius: 9999px`) for high-touch thumb accessibility and friendly tactile interaction.
- **Text Inputs & Sheets:** `rounded-lg` (12px) to keep text boundaries stable and structured.

## Components

### Buttons
- **Primary:** Espresso brown `#2B1810` background, `#FAF5EE` text, pill radius, padding `12px 24px`. Hover triggers warm amber lift `#3C2419`.
- **Secondary:** Transparent with a 1.5px solid border in `#2B1810` and text in `#2B1810`.
- **Tertiary / Amber CTA:** Amber fill `#C87D32` with white text for "Add to Cart" or "Brew This Roast".

### Cards (Product & Tasting Profile)
- Styled in `rounded-2xl`, background `#F5EFEB`, padding `20px`.
- Contains roast level indicators (visual pill bars shaded from blonde to dark roast), aroma tag clouds, and an inset image with a soft rounded inner contour (12px radius).

### Chips & Filter Tags
- Pill-shaped (`rounded-full`), height 36px, padding `0 16px`.
- Unselected: Surface `#EDE4DC`, text `#5C4436`.
- Selected: Amber `#C87D32` background with `#FFFFFF` text and subtle warm glow shadow.

### Inputs & Quantity Pickers
- Height 48px, background `#FDFBF7`, border 1px solid `#D7C7BA`, `rounded-lg`.
- Focus ring: 2px solid `#C87D32` with 0px outline offset.
- Quantity selectors use pill-capsules containing circular `-` and `+` touch targets with espresso glyphs.

### Origin Badges & Sensory Gauges
- Specialized badges for roast dates, process methods, and cupping scores.
- Compact uppercase tags with `#2B1810` fill and amber `#C87D32` text for direct flavor clarity (e.g., "JASMINE • BERGAMOT • HONEY").