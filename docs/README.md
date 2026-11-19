# Hajemti — Product & Engineering Blueprint

> **Hajemti** (حجامتي, "my barber / my beauty pro" in Tunisian Derja): Tunisia's beauty & wellness marketplace.
> It combines discovery, booking, a social feed, and a mini-website for each salon, spa, hammam, barber and freelance pro.

| # | Deliverable | File |
|---|-------------|------|
| 1 | Complete architecture | [01-architecture.md](01-architecture.md) |
| 2 | MongoDB database design | [02-database.md](02-database.md) |
| 3 | ERD diagram | [02-database.md#erd](02-database.md#erd) |
| 4 | RBAC system + security | [03-rbac-security.md](03-rbac-security.md) |
| 5 | Booking engine design | [04-booking-engine.md](04-booking-engine.md) |
| 6 | Chat system architecture | [05-chat.md](05-chat.md) |
| 7 | Analytics architecture | [06-analytics.md](06-analytics.md) |
| 8 | Design system | [07-design-system.md](07-design-system.md) |
| 9 | UI kit | [07-design-system.md#ui-kit](07-design-system.md#ui-kit) |
| 10 | User flows | [08-user-flows.md](08-user-flows.md) |
| 11 | API structure | [09-api.md](09-api.md) |
| 12 | SEO strategy | [10-seo.md](10-seo.md) |
| 13 | Subscription & monetization | [11-monetization.md](11-monetization.md) |
| 14 | Premium theme builder architecture | [12-theme-builder.md](12-theme-builder.md) |
| 15 | Custom design builder architecture | [12-theme-builder.md#custom-design-builder](12-theme-builder.md#custom-design-builder) |
| 16 | Deployment strategy | [13-deployment-performance.md](13-deployment-performance.md) |
| 17 | Cloudinary strategy | [13-deployment-performance.md#cloudinary](13-deployment-performance.md#cloudinary) |
| 18 | Performance optimization plan | [13-deployment-performance.md#performance](13-deployment-performance.md#performance) |

## Founding principles

1. **Local first.** Prices are in TND (stored as integer *millimes*), the timezone is `Africa/Tunis`, the site ships in French, Arabic (RTL) and English, people can book over WhatsApp, and payments go through Konnect, Flouci or D17. Cash on site is the default because that is how Tunisia pays today.
2. **The supply side wins the market.** Salons join for free and stay for the calendar, the CRM, and a mini-site that replaces their Facebook page. Customers follow.
3. **Trust is the product.** Only customers who actually booked can leave a review. Business scores are transparent, and pros are verified.
4. **Mobile-first, low-bandwidth-tolerant.** Most traffic will be 4G Android. Every page must pass Core Web Vitals on a mid-range device.
5. **Modular monolith first, services later.** One Next.js codebase with clear domain modules. Chat, notifications and analytics are split out only once load justifies it.

## Phased roadmap

| Phase | Scope | Exit criteria |
|-------|-------|---------------|
| **0 — Foundation** (this repo) | Data model, auth, RBAC, booking core, homepage, center mini-site, SEO plumbing | Build passes; demo data browsable |
| **1 — MVP (Tunis + Sousse)** | Search + map, booking flow, owner calendar, reviews, WhatsApp/email notifications, FREE plan | 150 centers live, 1,000 bookings/month |
| **2 — Growth** | Chat, loyalty, social feed, PRO plan, Konnect payments, analytics dashboard | 1,000 centers, 15k bookings/month |
| **3 — Premium** | Theme builder, custom domains, promotions engine, ads, PREMIUM plan | 10% paid conversion |
| **4 — Scale** | Enterprise/multi-branch, public API, mobile apps (Expo), Morocco/Algeria expansion | 10k centers |
