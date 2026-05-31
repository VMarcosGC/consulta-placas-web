// Tarjeta base del Bento Grid: shell vibrante y denso con barra de acento superior,
// ícono, título compacto, slot de badge a la derecha y estado "cargando".
// Reutilizable por el Perfil del Vehículo y por el Marketplace (estética común).

import type { ReactNode } from "react";

export type AcentoBento =
  | "azul"
  | "esmeralda"
  | "ambar"
  | "rosa"
  | "cian"
  | "indigo"
  | "neutro";

// Cada acento define: barra superior (gradiente), color del ícono/título y borde tenue.
const ACENTO: Record<AcentoBento, { barra: string; icono: string; borde: string }> = {
  azul: { barra: "from-blue-500 to-sky-400", icono: "text-blue-600", borde: "border-blue-100" },
  esmeralda: {
    barra: "from-emerald-500 to-teal-400",
    icono: "text-emerald-600",
    borde: "border-emerald-100",
  },
  ambar: { barra: "from-amber-500 to-orange-400", icono: "text-amber-600", borde: "border-amber-100" },
  rosa: { barra: "from-rose-500 to-pink-400", icono: "text-rose-600", borde: "border-rose-100" },
  cian: { barra: "from-cyan-500 to-sky-400", icono: "text-cyan-600", borde: "border-cyan-100" },
  indigo: { barra: "from-indigo-500 to-violet-400", icono: "text-indigo-600", borde: "border-indigo-100" },
  neutro: { barra: "from-slate-400 to-slate-300", icono: "text-slate-500", borde: "border-slate-200" },
};

interface Props {
  titulo: string;
  icono?: ReactNode;
  acento?: AcentoBento;
  badge?: ReactNode;
  cargando?: boolean;
  /** Clases de grid-span (ej. "lg:col-span-2 lg:row-span-2"). */
  className?: string;
  children: ReactNode;
}

export function BentoCard({
  titulo,
  icono,
  acento = "neutro",
  badge,
  cargando,
  className = "",
  children,
}: Props) {
  const a = ACENTO[acento];
  return (
    <section
      className={`group relative flex flex-col overflow-hidden rounded-2xl border ${a.borde} bg-white sombra-tarjeta animate-fade-in-up ${className}`}
    >
      {/* Barra de acento superior — identidad de color de la tarjeta */}
      <span className={`block h-1 w-full bg-gradient-to-r ${a.barra}`} aria-hidden />
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <header className="mb-3 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-700">
            {icono && <span className={a.icono}>{icono}</span>}
            {titulo}
          </h2>
          <div className="flex items-center gap-2">
            {cargando && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600">
                <span className="h-1.5 w-1.5 animate-ping rounded-full bg-blue-500" />
                actualizando
              </span>
            )}
            {badge}
          </div>
        </header>
        <div className="flex-1">{children}</div>
      </div>
    </section>
  );
}

// Insignia de estado reutilizable: "Limpio", "Deuda", etc. con tono semántico.
export type TonoInsignia = "ok" | "alerta" | "peligro" | "info" | "neutro";

const TONO_INSIGNIA: Record<TonoInsignia, string> = {
  ok: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  alerta: "bg-amber-100 text-amber-800 ring-amber-200",
  peligro: "bg-rose-100 text-rose-800 ring-rose-200",
  info: "bg-blue-100 text-blue-800 ring-blue-200",
  neutro: "bg-slate-100 text-slate-600 ring-slate-200",
};

export function Insignia({
  tono = "neutro",
  children,
}: {
  tono?: TonoInsignia;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ring-inset ${TONO_INSIGNIA[tono]}`}
    >
      {children}
    </span>
  );
}
