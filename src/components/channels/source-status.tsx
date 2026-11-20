import { Badge } from "@/components/ui/badge";
import type { CollectorStatus, ConnectionStatus } from "./types";

const CONNECTION_STATUS: Record<ConnectionStatus, { label: string; variant: "green" | "yellow" | "secondary" | "outline" }> = {
  disabled: { label: "Desabilitado", variant: "secondary" },
  awaiting_approval: { label: "Aguardando aprovação", variant: "yellow" },
  awaiting_bot_access: { label: "Aguardando acesso do bot", variant: "yellow" },
  paused: { label: "Pausado", variant: "secondary" },
  offline: { label: "Offline", variant: "outline" },
  degraded: { label: "Conexão degradada", variant: "yellow" },
  connected: { label: "Conectado", variant: "green" },
};

const COLLECTOR_STATUS: Record<CollectorStatus, { label: string; variant: "green" | "yellow" | "secondary" | "outline" }> = {
  disabled: { label: "Desabilitado", variant: "secondary" },
  running: { label: "Em execução", variant: "green" },
  degraded: { label: "Operação degradada", variant: "yellow" },
  stopped: { label: "Parado", variant: "outline" },
};

export function SourceStatusBadge({ status }: { status: ConnectionStatus }) {
  const config = CONNECTION_STATUS[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function CollectorStatusBadge({ status }: { status: CollectorStatus }) {
  const config = COLLECTOR_STATUS[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
