"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface SportSummary {
  esporte: string;
  Apostas: number;
  Greens: string;
  Lucro: number;
  StakeMedia: string;
  ROI: number;
  Aproveitamento: string;
}

interface SportsTableProps {
  data: SportSummary[];
}

export function SportsTable({ data }: SportsTableProps) {
  return (
    <Card className="border-slate-200/80 dark:border-slate-800 overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Resumo por Esporte
        </CardTitle>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Desempenho e taxa de acerto categorizados por modalidade
        </p>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-900/60 dark:text-slate-400 border-y border-slate-100 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Esporte</th>
                <th className="py-3 px-4 text-center">Apostas</th>
                <th className="py-3 px-4 text-center">Greens</th>
                <th className="py-3 px-4 text-right">Stake Média</th>
                <th className="py-3 px-4 text-right">Lucro</th>
                <th className="py-3 px-4 text-right">ROI</th>
                <th className="py-3 px-4 text-right">Aprov.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400">
                    Nenhum dado por esporte registrado.
                  </td>
                </tr>
              ) : (
                data.map((item, idx) => {
                  const isPositive = item.Lucro >= 0;
                  return (
                    <tr
                      key={idx}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                        {item.esporte}
                      </td>
                      <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-300">
                        {item.Apostas}
                      </td>
                      <td className="py-3 px-4 text-center font-medium text-emerald-600 dark:text-emerald-400">
                        {item.Greens}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-300">
                        {formatCurrency(item.StakeMedia)}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-bold ${
                          isPositive
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {formatCurrency(item.Lucro)}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-semibold ${
                          item.ROI >= 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {formatPercent(item.ROI)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Badge
                          variant={parseFloat(item.Aproveitamento) >= 50 ? "green" : "secondary"}
                          className="text-[11px]"
                        >
                          {item.Aproveitamento}%
                        </Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
