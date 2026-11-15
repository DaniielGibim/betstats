"use client";

import React from "react";
import { Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface AccuracyCardProps {
  taxaAcerto: number;
  totalApostas: number;
  apostasGanhas: number;
  derrotas: number;
  taxaTexto?: string;
}

export function AccuracyCard({
  taxaAcerto,
  totalApostas,
  apostasGanhas,
  derrotas,
  taxaTexto,
}: AccuracyCardProps) {
  const percentFormatted = `${taxaAcerto.toFixed(1)}%`;
  const defaultText = `${percentFormatted} (${derrotas} derrotas de ${totalApostas} apostas)`;

  return (
    <Card className="flex flex-col justify-between p-5 sm:p-6 transition-all hover:shadow-md border-slate-200/80 dark:border-slate-800">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
          Taxa de Acerto
        </span>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 shadow-xs dark:bg-amber-950/50 dark:text-amber-400">
          <Trophy className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Taxa atual
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {percentFormatted}
          </span>
        </div>

        <div className="my-2">
          <Progress
            value={taxaAcerto}
            className="h-2.5 bg-slate-100 dark:bg-slate-800"
            indicatorClassName="bg-emerald-500"
          />
        </div>

        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
          {taxaTexto || defaultText}
        </p>
      </div>
    </Card>
  );
}
