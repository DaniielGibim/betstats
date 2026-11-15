"use client";

import React, { useState } from "react";
import { useBanca, Banca } from "@/components/providers/banca-provider";
import { ChevronDown, Check, Plus, Layers } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function BankrollSelector() {
  const { bancas, selectedBanca, setSelectedBancaId, refreshBancas } = useBanca();
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoValor, setNovoValor] = useState("1000");
  const [novoDesc, setNovoDesc] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateBanca = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome) return;
    setLoading(true);
    try {
      const res = await fetch("/api/internal/bancas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: novoNome,
          descricao: novoDesc,
          valorInicial: novoValor,
          cor: "#3b82f6",
          padrao: false,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        await refreshBancas();
        setSelectedBancaId(created.id);
        setIsModalOpen(false);
        setNovoNome("");
        setNovoDesc("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/50 p-2.5 text-left transition-all hover:bg-slate-100/80 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:bg-slate-800/80"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="h-3 w-3 shrink-0 rounded-full shadow-sm"
              style={{ backgroundColor: selectedBanca?.cor || "#3b82f6" }}
            />
            <div className="truncate">
              <div className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
                {selectedBanca?.nome || "Selecionar Banca"}
              </div>
              <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                {selectedBanca?.descricao || "Banca de Apostas"}
              </div>
            </div>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute left-0 top-full z-50 mt-1.5 w-full min-w-[220px] rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900">
              <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Suas Bancas
              </div>
              <div className="max-h-56 space-y-1 overflow-y-auto">
                {bancas.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      setSelectedBancaId(b.id);
                      setIsOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                      selectedBanca?.id === b.id
                        ? "bg-slate-100 font-semibold text-slate-900 dark:bg-slate-800 dark:text-slate-50"
                        : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: b.cor }}
                      />
                      <span className="truncate">{b.nome}</span>
                    </div>
                    {selectedBanca?.id === b.id && (
                      <Check className="h-3.5 w-3.5 text-blue-500" />
                    )}
                  </button>
                ))}
              </div>

              <div className="mt-1 border-t border-slate-100 pt-1 dark:border-slate-800">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setIsModalOpen(true);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Nova Banca</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova Banca</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateBanca} className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Nome da Banca
              </label>
              <Input
                placeholder="Ex: Banca de Alavancagem"
                value={novoNome}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNovoNome(e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Descrição (opcional)
              </label>
              <Input
                placeholder="Ex: Apostas de valor esperado"
                value={novoDesc}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNovoDesc(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Saldo Inicial (R$)
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder="1000.00"
                value={novoValor}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNovoValor(e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Criando..." : "Criar Banca"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
