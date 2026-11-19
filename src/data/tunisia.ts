/**
 * Reference geography: the 24 Tunisian governorates (wilayas) with their main delegations (mutamadiyat).
 * Coordinates are approximate city centers, used for "near this governorate" fallbacks when GPS is denied.
 * The delegation lists are intentionally partial. The full list of 264 delegations ships with the geo seed in phase 1.
 */
export type Governorate = {
  slug: string;
  name: { fr: string; ar: string };
  center: { lat: number; lng: number };
  delegations: string[];
};

export const GOVERNORATES: Governorate[] = [
  { slug: "tunis", name: { fr: "Tunis", ar: "تونس" }, center: { lat: 36.8065, lng: 10.1815 },
    delegations: ["La Marsa", "Carthage", "Le Bardo", "El Menzah", "Sidi Bou Saïd", "La Goulette", "Le Kram", "Bab Bhar", "El Omrane", "Cité El Khadra", "Lac 1", "Lac 2"] },
  { slug: "ariana", name: { fr: "Ariana", ar: "أريانة" }, center: { lat: 36.8625, lng: 10.1956 },
    delegations: ["Ariana Ville", "Ennasr", "Raoued", "La Soukra", "Ettadhamen", "Mnihla", "Kalâat el-Andalous", "Sidi Thabet"] },
  { slug: "ben-arous", name: { fr: "Ben Arous", ar: "بن عروس" }, center: { lat: 36.7531, lng: 10.2189 },
    delegations: ["Ben Arous", "Ezzahra", "Hammam Lif", "Radès", "Mégrine", "El Mourouj", "Boumhel", "Fouchana", "Mohamedia"] },
  { slug: "manouba", name: { fr: "Manouba", ar: "منوبة" }, center: { lat: 36.8101, lng: 10.0956 },
    delegations: ["Manouba", "Den Den", "Douar Hicher", "Oued Ellil", "Mornaguia", "Tebourba"] },
  { slug: "nabeul", name: { fr: "Nabeul", ar: "نابل" }, center: { lat: 36.4561, lng: 10.7376 },
    delegations: ["Nabeul", "Hammamet", "Kélibia", "Korba", "Menzel Temime", "Dar Chaâbane", "Béni Khiar", "Grombalia"] },
  { slug: "zaghouan", name: { fr: "Zaghouan", ar: "زغوان" }, center: { lat: 36.4029, lng: 10.1429 },
    delegations: ["Zaghouan", "El Fahs", "Nadhour", "Bir Mcherga"] },
  { slug: "bizerte", name: { fr: "Bizerte", ar: "بنزرت" }, center: { lat: 37.2744, lng: 9.8739 },
    delegations: ["Bizerte Nord", "Bizerte Sud", "Menzel Bourguiba", "Mateur", "Ras Jebel", "Zarzouna"] },
  { slug: "beja", name: { fr: "Béja", ar: "باجة" }, center: { lat: 36.7256, lng: 9.1817 },
    delegations: ["Béja Nord", "Béja Sud", "Medjez el-Bab", "Testour", "Nefza"] },
  { slug: "jendouba", name: { fr: "Jendouba", ar: "جندوبة" }, center: { lat: 36.5011, lng: 8.7802 },
    delegations: ["Jendouba", "Tabarka", "Aïn Draham", "Bou Salem", "Ghardimaou"] },
  { slug: "le-kef", name: { fr: "Le Kef", ar: "الكاف" }, center: { lat: 36.1826, lng: 8.7149 },
    delegations: ["Le Kef Est", "Le Kef Ouest", "Dahmani", "Tajerouine", "Sakiet Sidi Youssef"] },
  { slug: "siliana", name: { fr: "Siliana", ar: "سليانة" }, center: { lat: 36.085, lng: 9.3708 },
    delegations: ["Siliana Nord", "Siliana Sud", "Makthar", "Gaâfour", "Bou Arada"] },
  { slug: "sousse", name: { fr: "Sousse", ar: "سوسة" }, center: { lat: 35.8256, lng: 10.6084 },
    delegations: ["Sousse Médina", "Sahloul", "Khezama", "Hammam Sousse", "Akouda", "Msaken", "Kalâa Kebira", "Sousse Riadh", "Port El Kantaoui"] },
  { slug: "monastir", name: { fr: "Monastir", ar: "المنستير" }, center: { lat: 35.7643, lng: 10.8113 },
    delegations: ["Monastir", "Skanès", "Ksar Hellal", "Moknine", "Jemmal", "Téboulba", "Sahline"] },
  { slug: "mahdia", name: { fr: "Mahdia", ar: "المهدية" }, center: { lat: 35.5047, lng: 11.0622 },
    delegations: ["Mahdia", "Ksour Essef", "El Jem", "Chebba", "Bou Merdes"] },
  { slug: "sfax", name: { fr: "Sfax", ar: "صفاقس" }, center: { lat: 34.7406, lng: 10.7603 },
    delegations: ["Sfax Ville", "Sfax Sud", "Sakiet Ezzit", "Sakiet Eddaïer", "Thyna", "El Ain", "Route de Tunis", "Route de Gremda"] },
  { slug: "kairouan", name: { fr: "Kairouan", ar: "القيروان" }, center: { lat: 35.6781, lng: 10.0963 },
    delegations: ["Kairouan Nord", "Kairouan Sud", "Haffouz", "Sbikha", "Bou Hajla"] },
  { slug: "kasserine", name: { fr: "Kasserine", ar: "القصرين" }, center: { lat: 35.1676, lng: 8.8365 },
    delegations: ["Kasserine Nord", "Kasserine Sud", "Sbeïtla", "Thala", "Fériana"] },
  { slug: "sidi-bouzid", name: { fr: "Sidi Bouzid", ar: "سيدي بوزيد" }, center: { lat: 35.0382, lng: 9.4849 },
    delegations: ["Sidi Bouzid Est", "Sidi Bouzid Ouest", "Regueb", "Meknassy", "Jilma"] },
  { slug: "gabes", name: { fr: "Gabès", ar: "قابس" }, center: { lat: 33.8815, lng: 10.0982 },
    delegations: ["Gabès Médina", "Gabès Sud", "Gabès Ouest", "El Hamma", "Mareth", "Matmata"] },
  { slug: "medenine", name: { fr: "Médenine", ar: "مدنين" }, center: { lat: 33.354, lng: 10.5055 },
    delegations: ["Médenine Nord", "Médenine Sud", "Djerba Houmt Souk", "Djerba Midoun", "Djerba Ajim", "Zarzis", "Ben Gardane"] },
  { slug: "tataouine", name: { fr: "Tataouine", ar: "تطاوين" }, center: { lat: 32.9297, lng: 10.4518 },
    delegations: ["Tataouine Nord", "Tataouine Sud", "Ghomrassen", "Remada"] },
  { slug: "gafsa", name: { fr: "Gafsa", ar: "قفصة" }, center: { lat: 34.425, lng: 8.7842 },
    delegations: ["Gafsa Nord", "Gafsa Sud", "Métlaoui", "Redeyef", "El Ksar"] },
  { slug: "tozeur", name: { fr: "Tozeur", ar: "توزر" }, center: { lat: 33.9197, lng: 8.1335 },
    delegations: ["Tozeur", "Nefta", "Degache", "Tameghza"] },
  { slug: "kebili", name: { fr: "Kébili", ar: "قبلي" }, center: { lat: 33.7044, lng: 8.969 },
    delegations: ["Kébili Nord", "Kébili Sud", "Douz", "Souk Lahad"] },
];

