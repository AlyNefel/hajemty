/**
 * RBAC: a global role plus per-center memberships. See docs/03-rbac-security.md.
 * Center-scoped permissions resolve against the membership for the target center,
 * never against the global role (an OWNER of salon A is a CUSTOMER at salon B).
 */
export const ROLES = ["SUPER_ADMIN", "OWNER", "MANAGER", "EMPLOYEE", "CUSTOMER"] as const;
export type Role = (typeof ROLES)[number];
export type CenterRole = Extract<Role, "OWNER" | "MANAGER" | "EMPLOYEE">;

export type Membership = { centerId: string; role: CenterRole; employeeId?: string };
export type Actor = { id: string; role: Role; memberships: Membership[] };

const CENTER_PERMISSIONS = {
  "center.update": ["OWNER", "MANAGER"],
  "center.delete": ["OWNER"],
  "center.theme.edit": ["OWNER", "MANAGER"],
  "service.manage": ["OWNER", "MANAGER"],
  "employee.manage": ["OWNER", "MANAGER"],
  "booking.read.center": ["OWNER", "MANAGER", "EMPLOYEE"],
  "booking.update.center": ["OWNER", "MANAGER", "EMPLOYEE"],
  "review.reply": ["OWNER", "MANAGER"],
  "post.manage": ["OWNER", "MANAGER"],
  "chat.center": ["OWNER", "MANAGER", "EMPLOYEE"],
  "analytics.read": ["OWNER", "MANAGER"],
  "analytics.revenue": ["OWNER"],
  "billing.manage": ["OWNER"],
  "staff.invite": ["OWNER", "MANAGER"],
} as const satisfies Record<string, readonly CenterRole[]>;

const SELF_PERMISSIONS = [
  "booking.create", "booking.cancel.own", "review.create", "follow", "chat.customer", "profile.update",
] as const;

const ADMIN_PERMISSIONS = [
  "admin.users", "admin.centers", "admin.reviews", "admin.subscriptions", "admin.payments", "admin.ads", "admin.reports",
  "review.moderate",
] as const;

export type CenterPermission = keyof typeof CENTER_PERMISSIONS;
export type SelfPermission = (typeof SELF_PERMISSIONS)[number];
export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];
export type Permission = CenterPermission | SelfPermission | AdminPermission;

export type ResourceCtx = {
  centerId?: string;
  /** For "own only" policies: the employee assigned to the booking / conversation. */
  employeeId?: string;
  /** Owner of a self-scoped resource (e.g. the customer of a booking). */
  ownerUserId?: string;
};

export function can(actor: Actor | null | undefined, permission: Permission, ctx: ResourceCtx = {}): boolean {
  if (!actor) return false;
  if (actor.role === "SUPER_ADMIN") return true;

  if ((ADMIN_PERMISSIONS as readonly string[]).includes(permission)) return false;

  if ((SELF_PERMISSIONS as readonly string[]).includes(permission)) {
    return ctx.ownerUserId === undefined || ctx.ownerUserId === actor.id;
  }

  const allowed = CENTER_PERMISSIONS[permission as CenterPermission];
  if (!allowed || !ctx.centerId) return false;
  const m = actor.memberships.find((x) => x.centerId === ctx.centerId);
  if (!m || !(allowed as readonly string[]).includes(m.role)) return false;

  // Resource policy: employees only touch their own bookings and conversations.
  if (m.role === "EMPLOYEE" && ctx.employeeId !== undefined) return ctx.employeeId === m.employeeId;
  return true;
}

export class ForbiddenError extends Error {
  status = 403 as const;
  constructor(public permission: Permission) {
    super(`Forbidden: ${permission}`);
  }
}

export function authorize(actor: Actor | null | undefined, permission: Permission, ctx: ResourceCtx = {}): asserts actor is Actor {
  if (!can(actor, permission, ctx)) throw new ForbiddenError(permission);
}
