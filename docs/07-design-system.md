# 8. Design System

## 8.1 Brand idea: "Jasmine & Gold"

Tunisian luxury is a calm, textured style. Think of the jasmine of Sidi Bou Saïd, hammam marble, and the gold of a henna night. The palette is **dark aubergine noir** for depth, **champagne gold** for premium accents, **rose clay** for warmth, and **jasmine ivory** for light surfaces. Effects stay understated: glass, a slow aurora, soft particles. Any motion should be something you *feel* rather than *see*.

## 8.2 Tokens

Defined in `src/app/globals.css` with Tailwind v4 `@theme`.

| Token | Value | Use |
|-------|-------|-----|
| `--color-noir-950` | `#0b0710` | page background (dark) |
| `--color-noir-900` | `#140d1c` | surfaces |
| `--color-noir-800` | `#1e1529` | raised surfaces |
| `--color-gold-300` | `#f1d9a6` | text accents |
| `--color-gold-400` | `#e5c07b` | primary accent |
| `--color-gold-500` | `#d4a64a` | primary buttons |
| `--color-rose-400` | `#e8a0a8` | secondary accent |
| `--color-rose-500` | `#d97a86` | |
| `--color-jasmine-50` | `#fbf8f3` | light surfaces |
| `--color-plum-500` | `#8b5cf6` → aurora mix | |
| Radius | `sm 8 · md 12 · lg 16 · xl 24 · pill 999` | |
| Shadow `glow-gold` | `0 0 40px -10px rgb(229 192 123 / .45)` | CTA hover |
| Blur `glass` | `backdrop-blur-xl` + `bg-white/[0.04]` + `border-white/10` | cards |

**Typography**
- Display: **Cormorant Garamond** (500/600, italic for emphasis), the editorial luxury voice
- UI/body: **Manrope** (400–700)
- Arabic: **Noto Kufi Arabic**, swapped in automatically when `dir="rtl"`
- Scale (fluid with `clamp`): `display-2xl 72→44`, `display-xl 56→36`, `h1 40→30`, `h2 32→26`, `h3 24→20`, `body 16`, `small 14`, `micro 12`

**Spacing**: 4px base, sections at `py-24 md:py-32`, container `max-w-7xl` with `px-4` (mobile 16px gutter), and `2xl:max-w-[1440px]` for ultra-wide.

## 8.3 Motion principles (Framer Motion)

| Principle | Rule |
|-----------|------|
| Duration | 200ms micro, 400–600ms reveal, 20–40s ambient loops |
| Easing | `[0.22, 1, 0.36, 1]` (easeOutQuint) for entrances; spring `stiffness 260, damping 24` for interactive elements |
| Reveal | fade + 24px rise, staggered 60ms, once per element (`viewport={{ once: true, margin: "-80px" }}`) |
| Hover | tilt of at most 8° (3D card), with a lift of `-4px` and a gold glow |
| Ambient | aurora gradients and particles run on the GPU (CSS transforms / canvas), pause off-screen, and are **disabled under `prefers-reduced-motion`** |
| Page transitions | View Transitions API (`next-view-transitions`) with a cross-fade and a shared element for the center cover image |
| Budget | ≤ 1 ambient effect per viewport; no motion on scroll-jacking |

## UI kit

Located in `src/components/ui` and `src/components/effects`.

| Component | Variants | Notes |
|-----------|----------|-------|
| `Button` | `gold` (primary), `glass`, `outline`, `ghost`, `link` · sizes `sm md lg icon` | cva + Radix Slot (`asChild`) |
| `Badge` | `gold`, `glass`, `rose`, `success` | used for "Ouvert", "Sponsorisé", "Vérifié" |
| `GlassCard` | `subtle`, `raised` | glassmorphism surface |
| `TiltCard` | — | 3D pointer tilt + specular highlight (spinning/interactive cards) |
| `Aurora` | `intensity` | animated blurred gradient blobs |
| `Particles` | `count`, `color` | canvas, DPR-aware, auto-pauses |
| `Reveal` / `Stagger` | — | scroll-triggered entrances |
| `AnimatedCounter` | — | counts up when in view |
| `RatingStars` | sizes | half-star support |
| `CenterCard` | `default`, `compact`, `horizontal` | the main marketplace card |
| `SectionHeading` | — | eyebrow + display title + lede |
| `SearchBar` | hero, compact | service + location (GPS or governorate) |
| Planned | `Dialog`, `Sheet`, `Tabs`, `Select`, `Calendar`, `SlotPicker`, `Toast`, `Avatar`, `Skeleton`, `DataTable`, `Chart` | via `npx shadcn add` and then restyled with the tokens |

## 8.4 Accessibility

- WCAG 2.2 AA: gold-on-noir text is only used at ≥ 18px. Body text is `jasmine-50/80` on noir, which gives a contrast of 11:1.
- Focus rings are a visible `ring-2 ring-gold-400 ring-offset-2 ring-offset-noir-950`.
- Full RTL support: layout uses logical properties (`ps-`, `me-`, `start-`) everywhere.
- Every interactive effect has a keyboard and reduced-motion equivalent.
