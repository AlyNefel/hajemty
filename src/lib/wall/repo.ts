import "server-only";
import { Types } from "mongoose";
import { DEMO_CENTERS } from "@/data/demo";
import { connectDB, hasDatabase } from "@/lib/db";
import { demoStore, shortName } from "@/lib/dashboard/demo-store";
import type { Photo } from "@/lib/dashboard/types";
import { Booking } from "@/models/Booking";
import { Center } from "@/models/Center";
import { Employee, Service } from "@/models/Catalog";
import { Post, PostComment, PostReaction } from "@/models/Engagement";
import { applyReaction, feedOrder, totalReactions } from "./logic";
import { emptyReactions, REACTION_KEYS, type CommentView, type PostKind, type PostView, type ReactionCounts, type ReactionKey } from "./types";

/**
 * The center's "Mur" (see ./types.ts). Two backends with one interface: MongoDB, or an in-memory
 * store seeded with realistic posts and threads when there is no database (demo mode).
 */
export class WallError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}
const notFound = () => new WallError(404, "NOT_FOUND", "Publication introuvable");

export type Viewer = { id: string; name: string } | null;
export type NewPost = {
  kind: PostKind; text: string; photos: Photo[]; serviceId?: string; employeeId?: string;
  promo?: { discountPercent: number; until?: string };
};

const PREVIEW_COMMENTS = 2;

/* ================================================================== demo store */

type DemoComment = { id: string; userId: string; author: string; isCenter: boolean; verifiedClient: boolean; text: string; createdAt: string; hidden: boolean };
type DemoPost = NewPost & {
  id: string; centerId: string; pinned: boolean; hidden: boolean; createdAt: string;
  reactions: ReactionCounts; reactedBy: Map<string, ReactionKey>; comments: DemoComment[];
};
const g = globalThis as unknown as { __hajemtiWall?: Map<string, DemoPost[]> };
const walls: Map<string, DemoPost[]> = (g.__hajemtiWall ??= new Map());

const FIRST = ["Salma", "Amira", "Ines", "Rania", "Leila", "Sarra", "Mariem", "Olfa", "Hela", "Asma", "Fatma", "Rim", "Ons", "Emna", "Aya", "Dorra", "Nesrine", "Chaima"];
const INITIAL = "BCDGHJKMRSTZ";
const PRAISE = [
  "Magnifique 😍", "Trop beau le résultat !", "Bravo à toute l'équipe 👏", "Je réserve la semaine prochaine ✨",
  "J'y étais samedi, accueil au top et résultat parfait.", "Waaaw ça donne envie !", "Toujours aussi pro, merci 🙏",
  "Le meilleur salon de la région, sans hésiter.", "C'est exactement ce que je cherchais !",
];
const QUESTIONS: [string, string][] = [
  ["C'est combien pour les cheveux longs ?", "Bonjour ! À partir du prix affiché, on ajuste selon la longueur. Vous pouvez réserver directement depuis la publication 😊"],
  ["Vous avez de la place samedi ?", "Bonjour, oui il reste quelques créneaux samedi matin, réservez en ligne pour bloquer votre place ✨"],
  ["Ça dure combien de temps ?", "Comptez la durée indiquée sur la prestation, on prend le temps qu'il faut 🙂"],
];

/** Deterministic pseudo-random generator, so a demo salon always gets the same wall. */
const rng = (seed: string) => {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296;
};

