"use client";

import React, { useState } from "react";
import { Headphones, MessageSquare, Mail, Send, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function SupportPage() {
  const [assunto, setAssunto] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assunto || !mensagem) return;
    setEnviado(true);
    setTimeout(() => {
      setAssunto("");
      setMensagem("");
      setEnviado(false);
    }, 4000);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <Headphones className="h-6 w-6 text-blue-600" />
          Suporte & Atendimento
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Abra um chamado de suporte ou fale diretamente com a equipe técnica.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4 lg:col-span-1">
          <Card className="border-slate-200/80 dark:border-slate-800 p-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Mail className="h-4 w-4 text-blue-600" />
              Canais Oficiais
            </h3>
            <div className="mt-3 space-y-3 text-xs text-slate-600 dark:text-slate-400">
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Canal de E-mail:
                </span>
                <div className="text-blue-600 dark:text-blue-400 font-medium mt-0.5">
                  Ainda não definido
                </div>
              </div>
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Canal de Bot:
                </span>
                <div className="text-blue-600 dark:text-blue-400 font-medium mt-0.5">
                  Ainda não definido
                </div>
              </div>
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Horário de Resposta:
                </span>
                <div className="text-slate-500 mt-0.5">
                  Segunda a Sábado, das 08h às 22h (BRT)
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="border-slate-200/80 dark:border-slate-800 p-6">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-600" />
                Novo Chamado de Suporte
              </CardTitle>
            </CardHeader>

            {enviado ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-6 text-center dark:border-emerald-900 dark:bg-emerald-950/30">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
                <h4 className="mt-2 text-sm font-bold text-emerald-900 dark:text-emerald-200">
                  Chamado Registrado com Sucesso!
                </h4>
                <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
                  Nossa equipe entrará em contato em breve através do seu e-mail cadastrado.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Assunto do Chamado
                  </label>
                  <Input
                    placeholder="Ex: Dúvida sobre cálculo de ROI ou integração Telegram"
                    value={assunto}
                    onChange={(e) => setAssunto(e.target.value)}
                    required
                    className="mt-1.5 rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Descrição Detalhada
                  </label>
                  <textarea
                    rows={5}
                    placeholder="Descreva o problema ou dúvida com o máximo de detalhes..."
                    value={mensagem}
                    onChange={(e) => setMensagem(e.target.value)}
                    required
                    className="mt-1.5 flex w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>

                <Button
                  type="submit"
                  className="rounded-xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 h-10 px-6"
                >
                  <Send className="mr-2 h-4 w-4" />
                  Enviar Chamado
                </Button>
              </form>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
