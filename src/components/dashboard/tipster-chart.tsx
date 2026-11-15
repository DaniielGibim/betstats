"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface TipsterData {
  tipster: string;
  profit: number;
}

interface TipsterChartProps {
  data: TipsterData[];
}

export function TipsterChart({ data }: TipsterChartProps) {
  return (
    <Card className="border-slate-200/80 dark:border-slate-800">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Lucro por Tipster
        </CardTitle>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Distribuição de resultado financeiro por especialista
        </p>
      </CardHeader>

      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-xs text-slate-400">
            Nenhum dado de tipster disponível.
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="rgba(148, 163, 184, 0.2)"
                />
                <XAxis
                  dataKey="tipster"
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
                <ReferenceLine y={0} stroke="#94a3b8" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload as TipsterData;
                      return (
                        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-800 dark:bg-slate-900">
                          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {item.tipster}
                          </div>
                          <div
                            className={`mt-1 text-sm font-bold ${
                              item.profit >= 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {formatCurrency(item.profit)}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="profit" radius={[6, 6, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.profit >= 0 ? "#10b981" : "#ef4444"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
