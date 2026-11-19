# 12. SEO Strategy

## 12.1 The moat: programmatic local landing pages

Each combination of **category × governorate × city** gets a statically generated page, revalidated hourly:

```
/fr/coiffeur/tunis                 → "Coiffeur à Tunis : 214 salons, réservation en ligne"
/fr/institut-beaute/sousse/sahloul
/fr/spa/djerba
/fr/hammam/sfax
/ar/حلاق/تونس                      (Arabic slugs, hreflang-linked)
/fr/centre-esthetique/la-marsa/laser-epilation
```

12 categories × 24 governorates × ~10 key cities comes to **~3,000 indexable pages**, each with real inventory, a map, an FAQ, average prices ("Prix moyen d'un brushing à Tunis : 25 DT", which is computed and a strong long-tail hook), and internal links to the top centers. Pages with fewer than 3 centers get `noindex` until they have inventory, to avoid thin content.

## 12.2 Target keywords (FR first; Tunisians search in French)
Primary: *salon beauté Tunisie, institut beauté Tunisie, coiffeur Tunisie, spa Tunisie, centre esthétique Tunisie, hammam Tunis, barbier Tunis, onglerie Sousse, épilation laser Tunis, maquilleuse mariage Tunisie.*
Long tail: *brushing pas cher Ariana, coiffeur ouvert dimanche Tunis, hammam femme La Marsa, lissage protéine prix Tunisie, salon mariée Sfax.*
Arabic: *صالون تجميل تونس, حلاق رجالي, حمام تقليدي.*

## 12.3 Technical SEO (implemented in this repo)
| Item | Implementation |
|------|----------------|
| Dynamic meta | `generateMetadata()` per route: title ≤ 60 chars, description ≤ 155, canonical |
| Sitemap | `src/app/sitemap.ts` covering static pages, centers and landing pages. Split into a sitemap index above 45k URLs (`generateSitemaps`) |
| Robots | `src/app/robots.ts` disallows `/dashboard`, `/admin`, `/api`, and `?sort=` facets |
| OpenGraph / Twitter | per-center OG image generated with `next/og` (cover + logo + rating) |
| JSON-LD | `Organization` + `WebSite` + `SearchAction` on home; `BeautySalon` / `HairSalon` / `DaySpa` / `HealthAndBeautyBusiness` with `aggregateRating`, `geo`, `openingHoursSpecification`, `priceRange`, `makesOffer` on center pages; `FAQPage` on home and landing pages; `BreadcrumbList` everywhere |
| Hreflang | `alternates.languages` for `fr-TN`, `ar-TN`, `en`, plus `x-default` → fr |
| Core Web Vitals | see the performance plan (LCP < 2.0s on 4G) |
| Mini-sites | Premium custom domains get a canonical pointing to the custom domain, so the center's own domain earns the ranking |

## 12.4 Content & authority
- A "Hajemti Mag" blog: trend articles ("Coiffures mariage 2027"), price guides, and "Best of" lists per city, refreshed every quarter.
- Every center page links to the center's Instagram and Facebook, and centers are encouraged to link back with a "Réservez sur Hajemti" badge widget, which builds backlinks at scale.
- Google Business Profile: onboarding includes "connect your Google profile" and pushes the booking link through Reserve with Google once eligible.
