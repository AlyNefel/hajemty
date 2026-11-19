# 16. Deployment Strategy

## 16.1 Infrastructure

| Component | Service | Region |
|-----------|---------|--------|
| Web/API | Vercel (Pro) with Fluid compute | functions in `cdg1` (Paris), the lowest latency to Tunis (~30ms) |
| Database | MongoDB Atlas M30 (3-node replica set), autoscaling to M50 | AWS `eu-west-3` (Paris) |
| Cache / rate limits / locks | Upstash Redis (global, primary in eu-west) | |
| Realtime | Fly.io, 2× shared-cpu-2x machines | `cdg` |
| Jobs | Upstash QStash → BullMQ workers on Fly when volume grows | |
| Media | Cloudinary (Advanced plan) | |
| Email | Resend | |
| WhatsApp | Meta Cloud API | |
| Monitoring | Sentry (errors + performance), Vercel Analytics/Speed Insights, Atlas alerts, Better Stack uptime | |

## 16.2 CI/CD (GitHub Actions + Vercel)
1. PR: `lint → typecheck → unit tests (vitest) → build → Playwright smoke tests against the Vercel preview`
2. Merge to `develop` deploys to staging, which runs seed + e2e.
3. Merge to `main` deploys to production with **instant rollback** (Vercel). DB migrations run as idempotent scripts (`scripts/migrations/*`) through `migrate-mongo` *before* the traffic switch, and must be backward compatible (expand/contract).

## 16.3 Backups & DR
Atlas continuous backup with PITR covering 7 days, daily snapshots kept 30 days, and a monthly snapshot copied to a second region. RPO is 1 minute and RTO is 1 hour. A restore drill runs every quarter.

## Cloudinary

| Concern | Strategy |
|---------|----------|
| Folder layout | `hajemti/{env}/centers/{centerId}/{logo\|cover\|gallery\|posts\|team}`, `users/{userId}/avatar`, `reviews/{reviewId}`, `chat/{conversationId}` (authenticated) |
| Uploads | Signed **direct-from-browser** uploads (server-signed params via `/api/uploads/sign`), so files never pass through our functions. Upload presets per purpose enforce formats, max size, and `eager` transforms |
| Delivery | `f_auto,q_auto` always; `c_fill,g_auto` (AI gravity) for covers; responsive `w_` breakpoints via the `next/image` custom loader (`src/lib/cloudinary.ts`) |
| Video | `vc_auto`, adaptive streaming (`sp_auto` HLS) for hero videos, with a poster from `so_0`. Autoplay is muted and only enabled when the network is not `2g`/`saveData` |
| Moderation | AI moderation add-on on public uploads. Rejected media stays hidden and lands in the admin queue |
| Cost control | Named transformations only (no arbitrary transform URLs: "strict transformations" on). Low-quality placeholder via `e_blur:1000,q_1,w_32` for blur-up |
| Cleanup | `cloudinary` webhook + nightly job deletes orphaned assets (publicIds no longer referenced) |

## Performance

### Budgets (p75, mid-range Android on 4G)
| Metric | Budget |
|--------|--------|
| LCP | < 2.0s (home), < 2.2s (center page) |
| INP | < 150ms |
| CLS | < 0.05 |
| JS (first load, home) | < 170KB gzipped |
| Search API p95 | < 250ms |
| Availability API p95 | < 150ms |

### Techniques
1. **RSC by default**. Client components only for interactive islands (search bar, slot picker, effects). Framer Motion is imported through `LazyMotion` + `domAnimation` (about 15KB instead of 34KB).
2. **Static + ISR** for center pages and SEO landing pages, invalidated by tags on change. `"use cache"` for repository reads.
3. **Images**: Cloudinary loader, `priority` only on the LCP image, `sizes` set precisely, AVIF/WebP via `f_auto`, and blur placeholders.
4. **Fonts**: `next/font` self-hosted with `display: swap`, subset `latin` plus `arabic` loaded only on `/ar`.
5. **Effects budget**: particles on canvas capped at 60 nodes, paused via `IntersectionObserver` and `document.hidden`, and disabled on `saveData`, `prefers-reduced-motion` and low `deviceMemory`. Aurora is pure CSS (transform/opacity only, which is compositor-friendly).
6. **DB**: every query is covered by an index (checked with `explain()` in CI for the critical queries), `.lean()` and projections on reads, and connection reuse across invocations (`src/lib/db.ts` global cache) with `maxPoolSize: 10`.
7. **Search**: Atlas Search with `returnStoredSource` for card fields, which skips the second fetch.
8. **Edge caching**: public GET APIs send `Cache-Control: s-maxage=60, stale-while-revalidate=300`.
9. **Prefetching**: `<Link prefetch>` for visible center cards on hover/viewport; `router.prefetch` for the next booking step.
10. **Monitoring**: Vercel Speed Insights RUM, with alerts when p75 LCP regresses by more than 10% after a deploy.
