import type { CategoryKey } from "./tunisia";
import type { Plan } from "@/lib/plans";
import type { Theme } from "@/lib/theme/schema";
import { defaultTheme } from "@/lib/theme/templates";
import type { DayHours } from "@/lib/booking/availability";
import type { CenterPhotos } from "@/lib/dashboard/types";

/** View model shared by the demo dataset and the Mongo repository. */
export type CenterView = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  categories: CategoryKey[];
  governorate: string;
  delegation: string;
  address: string;
  location: { lat: number; lng: number };
  phone: string;
  whatsapp: string;
  instagram?: string;
  rating: number;
  reviewCount: number;
  followerCount: number;
  priceFromMillimes: number;
  genderFocus: "women" | "men" | "unisex";
  verified: boolean;
  plan: Plan;
  /** Two-stop gradient used as artwork when no cover image is uploaded. */
  palette: [string, string];
  openingHours: DayHours[];
  services: { id: string; category: string; name: string; durationMin: number; priceMillimes: number; popular?: boolean }[];
  team: { id: string; name: string; title: string }[];
  reviews: { author: string; rating: number; comment: string; date: string; service: string }[];
  promo?: { title: string; discountPercent: number; until: string };
  theme: Theme;
  /** Uploaded photos; without them the page falls back to the palette artwork. */
  photos?: CenterPhotos;
};

const tueSun = (open: number, close: number, breaks: DayHours["breaks"] = []): DayHours[] =>
  [0, 2, 3, 4, 5, 6].map((day) => ({ day, open, close, breaks }));
const h = (hh: number, mm = 0) => hh * 60 + mm;

