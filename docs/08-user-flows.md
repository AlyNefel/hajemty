# 10. User Flows

## 10.1 Customer: discover → book (target: under 60 seconds, 4 taps after search)

```mermaid
flowchart TD
  A[Home] -->|"Allow location?"| B{GPS granted?}
  B -- yes --> C[Nearby results sorted by distance + score]
  B -- no --> D[Pick governorate / city] --> C
  A --> S[Search: 'brushing', 'hammam', 'barbier'] --> C
  C --> F[Filters: open now · top rated · price · women only · category]
  C --> P[Center mini-site]
  P --> SV[Pick service(s)] --> EM[Pick professional or 'Any'] --> DT[Pick date] --> SL[Pick slot]
  SL --> L{Logged in?}
  L -- no --> AU[1-tap Google/Facebook/Apple or WhatsApp OTP] --> CF
  L -- yes --> CF[Confirm: summary, notes, policy]
  CF --> OK[Booking confirmed ✓ · add to calendar · WhatsApp confirmation]
  OK --> R[-24h reminder] --> V[Visit] --> RV[Review request +50 pts]
```

## 10.2 Customer: reschedule / cancel
My bookings → booking → "Change time" opens the slot picker for the same service and employee, and a single transaction moves it. "Cancel" shows the policy: free before the window, warned after it.

## 10.3 Owner onboarding (target: published in under 10 minutes)
1. "Become a partner", then sign up with phone and Google
2. Business basics: name, category, governorate, delegation, pin on the map (autocomplete + drag)
3. Hours (prefilled with the Tunisian norm: Tue–Sun 9:00–19:00, Monday closed for many salons)
4. Services: pick from the **category template library** (e.g. Hair salon: brushing, coupe, couleur, balayage, lissage protéine, soin kératine) with suggested durations and editable prices
5. Team: add employees (name, photo, services) or "I work alone"
6. Branding: logo, cover, choose a template and 2 colors (FREE)
7. Preview, then **Publish**. The center lands in `pending_review`, and auto-publishes after a phone check, with verification badges after KYC

## 10.4 Owner daily loop
Dashboard home shows today's agenda, pending confirmations, unread messages, and the score trend. From there the owner works the calendar (accept, check-in, complete, no-show, walk-in) and the inbox, replies to reviews, and publishes a promo post.

## 10.5 Premium upgrade
A locked section in the theme builder shows "Premium" with a live preview of the locked feature. Clicking it opens the plan comparison, then Konnect checkout. On the webhook `payment.succeeded`, the subscription becomes active, `center.plan` is updated, and the features unlock instantly through a feature-flag check.

## 10.6 Employee
Login opens "My day" (their own bookings). They can check in and complete bookings, block time ("pause"), and chat on assigned conversations.

## 10.7 Super admin
Moderation queue (new centers, flagged reviews and media), subscriptions and payments reconciliation, ad campaigns, platform analytics, and user support with audited impersonation.
