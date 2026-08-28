// "Mapa" de provincias como GRILLA DE FICHAS (tile grid map) — se lee de un vistazo,
// escala en cualquier ancho y no depende de cartografía exacta. Cada provincia es una
// ficha teñida de `--color-marca` con OPACIDAD proporcional al conteo (más autos → más
// saturado). Tocar una ficha filtra. Predominante en la portada; la leyenda de regiones
// va debajo, en texto (lo pinta quien la usa).

"use client";

import { PROVINCIAS_TILE } from "@/lib/geografia";

type Props = {
  /** provincia → conteo. La intensidad del relleno escala con esto. */
  porProvincia?: Record<string, number>;
  seleccionada?: string | null;
  onSeleccion: (provincia: string | null) => void;
  className?: string;
};

export function MapaEcuador({
  porProvincia,
  seleccionada = null,
  onSeleccion,
  className = "",
}: Props) {
  const conConteo = porProvincia != null;
  const max = conConteo ? Math.max(1, ...Object.values(porProvincia)) : 1;

  return (
    <div className={className}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {PROVINCIAS_TILE.map((p) => {
          const n = porProvincia?.[p.provincia] ?? 0;
          const activa = seleccionada === p.provincia;
          const op = n <= 0 ? 0 : 0.14 + (n / max) * 0.86;
          return (
            <button
              key={p.provincia}
              type="button"
              aria-pressed={activa}
              aria-label={`${p.provincia}${conConteo ? `, ${n} ${n === 1 ? "auto" : "autos"}` : ""}`}
              onClick={() => onSeleccion(activa ? null : p.provincia)}
              className={`relative flex min-h-[74px] flex-col justify-between overflow-hidden rounded-2xl border p-2.5 text-left transition ${
                activa
                  ? "border-accion bg-accion"
                  : "border-borde bg-superficie hover:border-borde-fuerte"
              }`}
            >
              {/* Capa de intensidad (solo cuando NO está activa). */}
              {!activa && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-marca"
                  style={{ opacity: op }}
                />
              )}
              <span
                className={`relative text-[9px] font-semibold uppercase tracking-wide ${
                  activa ? "text-superficie/75" : "text-secundario"
                }`}
              >
                {p.region}
              </span>
              <span className="relative">
                <span
                  className={`block text-[13px] font-bold leading-tight ${
                    activa || (conConteo && n / max > 0.5) ? "text-superficie" : "text-tinta"
                  }`}
                >
                  {p.corto}
                </span>
                {conConteo && (
                  <span
                    className={`font-mono text-[11px] ${
                      activa || n / max > 0.5 ? "text-superficie/90" : "text-secundario"
                    }`}
                  >
                    {n} {n === 1 ? "auto" : "autos"}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {conConteo && (
        <div className="mt-3 flex items-center gap-2 text-[11px] text-secundario">
          <span>menos</span>
          <span
            aria-hidden
            className="h-2 flex-1 rounded-full"
            style={{
              background:
                "linear-gradient(90deg, color-mix(in oklab, var(--color-marca) 14%, transparent), var(--color-marca))",
            }}
          />
          <span>más autos</span>
        </div>
      )}

      {seleccionada && (
        <button
          type="button"
          onClick={() => onSeleccion(null)}
          className="mt-2 text-xs font-semibold text-secundario underline hover:text-tinta"
        >
          Quitar “{seleccionada}”
        </button>
      )}
    </div>
  );
}
