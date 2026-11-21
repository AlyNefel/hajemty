/**
 * Publishes the design work (design/) on the deployed site under /design.
 *
 * Next.js only serves static files from public/, so this copies design/ → public/design/
 * (gitignored) and generates public/design/index.html, a gallery of the proposals, captures and
 * brief. It runs automatically before `next build` (and `next dev`) via the npm "pre" hooks, so
 * Vercel deploys always reflect the current design/ folder. design/ stays the single source of truth.
 *
 * Usage: node scripts/sync-design.mjs
 */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SRC = "design";
const OUT = join("public", "design");

if (!existsSync(SRC)) {
  console.log("sync-design: no design/ folder, nothing to publish");
  process.exit(0);
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
cpSync(SRC, OUT, { recursive: true });

const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const list = (dir) => (existsSync(join(SRC, dir)) ? readdirSync(join(SRC, dir)).filter((f) => statSync(join(SRC, dir, f)).isFile()).sort() : []);
const titleOf = (file) => readFileSync(join(SRC, "proposals", file), "utf8").match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() ?? file;
const pretty = (f) => f.replace(/\.[a-z]+$/i, "").replace(/^\d+-/, "").replace(/-/g, " ");

/** Minimal Markdown → HTML for the brief (headings, lists, bold, inline code, paragraphs). */
function markdown(md) {
  const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/`([^`]+)`/g, "<code>$1</code>");
  const out = [];
  let inList = false;
  for (const line of md.split(/\r?\n/)) {
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    const li = line.match(/^\s*[-*]\s+(.*)$/);
    if (!li && inList) { out.push("</ul>"); inList = false; }
    if (h) out.push(`<h${h[1].length + 1}>${inline(h[2])}</h${h[1].length + 1}>`);
    else if (li) { if (!inList) { out.push("<ul>"); inList = true; } out.push(`<li>${inline(li[1])}</li>`); }
    else if (line.trim()) out.push(`<p>${inline(line)}</p>`);
  }
  if (inList) out.push("</ul>");
  return out.join("\n");
}

// Proposals: each HTML page with the screenshots that share its number prefix (01-, 02-…).
const proposalFiles = list("proposals");
const htmlPages = proposalFiles.filter((f) => f.endsWith(".html"));
const proposals = htmlPages.map((page) => {
  const prefix = page.split("-")[0];
  const shots = proposalFiles.filter((f) => f.startsWith(prefix + "-") && /\.(png|jpe?g|webp)$/i.test(f));
  return { page, title: titleOf(page), shots };
});
const orphanShots = proposalFiles.filter((f) => /\.(png|jpe?g|webp)$/i.test(f) && !proposals.some((p) => p.shots.includes(f)));

// Captures: group desktop/mobile pairs by their base name.
const captures = list("captures").filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
const groups = new Map();
for (const f of captures) {
  const base = f.replace(/-(desktop|mobile)\.[a-z]+$/i, "");
  groups.set(base, [...(groups.get(base) ?? []), f]);
}

const img = (dir, f) => `<a class="shot" href="${dir}/${esc(f)}" target="_blank" rel="noopener"><img loading="lazy" src="${dir}/${esc(f)}" alt="${esc(pretty(f))}"><span>${esc(pretty(f))}</span></a>`;
const brief = existsSync(join(SRC, "BRIEF.md")) ? markdown(readFileSync(join(SRC, "BRIEF.md"), "utf8")) : "";

const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Design · Rosée / Hajemti</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Manrope:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  :root { --bg:#faf6f1; --surface:#fff; --text:#1f1a20; --muted:#6c6470; --line:rgb(31 26 32/.09); --accent:#b4526b; color-scheme: light; }
  @media (prefers-color-scheme: dark) { :root { --bg:#120b12; --surface:#1d141c; --text:#f7eff2; --muted:#b2a3ad; --line:rgb(255 255 255/.09); --accent:#e7a3b5; color-scheme: dark; } }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--text); font:16px/1.6 Manrope, system-ui, sans-serif; }
  .wrap { max-width:1200px; margin:0 auto; padding:48px 16px 96px; }
  h1, h2, h3 { font-family:"Cormorant Garamond", Georgia, serif; font-weight:600; line-height:1.1; }
  h1 { font-size:clamp(2.4rem,6vw,4rem); margin:.2em 0 .3em; }
  h2 { font-size:2rem; margin:2.4em 0 .6em; }
  .eyebrow { text-transform:uppercase; letter-spacing:.28em; font-size:.75rem; font-weight:700; color:var(--accent); }
  .lede { color:var(--muted); max-width:60ch; }
  nav.toc { display:flex; flex-wrap:wrap; gap:8px; margin-top:24px; }
  nav.toc a { border:1px solid var(--line); border-radius:999px; padding:6px 14px; color:inherit; text-decoration:none; font-size:.9rem; }
  nav.toc a:hover { border-color:var(--accent); }
  .cards { display:grid; gap:20px; grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr)); }
  .card { background:var(--surface); border:1px solid var(--line); border-radius:20px; padding:16px; }
  .card h3 { font-size:1.6rem; margin:.2em 0 .5em; }
  .btn { display:inline-flex; align-items:center; gap:6px; background:var(--accent); color:#fff; border-radius:999px; padding:8px 16px; text-decoration:none; font-weight:700; font-size:.9rem; }
  .shots { display:grid; gap:10px; grid-template-columns:repeat(auto-fill,minmax(140px,1fr)); margin-top:14px; }
  .shot { display:block; color:var(--muted); text-decoration:none; font-size:.75rem; }
  .shot img { width:100%; aspect-ratio:4/3; object-fit:cover; object-position:top; border-radius:12px; border:1px solid var(--line); background:var(--bg); display:block; transition:transform .2s; }
  .shot:hover img { transform:translateY(-2px); }
  .shot span { display:block; margin-top:4px; text-transform:capitalize; }
  .pair { display:grid; gap:10px; grid-template-columns:3fr 1fr; }
  .pair .shot img { aspect-ratio:auto; height:220px; }
  .brief { background:var(--surface); border:1px solid var(--line); border-radius:20px; padding:8px 24px 24px; }
  .brief h2 { font-size:1.8rem; margin-top:.8em; } .brief h3 { font-size:1.4rem; margin:1.4em 0 .4em; }
  code { background:var(--line); padding:1px 6px; border-radius:6px; }
  footer { margin-top:64px; color:var(--muted); font-size:.85rem; }
</style>
</head>
<body>
<div class="wrap">
  <p class="eyebrow">Travail de design</p>
  <h1>Rosée · propositions &amp; captures</h1>
  <p class="lede">Pistes de palette, maquettes Rose &amp; Champagne, noms et logos, captures du front-end actuel, et brief. Les pages s'ouvrent en grand format au clic.</p>
  <nav class="toc"><a href="#propositions">Propositions</a><a href="#captures">Captures</a>${brief ? '<a href="#brief">Brief</a>' : ""}<a href="/">← Application</a></nav>

  <h2 id="propositions">Propositions</h2>
  <div class="cards">
${proposals.map((p) => `    <article class="card">
      <h3>${esc(p.title)}</h3>
      <a class="btn" href="proposals/${esc(p.page)}">Ouvrir la maquette →</a>
      ${p.shots.length ? `<div class="shots">${p.shots.map((s) => img("proposals", s)).join("")}</div>` : ""}
    </article>`).join("\n")}
${orphanShots.length ? `    <article class="card"><h3>Autres visuels</h3><div class="shots">${orphanShots.map((s) => img("proposals", s)).join("")}</div></article>` : ""}
  </div>

  <h2 id="captures">Captures du front-end (${captures.length})</h2>
  <div class="cards">
${[...groups.entries()].map(([base, files]) => `    <article class="card"><h3>${esc(pretty(base))}</h3><div class="pair">${files.sort().map((f) => img("captures", f)).join("")}</div></article>`).join("\n")}
  </div>

${brief ? `  <h2 id="brief">Brief</h2>\n  <section class="brief">${brief}</section>` : ""}

  <footer>Généré automatiquement depuis le dossier <code>design/</code> à chaque build (scripts/sync-design.mjs).</footer>
</div>
</body>
</html>
`;
writeFileSync(join(OUT, "index.html"), html);
console.log(`sync-design: published ${proposals.length} proposals, ${captures.length} captures → /design`);
