import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

export { BOOKING_STATUSES, BOOKING_TRANSITIONS, type BookingStatus } from "@/lib/booking/status";
import { BOOKING_STATUSES } from "@/lib/booking/status";

const BookingSchema = new Schema(
  {
    ref: { type: String, required: true },
    centerId: { type: Schema.Types.ObjectId, ref: "Center", required: true },
    customerId: { type: Schema.Types.ObjectId, ref: "User" },
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    items: {
      type: [{ serviceId: Schema.Types.ObjectId, name: String, durationMin: Number, priceMillimes: Number, _id: false }],
      validate: (v: unknown[]) => v.length > 0,
    },
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    status: { type: String, enum: BOOKING_STATUSES, default: "confirmed" },
    source: { type: String, enum: ["web", "app", "whatsapp", "walk_in", "owner_dashboard"], default: "web" },
    totalMillimes: { type: Number, required: true },
    depositMillimes: { type: Number, default: 0 },
    paymentStatus: { type: String, enum: ["unpaid", "deposit_paid", "paid", "refunded"], default: "unpaid" },
    notes: { type: String, maxlength: 500 },
    customerSnapshot: { name: String, phone: String },
    history: { type: [{ at: Date, by: Schema.Types.ObjectId, from: String, to: String, reason: String, _id: false }], default: [] },
    reminderSentAt: Date,
    reviewRequestedAt: Date,
  },
  { timestamps: true },
);
BookingSchema.index({ ref: 1 }, { unique: true });
BookingSchema.index({ centerId: 1, start: 1 });
BookingSchema.index({ employeeId: 1, start: 1 });
BookingSchema.index({ customerId: 1, start: -1 });
BookingSchema.index({ status: 1, start: 1 });

/** One document per 5-minute granule per employee. A unique _id makes double-booking impossible. */
const BookingLockSchema = new Schema({
  _id: { type: String, required: true },
  bookingId: { type: Schema.Types.ObjectId, ref: "Booking" },
  expiresAt: { type: Date }, // only for checkout holds
});
BookingLockSchema.index({ bookingId: 1 });
BookingLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { expiresAt: { $exists: true } } });

export type BookingDoc = InferSchemaType<typeof BookingSchema>;
export const Booking: Model<BookingDoc> = models.Booking ?? model<BookingDoc>("Booking", BookingSchema);
export const BookingLock = models.BookingLock ?? model("BookingLock", BookingLockSchema);
