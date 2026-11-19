import { Badge } from "@/components/ui/badge";
import type { SourceStatus } from "./types";

const STATUS: Record<SourceStatus, { label: string; variant: "green" | "yellow" | "secondary" | "outline" }> = {
  active: { label: "Ativo", variant: "green" },
  paused: { label: "Pausado", variant: "secondary" },
  pending: { label: "Pendente", variant: "yellow" },
  verification_unavailable: { label: "Verificação indisponível", variant: "outline" },
};

export function SourceStatusBadge({ status }: { status: SourceStatus }) {
  const config = STATUS[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
