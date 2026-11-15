"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Sparkles, Plus, CheckCircle2, Clock, Target, Calendar } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface TipItem {
  id: string;
  titulo: string;
  descricao?: string;
  esporte: string;
  evento: string;
  mercado: string;
  oddRecomendada: number;
  stakeSugerida: number;
  resultado: string;
  dataEvento: string;
}

export default function TipsPage() {
  const [tips, setTips] = useState<TipItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Form
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [esporte, setEsporte] = useState("Futebol");
  const [evento, setEvento] = useState("");
  const [mercado, setMercado] = useState("");
  const [oddRecomendada, setOddRecomendada] = useState("1.85");
  const [stakeSugerida, setStakeSugerida] = useState("1.0");
  const [submitting, setSubmitting] = useState(false);

  const fetchTips = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/internal/tips");
      if (res.ok) {
        const json = await res.json();
        setTips(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTips();
  }, [fetchTips]);

  const handleCreateTip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo || !evento || !mercado || !oddRecomendada) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/internal/tips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo,
          descricao,
          esporte,
          evento,
          mercado,
          oddRecomendada,
          stakeSugerida,
        }),
      });
      if (res.ok) {
        await fetchTips();
        setModalOpen(false);
        setTitulo("");
        setDescricao("");
        setEvento("");
        setMercado("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Minhas Tips & Sugestões
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Catálogo de análises, valor esperado e dicas pré-jogo compartilhadas com a comunidade.
          </p>
        </div>

        <Button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 h-10 px-4"
        >
          <Plus className="h-4 w-4" />
          <span>Publicar Nova Tip</span>
        </Button>
      </div>

      {/* Tips Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tips.map((tip) => {
          const isGreen = tip.resultado === "GREEN";
          const isRed = tip.resultado === "RED";
          return (
            <Card
              key={tip.id}
              className="border-slate-200/80 dark:border-slate-800 p-5 flex flex-col justify-between hover:shadow-md transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="blue" className="text-[10px]">
                    {tip.esporte}
                  </Badge>
                  {isGreen && <Badge variant="green">Green</Badge>}
                  {isRed && <Badge variant="red">Red</Badge>}
                  {!isGreen && !isRed && (
                    <Badge variant="secondary">Pendente</Badge>
                  )}
                </div>

                <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-slate-100">
                  {tip.titulo}
                </h3>
                {tip.descricao && (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {tip.descricao}
                  </p>
                )}

                <div className="mt-4 rounded-xl bg-slate-50/80 p-3 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Jogo:</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {tip.evento}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Mercado:</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {tip.mercado}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Odd Recomendada:</span>
                    <span className="font-extrabold text-slate-900 dark:text-white">
                      @{tip.oddRecomendada.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Stake Sugerida:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {tip.stakeSugerida}u
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(tip.dataEvento).toLocaleDateString("pt-BR")}
                </span>
                <span className="font-medium text-blue-500">BetStats Tip</span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Modal Nova Tip */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publicar Nova Tip</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTip} className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Título da Tip
              </label>
              <Input
                placeholder="Ex: Real Madrid vs Barcelona — Over 2.5"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                required
                className="mt-1.5 rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Justificativa / Análise (opcional)
              </label>
              <Input
                placeholder="Ex: Ambas as equipes com ataques fortes nos últimos jogos"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="mt-1.5 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Evento / Partida
                </label>
                <Input
                  placeholder="Ex: Real Madrid x Barcelona"
                  value={evento}
                  onChange={(e) => setEvento(e.target.value)}
                  required
                  className="mt-1.5 rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Mercado
                </label>
                <Input
                  placeholder="Ex: Mais de 2.5 gols"
                  value={mercado}
                  onChange={(e) => setMercado(e.target.value)}
                  required
                  className="mt-1.5 rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Odd Recomendada
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={oddRecomendada}
                  onChange={(e) => setOddRecomendada(e.target.value)}
                  required
                  className="mt-1.5 rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Stake Sugerida (em unidades)
                </label>
                <Input
                  type="number"
                  step="0.1"
                  value={stakeSugerida}
                  onChange={(e) => setStakeSugerida(e.target.value)}
                  required
                  className="mt-1.5 rounded-xl"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700"
              >
                {submitting ? "Publicando..." : "Publicar Tip"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
