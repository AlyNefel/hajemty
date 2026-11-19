import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { CATEGORY_KEYS } from "@/data/tunisia";
import { PLANS } from "@/lib/plans";
import { ThemeSchema } from "@/lib/theme/schema";

export const LocalizedString = { fr: { type: String, required: true }, ar: String, en: String };

const DayHoursSchema = new Schema(
  {
    day: { type: Number, min: 0, max: 6, required: true }, // 0 = Sunday
    open: { type: Number, min: 0, max: 1440, required: true }, // minutes from local midnight
    close: { type: Number, min: 0, max: 1440, required: true },
    breaks: { type: [{ start: Number, end: Number, _id: false }], default: [] },
  },
  { _id: false },
);

const MediaSchema = new Schema(
  { publicId: String, url: String, type: { type: String, enum: ["image", "video"] }, w: Number, h: Number, alt: String },
  { _id: false },
);

/** Theme is validated with zod (shared with the builder), so Mongo stores it as a checked Mixed. */
const themeValidator = {
  validator: (v: unknown) => v == null || ThemeSchema.safeParse(v).success,
  message: "Invalid theme document",
};

const CenterSchema = new Schema(
  {
    slug: { type: String, required: true, lowercase: true, trim: true, match: /^[a-z0-9-]{3,60}$/ },
    name: LocalizedString,
    description: { fr: String, ar: String, en: String },
    categories: { type: [{ type: String, enum: CATEGORY_KEYS }], required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization" },
    address: {
      line1: String,
      governorate: { type: String, required: true },
      delegation: String,
      city: String,
      postalCode: String,
    },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    contact: { phone: String, whatsapp: String, email: String, website: String, instagram: String, facebook: String, tiktok: String },
    openingHours: { type: [DayHoursSchema], default: [] },
    specialDays: { type: [{ date: String, closed: Boolean, open: Number, close: Number, _id: false }], default: [] },
    media: { logo: MediaSchema, cover: MediaSchema, gallery: { type: [MediaSchema], default: [] }, heroVideo: MediaSchema },
    theme: { type: Schema.Types.Mixed, validate: themeValidator },
    themeDraft: { type: Schema.Types.Mixed, validate: themeValidator },
    plan: { type: String, enum: PLANS, default: "FREE" },
    stats: {
      ratingAvg: { type: Number, default: 0 },
      reviewCount: { type: Number, default: 0 },
      bookingCount: { type: Number, default: 0 },
      followerCount: { type: Number, default: 0 },
      score: { type: Number, default: 0 },
      responseRate: { type: Number, default: 0 },
      completionRate: { type: Number, default: 0 },
    },
    priceFromMillimes: { type: Number, default: 0 },
    amenities: { type: [String], default: [] },
    genderFocus: { type: String, enum: ["women", "men", "unisex"], default: "unisex" },
    verified: { type: Boolean, default: false },
    status: { type: String, enum: ["draft", "pending_review", "published", "suspended"], default: "draft" },
    customDomain: { type: String, lowercase: true },
    bookingSettings: {
      slotStepMin: { type: Number, default: 15 },
      minNoticeMin: { type: Number, default: 60 },
      maxAdvanceDays: { type: Number, default: 60 },
      cancellationWindowMin: { type: Number, default: 240 },
      autoConfirm: { type: Boolean, default: true },
      depositPercent: { type: Number, default: 0, min: 0, max: 100 },
    },
    deletedAt: Date,
  },
  { timestamps: true },
);

CenterSchema.index({ slug: 1 }, { unique: true });
CenterSchema.index({ location: "2dsphere" });
CenterSchema.index({ "address.governorate": 1, categories: 1, "stats.score": -1 });
CenterSchema.index({ status: 1, plan: -1, "stats.score": -1 });
CenterSchema.index({ customDomain: 1 }, { unique: true, sparse: true });

export type CenterDoc = InferSchemaType<typeof CenterSchema>;
export const Center: Model<CenterDoc> = models.Center ?? model<CenterDoc>("Center", CenterSchema);
