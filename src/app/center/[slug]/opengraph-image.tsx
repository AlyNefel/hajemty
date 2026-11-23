import { ImageResponse } from "next/og";
import { CATEGORIES, governorateBySlug } from "@/data/tunisia";
import { getCenterBySlug } from "@/lib/repositories/centers";

/**
 * Share preview (WhatsApp, Facebook, Instagram DMs…): the salon's cover photo when it has one,
 * otherwise its palette, with name, category, city and rating on top.
 */
export const alt = "Réservez en ligne sur Hajemti";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await getCenterBySlug(slug);
  const [bg, accent] = c?.palette ?? ["#140d1c", "#e5c07b"];
  const cover = c?.photos?.cover?.url;
  const category = c ? CATEGORIES.find((x) => x.key === c.categories[0])?.fr ?? "Beauté" : "Beauté";
  const city = c ? `${c.delegation}, ${governorateBySlug(c.governorate)?.name.fr ?? "Tunisie"}` : "Tunisie";
  const initials = (c?.name ?? "Hajemti").split(" ").map((w) => w[0]).slice(0, 2).join("");

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: `linear-gradient(160deg, ${bg}, #0b0710)`, color: "#fff", fontFamily: "serif" }}>
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" width={1200} height={630} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ position: "absolute", right: 70, top: 40, fontSize: 300, fontStyle: "italic", color: accent, opacity: 0.85, display: "flex" }}>{initials}</div>
        )}
        <div style={{ position: "absolute", inset: 0, display: "flex", background: "linear-gradient(to top, rgba(11,7,16,0.95) 0%, rgba(11,7,16,0.55) 45%, rgba(11,7,16,0.05) 100%)" }} />
        <div style={{ position: "absolute", left: 70, right: 70, bottom: 60, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 26, letterSpacing: 6, textTransform: "uppercase", color: accent, display: "flex" }}>{category}</div>
          <div style={{ fontSize: 84, fontWeight: 700, lineHeight: 1.05, marginTop: 10, display: "flex" }}>{c?.name ?? "Hajemti"}</div>
          <div style={{ fontSize: 32, marginTop: 18, display: "flex", gap: 28, color: "rgba(255,255,255,0.85)", fontFamily: "sans-serif" }}>
            {c && c.reviewCount > 0 && <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <svg width="30" height="30" viewBox="0 0 24 24"><path fill={accent} d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 20.9l1.6-7L2 9.2l7.1-.6z" /></svg>
                {c.rating.toFixed(1)} ({c.reviewCount} avis)
              </span>}
            <span style={{ display: "flex" }}>{city}</span>
          </div>
        </div>
        <div style={{ position: "absolute", left: 70, top: 50, display: "flex", alignItems: "center", gap: 14, fontSize: 34, fontWeight: 700 }}>
          <div style={{ width: 54, height: 54, borderRadius: 27, background: accent, color: "#140d1c", display: "flex", alignItems: "center", justifyContent: "center", fontStyle: "italic" }}>h</div>
          Hajemti
        </div>
      </div>
    ),
    size,
  );
}
