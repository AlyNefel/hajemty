# 4. RBAC System & Security

## 4.1 Roles

Every user has a **global role** and zero or more **center memberships**. A permission check always asks: *can actor X do action Y on resource Z?* Center-scoped permissions resolve against the membership for `Z.centerId`, never against the global role. That is how a person can be an OWNER of salon A and a CUSTOMER everywhere else.

| Role | Scope | Summary |
|------|-------|---------|
| `SUPER_ADMIN` | platform | Everything. Impersonation is audited. |
| `OWNER` | center/org | Everything inside their center(s), including billing and deletion |
| `MANAGER` | center | Operations: bookings, calendar, services, staff schedules, reviews replies, posts. **No** billing, no deleting the center, no managing other managers |
| `EMPLOYEE` | center | Own calendar and bookings, read the services list, chat on assigned conversations |
| `CUSTOMER` | self | Own profile, bookings, reviews, follows, chat |

## 4.2 Permission matrix

Implemented in `src/lib/rbac.ts` as a typed constant, so a typo is a compile error.

| Permission | SA | OWNER | MANAGER | EMPLOYEE | CUSTOMER |
|------------|:--:|:-----:|:-------:|:--------:|:--------:|
| `center.read` | ✔ | ✔ | ✔ | ✔ | ✔ (published) |
| `center.update` | ✔ | ✔ | ✔ | | |
| `center.delete` | ✔ | ✔ | | | |
| `center.theme.edit` | ✔ | ✔ | ✔ | | |
| `service.manage` | ✔ | ✔ | ✔ | | |
| `employee.manage` | ✔ | ✔ | ✔ | | |
| `booking.create` | ✔ | ✔ | ✔ | ✔ | ✔ |
| `booking.read.center` | ✔ | ✔ | ✔ | own only | |
| `booking.update.center` | ✔ | ✔ | ✔ | own only | |
| `booking.cancel.own` | | | | | ✔ |
| `review.create` | | | | | ✔ (verified) |
| `review.reply` | ✔ | ✔ | ✔ | | |
| `review.moderate` | ✔ | | | | |
| `post.manage` | ✔ | ✔ | ✔ | | |
| `chat.center` | ✔ | ✔ | ✔ | assigned | |
| `analytics.read` | ✔ | ✔ | ✔ (no revenue unless granted) | | |
| `billing.manage` | ✔ | ✔ | | | |
| `staff.invite` | ✔ | ✔ | employees only | | |
| `admin.*` | ✔ | | | | |

"Own only" conditions are evaluated by **resource policies** (`policy(actor, resource) => boolean`), which run after the role check.

## 4.3 Enforcement layers (defense in depth)

1. **Edge middleware** is a coarse gate: `/admin/**` requires `SUPER_ADMIN`, and `/dashboard/**` requires any membership. It reads the JWT only, with no DB call.
2. **Server Action / Route Handler** is the fine-grained check: `await authorize(session, "booking.update.center", { centerId })`.
3. **Query scoping**: every repository function for center data *requires* a `centerId` argument, so no query can run without a tenant filter.
4. **Field-level filtering**: DTO mappers strip private fields (customer phone shows only to center staff with an active booking, plus revenue fields).

## 4.4 Sessions & JWT

- Auth.js v5 with the **JWT strategy**. The token carries `{sub, role, memberships:[{c, r}], ver}`, signed with `AUTH_SECRET` (HS512) and rotated every 30 days.
- `ver` (the token version) is stored on the user. Bumping it ("log out everywhere" or a role change) invalidates old tokens on the next refresh, every 15 minutes.
- Cookies are `__Secure-`, `HttpOnly`, `SameSite=Lax`, `Secure`.
- Providers: Google, Facebook, Apple, and phone OTP via WhatsApp (phase 1, since many Tunisians have no Google account on their main device).

## 4.5 Security controls checklist

| Threat | Control |
|--------|---------|
| Brute force / scraping | Rate limits per IP and per user (sliding window in Upstash Redis): auth 10/min, booking 20/min, search 120/min, chat 60/min. Bot score via Vercel BotID / Turnstile on signup and booking |
| CSRF | Auth.js double-submit CSRF token on auth routes. Server Actions check `Origin`. Mutating route handlers require same-origin `Origin`/`Sec-Fetch-Site` and JSON content type |
| XSS | React escaping everywhere. User HTML (custom HTML blocks) is sanitized with DOMPurify on the server against an allowlist and rendered **inside a sandboxed iframe** (`sandbox="allow-scripts"`, no same-origin). CSP with nonces |
| Injection (NoSQL) | zod schemas on every input. `mongoose.set("sanitizeFilter", true)`. User input never builds `$where` or operator keys |
| Secure uploads | Signed Cloudinary uploads only (server signs the params, with a folder per center). `allowed_formats`, a `max_file_size` of 10MB for images and 100MB for video, and AI moderation (`aws_rek`) on public media. EXIF is stripped |
| IDOR | Tenant-scoped repositories plus resource policies. ObjectIds are never trusted from the client without an ownership check |
| Account takeover | OAuth email-verified only; step-up OTP for payout and billing changes |
| Audit | `auditLogs` for every privileged mutation, written via a queue |
| Activity tracking | `events` time-series collection (login, booking, profile edits) feeds anomaly alerts |
| Headers | HSTS (preload), `X-Content-Type-Options`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (geolocation=self), frame-ancestors none (except the theme preview) |
| Secrets | Vercel encrypted env vars; never use the `NEXT_PUBLIC_` prefix for secrets |
| Data protection | Compliance with Tunisian Organic Law 2004-63 (INPDP) and GDPR-style rights: export and delete account |
