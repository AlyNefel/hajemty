import { Schema, model, models } from "mongoose";

/* ---------- Reviews (verified: one per booking) ---------- */
const ReviewSchema = new Schema(
  {
    centerId: { type: Schema.Types.ObjectId, ref: "Center", required: true },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true },
    customerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee" },
    // Snapshots: the review must read the same even if the customer renames or the service is retired.
    authorName: { type: String, required: true },
    serviceName: String,
    employeeName: String,
    rating: { type: Number, min: 1, max: 5, required: true },
    subRatings: { quality: Number, cleanliness: Number, welcome: Number, value: Number, punctuality: Number },
    comment: { type: String, maxlength: 2000 },
    photos: { type: [String], default: [] },
    reply: { text: String, at: Date, by: Schema.Types.ObjectId },
    status: { type: String, enum: ["visible", "flagged", "hidden"], default: "visible" },
    helpfulCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);
ReviewSchema.index({ bookingId: 1 }, { unique: true });
ReviewSchema.index({ centerId: 1, status: 1, createdAt: -1 });
ReviewSchema.index({ customerId: 1, createdAt: -1 });
ReviewSchema.index({ status: 1, rating: -1, createdAt: -1 }); // homepage testimonials

/* ---------- Chat ---------- */
const ConversationSchema = new Schema(
  {
    centerId: { type: Schema.Types.ObjectId, ref: "Center", required: true },
    customerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    assignedEmployeeId: { type: Schema.Types.ObjectId, ref: "Employee" },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking" },
    lastMessage: { body: String, type: { type: String }, at: Date, senderRole: String },
    unread: { customer: { type: Number, default: 0 }, center: { type: Number, default: 0 } },
  },
  { timestamps: true },
);
ConversationSchema.index({ centerId: 1, customerId: 1 }, { unique: true });
ConversationSchema.index({ centerId: 1, "lastMessage.at": -1 });
ConversationSchema.index({ customerId: 1, "lastMessage.at": -1 });

const MessageSchema = new Schema(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true },
    clientId: { type: String, required: true }, // idempotent retries
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    senderRole: { type: String, enum: ["customer", "center", "system"], required: true },
    type: { type: String, enum: ["text", "image", "voice", "file", "booking_ref", "system"], default: "text" },
    body: { type: String, maxlength: 4000 },
    media: { publicId: String, durationSec: Number, bytes: Number, mime: String },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking" },
    source: { type: String, enum: ["app", "whatsapp"], default: "app" },
    readAt: Date,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
MessageSchema.index({ conversationId: 1, _id: -1 });
MessageSchema.index({ clientId: 1 }, { unique: true });