function seedWall(centerId: string): DemoPost[] {
  const c = DEMO_CENTERS.find((x) => x.id === centerId);
  if (!c) return [];
  const s = demoStore(centerId);
  const services = s.services.filter((x) => x.isActive);
  const staff = s.staff;
  const r = rng(centerId);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const svc = (i: number) => services[i % Math.max(1, services.length)];
  const now = Date.now();
  const ago = (days: number, hours = 0) => new Date(now - days * 86_400_000 - hours * 3_600_000).toISOString();
  const popular = services.find((x) => c.services.find((y) => y.id === x.id)?.popular) ?? services[0];
  // The offer is tagged with the service its title talks about ("-20% sur le rituel hammam…").
  const words = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(/[^a-z]+/).filter((w) => w.length > 3);
  const promoWords = new Set(words(c.promo?.title ?? ""));
  const promoService = [...services].sort((a, b) => words(b.name).filter((w) => promoWords.has(w)).length - words(a.name).filter((w) => promoWords.has(w)).length)[0];

  const drafts: (Omit<DemoPost, "id" | "centerId" | "reactions" | "reactedBy" | "comments" | "hidden"> & { mood: number; asks?: boolean })[] = [];
  if (c.promo && promoService) {
    drafts.push({ kind: "promo", pinned: true, createdAt: ago(9, 3), text: `${c.promo.title} ✨\nOffre valable jusqu'au ${new Date(c.promo.until).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}, dans la limite des créneaux disponibles. Réservez en ligne, la remise est appliquée au salon.`, photos: [], serviceId: promoService.id, promo: { discountPercent: c.promo.discountPercent, until: c.promo.until }, mood: 1.4, asks: true });
  }
  if (svc(0)) drafts.push({ kind: "work", pinned: false, createdAt: ago(0, 5), text: `Résultat du jour ✨ ${svc(0).name}${staff[0] ? ` signé ${staff[0].name}` : ""}. Merci à notre cliente pour sa confiance, on adore ce rendu naturel et lumineux.`, photos: [], serviceId: svc(0).id, employeeId: staff[0]?.id, mood: 1.2 });
  if (svc(1)) drafts.push({ kind: "before_after", pinned: false, createdAt: ago(2, 2), text: `Avant / après : ${svc(1).name}. ${svc(1).durationMin} minutes pour un vrai coup d'éclat 💫`, photos: [], serviceId: svc(1).id, employeeId: staff[1]?.id ?? staff[0]?.id, mood: 1.6, asks: true });
  drafts.push({ kind: "news", pinned: false, createdAt: ago(5, 6), text: `Nouveau chez ${c.name} : réservez 7j/7 en ligne sur Hajemti, avec confirmation immédiate et rappel la veille. Plus besoin d'appeler 📲`, photos: [], mood: 0.6 });
  if (svc(2)) drafts.push({ kind: "work", pinned: false, createdAt: ago(8, 1), text: `${svc(2).name} : on vous montre le détail du travail. Chaque prestation est faite sur mesure, prenez rendez-vous pour en parler avec l'équipe.`, photos: [], serviceId: svc(2).id, employeeId: staff[2]?.id ?? staff[0]?.id, mood: 0.9 });
  if (staff.length > 1) drafts.push({ kind: "news", pinned: false, createdAt: ago(13, 4), text: `L'équipe au complet vous attend cette semaine : ${staff.map((x) => x.name).join(", ")}. Choisissez votre professionnelle au moment de réserver 💛`, photos: [], mood: 0.8 });

  const bookers = s.bookings.filter((b) => b.status === "completed");
  return drafts.map(({ mood, asks, ...d }, i) => {
    const id = `${centerId}-p${i + 1}`;
    const base = Math.round((12 + r() * 40) * mood);
    const reactions: ReactionCounts = {
      love: Math.round(base * (0.45 + r() * 0.2)), wow: Math.round(base * (0.15 + r() * 0.15)),
      want: Math.round(base * (d.serviceId ? 0.15 + r() * 0.2 : 0.02)), clap: Math.round(base * (0.08 + r() * 0.1)),
    };
    const comments: DemoComment[] = [];
    const n = Math.floor(r() * 4) + (asks ? 1 : 0);
    for (let k = 0; k < n; k++) {
      const at = new Date(Date.parse(d.createdAt) + (k + 1) * (1 + r() * 5) * 3_600_000).toISOString();
      const name = `${pick(FIRST)} ${pick(INITIAL.split(""))}.`;
      const ask = asks && k === 0;
      const q = ask ? pick(QUESTIONS) : null;
      comments.push({ id: `${id}-c${k}`, userId: `demo-fan-${k}`, author: name, isCenter: false, verifiedClient: bookers.length > 0 && r() < 0.6, text: q ? q[0] : pick(PRAISE), createdAt: at, hidden: false });
      if (q) comments.push({ id: `${id}-c${k}r`, userId: "demo-center", author: c.name, isCenter: true, verifiedClient: false, text: q[1], createdAt: new Date(Date.parse(at) + 40 * 60_000).toISOString(), hidden: false });
    }
    return { ...d, id, centerId, hidden: false, reactions, reactedBy: new Map(), comments: comments.filter((x) => Date.parse(x.createdAt) <= now) };
  });
}

function demoWall(centerId: string): DemoPost[] {
  let w = walls.get(centerId);
  if (!w) walls.set(centerId, (w = seedWall(centerId)));
  return w;
}
function demoFind(postId: string): DemoPost {
  for (const w of walls.values()) {
    const p = w.find((x) => x.id === postId);
    if (p) return p;
  }
  // The wall may not be seeded yet in this instance: post ids start with the center id.
  const centerId = postId.replace(/-p\d+$/, "").replace(/-u[\w]+$/, "");
  const p = demoWall(centerId).find((x) => x.id === postId);
  if (!p) throw notFound();
  return p;
}

