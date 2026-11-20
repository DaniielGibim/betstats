"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Clock3, Loader2, Radio, RefreshCw, Server } from "lucide-react";
import { SourceCard } from "@/components/channels/source-card";
import { SourceForm } from "@/components/channels/source-form";
import { CollectorStatusBadge } from "@/components/channels/source-status";
import { friendlyErrorCode, normalizeSourcesPayload, type CollectorState, type SourceAction, type TelegramSource } from "@/components/channels/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const REFRESH_INTERVAL_MS = 25_000;

async function responseMessage(response: Response) {
  const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (typeof payload?.error === "string") return payload.error;
  if (typeof payload?.message === "string") return payload.message;
  return "A operação não pôde ser concluída.";
}

export default function ChannelsPage() {
  const [sources, setSources] = useState<TelegramSource[]>([]);
  const [collector, setCollector] = useState<CollectorState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadSources = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const response = await fetch("/api/internal/sources", { cache: "no-store" });
      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (!response.ok) throw new Error(await responseMessage(response));
      const payload = normalizeSourcesPayload(await response.json());
      setSources(payload.sources);
      setCollector(payload.collector);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível carregar as origens.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let refreshTimer: number | null = null;

    const stopRefresh = () => {
      if (refreshTimer !== null) window.clearInterval(refreshTimer);
      refreshTimer = null;
    };
    const startRefresh = () => {
      if (refreshTimer === null) {
        refreshTimer = window.setInterval(() => void loadSources(true), REFRESH_INTERVAL_MS);
      }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        stopRefresh();
        return;
      }
      void loadSources(true);
      startRefresh();
    };

    void loadSources();
    if (document.visibilityState === "visible") startRefresh();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopRefresh();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadSources]);

  async function addSource(username: string) {
    setCreating(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/internal/sources", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: `@${username}` }) });
      if (!response.ok) throw new Error(await responseMessage(response));
      setNotice("Origem registrada como pendente. O canal ainda não foi verificado nem ativado.");
      await loadSources(true);
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível adicionar a origem.");
      return false;
    } finally {
      setCreating(false);
    }
  }

  async function actOnSource(source: TelegramSource, action: SourceAction) {
    if (action === "remove" && !window.confirm(`Remover @${source.username} das suas origens?`)) return;
    setBusyId(source.id);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/internal/sources/${encodeURIComponent(source.id)}`, {
        method: action === "remove" ? "DELETE" : "PATCH",
        headers: { "Content-Type": "application/json" },
        ...(action !== "remove" ? { body: JSON.stringify({ action }) } : {}),
      });
      if (!response.ok) throw new Error(await responseMessage(response));
      setNotice({
        remove: "Origem removida.",
        pause: "Origem pausada.",
        resume: "Retomada solicitada. O coletor verificará a autorização e o acesso ao canal.",
      }[action]);
      await loadSources(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível atualizar a origem.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      <div><h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">Origens do Telegram</h1><p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500 dark:text-slate-400">Cadastre usernames públicos para iniciar o fluxo de autorização. Nenhuma mensagem é coletada nesta tela.</p></div>
      <CollectorSummary collector={collector} loading={loading} />
      <Card><CardContent className="p-5 sm:p-6"><SourceForm busy={creating} onSubmit={addSource} /></CardContent></Card>
      {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 dark:border-red-950 dark:bg-red-950/40 dark:text-red-300"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div>}
      {notice && <div role="status" className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-700 dark:border-blue-950 dark:bg-blue-950/40 dark:text-blue-300">{notice}</div>}
      {loading ? (
        <div className="flex min-h-48 items-center justify-center text-sm text-slate-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando origens...</div>
      ) : sources.length ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">{sources.map((source) => <SourceCard key={source.id} source={source} busy={busyId === source.id} onAction={actOnSource} />)}</div>
      ) : !error && (
        <Card className="border-dashed"><CardContent className="flex min-h-48 flex-col items-center justify-center p-6 text-center"><Radio className="mb-3 h-8 w-8 text-slate-300 dark:text-slate-700" /><h2 className="text-sm font-bold">Nenhuma origem cadastrada</h2><p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">Adicione um username acima. O registro permanecerá pendente até o servidor confirmar autorização e ativação.</p></CardContent></Card>
      )}
      {!loading && error && <Button type="button" variant="outline" size="sm" onClick={() => void loadSources()} className="gap-2"><RefreshCw className="h-3.5 w-3.5" /> Tentar novamente</Button>}
    </div>
  );
}

function CollectorSummary({ collector, loading }: { collector: CollectorState | null; loading: boolean }) {
  const lastSuccess = formatDateTime(collector?.lastSuccessAt ?? null);
  const lastError = friendlyErrorCode(collector?.lastErrorCode ?? null);

  return (
    <Card>
      <CardContent className="space-y-3 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold"><Server className="h-4 w-4 text-blue-600 dark:text-blue-400" /> Coletor do Telegram</div>
          {loading ? <span className="text-xs text-slate-500">Consultando estado...</span> : collector ? <CollectorStatusBadge status={collector.status} /> : <span className="text-xs text-slate-500">Estado indisponível</span>}
        </div>
        <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
          <p className="flex items-center gap-2"><Clock3 className="h-3.5 w-3.5" /><span>{lastSuccess ? `Última consulta bem-sucedida em ${lastSuccess}.` : "Nenhuma consulta bem-sucedida até agora."}</span></p>
          {lastError && <p role="alert" className="flex items-start gap-2 text-red-600 dark:text-red-400"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>Último erro do coletor: {lastError}</span></p>}
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
