import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const ServiceSchema = new Schema(
  {
    centerId: { type: Schema.Types.ObjectId, ref: "Center", required: true },
    categoryKey: { type: String, required: true },
    name: { fr: { type: String, required: true }, ar: String, en: String },
    description: { fr: String, ar: String, en: String },
    durationMin: { type: Number, required: true, min: 5, max: 600 },
    bufferAfterMin: { type: Number, default: 0, min: 0, max: 120 },
    priceMillimes: { type: Number, required: true, min: 0 },
    priceMaxMillimes: Number,
    gender: { type: String, enum: ["women", "men", "unisex"], default: "unisex" },
    employeeIds: { type: [{ type: Schema.Types.ObjectId, ref: "Employee" }], default: [] },
    imagePublicId: String,
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    bookingCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);
ServiceSchema.index({ centerId: 1, isActive: 1, sortOrder: 1 });
ServiceSchema.index({ categoryKey: 1, priceMillimes: 1 });

const HoursSchema = new Schema(
  { day: Number, open: Number, close: Number, breaks: { type: [{ start: Number, end: Number, _id: false }], default: [] } },
  { _id: false },
);

const EmployeeSchema = new Schema(
  {
    centerId: { type: Schema.Types.ObjectId, ref: "Center", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    displayName: { type: String, required: true },
    title: String,
    avatarUrl: String,
    bio: String,
    serviceIds: { type: [{ type: Schema.Types.ObjectId, ref: "Service" }], default: [] },
    workingHours: { type: [HoursSchema], default: [] },
    timeOff: { type: [{ start: Date, end: Date, reason: String, _id: false }], default: [] },
    color: { type: String, default: "#e5c07b" },
    isBookable: { type: Boolean, default: true },
    ratingAvg: { type: Number, default: 0 },
  },
  { timestamps: true },
);
EmployeeSchema.index({ centerId: 1, isBookable: 1 });

export type ServiceDoc = InferSchemaType<typeof ServiceSchema>;
export type EmployeeDoc = InferSchemaType<typeof EmployeeSchema>;
export const Service: Model<ServiceDoc> = models.Service ?? model<ServiceDoc>("Service", ServiceSchema);
export const Employee: Model<EmployeeDoc> = models.Employee ?? model<EmployeeDoc>("Employee", EmployeeSchema);
