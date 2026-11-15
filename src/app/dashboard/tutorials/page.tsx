"use client";

import React from "react";
import { BookOpen, Video, ArrowRight, Send, Chrome, LayoutDashboard, UserCheck } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function TutorialsPage() {
  const tutorials = [
    {
      title: "Como Vincular o Bot do Telegram",
      desc: "Passo a passo completo para conectar sua conta ao bot oficial e receber notificações e automações.",
      icon: Send,
      duration: "3 min de leitura",
      tag: "Telegram",
    },
    {
      title: "Como Instalar e Usar a Extensão Chrome",
      desc: "Aprenda a sincronizar apostas diretamente das casas parceiras no navegador com 1 clique.",
      icon: Chrome,
      duration: "5 min de leitura",
      tag: "Extensão",
    },
    {
      title: "Visão Geral do Dashboard & Métricas",
      desc: "Entenda o cálculo de ROI, taxa de acerto, gestão do Banco Central e conversão em unidades de aposta.",
      icon: LayoutDashboard,
      duration: "4 min de leitura",
      tag: "Analytics",
    },
    {
      title: "Configurando sua Primeira Banca",
      desc: "Como definir o capital inicial, configurar casas de aposta e estabelecer a unidade padrão.",
      icon: UserCheck,
      duration: "2 min de leitura",
      tag: "Comece Aqui",
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-blue-600" />
          Central de Tutoriais & Guias
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Aprenda a extrair o máximo de desempenho da plataforma BetStats.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tutorials.map((item, idx) => {
          const Icon = item.icon;
          return (
            <Card
              key={idx}
              className="border-slate-200/80 dark:border-slate-800 p-6 flex flex-col justify-between hover:shadow-md transition-all group cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 group-hover:scale-105 transition-transform">
                    <Icon className="h-5 w-5" />
                  </div>
                  <Badge variant="blue" className="text-[10px]">
                    {item.tag}
                  </Badge>
                </div>

                <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {item.title}
                </h3>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {item.desc}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>{item.duration}</span>
                <span className="flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform">
                  Ler tutorial <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
