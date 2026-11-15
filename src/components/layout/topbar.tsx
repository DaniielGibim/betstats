"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useBanca } from "@/components/providers/banca-provider";
import { Bell, Eye, EyeOff, Coins, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { Badge } from "@/components/ui/badge";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard Geral",
  "/dashboard/bancas": "Gestão de Bancas",
  "/dashboard/financial": "Gestão Financeira & Casas",
  "/dashboard/analysis": "Análise Gráfica & Relatórios",
  "/dashboard/update": "Apostas & Bilhetes",
  "/dashboard/tips": "Minhas Tips & Catálogo",
  "/dashboard/tutorials": "Central de Tutoriais",
  "/dashboard/support": "Suporte & Atendimento",
  "/dashboard/profile": "Meu Perfil & Configurações",
};

export function Topbar() {
  const pathname = usePathname();
  const { selectedBanca, valorMode, toggleValorMode } = useBanca();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const title = PAGE_TITLES[pathname] || "Dashboard";

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 lg:px-8 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/95 transition-colors">
      {/* Left: Page Title & Bankroll Badge */}
      <div className="flex items-center gap-3">
        <h1 className="text-lg lg:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          {title}
        </h1>
        {selectedBanca && (
          <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50/80 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: selectedBanca.cor || "#3b82f6" }}
            />
            <span>{selectedBanca.nome}</span>
          </div>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 lg:gap-3">
        {/* Toggle Mode: Moeda / Unidades / Privacidade */}
        <button
          onClick={toggleValorMode}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-all hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          title="Clique para alternar entre R$, Unidades (u) e Privacidade"
        >
          {valorMode === "moeda" && (
            <>
              <Coins className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">Modo: Moeda (R$)</span>
              <span className="sm:hidden">R$</span>
            </>
          )}
          {valorMode === "unidades" && (
            <>
              <Coins className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span className="hidden sm:inline">Modo: Unidades (u)</span>
              <span className="sm:hidden">Unidades</span>
            </>
          )}
          {valorMode === "privacidade" && (
            <>
              <EyeOff className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span className="hidden sm:inline">Modo: Oculto (***)</span>
              <span className="sm:hidden">***</span>
            </>
          )}
        </button>

        {/* Theme Toggle Button */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          title="Alternar Modo Escuro / Claro"
        >
          {mounted && theme === "dark" ? (
            <Sun className="h-4 w-4 text-amber-400" />
          ) : (
            <Moon className="h-4 w-4 text-slate-600" />
          )}
        </button>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            title="Notificações"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white shadow">
              1
            </span>
          </button>

          {showNotifications && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowNotifications(false)}
              />
              <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Notificações do Sistema
                  </span>
                  <Badge variant="blue" className="text-[10px]">
                    1 Nova
                  </Badge>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-2.5 dark:border-blue-950 dark:bg-blue-950/30">
                    <div className="text-xs font-semibold text-slate-900 dark:text-slate-200">
                      Banca Oficial Ativa
                    </div>
                    <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                      Sua banca padrão foi carregada com sucesso com saldo consolidado disponível.
                    </div>
                    <div className="mt-1.5 text-[10px] text-slate-400">
                      Há 10 minutos
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