const demoVerified = (centerId: string, userId: string) =>
  demoStore(centerId).bookings.some((b) => b.customerId === userId && b.status === "completed");

const demoCommentView = (postId: string, c: DemoComment, viewer: Viewer): CommentView => ({
  id: c.id, postId, author: c.author, isCenter: c.isCenter, verifiedClient: c.verifiedClient, text: c.text,
  createdAt: c.createdAt, mine: !!viewer && viewer.id === c.userId, hidden: c.hidden,
});

function demoPostView(p: DemoPost, viewer: Viewer, includeHidden: boolean): PostView {
  const s = demoStore(p.centerId);
  const service = p.serviceId ? s.services.find((x) => x.id === p.serviceId && x.isActive) : undefined;
  const visible = p.comments.filter((c) => includeHidden || !c.hidden);
  return {
    id: p.id, kind: p.kind, text: p.text, photos: p.photos, pinned: p.pinned, hidden: p.hidden, createdAt: p.createdAt,
    service: service && { id: service.id, name: service.name, priceMillimes: service.priceMillimes, durationMin: service.durationMin },
    staffName: p.employeeId ? s.staff.find((x) => x.id === p.employeeId)?.name : undefined,
    promo: p.promo, reactions: { ...p.reactions }, commentCount: p.comments.filter((c) => !c.hidden).length,
    myReaction: viewer ? p.reactedBy.get(viewer.id) ?? null : null,
    preview: [...visible].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, PREVIEW_COMMENTS).reverse().map((c) => demoCommentView(p.id, c, viewer)),
  };
}

/* ================================================================== database helpers */

const oid = (id: string) => {
  if (!Types.ObjectId.isValid(id) || String(new Types.ObjectId(id)) !== id) throw notFound();
  return new Types.ObjectId(id);
};

type PostDoc = {
  _id: Types.ObjectId; centerId: Types.ObjectId; kind: PostKind; text?: string | null;
  photos?: { url?: string | null; publicId?: string | null; w?: number | null; h?: number | null; alt?: string | null }[];
  serviceId?: Types.ObjectId | null; employeeId?: Types.ObjectId | null; promo?: { discountPercent?: number | null; until?: Date | null } | null;
  pinned?: boolean; status: "visible" | "hidden"; createdAt: Date;
  stats?: { reactions?: Partial<ReactionCounts> | null; comments?: number | null } | null;
};
type CommentDoc = {
  _id: Types.ObjectId; postId: Types.ObjectId; userId: Types.ObjectId; authorName: string; isCenter?: boolean;
  verifiedClient?: boolean; text: string; status: "visible" | "hidden"; createdAt: Date;
};

const countsOf = (r?: Partial<ReactionCounts> | null): ReactionCounts => {
  const c = emptyReactions();
  for (const k of REACTION_KEYS) c[k] = Math.max(0, r?.[k] ?? 0);
  return c;
};
const commentFromDoc = (d: CommentDoc, viewer: Viewer): CommentView => ({
  id: String(d._id), postId: String(d.postId), author: d.authorName, isCenter: !!d.isCenter, verifiedClient: !!d.verifiedClient,
  text: d.text, createdAt: d.createdAt.toISOString(), mine: !!viewer && String(d.userId) === viewer.id, hidden: d.status === "hidden",
});

