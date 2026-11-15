"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Trash2,
  Edit2,
  Building2,
} from "lucide-react";
import { useBanca } from "@/components/providers/banca-provider";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatCurrency, formatUnits } from "@/lib/utils";

interface ApostaItem {
  id: string;
  esporte: string;
  evento: string;
  mercado: string;
  odd: number;
  stake: number;
  status: string;
  lucroPrejuizo: number | null;
  tipster: string;
  dataJogo: string;
  conta?: { id: string; nomeCasa: string } | null;
}

export default function UpdateApostasPage() {
  const { selectedBanca, formatValue, refreshBancas } = useBanca();
  const [apostas, setApostas] = useState<ApostaItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("TODOS");
  const [loading, setLoading] = useState(true);

  // Modal Nova Aposta
  const [modalOpen, setModalOpen] = useState(false);
  const [evento, setEvento] = useState("");
  const [mercado, setMercado] = useState("");
  const [esporte, setEsporte] = useState("Futebol");
  const [odd, setOdd] = useState("1.80");
  const [stake, setStake] = useState("10.00");
  const [status, setStatus] = useState("PENDENTE");
  const [tipster, setTipster] = useState("Oficial");
  const [contaId, setContaId] = useState("");
  const [dataJogo, setDataJogo] = useState("");
  const [contasDisponiveis, setContasDisponiveis] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  // Carregar contas da banca
  useEffect(() => {
    if (selectedBanca?.id) {
      fetch(`/api/internal/financial/widgets?banca_id=${selectedBanca.id}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d && d.contas) {
            setContasDisponiveis(d.contas);
            setContaId((prev) => (prev ? prev : d.contas[0]?.id || ""));
          }
        });
    }
  }, [selectedBanca?.id]);

  const fetchApostas = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedBanca?.id) params.set("banca_id", selectedBanca.id);
      if (statusFilter && statusFilter !== "TODOS") params.set("status", statusFilter);
      if (search) params.set("search", search);
      params.set("page", String(page));
      params.set("limit", "15");

      const res = await fetch(`/api/internal/apostas?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setApostas(json.data || []);
        setTotal(json.meta?.total || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedBanca?.id, statusFilter, search, page]);

  useEffect(() => {
    fetchApostas();
  }, [fetchApostas]);

  // Alteração rápida de status
  const handleQuickStatusChange = async (apostaId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/internal/apostas/${apostaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await Promise.all([fetchApostas(), refreshBancas()]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Excluir aposta
  const handleDeleteAposta = async (apostaId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta aposta?")) return;
    try {
      const res = await fetch(`/api/internal/apostas/${apostaId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await Promise.all([fetchApostas(), refreshBancas()]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateAposta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBanca?.id || !evento || !mercado || !odd || !stake) return;
    setSaving(true);
    try {
      const res = await fetch("/api/internal/apostas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bancaId: selectedBanca.id,
          contaId: contaId || null,
          esporte,
          evento,
          mercado,
          odd,
          stake,
          status,
          tipster,
          dataJogo: dataJogo || new Date().toISOString(),
        }),
      });

      if (res.ok) {
        await Promise.all([fetchApostas(), refreshBancas()]);
        setModalOpen(false);
        setEvento("");
        setMercado("");
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao salvar aposta");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "GREEN":
        return <Badge variant="green">Green</Badge>;
      case "RED":
        return <Badge variant="red">Red</Badge>;
      case "MEIO_GREEN":
        return <Badge variant="green">Meio Green</Badge>;
      case "MEIO_RED":
        return <Badge variant="red">Meio Red</Badge>;
      case "REEMBOLSO":
        return <Badge variant="yellow">Reembolso</Badge>;
      case "PENDENTE":
      default:
        return <Badge variant="secondary">Pendente</Badge>;
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Histórico & Atualização de Apostas
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Cadastre novos bilhetes ou liquide rapidamente o resultado de apostas pendentes.
          </p>
        </div>

        <Button
          onClick={() => {
            setDataJogo(new Date().toISOString().split("T")[0]);
            setModalOpen(true);
          }}
          className="flex items-center gap-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 h-10 px-4"
        >
          <Plus className="h-4 w-4" />
          <span>Cadastrar Nova Aposta</span>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-slate-200/80 dark:border-slate-800 p-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por time, evento, mercado ou tipster..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 h-10 rounded-xl text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
            >
              <option value="TODOS">Todos os Status</option>
              <option value="PENDENTE">Pendentes</option>
              <option value="GREEN">Greens</option>
              <option value="RED">Reds</option>
              <option value="REEMBOLSO">Reembolsos</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Bets Table */}
      <Card className="border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-900/60 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Data</th>
                <th className="py-3 px-4">Evento & Mercado</th>
                <th className="py-3 px-4">Casa / Tipster</th>
                <th className="py-3 px-4 text-center">Odd</th>
                <th className="py-3 px-4 text-right">Stake</th>
                <th className="py-3 px-4 text-right">Lucro/Prej.</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Liquidação Rápida</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {apostas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Nenhuma aposta encontrada com os filtros atuais.
                  </td>
                </tr>
              ) : (
                apostas.map((aposta) => {
                  const isPositive = (aposta.lucroPrejuizo || 0) >= 0;
                  const dateFormatted = new Date(aposta.dataJogo).toLocaleDateString(
                    "pt-BR",
                    { day: "2-digit", month: "2-digit" }
                  );

                  return (
                    <tr
                      key={aposta.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 text-slate-500 font-medium whitespace-nowrap">
                        {dateFormatted}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-slate-100">
                          {aposta.evento}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          {aposta.mercado}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {aposta.conta?.nomeCasa || "Casa Padrão"}
                        </div>
                        <div className="text-[11px] text-blue-600 dark:text-blue-400">
                          {aposta.tipster}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center font-bold text-slate-800 dark:text-slate-200">
                        @{aposta.odd.toFixed(2)}
                      </td>

                      <td className="py-3 px-4 text-right font-semibold text-slate-700 dark:text-slate-300">
                        {formatValue(aposta.stake)}
                      </td>

                      <td
                        className={`py-3 px-4 text-right font-extrabold ${
                          aposta.lucroPrejuizo === null
                            ? "text-slate-400"
                            : isPositive
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {aposta.lucroPrejuizo !== null
                          ? formatValue(aposta.lucroPrejuizo)
                          : "—"}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {getStatusBadge(aposta.status)}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleQuickStatusChange(aposta.id, "GREEN")}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/50 transition-colors"
                            title="Marcar Green"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleQuickStatusChange(aposta.id, "RED")}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/50 dark:hover:bg-red-900/50 transition-colors"
                            title="Marcar Red"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteAposta(aposta.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Excluir Aposta"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Nova Aposta */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Aposta</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateAposta} className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Evento / Jogo
              </label>
              <Input
                placeholder="Ex: Real Madrid x Barcelona"
                value={evento}
                onChange={(e) => setEvento(e.target.value)}
                required
                className="mt-1.5 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Mercado
                </label>
                <Input
                  placeholder="Ex: Mais de 2.5 gols"
                  value={mercado}
                  onChange={(e) => setMercado(e.target.value)}
                  required
                  className="mt-1.5 rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Esporte
                </label>
                <select
                  value={esporte}
                  onChange={(e) => setEsporte(e.target.value)}
                  className="mt-1.5 flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium dark:border-slate-800 dark:bg-slate-950"
                >
                  <option value="Futebol">Futebol</option>
                  <option value="Basquete">Basquete</option>
                  <option value="Tênis">Tênis</option>
                  <option value="eSports">eSports</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Odd Decimal
                </label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="1.85"
                  value={odd}
                  onChange={(e) => setOdd(e.target.value)}
                  required
                  className="mt-1.5 rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Stake (R$)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="20.00"
                  value={stake}
                  onChange={(e) => setStake(e.target.value)}
                  required
                  className="mt-1.5 rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Status Inicial
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="mt-1.5 flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium dark:border-slate-800 dark:bg-slate-950"
                >
                  <option value="PENDENTE">Pendente</option>
                  <option value="GREEN">Green</option>
                  <option value="RED">Red</option>
                  <option value="REEMBOLSO">Reembolso</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Casa de Aposta
                </label>
                <select
                  value={contaId}
                  onChange={(e) => setContaId(e.target.value)}
                  className="mt-1.5 flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium dark:border-slate-800 dark:bg-slate-950"
                >
                  {contasDisponiveis.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nomeCasa}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Tipster
                </label>
                <Input
                  placeholder="Ex: Oficial"
                  value={tipster}
                  onChange={(e) => setTipster(e.target.value)}
                  className="mt-1.5 rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Data do Jogo
              </label>
              <Input
                type="date"
                value={dataJogo}
                onChange={(e) => setDataJogo(e.target.value)}
                className="mt-1.5 rounded-xl"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700"
              >
                {saving ? "Salvando..." : "Salvar Aposta"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
