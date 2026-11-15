"use client";

import React, { useState, useEffect } from "react";
import {
  User,
  Send,
  Shield,
  Zap,
  Check,
  RefreshCw,
  Copy,
  ExternalLink,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [autoSettle, setAutoSettle] = useState(true);
  const [deteccaoCasa, setDeteccaoCasa] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/internal/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setUser(data);
          setAutoSettle(data.auto_settle ?? true);
          setDeteccaoCasa(data.deteccao_casa ?? true);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCopyCode = () => {
    if (user?.userTelegram?.codigoVinculo) {
      navigator.clipboard.writeText(user.userTelegram.codigoVinculo);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Perfil & Configurações da Conta
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Gerencie suas preferências, plano ativo e integração com o bot do Telegram.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Personal info & Plan */}
        <div className="space-y-6 lg:col-span-1">
          {/* User Details Card */}
          <Card className="border-slate-200/80 dark:border-slate-800 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white font-black text-xl shadow-md">
                {user?.name?.[0] || "U"}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100">
                  {user?.name || "Usuário"}
                </h3>
                <p className="text-xs text-slate-500">{user?.email}</p>
                <div className="mt-1">
                  <Badge variant="blue" className="text-[10px]">
                    {user?.role || "Usuário"}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Slug público:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  @{user?.slug || "perfil-publico"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Autenticação:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Senha local
                </span>
              </div>
            </div>
          </Card>

          {/* Subscription / Plano */}
          <Card className="border-slate-200/80 dark:border-slate-800 p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Plano Vigente
              </span>
              <Badge variant="green" className="text-[10px]">
                {user?.assinatura?.status === "active" ? "Ativo" : "Pendente"}
              </Badge>
            </div>

            <div className="mt-3 text-xl font-black text-slate-900 dark:text-white">
              {user?.assinatura?.plan?.name || "Plano Gratuito"}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              R$ {user?.assinatura?.plan?.price || "0.00"} / ano
            </p>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Limite diário de apostas:</span>
                <span className="font-bold text-slate-900 dark:text-white">10 apostas/dia</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Limite diário de tips:</span>
                <span className="font-bold text-slate-900 dark:text-white">10 tips/dia</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Telegram & Automation Toggles */}
        <div className="space-y-6 lg:col-span-2">
          {/* Telegram Bot Integration Card */}
          <Card className="border-slate-200/80 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 text-white shadow-sm">
                  <Send className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Vínculo do Bot Telegram
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Receba notificações de greens, envie prints de bilhetes e controle apostas pelo chat.
                  </p>
                </div>
              </div>
              <Badge variant="green" className="text-xs">
                Conectado
              </Badge>
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 font-medium">Nome no Telegram:</span>
                <div className="mt-1 font-bold text-slate-800 dark:text-slate-200 text-sm">
                  {user?.userTelegram?.name || "Usuário"}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 font-medium">ID do Telegram:</span>
                <div className="mt-1 font-mono font-bold text-slate-800 dark:text-slate-200 text-sm">
                  {user?.userTelegram?.id_telegram || "Não informado"}
                </div>
              </div>
            </div>

            {/* Pairing Code */}
            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-950 dark:bg-blue-950/30">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-blue-950 dark:text-blue-300">
                    Código de Pareamento Rápido
                  </span>
                  <p className="text-[11px] text-blue-700 dark:text-blue-400 mt-0.5">
                    Envie este código ao bot de integração do Telegram para sincronizar automaticamente.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-extrabold tracking-widest text-blue-900 dark:text-blue-100 bg-white dark:bg-slate-900 px-3 py-1 rounded-lg border border-blue-200 dark:border-blue-900">
                    {user?.userTelegram?.codigoVinculo || "000000"}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyCode}
                    className="h-8 rounded-lg text-xs"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Automations Card */}
          <Card className="border-slate-200/80 dark:border-slate-800 p-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              Automações de Bilhetes
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Configure regras automáticas de liquidação e inteligência de leitura de bilhetes.
            </p>

            <div className="mt-5 space-y-4">
              {/* Auto settle toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Liquidação Automática de Apostas
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Liquidar bilhetes pendentes automaticamente quando a tip oficial for finalizada.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={autoSettle}
                  onChange={(e) => setAutoSettle(e.target.checked)}
                  className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </div>

              {/* OCR Detection toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Detecção Automática por Imagem (OCR)
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Identificar casa de aposta, odd e stake a partir de prints enviados ao bot.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={deteccaoCasa}
                  onChange={(e) => setDeteccaoCasa(e.target.checked)}
                  className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
