export type SourceStatus = "active" | "paused" | "pending" | "verification_unavailable";

export interface TelegramSource {
  id: string;
  username: string;
  title?: string | null;
  active: boolean;
  activatedAt?: string | null;
  status: SourceStatus;
  verificationAvailable: boolean;
}

export function normalizeSource(value: unknown): TelegramSource | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  if (typeof source.id !== "string") return null;

  const rawUsername = typeof source.requestedUsername === "string"
    ? source.requestedUsername
    : typeof source.normalizedUsername === "string"
      ? source.normalizedUsername
      : typeof source.username === "string"
        ? source.username
        : typeof source.usernameSnapshot === "string"
          ? source.usernameSnapshot
          : "";
  const username = rawUsername.replace(/^@/, "");
  if (!username) return null;

  const rawStatus = typeof source.status === "string" ? source.status.toLowerCase() : "";
  const active = source.active === true || rawStatus === "active";
  const activatedAt = typeof source.activatedAt === "string" ? source.activatedAt : null;
  const verificationUnavailable = rawStatus === "pending_resolution" || rawStatus.includes("verification") || source.verificationAvailable === false;
  const status: SourceStatus = active
    ? "active"
    : rawStatus.includes("verification")
      ? "verification_unavailable"
      : rawStatus === "inactive" || activatedAt
        ? "paused"
        : "pending";

  return {
    id: source.id,
    username,
    title: typeof source.title === "string"
      ? source.title
      : typeof source.titleSnapshot === "string"
        ? source.titleSnapshot
        : null,
    active,
    activatedAt,
    status,
    verificationAvailable: !verificationUnavailable,
  };
}

export function normalizeSourceList(value: unknown): TelegramSource[] {
  const payload = value && typeof value === "object" ? value as Record<string, unknown> : null;
  const rows = Array.isArray(value)
    ? value
    : Array.isArray(payload?.sources)
      ? payload.sources
      : Array.isArray(payload?.items)
        ? payload.items
        : Array.isArray(payload?.data)
          ? payload.data
          : [];
  return rows.map(normalizeSource).filter((source): source is TelegramSource => source !== null);
}
