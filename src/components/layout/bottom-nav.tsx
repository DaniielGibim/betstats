"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  RefreshCw,
  Wallet,
  LineChart,
  Menu,
  Layers,
  Sparkles,
  BookOpen,
  Headphones,
  User,
  X,
} from "lucide-react";

export function BottomNav() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const mainTabs = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutGrid },
    { label: "Apostas", href: "/dashboard/update", icon: RefreshCw },
    { label: "Financeiro", href: "/dashboard/financial", icon: Wallet },
    { label: "Análises", href: "/dashboard/analysis", icon: LineChart },
  ];

  const moreItems = [
    { label: "Bancas", href: "/dashboard/bancas", icon: Layers },
    { label: "Minhas Tips", href: "/dashboard/tips", icon: Sparkles },
    { label: "Tutoriais", href: "/dashboard/tutorials", icon: BookOpen },
    { label: "Suporte", href: "/dashboard/support", icon: Headphones },
    { label: "Perfil", href: "/dashboard/profile", icon: User },
  ];

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 flex h-16 items-center justify-around border-t border-slate-200/80 bg-white/90 backdrop-blur-md px-2 dark:border-slate-800 dark:bg-slate-950/90">
        {mainTabs.map((tab) => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center gap-1 py-1 px-3 text-[11px] font-medium transition-colors ${
                isActive
                  ? "text-blue-600 dark:text-blue-400 font-bold"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{tab.label}</span>
            </Link>
          );
        })}

        <button
          onClick={() => setDrawerOpen(true)}
          className={`flex flex-col items-center justify-center gap-1 py-1 px-3 text-[11px] font-medium transition-colors ${
            moreItems.some((m) => m.href === pathname)
              ? "text-blue-600 dark:text-blue-400 font-bold"
              : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          }`}
        >
          <Menu className="h-5 w-5" />
          <span>Mais</span>
        </button>
      </nav>

      {/* Drawer More */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="relative ml-auto flex h-full w-72 flex-col bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <span className="text-base font-bold text-slate-900 dark:text-white">
                Menu Adicional
              </span>
              <button
                onClick={() => setDrawerOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-1">
              {moreItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-xs font-semibold transition-colors ${
                      isActive
                        ? "bg-slate-900 text-white dark:bg-slate-800 dark:text-slate-50"
                        : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
