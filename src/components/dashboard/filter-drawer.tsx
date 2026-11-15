"use client";

import React, { useState } from "react";
import { Filter, RotateCcw } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface DashboardFilters {
  status: string;
  tipster: string;
  bookmaker: string;
  startDate: string;
  endDate: string;
}

interface FilterDrawerProps {
  filters: DashboardFilters;
  onApplyFilters: (newFilters: DashboardFilters) => void;
  onResetFilters: () => void;
}

export function FilterDrawer({
  filters,
  onApplyFilters,
  onResetFilters,
}: FilterDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<DashboardFilters>(filters);

  const activeFiltersCount = [
    localFilters.status !== "TODOS",
    localFilters.tipster !== "TODOS",
    localFilters.bookmaker !== "TODOS",
    Boolean(localFilters.startDate),
    Boolean(localFilters.endDate),
  ].filter(Boolean).length;

  const handleApply = () => {
    onApplyFilters(localFilters);
    setIsOpen(false);
  };

  const handleReset = () => {
    const cleared: DashboardFilters = {
      status: "TODOS",
      tipster: "TODOS",
      bookmaker: "TODOS",
      startDate: "",
      endDate: "",
    };
    setLocalFilters(cleared);
    onResetFilters();
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating Action Button (FAB) */}
      <div className="fixed bottom-20 lg:bottom-8 right-6 z-40">
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex h-13 w-13 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-xl hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 transition-all duration-200 hover:scale-105"
          title="Abrir Filtros"
        >
          <Filter className="h-5 w-5" />
          {activeFiltersCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-900">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      {/* Drawer */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="right" className="flex flex-col justify-between">
          <div>
            <SheetHeader className="border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <SheetTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Filter className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  Filtrar Dashboard
                </SheetTitle>
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                >
                  <RotateCcw className="h-3 w-3" />
                  Limpar
                </button>
              </div>
            </SheetHeader>

            <div className="mt-6 space-y-5">
              {/* Status */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Status da Aposta
                </label>
                <select
                  value={localFilters.status}
                  onChange={(e) =>
                    setLocalFilters({ ...localFilters, status: e.target.value })
                  }
                  className="mt-1.5 flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                >
                  <option value="TODOS">Todos os Status</option>
                  <option value="PENDENTE">Pendente</option>
                  <option value="GREEN">Green (Ganha)</option>
                  <option value="RED">Red (Perdida)</option>
                  <option value="REEMBOLSO">Reembolso (Void)</option>
                  <option value="MEIO_GREEN">Meio Green</option>
                  <option value="MEIO_RED">Meio Red</option>
                </select>
              </div>

              {/* Tipster */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Tipster
                </label>
                <select
                  value={localFilters.tipster}
                  onChange={(e) =>
                    setLocalFilters({ ...localFilters, tipster: e.target.value })
                  }
                  className="mt-1.5 flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                >
                  <option value="TODOS">Todos os Tipsters</option>
                  <option value="Oficial">Oficial</option>
                  <option value="Sem tipster">Sem tipster</option>
                </select>
              </div>

              {/* Bookmaker */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Casa de Aposta
                </label>
                <select
                  value={localFilters.bookmaker}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      bookmaker: e.target.value,
                    })
                  }
                  className="mt-1.5 flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                >
                  <option value="TODOS">Todas as Casas</option>
                  <option value="Betano">Betano</option>
                  <option value="Bet365">Bet365</option>
                  <option value="Betfair">Betfair</option>
                  <option value="Estrelabet">Estrelabet</option>
                </select>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Data Inicial
                  </label>
                  <Input
                    type="date"
                    value={localFilters.startDate}
                    onChange={(e) =>
                      setLocalFilters({
                        ...localFilters,
                        startDate: e.target.value,
                      })
                    }
                    className="mt-1.5 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Data Final
                  </label>
                  <Input
                    type="date"
                    value={localFilters.endDate}
                    onChange={(e) =>
                      setLocalFilters({
                        ...localFilters,
                        endDate: e.target.value,
                      })
                    }
                    className="mt-1.5 rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          <SheetFooter className="border-t border-slate-100 pt-4 dark:border-slate-800">
            <Button
              onClick={handleApply}
              className="w-full h-11 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700"
            >
              Aplicar Filtros
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
