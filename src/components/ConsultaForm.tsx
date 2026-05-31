"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface Props {
  tamanio?: "hero" | "compacto";
  placaInicial?: string;
}

// Spinner inline (hereda el color del texto vía currentColor).
function Spinner() {
  return (
    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
    </svg>
  );
}

export function ConsultaForm({ tamanio = "hero", placaInicial = "" }: Props) {
  const [placa, setPlaca] = useState(placaInicial);
  const [error, setError] = useState<string | null>(null);
  // useTransition: isPending sigue en true mientras Next navega y el server
  // component resuelve el fetch del perfil → feedback real de "buscando".
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function normalizar(v: string) {
    return v.toUpperCase().replace(/[-\s]/g, "");
  }

  function validar(v: string) {
    return /^[A-Z]{3}[0-9]{3,4}$/.test(v);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const limpia = normalizar(placa);
    if (!validar(limpia)) {
      setError("Formato esperado: 3 letras + 3 o 4 números (ej: ABC1234)");
      return;
    }
    setError(null);
    startTransition(() => router.push(`/consultar/${limpia}`));
  }

  const inputClases =
    tamanio === "hero"
      ? "h-16 text-2xl tracking-widest"
      : "h-12 text-lg tracking-wider";
  const botonClases =
    tamanio === "hero" ? "h-16 px-6 text-base min-w-[12rem]" : "h-12 px-4 text-sm min-w-[8rem]";

  const etiqueta = tamanio === "hero" ? "Consultar gratis" : "Consultar";

  return (
    <form onSubmit={submit} className="w-full">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
          value={placa}
          onChange={(e) => setPlaca(normalizar(e.target.value))}
          placeholder="TBA3373"
          maxLength={8}
          disabled={pending}
          aria-label="Placa del vehiculo"
          className={`focus-glow flex-1 rounded-2xl border border-slate-300 bg-white px-5 font-mono text-center text-slate-900 placeholder-slate-300 shadow-sm disabled:opacity-60 ${inputClases}`}
        />
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className={`inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-gradient font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-90 ${botonClases}`}
        >
          {pending ? (
            <>
              <Spinner />
              Buscando…
            </>
          ) : (
            etiqueta
          )}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {tamanio === "hero" && !pending && (
        <p className="mt-3 text-center text-sm text-slate-500">
          Consulta anónima, sin registro. Resultados en segundos.
        </p>
      )}
      {pending && (
        <p className="mt-3 text-center text-sm text-slate-500">
          Consultando fuentes oficiales… puede tardar unos segundos.
        </p>
      )}
    </form>
  );
}
