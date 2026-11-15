"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Building2,
  DollarSign,
  Plus,
  History,
  TrendingUp,
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
import { formatCurrency } from "@/lib/utils";

interface FinancialData {
  depositos: { valor: number; quantidade: number };
  saques: { valor: number; quantidade: number };
  aportes: { valor: number; quantidade: number };
  retiradas: { valor: number; quantidade: number };
  apostas: { valor: number; quantidade: number };
  pendentes: { valor: number; quantidade: number };
  saldo_atual: number;
  banco: {
    saldo: number;
    aporte_inicial: number;
    capital_aportado: number;
    aportes_total: number;
    retiradas_total: number;
    saiu_depositos: number;
    entrou_saques: number;
  };
  casas_total: number;
  banca_total: number;
  contas: { id: string; nomeCasa: string; saldoAtual: number }[];
  transacoesRecentes: any[];
}

export default function FinancialPage() {
  const { selectedBanca, formatValue, refreshBancas } = useBanca();
  const [data, setData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal de transação
  const [modalOpen, setModalOpen] = useState(false);
  const [tipoTransacao, setTipoTransacao] = useState<
    "APORTE" | "RETIRADA" | "DEPOSITO_CASA" | "SAQUE_CASA" | "AJUSTE"
  >("APORTE");
  const [contaId, setContaId] = useState("");
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchFinancialData = useCallback(async () => {
    if (!selectedBanca?.id) return;
    try {
      setLoading(true);
      const res = await fetch(
        `/api/internal/financial/widgets?banca_id=${selectedBanca.id}`
      );
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedBanca?.id]);

  useEffect(() => {
    fetchFinancialData();
  }, [fetchFinancialData]);

  const handleOpenModal = (
    tipo: "APORTE" | "RETIRADA" | "DEPOSITO_CASA" | "SAQUE_CASA" | "AJUSTE",
    preselectedContaId?: string
  ) => {
    setTipoTransacao(tipo);
    if (preselectedContaId) {
      setContaId(preselectedContaId);
    } else if (data?.contas && data.contas.length > 0) {
      setContaId(data.contas[0].id);
    }
    setValor("");
    setDescricao("");
    setModalOpen(true);
  };

  const handleExecuteTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBanca?.id || !valor) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/internal/transacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bancaId: selectedBanca.id,
          contaId:
            tipoTransacao === "DEPOSITO_CASA" ||
            tipoTransacao === "SAQUE_CASA" ||
            (tipoTransacao === "AJUSTE" && contaId)
              ? contaId
              : null,
          tipo: tipoTransacao,
          valor,
          descricao,
        }),
      });

      if (res.ok) {
        await Promise.all([fetchFinancialData(), refreshBancas()]);
        setModalOpen(false);
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao executar transação");
      }
    } catch (err) {
      console.error(err);
      alert("Erro na requisição");
    } finally {
      setSubmitting(false);
    }
  };

  const getModalTitle = () => {
    switch (tipoTransacao) {
      case "APORTE":
        return "Novo Aporte na Banca";
      case "RETIRADA":
        return "Retirada de Capital / Lucro";
      case "DEPOSITO_CASA":
        return "Depositar na Casa de Aposta";
      case "SAQUE_CASA":
        return "Sacar da Casa de Aposta";
      case "AJUSTE":
        return "Acerto de Saldo";
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Gestão Financeira & Casas
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Controle de capital reservado no Banco Central vs. saldos distribuídos nas casas de apostas.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => handleOpenModal("APORTE")}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs h-9 px-3"
          >
            <ArrowDownLeft className="h-4 w-4" />
            <span>Aporte</span>
          </Button>

          <Button
            onClick={() => handleOpenModal("RETIRADA")}
            variant="outline"
            className="flex items-center gap-1.5 rounded-xl text-xs h-9 px-3 text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-950/30"
          >
            <ArrowUpRight className="h-4 w-4" />
            <span>Retirada</span>
          </Button>

          <Button
            onClick={() => handleOpenModal("DEPOSITO_CASA")}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-xs h-9 px-3"
          >
            <Building2 className="h-4 w-4" />
            <span>Transferir p/ Casa</span>
          </Button>
        </div>
      </div>

      {/* Main Financial Cards Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Banca Total */}
        <Card className="border-slate-200/80 dark:border-slate-800 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Banca Total
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-slate-900 dark:text-white">
            {formatValue(data?.banca_total || 0)}
          </div>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            Soma do Banco + Contas das Casas
          </p>
        </Card>

        {/* Saldo no Banco */}
        <Card className="border-slate-200/80 dark:border-slate-800 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Saldo no Banco
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {formatValue(data?.banco?.saldo || 0)}
          </div>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            Capital disponível para alocação
          </p>
        </Card>

        {/* Saldo nas Casas */}
        <Card className="border-slate-200/80 dark:border-slate-800 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Saldo nas Casas
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-slate-900 dark:text-white">
            {formatValue(data?.casas_total || 0)}
          </div>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            Distribuído em {data?.contas?.length || 0} contas de bookmakers
          </p>
        </Card>
      </div>

      {/* Bookmaker Accounts Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-blue-600" />
            Contas de Casas de Apostas
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {data?.contas?.map((conta) => (
            <Card
              key={conta.id}
              className="border-slate-200/80 dark:border-slate-800 p-5 flex flex-col justify-between hover:shadow-md transition-all"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {conta.nomeCasa}
                  </span>
                  <Badge variant="blue" className="text-[10px]">
                    Ativa
                  </Badge>
                </div>
                <div className="mt-3 text-xs text-slate-500">Saldo Atual</div>
                <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                  {formatValue(conta.saldoAtual)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenModal("DEPOSITO_CASA", conta.id)}
                  className="rounded-lg text-xs h-8"
                >
                  Depositar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenModal("SAQUE_CASA", conta.id)}
                  className="rounded-lg text-xs h-8"
                >
                  Sacar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Transaction Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{getModalTitle()}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleExecuteTransaction} className="space-y-4 py-2">
            {(tipoTransacao === "DEPOSITO_CASA" ||
              tipoTransacao === "SAQUE_CASA" ||
              tipoTransacao === "AJUSTE") && (
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Casa de Aposta
                </label>
                <select
                  value={contaId}
                  onChange={(e) => setContaId(e.target.value)}
                  className="mt-1.5 flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium dark:border-slate-800 dark:bg-slate-950"
                  required
                >
                  {data?.contas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nomeCasa} (Saldo: {formatCurrency(c.saldoAtual)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Valor (R$)
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder="Ex: 50.00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                required
                className="mt-1.5 rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Descrição / Observações (opcional)
              </label>
              <Input
                placeholder="Ex: Depósito via Pix para jogo de hoje"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="mt-1.5 rounded-xl"
              />
            </div>

            <DialogFooter className="pt-2">
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
                disabled={submitting}
                className="rounded-xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700"
              >
                {submitting ? "Processando..." : "Confirmar Movimentação"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
