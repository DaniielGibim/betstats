"use client";

import React, { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface DailyProfitPoint {
  date: string;
  profit: number;
  acumulado: number;
}

interface ProfitChartProps {
  data: DailyProfitPoint[];
}

export function ProfitChart({ data }: ProfitChartProps) {
  const [chartView, setChartView] = useState<"acumulado" | "diario">("acumulado");

  const formattedData = data.map((d) => ({
    ...d,
    formattedDate: d.date.split("-").slice(1).join("/"),
  }));

  const currentTotal =
    data.length > 0 ? data[data.length - 1].acumulado : 0;

  return (
    <Card className="border-slate-200/80 dark:border-slate-800">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {chartView === "acumulado"
              ? "Evolução do Lucro Acumulado"
              : "Lucro por Dia"}
          </CardTitle>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Total acumulado no período:{" "}
            <span
              className={`font-semibold ${
                currentTotal >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {formatCurrency(currentTotal)}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900">
          <button
            onClick={() => setChartView("acumulado")}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
              chartView === "acumulado"
                ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-slate-100"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            }`}
          >
            Acumulado
          </button>
          <button
            onClick={() => setChartView("diario")}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
              chartView === "diario"
                ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-slate-100"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            }`}
          >
            Diário
          </button>
        </div>
      </CardHeader>

      <CardContent>
        {formattedData.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-xs text-slate-400">
            Nenhuma aposta resolvida no período selecionado.
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={formattedData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="rgba(148, 163, 184, 0.2)"
                />
                <XAxis
                  dataKey="formattedDate"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickFormatter={(val) => `R$ ${val}`}
                />
                <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="2 2" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const dataPoint = payload[0].payload as DailyProfitPoint;
                      const val =
                        chartView === "acumulado"
                          ? dataPoint.acumulado
                          : dataPoint.profit;
                      return (
                        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-800 dark:bg-slate-900">
                          <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                            {dataPoint.date}
                          </div>
                          <div
                            className={`mt-1 text-sm font-bold ${
                              val >= 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {formatCurrency(val)}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey={chartView === "acumulado" ? "acumulado" : "profit"}
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#profitGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
