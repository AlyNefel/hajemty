# 13. Subscription & Monetization Strategy

## 13.1 Plans (prices in TND, excluding 19% VAT; annual = 2 months free)

| | **FREE** | **PRO** | **PREMIUM** | **ENTERPRISE** |
|---|---|---|---|---|
| Price / month | 0 DT | **49 DT** | **129 DT** | from **349 DT** (custom) |
| Listing & booking | ✔ unlimited bookings | ✔ | ✔ | ✔ |
| Staff calendars | 2 | 8 | unlimited | unlimited |
| Templates | 3 basic + 2 colors | all 8 templates + colors | full theme builder | full + brand kit across branches |
| Reminders | email | WhatsApp + email | WhatsApp + email + SMS | + custom sender |
| Analytics | basic (7 days) | advanced (12 months) | premium + funnels + exports | cross-branch reporting |
| Visibility | standard | priority boost in ties, "PRO" badge | **Featured** rotation + home placement credits | |
| Promotions & posts | 2 / month | unlimited | unlimited + scheduled | |
| Social stories / video | — | stories | video hero, galleries | |
| Mini-site | `/center/slug` | `/center/slug` | `slug.hajemti.tn` + custom domain, advanced SEO | multiple domains |
| Marketing tools | — | promo codes | SMS/WhatsApp campaigns (credits), loyalty customization | |
| Online deposits | — | ✔ (Konnect) | ✔ | ✔ |
| Support | community | email | priority WhatsApp | dedicated manager, SLA |
| API | — | — | — | ✔ |

**Feature flags** live in `src/lib/plans.ts`. UI and API both call `hasFeature(center.plan, "theme.customTypography")`.

## 13.2 Additional revenue lines
1. **Sponsored placements (ads)**: CPC auction in search results and on category pages. A "Sponsorisé" label is always shown. Expected to be the largest revenue line by year 3.
2. **Booking deposit fee**: 3% + 0.300 DT on online deposits (no fee on pay-on-site bookings, so we never tax the core habit).
3. **Marketing credits**: WhatsApp campaign messages at about 0.150 DT each (cost plus margin).
4. **Hajemti Gift Cards**: B2C, sold for Eid, Mother's Day and weddings, redeemable at partner centers, with float income plus 8% commission.
5. **Pro marketplace (phase 4)**: product supply ordering for salons, plus a referral fee from distributors.

## 13.3 Go-to-market
- **Supply first, by density**: one neighborhood at a time (La Marsa → Ennasr → Menzah → Lac → Sousse Sahloul). Field sales team, with onboarding done *for* the salon in 15 minutes on their phone.
- **3 months of PRO free** for the first 500 centers ("Membre fondateur" badge forever).
- **Demand**: Instagram and TikTok creators (beauty niche, Tunisian), wedding-season campaigns (June–September), Ramadan night-hours campaigns, and a referral program (give 10 DT, get 10 DT in points).
- **Retention lever**: the calendar and CRM. Once a salon runs its agenda on Hajemti, churn falls below 2% per month.

## 13.4 Unit economics target (year 2)
ARPA (paying centers) ≈ 75 DT/month. CAC for a center ≈ 180 DT (field sales), giving payback in under 3 months. Paid conversion is 12% of active centers. Ads ARPU adds about 40% on top of subscriptions.
