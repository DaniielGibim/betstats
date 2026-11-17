"use client";

import { useEffect, useState } from "react";
import { BarChart3, LockKeyhole, Mail, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Mode = "login" | "register";

async function readError(response: Response) {
  const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
  return typeof payload?.error === "string"
    ? payload.error
    : typeof payload?.message === "string"
      ? payload.message
      : "Não foi possível concluir a solicitação.";
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/session")
      .then((response) => {
        if (active && response.ok) router.replace("/dashboard");
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => { active = false; };
  }, [router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, ...(mode === "register" ? { name: name.trim() } : {}) }),
      });
      if (!response.ok) {
        setError(await readError(response));
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Serviço indisponível. Tente novamente em instantes.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex min-h-screen items-center justify-center overflow-y-auto bg-slate-950 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3 text-white">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/20"><BarChart3 className="h-6 w-6" /></div>
          <div><div className="text-xl font-black tracking-tight">BetStats</div><div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-300">Analytics & Copy</div></div>
        </div>
        <Card className="border-slate-800 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-xl">{mode === "login" ? "Entrar na conta" : "Criar conta"}</CardTitle>
            <p className="text-sm text-slate-500 dark:text-slate-400">{mode === "login" ? "Use suas credenciais para acessar o painel." : "Cadastre uma conta para começar a configurar suas origens."}</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && <label className="block space-y-1.5 text-xs font-semibold">Nome<div className="relative"><User className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input value={name} onChange={(event) => setName(event.target.value)} required minLength={2} autoComplete="name" className="pl-9" /></div></label>}
              <label className="block space-y-1.5 text-xs font-semibold">E-mail<div className="relative"><Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" className="pl-9" /></div></label>
              <label className="block space-y-1.5 text-xs font-semibold">Senha<div className="relative"><LockKeyhole className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={12} autoComplete={mode === "login" ? "current-password" : "new-password"} className="pl-9" /></div></label>
              {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-950 dark:bg-red-950/40 dark:text-red-300">{error}</div>}
              <Button type="submit" className="w-full" disabled={busy || checking}>{checking ? "Verificando sessão..." : busy ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}</Button>
            </form>
            <button type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }} className="mt-5 w-full text-center text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400">
              {mode === "login" ? "Ainda não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
