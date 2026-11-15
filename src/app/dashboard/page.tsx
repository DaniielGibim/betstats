"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  FileCheck2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Percent,
  Wallet,
  Clock,
  Layers,
} from "lucide-react";
import { useBanca } from "@/components/providers/banca-provider";
import { MetricCard } from "@/components/dashboard/metric-card";
import { AccuracyCard } from "@/components/dashboard/accuracy-card";
import { ProfitChart } from "@/components/dashboard/profit-chart";
import { TipsterChart } from "@/components/dashboard/tipster-chart";
import { SportsTable } from "@/components/dashboard/sports-table";
import { BookmakersTable } from "@/components/dashboard/bookmakers-table";
import {
  FilterDrawer,
  DashboardFilters,
} from "@/components/dashboard/filter-drawer";
import { formatPercent } from "@/lib/utils";

interface DashboardData {
  widgets: {
    apostas_concluidas: number;
    total_apostas: number;
    total_investido: number;
    lucro_total: number;
    saldo_banca: number;
    roi: number;
    taxa_acerto: number;
    total_resolvidas: number;
    apostas_ganhas: number;
    derrotas: number;
    taxa_texto: string;
  };
  profit: {
    dailyProfit: { date: string; profit: number; acumulado: number }[];
    profitByTipster: { tipster: string; profit: number }[];
  };
  sportsSummary: any[];
  bookmakerSummary: any[];
}

export default function DashboardPage() {
  const { selectedBanca, formatValue } = useBanca();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState<DashboardFilters>({
    status: "TODOS",
    tipster: "TODOS",
    bookmaker: "TODOS",
    startDate: "",
    endDate: "",
  });

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedBanca?.id) params.set("banca_id", selectedBanca.id);
      if (filters.status && filters.status !== "TODOS") params.set("status", filters.status);
      if (filters.tipster && filters.tipster !== "TODOS") params.set("tipster", filters.tipster);
      if (filters.bookmaker && filters.bookmaker !== "TODOS") params.set("bookmaker", filters.bookmaker);
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);

      const res = await fetch(`/api/internal/dashboard/all?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Erro ao carregar dados do dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedBanca?.id, filters]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const widgets = data?.widgets || {
    apostas_concluidas: 0,
    total_apostas: 0,
    total_investido: 0,
    lucro_total: 0,
    saldo_banca: 0,
    roi: 0,
    taxa_acerto: 0,
    total_resolvidas: 0,
    apostas_ganhas: 0,
    derrotas: 0,
    taxa_texto: "0.0% (0 derrotas de 0 apostas)",
  };

  const isProfitPositive = widgets.lucro_total >= 0;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Overview Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <span>Visão Consolidada</span>
            {selectedBanca && (
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                — {selectedBanca.nome}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Métricas acumuladas de bilhetes resolvidos e distribuição financeira em tempo real.
          </p>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Apostas Concluídas */}
        <MetricCard
          title="Apostas Concluídas"
          value={widgets.apostas_concluidas}
          subtitle={`de ${widgets.total_apostas} apostas totais`}
          icon={FileCheck2}
          variant="default"
        />

        {/* Total Investido */}
        <MetricCard
          title="Total Investido"
          value={formatValue(widgets.total_investido)}
          subtitle="Stake total apostada"
          icon={DollarSign}
          variant="default"
        />

        {/* Lucro Total */}
        <MetricCard
          title="Lucro Total"
          value={formatValue(widgets.lucro_total)}
          subtitle="Resultado líquido"
          icon={isProfitPositive ? TrendingUp : TrendingDown}
          variant={isProfitPositive ? "success" : "danger"}
        />

        {/* ROI */}
        <MetricCard
          title="ROI"
          value={formatPercent(widgets.roi)}
          subtitle="Retorno s/ investimento"
          icon={Percent}
          variant={widgets.roi >= 0 ? "success" : "danger"}
        />

        {/* Saldo da Banca */}
        <MetricCard
          title="Saldo da Banca"
          value={formatValue(widgets.saldo_banca)}
          subtitle="Banco + Casas ativas"
          icon={Wallet}
          variant="blue"
        />

        {/* Taxa de Acerto Card */}
        <AccuracyCard
          taxaAcerto={widgets.taxa_acerto}
          totalApostas={widgets.apostas_concluidas}
          apostasGanhas={widgets.apostas_ganhas}
          derrotas={widgets.derrotas}
          taxaTexto={widgets.taxa_texto}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProfitChart data={data?.profit?.dailyProfit || []} />
        <TipsterChart data={data?.profit?.profitByTipster || []} />
      </div>

      {/* Summaries Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SportsTable data={data?.sportsSummary || []} />
        <BookmakersTable data={data?.bookmakerSummary || []} />
      </div>

      {/* Floating Filter Drawer */}
      <FilterDrawer
        filters={filters}
        onApplyFilters={(newFilters) => setFilters(newFilters)}
        onResetFilters={() =>
          setFilters({
            status: "TODOS",
            tipster: "TODOS",
            bookmaker: "TODOS",
            startDate: "",
            endDate: "",
          })
        }
      />
    </div>
  );
}
