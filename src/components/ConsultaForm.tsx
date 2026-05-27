"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  tamanio?: "hero" | "compacto";
  placaInicial?: string;
}

export function ConsultaForm({ tamanio = "hero", placaInicial = "" }: Props) {
  const [placa, setPlaca] = useState(placaInicial);
  const [error, setError] = useState<string | null>(null);
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
    router.push(`/consultar/${limpia}`);
  }

  const inputClases =
    tamanio === "hero"
      ? "h-16 text-2xl tracking-widest"
      : "h-12 text-lg tracking-wider";
  const botonClases =
    tamanio === "hero" ? "h-16 px-6 text-base" : "h-12 px-4 text-sm";

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
          aria-label="Placa del vehiculo"
          className={`focus-glow flex-1 rounded-2xl border border-zinc-800 bg-zinc-900 px-5 font-mono text-center text-zinc-100 placeholder-zinc-600 ${inputClases}`}
        />
        <button
          type="submit"
          className={`rounded-2xl bg-brand-gradient font-semibold text-zinc-950 hover:opacity-90 transition-opacity ${botonClases}`}
        >
          {tamanio === "hero" ? "Consultar gratis" : "Consultar"}
        </button>
      </div>
      {error && (
        <p className="mt-2 text-sm text-amber-400">{error}</p>
      )}
      {tamanio === "hero" && (
        <p className="mt-3 text-center text-sm text-zinc-500">
          Consulta anónima, sin registro. Resultados en segundos.
        </p>
      )}
    </form>
  );
}