/* ---------- Social ---------- */
const WallMediaSchema = new Schema({ url: String, publicId: String, w: Number, h: Number, alt: String }, { _id: false });
const ReactionCountsSchema = new Schema(
  { love: { type: Number, default: 0 }, wow: { type: Number, default: 0 }, want: { type: Number, default: 0 }, clap: { type: Number, default: 0 } },
  { _id: false },
);
/** A post on the center's "Mur" (src/lib/wall). Counters are kept in step with the reaction/comment collections. */
const PostSchema = new Schema(
  {
    centerId: { type: Schema.Types.ObjectId, ref: "Center", required: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    kind: { type: String, enum: ["work", "before_after", "promo", "news"], default: "work" },
    text: { type: String, maxlength: 2000, default: "" },
    photos: { type: [WallMediaSchema], default: [] },
    serviceId: { type: Schema.Types.ObjectId, ref: "Service" },
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee" },
    promo: { discountPercent: Number, until: Date },
    pinned: { type: Boolean, default: false },
    status: { type: String, enum: ["visible", "hidden"], default: "visible" },
    stats: { reactions: { type: ReactionCountsSchema, default: () => ({}) }, comments: { type: Number, default: 0 } },
  },
  { timestamps: true },
);
PostSchema.index({ centerId: 1, status: 1, pinned: -1, createdAt: -1 });

/** One reaction per user per post: _id = "{postId}:{userId}". */
const PostReactionSchema = new Schema(
  { _id: String, postId: { type: Schema.Types.ObjectId, required: true }, userId: { type: Schema.Types.ObjectId, required: true }, type: { type: String, enum: ["love", "wow", "want", "clap"], required: true } },
  { timestamps: true },
);
PostReactionSchema.index({ postId: 1 });

const PostCommentSchema = new Schema(
  {
    postId: { type: Schema.Types.ObjectId, ref: "Post", required: true },
    centerId: { type: Schema.Types.ObjectId, ref: "Center", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    // Snapshot, like reviews: the thread reads the same if the user renames.
    authorName: { type: String, required: true },
    isCenter: { type: Boolean, default: false },
    verifiedClient: { type: Boolean, default: false },
    text: { type: String, required: true, maxlength: 1000 },
    status: { type: String, enum: ["visible", "hidden"], default: "visible" },
  },
  { timestamps: true },
);
PostCommentSchema.index({ postId: 1, status: 1, createdAt: -1 });

const StorySchema = new Schema(
  { centerId: { type: Schema.Types.ObjectId, required: true }, media: { publicId: String, type: { type: String } }, expiresAt: { type: Date, required: true } },
  { timestamps: true },
);
StorySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
StorySchema.index({ centerId: 1, createdAt: -1 });

/** _id = "{userId}:{centerId}" makes follow idempotent. */
const FollowSchema = new Schema(
  { _id: String, userId: { type: Schema.Types.ObjectId, required: true }, centerId: { type: Schema.Types.ObjectId, required: true } },
  { timestamps: { createdAt: true, updatedAt: false } },
);
FollowSchema.index({ centerId: 1 });
FollowSchema.index({ userId: 1, createdAt: -1 });

/* ---------- Loyalty (append-only ledger) ---------- */
const LoyaltyEntrySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true },
    centerId: Schema.Types.ObjectId,
    delta: { type: Number, required: true },
    reason: { type: String, enum: ["booking_completed", "review", "photo_review", "referral", "redeem", "adjustment"], required: true },
    bookingId: Schema.Types.ObjectId,
    balanceAfter: Number,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
LoyaltyEntrySchema.index({ userId: 1, createdAt: -1 });
LoyaltyEntrySchema.index({ bookingId: 1, reason: 1 }, { unique: true, sparse: true }); // no double credit

/* ---------- Billing ---------- */
const SubscriptionSchema = new Schema(
  {
    centerId: { type: Schema.Types.ObjectId, required: true },
    plan: { type: String, enum: ["FREE", "PRO", "PREMIUM", "ENTERPRISE"], required: true },
    interval: { type: String, enum: ["month", "year"], default: "month" },
    status: { type: String, enum: ["trialing", "active", "past_due", "cancelled"], default: "trialing" },
    currentPeriodEnd: Date,
    provider: { type: String, enum: ["konnect", "flouci", "d17", "manual"] },
    providerRef: String,
  },
  { timestamps: true },
);
SubscriptionSchema.index({ centerId: 1 }, { unique: true });
SubscriptionSchema.index({ status: 1, currentPeriodEnd: 1 });

/* ---------- Audit ---------- */
const AuditLogSchema = new Schema({
  actorId: Schema.Types.ObjectId,
  actorRole: String,
  action: { type: String, required: true },
  resource: { type: { type: String }, id: String },
  centerId: Schema.Types.ObjectId,
  ip: String,
  userAgent: String,
  diff: Schema.Types.Mixed,
  at: { type: Date, default: Date.now },
});
AuditLogSchema.index({ at: 1 }, { expireAfterSeconds: 400 * 24 * 3600 });
AuditLogSchema.index({ centerId: 1, at: -1 });
AuditLogSchema.index({ actorId: 1, at: -1 });

export const Review = models.Review ?? model("Review", ReviewSchema);
export const Conversation = models.Conversation ?? model("Conversation", ConversationSchema);
export const Message = models.Message ?? model("Message", MessageSchema);
export const Post = models.Post ?? model("Post", PostSchema);
export const PostReaction = models.PostReaction ?? model("PostReaction", PostReactionSchema);
export const PostComment = models.PostComment ?? model("PostComment", PostCommentSchema);
export const Story = models.Story ?? model("Story", StorySchema);
export const Follow = models.Follow ?? model("Follow", FollowSchema);
export const LoyaltyEntry = models.LoyaltyEntry ?? model("LoyaltyEntry", LoyaltyEntrySchema);
export const Subscription = models.Subscription ?? model("Subscription", SubscriptionSchema);
export const AuditLog = models.AuditLog ?? model("AuditLog", AuditLogSchema);
