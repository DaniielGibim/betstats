"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { formatCurrency, formatUnits } from "@/lib/utils";

export interface Banca {
  id: string;
  nome: string;
  descricao?: string | null;
  cor: string;
  valorInicial: number;
  saldoBanco: number;
  unidadeEfetiva: number;
  ativa: boolean;
  padrao: boolean;
  compartilhada: boolean;
  totalCasas?: number;
  totalBanca?: number;
}

export type ValorMode = "moeda" | "unidades" | "privacidade";

interface BancaContextType {
  bancas: Banca[];
  selectedBanca: Banca | null;
  setSelectedBancaId: (id: string) => void;
  isLoading: boolean;
  refreshBancas: () => Promise<void>;
  valorMode: ValorMode;
  setValorMode: (mode: ValorMode) => void;
  toggleValorMode: () => void;
  formatValue: (value: number | null | undefined) => string;
}

const BancaContext = createContext<BancaContextType | undefined>(undefined);

export function BancaProvider({ children }: { children: React.ReactNode }) {
  const [bancas, setBancas] = useState<Banca[]>([]);
  const [selectedBancaId, setSelectedBancaId] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [valorMode, setValorMode] = useState<ValorMode>("moeda");

  const refreshBancas = useCallback(async () => {
    try {
      const res = await fetch("/api/internal/bancas");
      if (res.ok) {
        const data = await res.json();
        setBancas(data);
        if (data.length > 0) {
          setSelectedBancaId((prev) => {
            if (prev) return prev;
            const defaultBanca = data.find((b: Banca) => b.padrao) || data[0];
            return defaultBanca.id;
          });
        }
      }
    } catch (err) {
      console.error("Erro ao carregar bancas:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshBancas();
  }, [refreshBancas]);

  const selectedBanca =
    bancas.find((b) => b.id === selectedBancaId) || bancas[0] || null;

  const toggleValorMode = () => {
    setValorMode((prev) => {
      if (prev === "moeda") return "unidades";
      if (prev === "unidades") return "privacidade";
      return "moeda";
    });
  };

  const formatValue = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return "R$ 0,00";
    if (valorMode === "privacidade") return "••••••";
    if (valorMode === "unidades") {
      const unit = selectedBanca?.unidadeEfetiva || 100;
      return formatUnits(value, unit);
    }
    return formatCurrency(value);
  };

  return (
    <BancaContext.Provider
      value={{
        bancas,
        selectedBanca,
        setSelectedBancaId,
        isLoading,
        refreshBancas,
        valorMode,
        setValorMode,
        toggleValorMode,
        formatValue,
      }}
    >
      {children}
    </BancaContext.Provider>
  );
}

export function useBanca() {
  const context = useContext(BancaContext);
  if (!context) {
    throw new Error("useBanca deve ser usado dentro de um BancaProvider");
  }
  return context;
}