async function hydrateDocs(docs: PostDoc[], viewer: Viewer, includeHidden: boolean): Promise<PostView[]> {
  if (!docs.length) return [];
  const serviceIds = docs.flatMap((d) => (d.serviceId ? [d.serviceId] : []));
  const employeeIds = docs.flatMap((d) => (d.employeeId ? [d.employeeId] : []));
  const [services, employees, mine, previews] = await Promise.all([
    serviceIds.length ? Service.find({ _id: { $in: serviceIds }, isActive: true }, { "name.fr": 1, priceMillimes: 1, durationMin: 1 }).lean() : [],
    employeeIds.length ? Employee.find({ _id: { $in: employeeIds } }, { displayName: 1 }).lean() : [],
    viewer && Types.ObjectId.isValid(viewer.id) ? PostReaction.find({ _id: { $in: docs.map((d) => `${d._id}:${viewer.id}`) } }, { type: 1 }).lean() : [],
    Promise.all(docs.map((d) => PostComment.find({ postId: d._id, ...(includeHidden ? {} : { status: "visible" }) }).sort({ createdAt: -1 }).limit(PREVIEW_COMMENTS).lean<CommentDoc[]>())),
  ]);
  const svc = new Map(services.map((x) => [String(x._id), x]));
  const emp = new Map(employees.map((x) => [String(x._id), x.displayName as string]));
  const my = new Map(mine.map((x) => [String(x._id).split(":")[0], x.type as ReactionKey]));
  return docs.map((d, i) => {
    const s = d.serviceId ? svc.get(String(d.serviceId)) : undefined;
    return {
      id: String(d._id), kind: d.kind, text: d.text ?? "", pinned: !!d.pinned, hidden: d.status === "hidden", createdAt: d.createdAt.toISOString(),
      photos: (d.photos ?? []).flatMap((p) => (p.url ? [{ url: p.url, publicId: p.publicId ?? undefined, w: p.w ?? undefined, h: p.h ?? undefined, alt: p.alt ?? undefined }] : [])),
      service: s && { id: String(s._id), name: s.name?.fr ?? "", priceMillimes: s.priceMillimes, durationMin: s.durationMin },
      staffName: d.employeeId ? emp.get(String(d.employeeId)) : undefined,
      promo: d.promo?.discountPercent ? { discountPercent: d.promo.discountPercent, until: d.promo.until?.toISOString().slice(0, 10) } : undefined,
      reactions: countsOf(d.stats?.reactions), commentCount: Math.max(0, d.stats?.comments ?? 0),
      myReaction: my.get(String(d._id)) ?? null,
      preview: previews[i].reverse().map((c) => commentFromDoc(c, viewer)),
    };
  });
}

/* ================================================================== public API */

/** Visible posts, pinned first then newest. `includeHidden` is for the salon's own team. */
export async function listFeed(centerId: string, viewer: Viewer, opts: { offset?: number; limit?: number; includeHidden?: boolean } = {}) {
  const { offset = 0, limit = 6, includeHidden = false } = opts;
  if (!hasDatabase()) {
    const all = demoWall(centerId).filter((p) => includeHidden || !p.hidden).sort(feedOrder);
    return { posts: all.slice(offset, offset + limit).map((p) => demoPostView(p, viewer, includeHidden)), total: all.length };
  }
  await connectDB();
  const filter = { centerId: oid(centerId), ...(includeHidden ? {} : { status: "visible" }) };
  const [docs, total] = await Promise.all([
    Post.find(filter).sort({ pinned: -1, createdAt: -1 }).skip(offset).limit(limit).lean<PostDoc[]>(),
    Post.countDocuments(filter),
  ]);
  return { posts: await hydrateDocs(docs, viewer, includeHidden), total };
}

export async function countPosts(centerId: string): Promise<number> {
  if (!hasDatabase()) return demoWall(centerId).filter((p) => !p.hidden).length;
  try {
    await connectDB();
    return await Post.countDocuments({ centerId: oid(centerId), status: "visible" });
  } catch {
    return 0;
  }
}

/** The center a post belongs to (for permission checks), or 404. */
export async function postCenterId(postId: string): Promise<string> {
  if (!hasDatabase()) return demoFind(postId).centerId;
  await connectDB();
  const p = await Post.findById(oid(postId), { centerId: 1 }).lean<{ centerId: Types.ObjectId }>();
  if (!p) throw notFound();
  return String(p.centerId);
}

/** The salon's display name, used to sign its team's comments. */
export async function centerDisplayName(centerId: string): Promise<string> {
  if (!hasDatabase()) return DEMO_CENTERS.find((c) => c.id === centerId)?.name ?? "Le salon";
  await connectDB();
  const c = await Center.findById(oid(centerId), { "name.fr": 1, slug: 1 }).lean<{ name?: { fr?: string }; slug: string }>();
  return c?.name?.fr ?? c?.slug ?? "Le salon";
}

/** Hidden posts are only reachable by the salon's team. */
async function assertPostVisible(postId: string, canManage: boolean) {
  if (canManage) return;
  const hidden = !hasDatabase() ? demoFind(postId).hidden : (await Post.exists({ _id: oid(postId), status: "hidden" })) !== null;
  if (hidden) throw notFound();
}

