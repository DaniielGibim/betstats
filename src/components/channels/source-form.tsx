"use client";

import { useState } from "react";
import { AtSign, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SourceFormProps {
  busy?: boolean;
  onSubmit: (username: string) => Promise<boolean>;
}

export function SourceForm({ busy = false, onSubmit }: SourceFormProps) {
  const [username, setUsername] = useState("");
  const [validation, setValidation] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = username.trim().replace(/^@/, "");
    if (!/^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(normalized)) {
      setValidation("Use de 5 a 32 caracteres, começando por uma letra; depois use letras, números ou sublinhados.");
      return;
    }
    setValidation(null);
    if (await onSubmit(normalized)) setUsername("");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      <label htmlFor="channel-username" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
        Username público do Telegram
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <AtSign className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input id="channel-username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="canal_exemplo" autoComplete="off" aria-describedby="channel-username-help" aria-invalid={Boolean(validation)} className="pl-9" disabled={busy} />
        </div>
        <Button type="submit" disabled={busy} className="gap-2">
          <Plus className="h-4 w-4" />
          {busy ? "Adicionando..." : "Adicionar origem"}
        </Button>
      </div>
      <p id="channel-username-help" className={validation ? "text-xs text-red-600 dark:text-red-400" : "text-xs text-slate-500 dark:text-slate-400"}>
        {validation ?? "Adicionar um username não verifica o canal, não concede acesso e não ativa a coleta."}
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Canais privados sem @username público não podem ser cadastrados aqui; a identificação alternativa depende de integração e autorização separadas.
      </p>
    </form>
  );
}
