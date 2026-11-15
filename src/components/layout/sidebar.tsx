"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Layers,
  Wallet,
  LineChart,
  RefreshCw,
  Sparkles,
  BookOpen,
  Headphones,
  User,
  LogOut,
  Moon,
  Sun,
  ShieldAlert,
} from "lucide-react";
import { useTheme } from "next-themes";
import { BankrollSelector } from "./bankroll-selector";
import { Progress } from "@/components/ui/progress";

interface UserProfile {
  name: string;
  email: string;
  assinatura?: {
    plan: {
      name: string;
      features: { feature_key: string; limit: number }[];
    };
    usages: { feature_key: string; consumed: number }[];
  };
}

export function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    setMounted(true);
    fetch("/api/internal/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setUser(data);
      })
      .catch((err) => console.error("Erro ao carregar usuário:", err));
  }, []);

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutGrid },
    { label: "Bancas", href: "/dashboard/bancas", icon: Layers },
    { label: "Financeiro", href: "/dashboard/financial", icon: Wallet },
    { label: "Análise Gráfica", href: "/dashboard/analysis", icon: LineChart },
    { label: "Atualizar / Apostas", href: "/dashboard/update", icon: RefreshCw },
    { label: "Minhas Tips", href: "/dashboard/tips", icon: Sparkles },
    { label: "Tutoriais", href: "/dashboard/tutorials", icon: BookOpen },
    { label: "Suporte", href: "/dashboard/support", icon: Headphones },
    { label: "Perfil", href: "/dashboard/profile", icon: User },
  ];

  const planLimit =
    user?.assinatura?.plan?.features?.find((f) => f.feature_key === "apostas")?.limit || 10;
  const consumed =
    user?.assinatura?.usages?.find((u) => u.feature_key === "apostas")?.consumed || 0;
  const percentage = Math.min(100, Math.round((consumed / planLimit) * 100));

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-64 flex-col border-r border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950 z-30 transition-colors">
      {/* Brand Header */}
      <div className="flex h-16 items-center px-6 border-b border-slate-100 dark:border-slate-800/80">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm dark:bg-blue-600 transition-transform group-hover:scale-105">
            <span className="text-lg font-black tracking-tighter">B</span>
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white leading-none">
              BetStats
            </span>
            <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 tracking-wider uppercase mt-0.5">
              Analytics & Copy
            </span>
          </div>
        </Link>
      </div>

      {/* Bankroll Selector */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800/80">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 px-1">
          Contexto Ativo
        </div>
        <BankrollSelector />
      </div>

      {/* Main Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium transition-all ${
                isActive
                  ? "bg-slate-900 text-white shadow-sm dark:bg-slate-800 dark:text-slate-50"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100"
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 ${
                  isActive ? "text-white dark:text-blue-400" : "text-slate-500 dark:text-slate-400"
                }`}
              />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Plan Usage Card */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800/80">
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {user?.assinatura?.plan?.name || "Plano Gratuito"}
            </span>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {consumed} de {planLimit}
            </span>
          </div>
          <div className="mt-2">
            <Progress value={percentage} className="h-1.5" />
          </div>
          <div className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">
            Apostas diárias consumidas
          </div>
        </div>
      </div>

      {/* Footer Controls */}
      <div className="flex items-center justify-between p-4 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500">
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex items-center gap-2 rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900 transition-colors"
          title="Alternar Tema"
        >
          {mounted && theme === "dark" ? (
            <Sun className="h-4 w-4 text-amber-400" />
          ) : (
            <Moon className="h-4 w-4 text-slate-600" />
          )}
          <span className="text-[11px] font-medium">
            {mounted && theme === "dark" ? "Claro" : "Escuro"}
          </span>
        </button>

        <Link
          href="/dashboard/profile"
          className="flex items-center gap-1.5 rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900 transition-colors"
          title="Meu Perfil"
        >
          <User className="h-4 w-4" />
          <span className="text-[11px] font-medium truncate max-w-[80px]">
            {user?.name || "Conta"}
          </span>
        </Link>
      </div>
    </aside>
  );
}
