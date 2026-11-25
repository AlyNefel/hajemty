/**
 * The salon's "Mur": a public feed where a center shows its work (réalisations, avant/après, offres,
 * annonces) and clients react and comment. Client-safe: no server imports here.
 */
import type { Photo } from "@/lib/dashboard/types";

export const POST_KINDS = {
  work: { label: "Réalisation", lede: "Montrez un résultat" },
  before_after: { label: "Avant / Après", lede: "2 photos : avant puis après" },
  promo: { label: "Offre", lede: "Une promotion à réserver" },
  news: { label: "Annonce", lede: "Nouveauté, horaires, événement" },
} as const;
export type PostKind = keyof typeof POST_KINDS;
export const POST_KIND_KEYS = Object.keys(POST_KINDS) as PostKind[];

/**
 * Beauty-specific reactions. "want" ("Je le veux") is a purchase-intent signal: the dashboard
 * surfaces it, and the post's "Réserver ce soin" button is right next to it.
 */
export const REACTIONS = [
  { key: "love", emoji: "❤️", label: "J'adore" },
  { key: "wow", emoji: "😍", label: "Magnifique" },
  { key: "want", emoji: "✨", label: "Je le veux" },
  { key: "clap", emoji: "👏", label: "Bravo" },
] as const;
export type ReactionKey = (typeof REACTIONS)[number]["key"];
export const REACTION_KEYS = REACTIONS.map((r) => r.key) as ReactionKey[];
export type ReactionCounts = Record<ReactionKey, number>;
export const emptyReactions = (): ReactionCounts => ({ love: 0, wow: 0, want: 0, clap: 0 });

export const POST_TEXT_MAX = 2000;
export const POST_PHOTOS_MAX = 10;
export const COMMENT_MAX = 1000;
export const FEED_PAGE = 6;

export type PostView = {
  id: string;
  kind: PostKind;
  text: string;
  photos: Photo[];
  /** Tagged service: the post links straight to booking it. */
  service?: { id: string; name: string; priceMillimes: number; durationMin: number };
  /** "Réalisé par …" */
  staffName?: string;
  promo?: { discountPercent: number; until?: string };
  pinned: boolean;
  hidden: boolean;
  createdAt: string;
  reactions: ReactionCounts;
  commentCount: number;
  /** The viewer's own reaction, when signed in. */
  myReaction: ReactionKey | null;
  /** A few latest comments, so the feed reads like a conversation without extra requests. */
  preview: CommentView[];
};

export type CommentView = {
  id: string;
  postId: string;
  author: string;
  /** Written by the salon's team: shown with the salon's name and a "Salon" badge. */
  isCenter: boolean;
  /** The author completed a booking at this salon. */
  verifiedClient: boolean;
  text: string;
  createdAt: string;
  /** The viewer wrote it (can delete it). */
  mine: boolean;
  hidden: boolean;
};

export type WallViewer = { signedIn: boolean; name?: string; canManage: boolean };

export type FeedPage = { posts: PostView[]; nextOffset: number | null; total: number; viewer: WallViewer };
