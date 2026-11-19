import type { DayHours } from "@/lib/booking/availability";
import type { BookingStatus } from "@/lib/booking/status";
import type { Plan } from "@/lib/plans";
import type { CenterRole } from "@/lib/rbac";

/** DTOs crossing the server→client boundary in the owner dashboard. Plain JSON, no ObjectIds or Dates. */
export type DashCenter = {
  id: string;
  slug: string;
  name: string;
  plan: Plan;
  palette: [string, string];
  openingHours: DayHours[];
  slotStepMin: number;
  autoConfirm: boolean;
  /** The viewer's role in this center ("SUPER_ADMIN" when acting platform-wide). */
  myRole: CenterRole | "SUPER_ADMIN";
  myEmployeeId?: string;
};

export type DashService = {
  id: string;
  category: string;
  name: string;
  description?: string;
  durationMin: number;
  bufferAfterMin: number;
  priceMillimes: number;
  isActive: boolean;
  sortOrder: number;
};

export type DashStaff = {
  id: string;
  name: string;
  title: string;
  color: string;
  serviceIds: string[];
  workingHours: DayHours[];
  isBookable: boolean;
};

export type DashBooking = {
  id: string;
  ref: string;
  employeeId: string;
  start: string; // ISO UTC
  end: string;
  status: BookingStatus;
  source: "web" | "app" | "whatsapp" | "walk_in" | "owner_dashboard";
  customerName: string;
  customerPhone?: string;
  items: { name: string; durationMin: number; priceMillimes: number }[];
  totalMillimes: number;
  notes?: string;
};

export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };
