import { Schema, model, models } from "mongoose";

/* ---------- Reviews (verified: one per booking) ---------- */
const ReviewSchema = new Schema(
  {
    centerId: { type: Schema.Types.ObjectId, ref: "Center", required: true },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true },
    customerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee" },
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
const PostSchema = new Schema(
  {
    centerId: { type: Schema.Types.ObjectId, ref: "Center", required: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["post", "promotion", "event", "announcement", "video"], default: "post" },
    body: { fr: String, ar: String, en: String },
    media: { type: [{ publicId: String, type: { type: String }, _id: false }], default: [] },
    promo: { serviceIds: [Schema.Types.ObjectId], discountPercent: Number, validFrom: Date, validTo: Date, code: String },
    event: { startsAt: Date, location: String },
    stats: { likes: { type: Number, default: 0 }, comments: { type: Number, default: 0 }, shares: { type: Number, default: 0 } },
    visibility: { type: String, enum: ["public", "followers"], default: "public" },
  },
  { timestamps: true },
);
PostSchema.index({ centerId: 1, createdAt: -1 });
PostSchema.index({ type: 1, "promo.validTo": 1 });

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
export const Story = models.Story ?? model("Story", StorySchema);
export const Follow = models.Follow ?? model("Follow", FollowSchema);
export const LoyaltyEntry = models.LoyaltyEntry ?? model("LoyaltyEntry", LoyaltyEntrySchema);
export const Subscription = models.Subscription ?? model("Subscription", SubscriptionSchema);
export const AuditLog = models.AuditLog ?? model("AuditLog", AuditLogSchema);
