/** Roles that can access Logs, My Scan, cron ops, etc. (admin + master). */
export const MASTER_ROLES = ["master", "admin"] as const;

export type MasterRole = (typeof MASTER_ROLES)[number];

export function normalizeRole(role?: string | null): string {
  return (role || "").trim().toLowerCase();
}

export function hasMasterAccess(role?: string | null): boolean {
  const normalized = normalizeRole(role);
  return MASTER_ROLES.includes(normalized as MasterRole);
}

/** Decode JWT payload without verifying signature (UI gating only). */
export function getRoleFromToken(token?: string | null): string {
  if (!token) return "";
  try {
    const parts = token.split(".");
    if (parts.length < 2) return "";
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json =
      typeof atob === "function"
        ? atob(padded)
        : Buffer.from(padded, "base64").toString("utf8");
    const payload = JSON.parse(json) as { role?: string };
    return normalizeRole(payload?.role);
  } catch {
    return "";
  }
}
