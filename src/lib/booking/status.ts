/** Booking state machine (docs/04-booking-engine.md §5.4). Has no DB imports, so it is safe in client components. */
export const BOOKING_STATUSES = [
  "pending", "confirmed", "checked_in", "completed",
  "cancelled_by_customer", "cancelled_by_center", "no_show",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const BOOKING_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ["confirmed", "cancelled_by_center", "cancelled_by_customer"],
  confirmed: ["checked_in", "no_show", "cancelled_by_customer", "cancelled_by_center"],
  checked_in: ["completed"],
  completed: [],
  cancelled_by_customer: [],
  cancelled_by_center: [],
  no_show: [],
};

export const isCancelled = (s: BookingStatus) => s === "cancelled_by_customer" || s === "cancelled_by_center";
/** Statuses that occupy the employee's time. */
export const isActive = (s: BookingStatus) => s === "pending" || s === "confirmed" || s === "checked_in";

export const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: "En attente",
  confirmed: "Confirmé",
  checked_in: "Arrivé·e",
  completed: "Terminé",
  cancelled_by_customer: "Annulé (client)",
  cancelled_by_center: "Annulé (salon)",
  no_show: "Absent",
};

/** Labels for the action that moves a booking INTO a status (staff side). */
export const ACTION_LABEL: Partial<Record<BookingStatus, string>> = {
  confirmed: "Confirmer",
  checked_in: "Client arrivé",
  completed: "Terminer",
  no_show: "Marquer absent",
  cancelled_by_center: "Annuler le RDV",
};