export async function createPost(centerId: string, author: { id: string }, input: NewPost): Promise<PostView> {
  if (!hasDatabase()) {
    const w = demoWall(centerId);
    const p: DemoPost = {
      ...input, id: `${centerId}-u${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`, centerId, pinned: false, hidden: false,
      createdAt: new Date().toISOString(), reactions: emptyReactions(), reactedBy: new Map(), comments: [],
    };
    w.push(p);
    return demoPostView(p, null, true);
  }
  await connectDB();
  const doc = await Post.create({
    centerId: oid(centerId), authorId: oid(author.id), kind: input.kind, text: input.text, photos: input.photos,
    serviceId: input.serviceId ? oid(input.serviceId) : undefined, employeeId: input.employeeId ? oid(input.employeeId) : undefined,
    promo: input.promo ? { discountPercent: input.promo.discountPercent, until: input.promo.until ? new Date(input.promo.until) : undefined } : undefined,
  });
  return (await hydrateDocs([doc.toObject() as PostDoc], null, true))[0];
}

export async function updatePost(centerId: string, postId: string, patch: { pinned?: boolean; hidden?: boolean }) {
  if (!hasDatabase()) {
    const p = demoFind(postId);
    if (p.centerId !== centerId) throw notFound();
    if (patch.pinned !== undefined) p.pinned = patch.pinned;
    if (patch.hidden !== undefined) p.hidden = patch.hidden;
    return;
  }
  await connectDB();
  const set: Record<string, unknown> = {};
  if (patch.pinned !== undefined) set.pinned = patch.pinned;
  if (patch.hidden !== undefined) set.status = patch.hidden ? "hidden" : "visible";
  const r = await Post.updateOne({ _id: oid(postId), centerId: oid(centerId) }, { $set: set });
  if (!r.matchedCount) throw notFound();
}

export async function deletePost(centerId: string, postId: string) {
  if (!hasDatabase()) {
    const w = demoWall(centerId);
    const i = w.findIndex((p) => p.id === postId);
    if (i < 0) throw notFound();
    w.splice(i, 1);
    return;
  }
  await connectDB();
  const r = await Post.deleteOne({ _id: oid(postId), centerId: oid(centerId) });
  if (!r.deletedCount) throw notFound();
  await Promise.all([PostReaction.deleteMany({ postId: oid(postId) }), PostComment.deleteMany({ postId: oid(postId) })]);
}

/** Sets (or clears, with null) the viewer's reaction. Returns the new counts. */
export async function react(postId: string, userId: string, type: ReactionKey | null, canManage = false): Promise<{ reactions: ReactionCounts; myReaction: ReactionKey | null }> {
  await assertPostVisible(postId, canManage);
  if (!hasDatabase()) {
    const p = demoFind(postId);
    const before = p.reactedBy.get(userId) ?? null;
    p.reactions = applyReaction(p.reactions, before, type);
    if (type) p.reactedBy.set(userId, type);
    else p.reactedBy.delete(userId);
    return { reactions: { ...p.reactions }, myReaction: type };
  }
  await connectDB();
  const pid = oid(postId);
  const _id = `${postId}:${userId}`;
  let before: ReactionKey | null = null;
  if (type) {
    const prev = await PostReaction.findOneAndUpdate({ _id }, { $set: { type, postId: pid, userId: oid(userId) } }, { upsert: true, new: false }).lean<{ type: ReactionKey }>();
    before = prev?.type ?? null;
  } else {
    const prev = await PostReaction.findOneAndDelete({ _id }).lean<{ type: ReactionKey }>();
    before = prev?.type ?? null;
  }
  if (before !== type) {
    const inc: Record<string, number> = {};
    if (before) inc[`stats.reactions.${before}`] = -1;
    if (type) inc[`stats.reactions.${type}`] = 1;
    await Post.updateOne({ _id: pid }, { $inc: inc });
  }
  const p = await Post.findById(pid, { "stats.reactions": 1 }).lean<PostDoc>();
  return { reactions: countsOf(p?.stats?.reactions), myReaction: type };
}

export async function listComments(postId: string, viewer: Viewer, opts: { offset?: number; limit?: number; includeHidden?: boolean } = {}) {
  const { offset = 0, limit = 20, includeHidden = false } = opts;
  await assertPostVisible(postId, includeHidden);
  if (!hasDatabase()) {
    const all = demoFind(postId).comments.filter((c) => includeHidden || !c.hidden).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return { comments: all.slice(offset, offset + limit).map((c) => demoCommentView(postId, c, viewer)), total: all.length };
  }
  await connectDB();
  const filter = { postId: oid(postId), ...(includeHidden ? {} : { status: "visible" }) };
  const [docs, total] = await Promise.all([
    PostComment.find(filter).sort({ createdAt: 1 }).skip(offset).limit(limit).lean<CommentDoc[]>(),
    PostComment.countDocuments(filter),
  ]);
  return { comments: docs.map((d) => commentFromDoc(d, viewer)), total };
}