export const DEMO_CENTERS: CenterView[] = [
  {
    id: "c1", slug: "maison-jasmin-la-marsa", name: "Maison Jasmin", tagline: "Institut de beauté & spa — La Marsa",
    description: "Un écrin lumineux à deux pas de la corniche : soins visage signature, hammam privatif et rituels au jasmin de Sidi Bou Saïd.",
    categories: ["beauty_center", "spa", "hammam"], governorate: "tunis", delegation: "La Marsa", address: "12 Rue du Saf Saf, La Marsa",
    location: { lat: 36.8782, lng: 10.3247 }, phone: "+21671000001", whatsapp: "+21698000001", instagram: "maisonjasmin.tn",
    rating: 4.9, reviewCount: 412, followerCount: 8300, priceFromMillimes: 35000, genderFocus: "women", verified: true, plan: "PREMIUM",
    palette: ["#3b1f3a", "#e5c07b"], openingHours: tueSun(h(9), h(20)),
    services: [
      { id: "s1", category: "Visage", name: "Soin éclat signature", durationMin: 60, priceMillimes: 95000, popular: true },
      { id: "s2", category: "Hammam", name: "Rituel hammam & gommage", durationMin: 75, priceMillimes: 80000, popular: true },
      { id: "s3", category: "Corps", name: "Massage relaxant au jasmin", durationMin: 60, priceMillimes: 110000 },
      { id: "s4", category: "Épilation", name: "Épilation jambes complètes", durationMin: 40, priceMillimes: 35000 },
    ],
    team: [{ id: "e1", name: "Amira", title: "Esthéticienne senior" }, { id: "e2", name: "Sonia", title: "Spa therapist" }, { id: "e3", name: "Ines", title: "Hammam" }],
    reviews: [
      { author: "Yasmine B.", rating: 5, comment: "Le rituel hammam est un vrai voyage. Accueil adorable, propreté irréprochable.", date: "2026-11-02", service: "Rituel hammam" },
      { author: "Nour K.", rating: 5, comment: "Mon soin visage préféré à Tunis, la peau est lumineuse pendant des jours.", date: "2026-10-21", service: "Soin éclat" },
    ],
    promo: { title: "-20% sur le rituel hammam du mardi", discountPercent: 20, until: "2026-12-15" },
    theme: defaultTheme("luxury_gold"),
  },
  {
    id: "c2", slug: "le-barbier-de-carthage", name: "Le Barbier de Carthage", tagline: "Barbershop premium — Carthage",
    description: "Coupe, rasage à l'ancienne et soin barbe dans une ambiance cuir & laiton. Café offert.",
    categories: ["barbershop"], governorate: "tunis", delegation: "Carthage", address: "Av. Habib Bourguiba, Carthage",
    location: { lat: 36.8528, lng: 10.3233 }, phone: "+21671000002", whatsapp: "+21698000002",
    rating: 4.8, reviewCount: 286, followerCount: 4100, priceFromMillimes: 15000, genderFocus: "men", verified: true, plan: "PRO",
    palette: ["#111111", "#b08d57"], openingHours: [1, 2, 3, 4, 5, 6].map((day) => ({ day, open: h(9), close: h(21) })),
    services: [
      { id: "s1", category: "Coupe", name: "Coupe homme", durationMin: 30, priceMillimes: 20000, popular: true },
      { id: "s2", category: "Barbe", name: "Taille de barbe & serviette chaude", durationMin: 25, priceMillimes: 15000 },
      { id: "s3", category: "Combo", name: "Coupe + barbe signature", durationMin: 50, priceMillimes: 32000, popular: true },
    ],
    team: [{ id: "e1", name: "Karim", title: "Master barber" }, { id: "e2", name: "Wassim", title: "Barber" }],
    reviews: [{ author: "Mehdi S.", rating: 5, comment: "Dégradé parfait, ponctuel, réservation en 30 secondes.", date: "2026-11-10", service: "Coupe homme" }],
    theme: defaultTheme("black_edition"),
  },
  {
    id: "c3", slug: "nails-atelier-ennasr", name: "Nails Atelier", tagline: "Onglerie & nail art — Ennasr",
    description: "Gel, semi-permanent et nail art sur-mesure. Produits vegan et hygiène stérilisée.",
    categories: ["nail_studio"], governorate: "ariana", delegation: "Ennasr", address: "Ennasr 2, Ariana",
    location: { lat: 36.8615, lng: 10.1622 }, phone: "+21671000003", whatsapp: "+21698000003",
    rating: 4.7, reviewCount: 198, followerCount: 6200, priceFromMillimes: 25000, genderFocus: "women", verified: true, plan: "PRO",
    palette: ["#4a1d2e", "#e8a0a8"], openingHours: tueSun(h(10), h(20)),
    services: [
      { id: "s1", category: "Mains", name: "Semi-permanent mains", durationMin: 45, priceMillimes: 30000, popular: true },
      { id: "s2", category: "Mains", name: "Capsules gel + nail art", durationMin: 90, priceMillimes: 65000 },
      { id: "s3", category: "Pieds", name: "Beauté des pieds", durationMin: 50, priceMillimes: 35000 },
    ],
    team: [{ id: "e1", name: "Rania", title: "Nail artist" }],
    reviews: [{ author: "Salma T.", rating: 5, comment: "Nail art incroyable, tient 3 semaines !", date: "2026-11-08", service: "Capsules gel" }],
    theme: defaultTheme("feminine"),
  },
  {
    id: "c4", slug: "dar-hammam-sousse", name: "Dar Hammam", tagline: "Hammam traditionnel — Sousse Médina",
    description: "Hammam centenaire restauré, savon noir, kessa et thé à la menthe sur la terrasse.",
    categories: ["hammam", "spa"], governorate: "sousse", delegation: "Sousse Médina", address: "Médina de Sousse",
    location: { lat: 35.8268, lng: 10.6386 }, phone: "+21673000004", whatsapp: "+21698000004",
    rating: 4.8, reviewCount: 340, followerCount: 5100, priceFromMillimes: 20000, genderFocus: "unisex", verified: true, plan: "PREMIUM",
    palette: ["#1d2b2a", "#c9b28a"], openingHours: tueSun(h(8), h(22)),
    services: [
      { id: "s1", category: "Hammam", name: "Hammam + kessa", durationMin: 60, priceMillimes: 25000, popular: true },
      { id: "s2", category: "Massage", name: "Massage à l'huile d'argan", durationMin: 45, priceMillimes: 60000 },
    ],
    team: [{ id: "e1", name: "Fatma", title: "Hammam (femmes)" }, { id: "e2", name: "Hedi", title: "Hammam (hommes)" }],
    reviews: [{ author: "Leila M.", rating: 5, comment: "Authentique et propre, on ressort comme neuve.", date: "2026-10-30", service: "Hammam + kessa" }],
    promo: { title: "Pack mariée : hammam + henné", discountPercent: 15, until: "2026-12-31" },
    theme: defaultTheme("luxury_spa"),
  },
  {
    id: "c5", slug: "studio-lumiere-sfax", name: "Studio Lumière", tagline: "Coiffure & coloration — Sfax",
    description: "Experts balayage, lissage protéine et coiffures de mariée. Diagnostic capillaire offert.",
    categories: ["hair_salon", "women_salon"], governorate: "sfax", delegation: "Route de Tunis", address: "Route de Tunis km 3, Sfax",
    location: { lat: 34.7615, lng: 10.7487 }, phone: "+21674000005", whatsapp: "+21698000005",
    rating: 4.6, reviewCount: 155, followerCount: 3000, priceFromMillimes: 25000, genderFocus: "women", verified: false, plan: "FREE",
    palette: ["#2a1840", "#d97a86"], openingHours: tueSun(h(9), h(19), [{ start: h(13), end: h(14) }]),
    services: [
      { id: "s1", category: "Coiffure", name: "Brushing", durationMin: 45, priceMillimes: 25000, popular: true },
      { id: "s2", category: "Couleur", name: "Balayage", durationMin: 150, priceMillimes: 180000 },
      { id: "s3", category: "Soin", name: "Lissage protéine", durationMin: 180, priceMillimes: 250000 },
    ],
    team: [{ id: "e1", name: "Hela", title: "Coloriste" }, { id: "e2", name: "Meriem", title: "Coiffeuse" }],
    reviews: [{ author: "Asma R.", rating: 4, comment: "Très beau balayage, un peu d'attente.", date: "2026-11-05", service: "Balayage" }],
    theme: defaultTheme("modern_salon"),
  },
  {
    id: "c6", slug: "clinique-aura-lac", name: "Clinique Aura", tagline: "Médecine esthétique & laser — Les Berges du Lac",
    description: "Épilation laser diode, HydraFacial et injections réalisées par des médecins diplômés.",
    categories: ["aesthetic_clinic", "laser"], governorate: "tunis", delegation: "Lac 2", address: "Rue du Lac Biwa, Lac 2",
    location: { lat: 36.8466, lng: 10.2735 }, phone: "+21671000006", whatsapp: "+21698000006",
    rating: 4.9, reviewCount: 221, followerCount: 7400, priceFromMillimes: 90000, genderFocus: "unisex", verified: true, plan: "ENTERPRISE",
    palette: ["#0f2633", "#7cc6c2"], openingHours: [1, 2, 3, 4, 5, 6].map((day) => ({ day, open: h(9), close: h(19) })),
    services: [
      { id: "s1", category: "Laser", name: "Laser aisselles", durationMin: 20, priceMillimes: 90000, popular: true },
      { id: "s2", category: "Visage", name: "HydraFacial", durationMin: 60, priceMillimes: 220000 },
    ],
    team: [{ id: "e1", name: "Dr. Ben Salah", title: "Médecin esthétique" }],
    reviews: [{ author: "Rim A.", rating: 5, comment: "Très professionnel, résultats visibles dès la 2e séance.", date: "2026-11-12", service: "Laser" }],
    theme: defaultTheme("medical_aesthetic"),
  },
  {
    id: "c7", slug: "glow-by-meriem-djerba", name: "Glow by Meriem", tagline: "Maquilleuse mariage — Djerba",
    description: "Maquillage mariée, outia et henné, à domicile partout à Djerba et Zarzis.",
    categories: ["makeup_artist", "freelancer"], governorate: "medenine", delegation: "Djerba Houmt Souk", address: "Houmt Souk, Djerba",
    location: { lat: 33.8758, lng: 10.8575 }, phone: "+21675000007", whatsapp: "+21698000007",
    rating: 5.0, reviewCount: 96, followerCount: 12800, priceFromMillimes: 120000, genderFocus: "women", verified: true, plan: "PRO",
    palette: ["#3a1424", "#f1d9a6"], openingHours: [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, open: h(8), close: h(22) })),
    services: [
      { id: "s1", category: "Mariage", name: "Maquillage mariée", durationMin: 120, priceMillimes: 450000, popular: true },
      { id: "s2", category: "Soirée", name: "Maquillage soirée", durationMin: 60, priceMillimes: 120000 },
    ],
    team: [{ id: "e1", name: "Meriem", title: "Makeup artist" }],
    reviews: [{ author: "Olfa D.", rating: 5, comment: "Le maquillage a tenu toute la nuit de mon mariage !", date: "2026-09-14", service: "Maquillage mariée" }],
    theme: defaultTheme("feminine"),
  },
  {
    id: "c8", slug: "zen-wellness-hammamet", name: "Zen Wellness", tagline: "Spa & bien-être — Hammamet",
    description: "Piscine chauffée, sauna, massages thaïs et yoga face à la mer.",
    categories: ["spa", "wellness"], governorate: "nabeul", delegation: "Hammamet", address: "Yasmine Hammamet",
    location: { lat: 36.3725, lng: 10.5395 }, phone: "+21672000008", whatsapp: "+21698000008",
    rating: 4.7, reviewCount: 264, followerCount: 3900, priceFromMillimes: 70000, genderFocus: "unisex", verified: true, plan: "PREMIUM",
    palette: ["#10202a", "#8bc0c9"], openingHours: [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, open: h(9), close: h(21) })),
    services: [
      { id: "s1", category: "Massage", name: "Massage thaï", durationMin: 60, priceMillimes: 120000, popular: true },
      { id: "s2", category: "Accès", name: "Accès spa (piscine + sauna)", durationMin: 120, priceMillimes: 70000 },
    ],
    team: [{ id: "e1", name: "Lina", title: "Thérapeute" }, { id: "e2", name: "Omar", title: "Thérapeute" }],
    reviews: [{ author: "Sarra H.", rating: 5, comment: "Moment hors du temps, vue magnifique.", date: "2026-11-01", service: "Massage thaï" }],
    theme: defaultTheme("luxury_spa"),
  },
];

export const TRENDING_SERVICES = [
  { name: "Brushing", from: 20000, count: 1240 },
  { name: "Hammam + gommage", from: 25000, count: 980 },
  { name: "Semi-permanent", from: 30000, count: 860 },
  { name: "Coupe homme dégradé", from: 15000, count: 830 },
  { name: "Lissage protéine", from: 180000, count: 540 },
  { name: "Épilation laser", from: 90000, count: 410 },
  { name: "Maquillage mariée", from: 300000, count: 220 },
  { name: "Massage relaxant", from: 70000, count: 390 },
];
