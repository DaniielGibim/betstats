"use client";

import React, { useState } from "react";
import {
  Layers,
  Plus,
  CheckCircle2,
  Share2,
  ExternalLink,
  Wallet,
  Building2,
  TrendingUp,
} from "lucide-react";
import { useBanca, Banca } from "@/components/providers/banca-provider";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";

export default function BancasPage() {
  const { bancas, selectedBanca, setSelectedBancaId, refreshBancas, formatValue } =
    useBanca();
  const [modalOpen, setModalOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valorInicial, setValorInicial] = useState("3000.00");
  const [unidadeEfetiva, setUnidadeEfetiva] = useState("100.00");
  const [cor, setCor] = useState("#3b82f6");
  const [loading, setLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome) return;
    setCreateError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/internal/bancas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          descricao,
          valorInicial,
          unidadeEfetiva,
          cor,
          padrao: bancas.length === 0,
        }),
      });
      if (res.ok) {
        await refreshBancas();
        setModalOpen(false);
        setNome("");
        setDescricao("");
        setCreateError(null);
        return;
      }
      setCreateError(
        res.status === 401 || res.status === 403
          ? "Sua sessão não permite cadastrar a banca. Entre novamente e tente de novo."
          : "Não foi possível cadastrar a banca. Verifique os dados e tente novamente."
      );
    } catch {
      setCreateError(
        "Não foi possível confirmar o cadastro. Verifique sua conexão e tente novamente."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Gestão de Bancas (Bankrolls)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Gerencie múltiplas bancas, defina valores de unidade e acompanhe o capital alocado.
          </p>
        </div>
        <Button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 h-10 px-4"
        >
          <Plus className="h-4 w-4" />
          <span>Nova Banca</span>
        </Button>
      </div>

      {/* Grid of Bankrolls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bancas.map((banca) => {
          const isSelected = selectedBanca?.id === banca.id;
          const caixa = (banca as any).caixa || {
            banco: banca.saldoBanco,
            casas: 0,
            total: banca.saldoBanco,
            aportes: 0,
            retiradas: 0,
            resultado: 0,
          };

          return (
            <Card
              key={banca.id}
              className={`flex flex-col justify-between transition-all duration-200 border-2 ${
                isSelected
                  ? "border-blue-500 shadow-md ring-2 ring-blue-500/10 dark:border-blue-500"
                  : "border-slate-200/80 hover:border-slate-300 dark:border-slate-800"
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-3.5 w-3.5 shrink-0 rounded-full shadow-sm"
                      style={{ backgroundColor: banca.cor || "#3b82f6" }}
                    />
                    <div>
                      <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {banca.nome}
                      </CardTitle>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                        {banca.descricao || "Sem descrição"}
                      </p>
                    </div>
                  </div>
                  {banca.padrao && (
                    <Badge variant="blue" className="text-[10px]">
                      Padrão
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-1">
                {/* Total Balance Big Metric */}
                <div className="rounded-xl bg-slate-50/80 p-3.5 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Banca Total Consolidada
                  </div>
                  <div className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">
                    {formatValue(caixa.total)}
                  </div>
                </div>

                {/* Sub balances breakdown */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex flex-col p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Wallet className="h-3 w-3" /> No Banco
                    </span>
                    <span className="mt-1 font-bold text-slate-800 dark:text-slate-200">
                      {formatValue(caixa.banco)}
                    </span>
                  </div>

                  <div className="flex flex-col p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Building2 className="h-3 w-3" /> Nas Casas
                    </span>
                    <span className="mt-1 font-bold text-slate-800 dark:text-slate-200">
                      {formatValue(caixa.casas)}
                    </span>
                  </div>
                </div>

                {/* Unit Details */}
                <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-3">
                  <span>Valor da Unidade (1u):</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {formatCurrency(banca.unidadeEfetiva)}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    variant={isSelected ? "secondary" : "default"}
                    size="sm"
                    onClick={() => setSelectedBancaId(banca.id)}
                    className="flex-1 rounded-xl text-xs h-9"
                  >
                    {isSelected ? (
                      <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-semibold">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Ativa Agora
                      </span>
                    ) : (
                      "Tornar Ativa"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Modal Nova Banca */}
      <Dialog
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (open) setCreateError(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar Nova Banca</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 py-2">
            {createError && (
              <div
                role="alert"
                aria-live="assertive"
                className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
              >
                {createError}
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Nome da Banca
              </label>
              <Input
                placeholder="Ex: Banca Secundária"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                className="mt-1.5 rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Descrição
              </label>
              <Input
                placeholder="Ex: Operações de futebol europeu"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="mt-1.5 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Capital Inicial (R$)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={valorInicial}
                  onChange={(e) => setValorInicial(e.target.value)}
                  required
                  className="mt-1.5 rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Valor Unidade (R$)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={unidadeEfetiva}
                  onChange={(e) => setUnidadeEfetiva(e.target.value)}
                  required
                  className="mt-1.5 rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Cor de Identificação
              </label>
              <div className="mt-1.5 flex items-center gap-3">
                {["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444"].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCor(c)}
                    className={`h-7 w-7 rounded-full transition-transform ${
                      cor === c ? "ring-2 ring-slate-900 ring-offset-2 scale-110" : ""
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
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
                disabled={loading}
                className="rounded-xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700"
              >
                {loading ? "Salvando..." : "Salvar Banca"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
