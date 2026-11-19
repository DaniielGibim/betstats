"use client";

import { LockKeyhole, Pause, Radio, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SourceStatusBadge } from "./source-status";
import type { TelegramSource } from "./types";

interface SourceCardProps {
  source: TelegramSource;
  busy?: boolean;
  onAction: (source: TelegramSource, action: "pause" | "remove") => void;
}

export function SourceCard({ source, busy = false, onAction }: SourceCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300"><Radio className="h-5 w-5" /></div>
            <div className="min-w-0">
              <CardTitle className="truncate text-sm">{source.title || `@${source.username}`}</CardTitle>
              <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">@{source.username}</p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <SourceStatusBadge status={source.status} />
            {!source.verificationAvailable && <Badge variant="outline">Verificação indisponível</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          A ativação depende de autorização e validação pelo servidor. O username, sozinho, não confirma a identidade do canal.
        </p>
        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
          {source.active ? (
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => onAction(source, "pause")} className="gap-1.5"><Pause className="h-3.5 w-3.5" /> Pausar</Button>
          ) : (
            <Button type="button" size="sm" disabled title="Ativação indisponível até a resolução e autorização do canal" className="gap-1.5"><LockKeyhole className="h-3.5 w-3.5" /> Ativar indisponível</Button>
          )}
          <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => onAction(source, "remove")} className="gap-1.5 text-red-600 hover:text-red-700 dark:text-red-400"><Trash2 className="h-3.5 w-3.5" /> Remover</Button>
        </div>
      </CardContent>
    </Card>
  );
}
