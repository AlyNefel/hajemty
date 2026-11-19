import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { ROLES } from "@/lib/rbac";

const MembershipSchema = new Schema(
  {
    centerId: { type: Schema.Types.ObjectId, ref: "Center", required: true },
    role: { type: String, enum: ["OWNER", "MANAGER", "EMPLOYEE"], required: true },
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee" },
  },
  { _id: false },
);

const UserSchema = new Schema(
  {
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true, match: /^\+216\d{8}$/ },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    avatarUrl: String,
    bio: { type: String, maxlength: 500 },
    role: { type: String, enum: ROLES, default: "CUSTOMER", index: true },
    memberships: { type: [MembershipSchema], default: [] },
    providers: { type: [{ provider: String, providerAccountId: String, _id: false }], default: [] },
    passwordHash: { type: String, select: false },
    locale: { type: String, enum: ["fr", "ar", "en"], default: "fr" },
    loyalty: {
      points: { type: Number, default: 0 },
      lifetimePoints: { type: Number, default: 0 },
      tier: { type: String, enum: ["BRONZE", "SILVER", "GOLD", "VIP"], default: "BRONZE" },
    },
    favorites: { type: [{ type: Schema.Types.ObjectId, ref: "Center" }], default: [] },
    notificationPrefs: {
      whatsapp: { type: Boolean, default: true },
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      marketing: { type: Boolean, default: false },
    },
    tokenVersion: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "suspended", "deleted"], default: "active" },
    lastLoginAt: Date,
  },
  { timestamps: true },
);

UserSchema.index({ email: 1 }, { unique: true, sparse: true });
UserSchema.index({ phone: 1 }, { unique: true, sparse: true });
UserSchema.index({ "memberships.centerId": 1 });
UserSchema.index({ "providers.provider": 1, "providers.providerAccountId": 1 }, { unique: true, sparse: true });

export type UserDoc = InferSchemaType<typeof UserSchema>;
export const User: Model<UserDoc> = models.User ?? model<UserDoc>("User", UserSchema);

export const LOYALTY_TIERS = [
  { tier: "BRONZE", min: 0 },
  { tier: "SILVER", min: 500 },
  { tier: "GOLD", min: 2000 },
  { tier: "VIP", min: 6000 },
] as const;

export const tierFor = (lifetimePoints: number) =>
  [...LOYALTY_TIERS].reverse().find((t) => lifetimePoints >= t.min)!.tier;
