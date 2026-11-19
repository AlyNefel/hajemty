# 14. Premium Theme Builder Architecture

## 14.1 Core idea: a page is data, never code

A center's mini-site is a **Theme document**: design tokens plus an ordered list of typed **sections**. The renderer (`src/components/center/CenterSite.tsx`) maps each section type to a React component. Owners never ship code, which keeps every theme fast, accessible, SEO-correct and safe.

```ts
// src/lib/theme/schema.ts (zod; shared by the builder UI, the API and the renderer)
Theme = {
  version: number,
  template: "luxury_spa" | "modern_salon" | "premium_beauty" | "minimal" |
            "feminine" | "luxury_gold" | "black_edition" | "medical_aesthetic",
  tokens: {
    colors: { primary, secondary, background, surface, text, muted },  // hex
    typography: { display: FontKey, body: FontKey, scale: "sm"|"md"|"lg" },
    radius: "none"|"sm"|"md"|"lg"|"pill",
    cardStyle: "glass"|"solid"|"outline"|"elevated",
    pageStyle: "dark"|"light"|"auto",
    animation: "none"|"subtle"|"elegant"|"expressive",
    seasonal?: "ramadan"|"eid"|"summer"|"wedding"|"christmas"|null
  },
  sections: Array<{ id, type, visible, props }>   // ordered
}
```

**Section types**: `hero` (image | video | slideshow), `about`, `services` (grid | list | tabs by category), `team`, `gallery` (masonry | carousel), `reviews`, `testimonials`, `promotions`, `banner`, `faq`, `hours_location` (map), `social_feed`, `cta_booking`, `custom_html` (Premium, sandboxed), `video`.

## 14.2 Plan gating (validated server-side, not only in UI)

| Capability | FREE | PRO | PREMIUM |
|------------|:----:|:---:|:-------:|
| Templates | minimal, modern_salon, feminine | all 8 | all 8 |
| primary/secondary color | ✔ | ✔ | ✔ |
| full palette, typography, radius, card/page style | | | ✔ |
| Reorder / hide sections | basic set only | ✔ | ✔ |
| video hero, custom gallery, testimonials, FAQ, banner, promo blocks | | partial | ✔ |
| animations selection, seasonal themes | | | ✔ |
| `custom_html` | | | ✔ |

`validateThemeForPlan(theme, plan)` either strips or rejects disallowed features on save. A downgrade keeps the stored theme but renders it through the gate, so nothing is lost if the center upgrades again.

## 14.3 Rendering pipeline

1. `theme.tokens` → `themeToCssVars()` produces `--c-primary`, `--c-surface`, `--font-display`, `--radius`, … on the site root `<div style>`. There is zero runtime JS for theming.
2. Fonts come from a curated allowlist of 16 `next/font` families. They are preloaded per template, so arbitrary Google Font URLs never load.
3. Sections are Server Components. Only interactive islands (booking widget, gallery lightbox, map) hydrate.
4. Animations: `animation` maps to a Framer Motion preset object passed via context (`none` disables everything).
5. The page is cached with tag `center:{slug}`. **Publish** calls `revalidateTag`, so the change is live worldwide within about a second.

## 14.4 Draft / publish / versions

- The builder edits `themeDraft`, with autosave debounced at 800ms.
- **Preview** runs at `/center/:slug?preview=<signed token>` inside an iframe in the builder. Updates go over `postMessage`, which gives instant live preview without saving.
- **Publish** copies the draft to `theme`, increments `version`, and pushes the previous version into `themeVersions` (last 20 kept), so one-click revert is available.

## Custom Design Builder

### Builder UI (dashboard `/dashboard/site`)
```
┌──────────────┬──────────────────────────────────┬─────────────────┐
│ Sections     │                                  │ Inspector       │
│ ≡ Hero    👁 │      Live preview iframe         │ (props of       │
│ ≡ Services 👁│      desktop | tablet | mobile   │  selected       │
│ ≡ Team    👁 │                                  │  section or     │
│ + Add block  │                                  │  global tokens) │
├──────────────┴──────────────────────────────────┴─────────────────┤
│ Templates · Colors · Typography · Animations · Seasonal · Publish │
└────────────────────────────────────────────────────────────────────┘
```

- Sections are reordered with drag and drop via `@dnd-kit/sortable`, with keyboard support.
- The Inspector form is **generated from each section's zod schema** (`zod → form fields` with per-field UI hints), so adding a new section type means writing one schema and one renderer, with no builder code.
- The color picker suggests palettes derived from the uploaded logo (Cloudinary `predominant` colors) and enforces WCAG contrast by auto-adjusting text color.
- Undo/redo via an immutable history stack (Immer patches), up to 50 steps.

### Custom HTML block (Premium) security
The HTML is sanitized server-side (DOMPurify via jsdom) with an allowlist, and rendered in `<iframe sandbox="allow-scripts" srcdoc=…>` with **no** `allow-same-origin`. It cannot read cookies or the parent DOM. Size is capped at 20KB, and blocks are flagged for review when they contain external scripts.

### Mini-site routing & custom domains
- `/center/:slug` works on every plan.
- `slug.hajemti.tn`: wildcard DNS `*.hajemti.tn` points to Vercel. Middleware rewrites host `slug.hajemti.tn` to `/center/slug`.
- Custom domain: the owner adds `beautylounge.tn` and we call the Vercel Domains API to attach it and show the DNS record to add. Middleware looks up `customDomain → slug` in a Redis map cached for 5 minutes, and TLS is automatic.