/**
 * A comment. Written by the salon's team it is signed with the salon's name; written by a client
 * who completed a booking there it carries the "Cliente vérifiée" badge.
 */
export async function addComment(postId: string, user: { id: string; name: string }, text: string, asCenter: { name: string } | null): Promise<CommentView> {
  await assertPostVisible(postId, !!asCenter);
  const viewer = { id: user.id, name: user.name };
  const author = asCenter ? asCenter.name : shortName(user.name);
  if (!hasDatabase()) {
    const p = demoFind(postId);
    const c: DemoComment = {
      id: `${postId}-x${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`, userId: user.id, author, isCenter: !!asCenter,
      verifiedClient: !asCenter && demoVerified(p.centerId, user.id), text, createdAt: new Date().toISOString(), hidden: false,
    };
    p.comments.push(c);
    return demoCommentView(postId, c, viewer);
  }
  await connectDB();
  const pid = oid(postId);
  const post = await Post.findById(pid, { centerId: 1 }).lean<{ centerId: Types.ObjectId }>();
  if (!post) throw notFound();
  const verifiedClient = !asCenter && Types.ObjectId.isValid(user.id)
    && (await Booking.exists({ centerId: post.centerId, customerId: oid(user.id), status: "completed" })) !== null;
  const doc = await PostComment.create({ postId: pid, centerId: post.centerId, userId: oid(user.id), authorName: author, isCenter: !!asCenter, verifiedClient, text });
  await Post.updateOne({ _id: pid }, { $inc: { "stats.comments": 1 } });
  return commentFromDoc(doc.toObject() as CommentDoc, viewer);
}

/** Authors delete their own comments; the salon's team can delete or hide any comment on its wall. */
export async function removeComment(postId: string, commentId: string, actor: { id: string; canManage: boolean }, mode: "delete" | "hide" | "show") {
  if (mode !== "delete" && !actor.canManage) throw new WallError(403, "FORBIDDEN", "Action réservée au salon");
  if (!hasDatabase()) {
    const p = demoFind(postId);
    const i = p.comments.findIndex((c) => c.id === commentId);
    if (i < 0) throw new WallError(404, "NOT_FOUND", "Commentaire introuvable");
    if (!actor.canManage && p.comments[i].userId !== actor.id) throw new WallError(403, "FORBIDDEN", "Vous ne pouvez supprimer que vos commentaires");
    if (mode === "delete") p.comments.splice(i, 1);
    else p.comments[i].hidden = mode === "hide";
    return;
  }
  await connectDB();
  const c = await PostComment.findOne({ _id: oid(commentId), postId: oid(postId) }).lean<CommentDoc>();
  if (!c) throw new WallError(404, "NOT_FOUND", "Commentaire introuvable");
  if (!actor.canManage && String(c.userId) !== actor.id) throw new WallError(403, "FORBIDDEN", "Vous ne pouvez supprimer que vos commentaires");
  const wasVisible = c.status === "visible";
  if (mode === "delete") {
    await PostComment.deleteOne({ _id: c._id });
    if (wasVisible) await Post.updateOne({ _id: c.postId }, { $inc: { "stats.comments": -1 } });
  } else {
    const hide = mode === "hide";
    if (hide === wasVisible) {
      await PostComment.updateOne({ _id: c._id }, { $set: { status: hide ? "hidden" : "visible" } });
      await Post.updateOne({ _id: c.postId }, { $inc: { "stats.comments": hide ? -1 : 1 } });
    }
  }
}

/** Engagement figures for the dashboard. */
export async function wallStats(centerId: string) {
  const { posts } = await listFeed(centerId, null, { limit: 500, includeHidden: true });
  const since = Date.now() - 30 * 86_400_000;
  const sum = emptyReactions();
  for (const p of posts) for (const k of REACTION_KEYS) sum[k] += p.reactions[k];
  return {
    posts: posts.length,
    last30: posts.filter((p) => Date.parse(p.createdAt) >= since).length,
    reactions: totalReactions(sum),
    want: sum.want,
    comments: posts.reduce((n, p) => n + p.commentCount, 0),
  };
}
