import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope, Noto_Kufi_Arabic } from "next/font/google";
import { SITE_URL } from "@/lib/utils";
import { MotionProvider } from "@/components/effects/MotionProvider";
import { themeBootScript } from "@/lib/platform-theme";
import { getAppearance } from "@/lib/platform-settings";
import "./globals.css";

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["500", "600", "700"], style: ["normal", "italic"], variable: "--font-cormorant", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
const kufi = Noto_Kufi_Arabic({ subsets: ["arabic"], variable: "--font-kufi", display: "swap", preload: false });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Hajemti — Réservez salons de beauté, coiffeurs & spas en Tunisie",
    template: "%s · Hajemti",
  },
  description:
    "Trouvez et réservez en ligne les meilleurs instituts de beauté, coiffeurs, barbiers, spas et hammams près de chez vous en Tunisie. Avis vérifiés, disponibilités en temps réel.",
  keywords: ["salon beauté Tunisie", "institut beauté Tunisie", "coiffeur Tunisie", "spa Tunisie", "centre esthétique Tunisie", "hammam Tunis", "barbier Tunis"],
  alternates: {
    canonical: "/",
    languages: { "fr-TN": "/", "ar-TN": "/ar", en: "/en", "x-default": "/" },
  },
  openGraph: {
    type: "website",
    locale: "fr_TN",
    siteName: "Hajemti",
    url: SITE_URL,
    title: "Hajemti — La beauté en Tunisie, réservée en un geste",
    description: "Salons, spas, hammams, barbiers et pros de la beauté près de chez vous.",
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0b0710",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Super-admin appearance settings (cached, tag-invalidated, so pages stay static/ISR).
  const appearance = await getAppearance();
  return (
    // suppressHydrationWarning: the boot script may set data-theme on <html> before React hydrates.
    // data-themes / data-theme-choice tell the client switchers what the admin allows.
    <html
      lang="fr" dir="ltr" suppressHydrationWarning
      data-theme={appearance.defaultTheme}
      data-themes={appearance.enabledThemes.join(",")}
      data-theme-choice={appearance.allowVisitorChoice ? "on" : "off"}
      className={`${cormorant.variable} ${manrope.variable} ${kufi.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript(appearance) }} />
      </head>
      <body className="min-h-dvh antialiased">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