export const governorateBySlug = (slug: string) => GOVERNORATES.find((g) => g.slug === slug);

export const CATEGORIES = [
  { key: "beauty_center", keywords: "institut esthetique esthéticienne soin visage beauté épilation", fr: "Institut de beauté", ar: "مركز تجميل", slug: "institut-beaute", icon: "Sparkles" },
  { key: "hair_salon", keywords: "coiffeur coiffeuse coiffure cheveux brushing coupe couleur balayage lissage kératine", fr: "Salon de coiffure", ar: "صالون حلاقة", slug: "coiffeur", icon: "Scissors" },
  { key: "women_salon", keywords: "femme femmes dames coiffeur coiffeuse coiffure brushing", fr: "Salon femme", ar: "صالون نسائي", slug: "salon-femme", icon: "Flower2" },
  { key: "barbershop", keywords: "barbier barber barbe coiffeur homme hommes rasage dégradé coupe", fr: "Barbier", ar: "حلاق رجالي", slug: "barbier", icon: "Scissors" },
  { key: "nail_studio", keywords: "ongles onglerie manucure pédicure nail vernis gel capsules semi-permanent", fr: "Onglerie", ar: "أظافر", slug: "onglerie", icon: "Hand" },
  { key: "makeup_artist", keywords: "maquillage maquilleuse makeup mariée mariage soirée henné outia", fr: "Maquilleuse", ar: "خبيرة مكياج", slug: "maquillage", icon: "Brush" },
  { key: "spa", keywords: "spa massage détente relaxation sauna", fr: "Spa", ar: "سبا", slug: "spa", icon: "Waves" },
  { key: "hammam", keywords: "hammam gommage kessa savon noir", fr: "Hammam", ar: "حمام", slug: "hammam", icon: "Droplets" },
  { key: "wellness", keywords: "bien-être yoga massage relaxation", fr: "Bien-être", ar: "عافية", slug: "bien-etre", icon: "Leaf" },
  { key: "laser", keywords: "laser épilation définitive", fr: "Centre laser", ar: "ليزر", slug: "laser", icon: "Zap" },
  { key: "aesthetic_clinic", keywords: "clinique esthétique médecin botox injection hydrafacial", fr: "Clinique esthétique", ar: "عيادة تجميل", slug: "centre-esthetique", icon: "Stethoscope" },
  { key: "freelancer", keywords: "domicile freelance déplacement", fr: "Pro à domicile", ar: "خدمة منزلية", slug: "a-domicile", icon: "Home" },
] as const;

export type CategoryKey = (typeof CATEGORIES)[number]["key"];
export const CATEGORY_KEYS = CATEGORIES.map((c) => c.key) as [CategoryKey, ...CategoryKey[]];
