"use client";

import { Activity, AlertCircle, CalendarCheck, LockKeyhole, MessageCircle, Pause, Play, Radio, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SourceStatusBadge } from "./source-status";
import { friendlyErrorCode, type SourceAction, type TelegramSource } from "./types";

interface SourceCardProps {
  source: TelegramSource;
  busy?: boolean;
  onAction: (source: TelegramSource, action: SourceAction) => void;
}

export function SourceCard({ source, busy = false, onAction }: SourceCardProps) {
  const lastError = friendlyErrorCode(source.lastErrorCode);
  const activatedAt = formatDateTime(source.activatedAt);
  const lastCollected = formatDateTime(source.lastCollectedAt);
  const lastPollSuccess = formatDateTime(source.lastPollSuccessAt);

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
            <SourceStatusBadge status={source.connectionStatus} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
          <p className="leading-relaxed">A ativação depende da autorização registrada no servidor e do acesso do bot. O username, sozinho, não confirma a identidade do canal.</p>
          <p className="flex items-center gap-2"><CalendarCheck className="h-3.5 w-3.5" /><span>{activatedAt ? `Ativado em ${activatedAt}.` : "Ainda não ativado."}</span></p>
          <p className="flex items-center gap-2"><MessageCircle className="h-3.5 w-3.5" /><span>{lastCollected ? `Última mensagem coletada em ${lastCollected}.` : "Nenhuma mensagem coletada até agora."}</span></p>
          <p className="flex items-center gap-2"><Activity className="h-3.5 w-3.5" /><span>{lastPollSuccess ? `Última consulta bem-sucedida em ${lastPollSuccess}.` : "Nenhuma consulta bem-sucedida registrada."}</span></p>
          {lastError && <p role="alert" className="flex items-start gap-2 text-red-600 dark:text-red-400"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>Último erro: {lastError}</span></p>}
        </div>
        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
          {source.active || source.connectionStatus === "awaiting_resume" ? (
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => onAction(source, "pause")} className="gap-1.5"><Pause className="h-3.5 w-3.5" /> {source.active ? "Pausar" : "Cancelar retomada"}</Button>
          ) : source.canResume ? (
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => onAction(source, "resume")} className="gap-1.5"><Play className="h-3.5 w-3.5" /> Solicitar retomada</Button>
          ) : (
            <Button type="button" size="sm" disabled title="Ativação indisponível até a resolução e autorização do canal" className="gap-1.5"><LockKeyhole className="h-3.5 w-3.5" /> Ativar indisponível</Button>
          )}
          <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => onAction(source, "remove")} className="gap-1.5 text-red-600 hover:text-red-700 dark:text-red-400"><Trash2 className="h-3.5 w-3.5" /> Remover</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function formatDateTime(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
}
