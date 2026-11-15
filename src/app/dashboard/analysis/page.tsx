"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Trophy,
  AlertTriangle,
  Flame,
  Award,
} from "lucide-react";
import { useBanca } from "@/components/providers/banca-provider";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatPercent } from "@/lib/utils";

interface DayData {
  dia: number;
  date: string;
  lucro: number;
  stakeTotal: number;
  roi: number;
  totalApostas: number;
  greens: number;
  reds: number;
}

interface CalendarData {
  mes: string;
  days: DayData[];
  stats: {
    melhorDia: { dia: number; lucro: number } | null;
    piorDia: { dia: number; lucro: number } | null;
    maiorGreen: { evento: string; lucro: number };
    maiorRed: { evento: string; prejuizo: number };
    lucroMes: number;
    stakeMes: number;
    roiMes: number;
    winRateMes: number;
    totalApostasMes: number;
  };
}

export default function AnalysisPage() {
  const { selectedBanca, formatValue } = useBanca();
  const [currentDate, setCurrentDate] = useState(new Date("2026-09-01"));
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCalendar = useCallback(async () => {
    try {
      setLoading(true);
      const ano = currentDate.getFullYear();
      const mes = String(currentDate.getMonth() + 1).padStart(2, "0");
      const mesStr = `${ano}-${mes}`;

      const params = new URLSearchParams({ mes: mesStr });
      if (selectedBanca?.id) params.set("banca_id", selectedBanca.id);

      const res = await fetch(`/api/internal/analysis/calendar?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentDate, selectedBanca?.id]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const monthName = currentDate.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  const stats = data?.stats;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Calendário do Lucro & Heatmap
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Visualização diária dos resultados de apostas e destaques do mês.
          </p>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <Button
            size="icon"
            variant="ghost"
            onClick={handlePrevMonth}
            className="h-8 w-8 rounded-lg"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-3 text-xs font-bold capitalize text-slate-800 dark:text-slate-200">
            {monthName}
          </span>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleNextMonth}
            className="h-8 w-8 rounded-lg"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Highlights / Destaques do Mês */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Melhor Dia */}
        <Card className="border-slate-200/80 dark:border-slate-800 p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Melhor Dia
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50">
              <Trophy className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {stats?.melhorDia
              ? formatCurrency(stats.melhorDia.lucro)
              : "—"}
          </div>
          <p className="mt-1 text-[11px] text-slate-400 font-medium">
            {stats?.melhorDia ? `Dia ${stats.melhorDia.dia}` : "Nenhuma aposta"}
          </p>
        </Card>

        {/* Pior Dia */}
        <Card className="border-slate-200/80 dark:border-slate-800 p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Pior Dia
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-950/50">
              <AlertTriangle className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 text-xl font-extrabold text-red-600 dark:text-red-400">
            {stats?.piorDia
              ? formatCurrency(stats.piorDia.lucro)
              : "—"}
          </div>
          <p className="mt-1 text-[11px] text-slate-400 font-medium">
            {stats?.piorDia ? `Dia ${stats.piorDia.dia}` : "Nenhuma aposta"}
          </p>
        </Card>

        {/* Maior Green */}
        <Card className="border-slate-200/80 dark:border-slate-800 p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Maior Green
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50">
              <Flame className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {stats?.maiorGreen?.lucro ? formatCurrency(stats.maiorGreen.lucro) : "—"}
          </div>
          <p className="mt-1 text-[11px] text-slate-400 font-medium truncate">
            {stats?.maiorGreen?.evento || "Sem registro"}
          </p>
        </Card>

        {/* Lucro do Mês */}
        <Card className="border-slate-200/80 dark:border-slate-800 p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Resultado do Mês
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <Award className="h-3.5 w-3.5" />
            </div>
          </div>
          <div
            className={`mt-2 text-xl font-extrabold ${
              (stats?.lucroMes || 0) >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {formatCurrency(stats?.lucroMes || 0)}
          </div>
          <p className="mt-1 text-[11px] text-slate-400 font-medium">
            ROI: {formatPercent(stats?.roiMes || 0)} ({stats?.totalApostasMes || 0} apostas)
          </p>
        </Card>
      </div>

      {/* Calendar Heatmap Grid */}
      <Card className="border-slate-200/80 dark:border-slate-800 p-6 shadow-sm">
        <CardHeader className="p-0 pb-4">
          <CardTitle className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-600" />
            Calendário Diário
          </CardTitle>
        </CardHeader>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
          {data?.days?.map((day) => {
            const hasBets = day.totalApostas > 0;
            const isProfit = day.lucro > 0;
            const isLoss = day.lucro < 0;

            let cardBg =
              "bg-slate-50/50 border-slate-100 text-slate-400 dark:bg-slate-900/30 dark:border-slate-800/80";
            if (hasBets && isProfit) {
              cardBg =
                "bg-emerald-50/70 border-emerald-200 text-emerald-950 dark:bg-emerald-950/30 dark:border-emerald-800/60 dark:text-emerald-300";
            } else if (hasBets && isLoss) {
              cardBg =
                "bg-red-50/70 border-red-200 text-red-950 dark:bg-red-950/30 dark:border-red-800/60 dark:text-red-300";
            } else if (hasBets && day.lucro === 0) {
              cardBg =
                "bg-amber-50/70 border-amber-200 text-amber-950 dark:bg-amber-950/30 dark:border-amber-800/60 dark:text-amber-300";
            }

            return (
              <div
                key={day.dia}
                className={`flex flex-col justify-between rounded-xl border p-3 min-h-[90px] transition-all hover:scale-[1.02] ${cardBg}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold">{day.dia}</span>
                  {hasBets && (
                    <span className="text-[10px] font-semibold opacity-75">
                      {day.totalApostas} {day.totalApostas === 1 ? "aposta" : "apostas"}
                    </span>
                  )}
                </div>

                <div className="mt-2">
                  {hasBets ? (
                    <>
                      <div
                        className={`text-sm font-extrabold ${
                          isProfit
                            ? "text-emerald-700 dark:text-emerald-400"
                            : isLoss
                            ? "text-red-700 dark:text-red-400"
                            : "text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {formatCurrency(day.lucro)}
                      </div>
                      <div className="text-[10px] font-medium opacity-80 mt-0.5">
                        ROI: {formatPercent(day.roi)}
                      </div>
                    </>
                  ) : (
                    <div className="text-[11px] text-slate-400 italic">Sem apostas</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
