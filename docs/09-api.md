# 11. API Structure

REST-style Route Handlers under `/api/v1/*` serve public, mobile and third-party clients. The web app itself prefers **Server Actions** for mutations and **Server Components** for reads, and both call the same service layer.

Conventions: JSON; zod-validated; errors as `{ error: { code, message, details? } }`; cursor pagination (`?cursor=&limit=`); `Idempotency-Key` header on POSTs that create money or bookings; ETags on GETs of public resources.

## Public
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/centers` | Search: `q, lat, lng, radiusKm, governorate, city, category, gender, priceMax, openNow, sort=distance\|rating\|popular\|value` |
| GET | `/api/centers/:slug` | Center profile (published theme, services, team, hours) |
| GET | `/api/centers/:slug/availability` | `serviceIds, employeeId?, date` → slots |
| GET | `/api/centers/:slug/reviews` | Paginated reviews |
| GET | `/api/centers/:slug/posts` | Feed of that center |
| GET | `/api/geo/governorates` | Governorates + delegations |
| GET | `/api/categories` | Category tree + trending services |

## Customer (auth)
| Method | Path | |
|--------|------|-|
| POST | `/api/bookings` | Create (granule-lock transaction) |
| GET | `/api/me/bookings` | History & upcoming |
| PATCH | `/api/bookings/:id` | `{action: "reschedule", start}` or `{action: "cancel", reason}` |
| POST | `/api/bookings/:id/review` | Verified review (completed bookings only) |
| POST/DELETE | `/api/centers/:id/follow` | |
| POST/DELETE | `/api/me/favorites/:centerId` | |
| POST | `/api/waitlist` | |
| GET | `/api/me/loyalty` | Balance, tier, ledger |
| GET/POST | `/api/conversations`, `/api/conversations/:id/messages` | Chat history; sending goes over the socket |
| POST | `/api/uploads/sign` | Signed Cloudinary params `{purpose: avatar\|review\|chat}` |
| POST | `/api/posts/:id/like`, `/api/posts/:id/comments` | |

## Center (auth + membership)
Prefix: `/api/dashboard/centers/:centerId/…`

| Resource | Methods |
|----------|---------|
| `profile` | GET, PATCH |
| `services` | GET, POST, PATCH `/:id`, DELETE `/:id`, POST `/reorder` |
| `employees` | CRUD + `/:id/time-off` |
| `calendar` | GET `?from&to&employeeId` |
| `bookings` | POST (walk-in), PATCH `/:id` `{action: confirm\|decline\|check_in\|complete\|no_show\|reschedule}` |
| `reviews` | GET, POST `/:id/reply` |
| `posts`, `stories`, `promotions` | CRUD |
| `theme` | GET draft, PUT draft, POST `/publish`, POST `/revert/:version` |
| `analytics` | GET `?range=7d\|30d\|12m&metric=` |
| `staff` | POST `/invite`, PATCH `/:userId` role, DELETE |
| `billing` | GET, POST `/checkout`, POST `/cancel` |

## Admin
`/api/admin/users`, `/centers` (approve, suspend, verify), `/reviews` (moderate), `/subscriptions`, `/payments`, `/ads`, `/reports`, `/audit-logs`, `/analytics`.

## Webhooks
`/api/webhooks/konnect`, `/flouci`, `/whatsapp`, `/cloudinary` (moderation results). Each one verifies its signature, deduplicates by event ID, and enqueues the work.

## Enterprise public API (phase 4)
`/api/v1/*` uses API keys (hashed, scoped per organization), a 600 req/min limit, and an OpenAPI 3.1 spec generated from the zod schemas (`zod-to-openapi`).
