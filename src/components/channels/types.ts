export type ConnectionStatus = "disabled" | "awaiting_approval" | "awaiting_bot_access" | "awaiting_resume" | "paused" | "offline" | "degraded" | "connected";
export type CollectorStatus = "disabled" | "running" | "degraded" | "stopped";

export interface CollectorState {
  status: CollectorStatus;
  lastSuccessAt: string | null;
  lastErrorCode: string | null;
}

export type SourceAction = "pause" | "resume" | "remove";

export interface TelegramSource {
  id: string;
  username: string;
  title?: string | null;
  active: boolean;
  canResume: boolean;
  activatedAt: string | null;
  connectionStatus: ConnectionStatus;
  lastCollectedAt: string | null;
  lastPollSuccessAt: string | null;
  lastErrorCode: string | null;
}

const CONNECTION_STATUSES = new Set<ConnectionStatus>([
  "disabled",
  "awaiting_approval",
  "awaiting_bot_access",
  "awaiting_resume",
  "paused",
  "offline",
  "degraded",
  "connected",
]);

const COLLECTOR_STATUSES = new Set<CollectorStatus>(["disabled", "running", "degraded", "stopped"]);

function nullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
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

  const connection = source.connection && typeof source.connection === "object"
    ? source.connection as Record<string, unknown>
    : null;
  const rawConnectionStatus = typeof connection?.status === "string" ? connection.status.toLowerCase() : "";
  const connectionStatus: ConnectionStatus = CONNECTION_STATUSES.has(rawConnectionStatus as ConnectionStatus)
    ? rawConnectionStatus as ConnectionStatus
    : "disabled";
  const active = connectionStatus === "connected" || connectionStatus === "degraded" || connectionStatus === "offline";

  return {
    id: source.id,
    username,
    title: typeof source.title === "string"
      ? source.title
      : typeof source.titleSnapshot === "string"
        ? source.titleSnapshot
        : null,
    active,
    canResume: source.platform === "telegram" && source.status === "inactive" && !!connection?.activatedAt,
    activatedAt: nullableString(connection?.activatedAt),
    connectionStatus,
    lastCollectedAt: nullableString(connection?.lastCollectedAt),
    lastPollSuccessAt: nullableString(connection?.lastPollSuccessAt),
    lastErrorCode: nullableString(connection?.errorCode),
  };
}

export function normalizeSourcesPayload(value: unknown): { sources: TelegramSource[]; collector: CollectorState | null } {
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
  const collectorValue = payload?.collector && typeof payload.collector === "object"
    ? payload.collector as Record<string, unknown>
    : null;
  const rawCollectorStatus = typeof collectorValue?.status === "string" ? collectorValue.status.toLowerCase() : "";
  const collector = collectorValue && COLLECTOR_STATUSES.has(rawCollectorStatus as CollectorStatus)
    ? {
        status: rawCollectorStatus as CollectorStatus,
        lastSuccessAt: nullableString(collectorValue.lastSuccessAt),
        lastErrorCode: nullableString(collectorValue.lastErrorCode),
      }
    : null;

  return {
    sources: rows.map(normalizeSource).filter((source): source is TelegramSource => source !== null),
    collector,
  };
}

const ERROR_MESSAGES: Record<string, string> = {
  access_lost: "O bot perdeu o acesso necessário ao canal.",
  approval_revoked: "A autorização do canal foi revogada.",
  bot_access_denied: "O bot ainda não tem acesso ao canal.",
  bot_forbidden: "O bot não tem permissão para acessar o canal.",
  bot_token_invalid: "A configuração do bot foi recusada pelo Telegram.",
  chat_not_found: "O canal não foi encontrado pelo bot.",
  coverage_gap: "A coleta identificou uma possível lacuna de mensagens.",
  poll_conflict: "Existe outra conexão do bot em execução.",
  polling_conflict: "Existe outra conexão do bot em execução.",
  rate_limited: "O Telegram limitou temporariamente as solicitações.",
  sequence_uncertain: "A sequência das mensagens não pôde ser confirmada.",
  storage_failure: "Não foi possível registrar a coleta com segurança.",
  telegram_invalid_response: "O Telegram devolveu uma resposta inesperada.",
  telegram_unavailable: "O Telegram está temporariamente indisponível.",
  unauthorized: "A autenticação do bot foi recusada pelo Telegram.",
};

export function friendlyErrorCode(code: string | null) {
  if (!code) return null;
  return ERROR_MESSAGES[code.toLowerCase()] ?? "A integração registrou uma falha de conexão.";
}
