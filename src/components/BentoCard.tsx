// Tarjeta base, sobria y uniforme: superficie blanca, borde tenue, buen aire interno.
// Sin barras de color por tarjeta (eso hacía ruido). El color queda reservado a las
// insignias de estado, para que la jerarquía la marque la tipografía, no el colorido.
// Reutilizable por el Perfil del Vehículo y el Marketplace.

import type { ReactNode } from "react";

interface Props {
  titulo: string;
  /** Acción/insignia a la derecha del título (estado, monto, etc.). */
  badge?: ReactNode;
  cargando?: boolean;
  /** Clases de grid-span (ej. "lg:col-span-2"). */
  className?: string;
  children: ReactNode;
}

export function BentoCard({ titulo, badge, cargando, className = "", children }: Props) {
  return (
    <section
      className={`flex flex-col rounded-2xl border border-slate-200/70 bg-white p-5 sm:p-6 sombra-tarjeta ${className}`}
    >
      <header className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
          {titulo}
        </h2>
        <div className="flex items-center gap-2">
          {cargando && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400" />
              actualizando
            </span>
          )}
          {badge}
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </section>
  );
}

// Insignia de estado: tono semántico suave. "Limpio", "Deuda", etc.
export type TonoInsignia = "ok" | "alerta" | "peligro" | "info" | "neutro";

const TONO_INSIGNIA: Record<TonoInsignia, string> = {
  ok: "bg-emerald-50 text-emerald-700",
  alerta: "bg-amber-50 text-amber-700",
  peligro: "bg-rose-50 text-rose-700",
  info: "bg-sky-50 text-sky-700",
  neutro: "bg-slate-100 text-slate-500",
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
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${TONO_INSIGNIA[tono]}`}
    >
      {children}
    </span>
  );
}
