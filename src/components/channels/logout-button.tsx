"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function logout() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        setError("Não foi possível sair. Tente novamente.");
        return;
      }
      router.replace("/login");
      router.refresh();
    } catch {
      setError("Não foi possível confirmar a saída. Verifique sua sessão.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <button type="button" onClick={logout} disabled={busy} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800" title="Sair da conta" aria-label="Sair da conta" aria-describedby={error ? "logout-error" : undefined}>
        <LogOut className="h-4 w-4" />
      </button>
      {error && <div id="logout-error" role="alert" className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border border-red-200 bg-white p-2 text-xs text-red-700 shadow-lg dark:border-red-950 dark:bg-slate-900 dark:text-red-300">{error}</div>}
    </div>
  );
}
