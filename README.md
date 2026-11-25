# Hajemti · حجامتي

Tunisia's beauty & wellness marketplace, covering discovery, booking, social features and a mini-website for every center.

**Stack:** Next.js 15 (App Router, RSC) · React 19 · TypeScript · Tailwind CSS v4 · Framer Motion · Radix UI · MongoDB/Mongoose · Auth.js v5 · Cloudinary.

## Quick start

```bash
npm install
cp .env.example .env.local     # optional: everything works on demo data without a DB
npm run dev                    # http://localhost:3000
```

With **no `MONGODB_URI`** the app runs on the built-in demo dataset (8 centers across Tunis, Ariana, Sousse, Sfax, Nabeul and Djerba). Browsing, search and slot availability all work, and booking returns `503 DEMO_MODE`.

With a database (Atlas, or a local replica set, since booking uses transactions):

```bash
npm run seed
```

## Scripts
| Script | |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build (pre-renders center and SEO landing pages) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Booking engine unit tests (`node:test`) |
| `npm run seed` | Upsert the demo data into MongoDB |

## What's in the box

| Area | Where |
|---|---|
| Blueprint (all 18 deliverables) | [`docs/`](docs/README.md) |
| Design tokens ("Jasmine & Gold") | `src/app/globals.css` |
| UI kit & effects (glass, aurora, particles, tilt cards, counters, reveals) | `src/components/ui`, `src/components/effects` |
| Homepage: 12 sections | `src/app/page.tsx`, `src/components/home` |
| Center mini-site, theme-driven, with booking widget | `src/app/center/[slug]`, `src/components/center` |
| Search + filters (GPS, governorate, category, open now, gender, sort) | `src/app/recherche` |
| SEO landing pages `/coiffeur/tunis`, `/spa/djerba`… (288) | `src/app/[category]/[governorate]` |
| Sitemap, robots, JSON-LD (LocalBusiness, FAQ, Breadcrumb, ItemList) | `src/app/sitemap.ts`, `robots.ts`, `components/seo` |
| Mongoose models (users, centers, services, staff, bookings + locks, reviews, chat, social, loyalty, billing, audit) | `src/models` |
| RBAC (roles × center memberships, resource policies) | `src/lib/rbac.ts` |
| Plans & feature flags, theme plan-gating | `src/lib/plans.ts` |
| Theme schema, 8 templates, CSS-variable renderer | `src/lib/theme` |
| Booking engine: pure availability + granule-lock transactions | `src/lib/booking` |
| Auth (Google / Facebook / Apple, JWT + role claims) | `src/auth.ts`, `src/auth.config.ts` |
| Middleware: rate limits, CSRF origin check, RBAC gates, security headers | `src/middleware.ts` |
| 24 governorates + delegations, 12 categories | `src/data/tunisia.ts` |

## Owner dashboard — `/dashboard`

| Page | What it does |
|---|---|
| `/dashboard/[center]` | Today's KPIs (bookings, expected revenue (owner only), occupancy, pending), upcoming appointments, top services |
| `…/calendar?date=` | Resource day view (one column per staff), week strip with counts, click a booking → confirm / check-in / complete / no-show / cancel, click an empty slot → phone or walk-in booking |
| `…/services` | Create / edit / activate / delete services, grouped by category; changes appear on the public page |
| `…/staff` | Team members, colors, weekly hours, which services they perform, online bookability, per-staff rating; plan staff limit enforced |
| `…/reviews` | Rating stats & distribution, response rate, filters (unreplied / ≤3★ / flagged), public replies with templates, report abusive reviews |
| `…/clients` | CRM derived from bookings: visits, spend (owner only), last/next visit, no-shows, favorite service, search & sort, call/WhatsApp |
| `…/settings` | Public profile (description, address, phone, WhatsApp, Instagram), opening hours, booking rules (auto-confirm, notice, cancellation window, slot interval) |

## Customers, reviews & search

- **Accounts:** email + password (scrypt-hashed) at `/inscription` and `/login`, Google/Facebook/Apple when keys are set, and a one-click demo customer in demo mode.
- **`/compte`:** upcoming and past bookings, cancellation (before the start time), loyalty points and tier (1 pt/DT + 50/review), and "Donner mon avis".
- **Verified reviews** (`src/lib/reviews`): only the customer of a completed booking can review it, once (unique per booking), within 60 days. Center and staff ratings are recomputed from the reviews and never set by hand. The public page shows the average, a clickable star histogram, paginated reviews with owner replies, and JSON-LD `Review` + `AggregateRating`.
- **Search** (`src/lib/search/match.ts`): accent-insensitive, prefix and stem matching ("coiffeur" ↔ "coiffure"), one-typo tolerance ("hamam" → "hammam"), multi-word AND, weighted relevance (name > services > category > place), and category keywords. Filters: category, governorate, open now, women/men, price ≤ X DT, rating ≥ 4/4.5, GPS radius. Sort: relevance, rating (Bayesian), popularity, price, distance. The autocomplete (`/api/search/suggest`) suggests salons, services, categories and places, with full keyboard navigation.

Code: `src/app/dashboard`, `src/components/dashboard`, `src/lib/dashboard` (`repo.ts` = data access, `actions.ts` = Server Actions with zod + RBAC + audit log).

**Demo mode:** without `MONGODB_URI`, `/dashboard` is open and runs on an in-memory store seeded with four weeks of fictitious bookings. You act as the owner of every demo center, and edits last until the server restarts. Never deploy publicly without `MONGODB_URI`, or the demo dashboard will be reachable by anyone (it only holds fake data, but still).

## Themes & super admin

Six platform palettes (Jasmin & Or, Électrique, Claire, Sidi Bou Saïd, Sahara, Émeraude). The super admin chooses the default and the themes visitors can pick at **`/admin/apparence`** (see docs/07-design-system.md §8.5).

- **Demo mode, local:** you are super admin automatically.
- **Demo mode, deployed on Vercel:** `/admin` is **locked**, because it would let any visitor re-theme the public site. The demo dashboard stays open. To open the admin on a private deployment, set `DEMO_ADMIN=open` (see `src/lib/demo.ts`).
- **Salon wall ("Mur"):** each salon page has *Profil* and *Mur* tabs. Salons publish réalisations, avant/après (comparison slider), offres and annonces from *Espace pro → Mur*, optionally tagged with a service (a "Réserver" button on the post) and a staff member. Signed-in clients react (J'adore, Magnifique, Je le veux, Bravo) and comment; the salon's team replies in the salon's name and can hide or delete comments; clients with a completed booking get a "Cliente vérifiée" badge. Code: `src/lib/wall/` (rules + repo), `src/app/api/posts/`, `src/components/wall/`. Links: `/center/<slug>#mur` and `#post-<id>`.
- **Salon photos:** owners upload a cover and up to 12 gallery photos in *Espace pro → Paramètres → Photos*. Files go from the browser straight to Cloudinary with a server-signed ticket (`src/lib/media.ts`), into `hajemti/centers/<id>/`. Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` on the deployment to enable it; without them the section explains that uploads are not available yet. Each salon also gets a generated share image (`/center/<slug>/opengraph-image`).
- **With a database:** give your account the role first:

```bash
npm run grant-role -- you@example.com super-admin
npm run grant-role -- you@example.com owner maison-jasmin-la-marsa   # salon dashboard access
```

## Next steps (Phase 1)
WhatsApp/email notifications via a queue, reviews flow, Atlas Search index, Upstash rate limiting, Arabic `/ar` locale with RTL, the theme builder UI, staff invitations, and drag-and-drop rescheduling in the calendar.
