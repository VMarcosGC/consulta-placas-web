// Mapa visual del Ecuador para elegir provincia. NO es cartografía exacta: es un
// silueta esquemática + un marcador por provincia colocado en su posición relativa
// aproximada (oeste→este, norte→sur). Suficiente para "toca la provincia que quieres
// filtrar" y liviano en gama baja (un solo <svg> inline, sin librerías ni assets).
//
// Solo se dibujan las 11 provincias que hoy pueden tener stock (las que tienen una
// ciudad en el catálogo del backend, `geografia.py` / `lib/geografia.ts`).

"use client";

import { PROVINCIAS_MAPA } from "@/lib/geografia";

type Props = {
  /** provincia → conteo. Si se pasa, el marcador escala con el número. */
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
  const maxN = conConteo
    ? Math.max(1, ...Object.values(porProvincia))
    : 1;

  return (
    <div className={className}>
      <svg
        viewBox="0 0 320 400"
        className="w-full"
        role="group"
        aria-label="Mapa del Ecuador: elige una provincia"
      >
        {/* Silueta nacional aproximada. Decorativa: da el "es un mapa". */}
        <path
          d="M96 44
             C120 36 150 40 168 54
             C182 64 200 66 214 80
             C226 92 236 110 232 128
             C228 146 236 160 244 178
             C250 194 246 214 236 230
             C226 246 232 262 224 282
             C214 306 190 322 160 330
             C136 336 112 330 96 314
             C82 300 84 280 72 262
             C58 242 44 226 44 204
             C44 182 56 166 56 146
             C56 126 46 110 56 92
             C66 74 74 52 96 44 Z"
          className="fill-superficie-tenue stroke-borde-fuerte"
          strokeWidth="1.5"
        />

        {PROVINCIAS_MAPA.map((p) => {
          const n = porProvincia?.[p.provincia] ?? 0;
          const activa = seleccionada === p.provincia;
          const r = conConteo ? 6 + (n / maxN) * 12 : 9;
          return (
            <g
              key={p.provincia}
              role="button"
              tabIndex={0}
              aria-pressed={activa}
              aria-label={`${p.provincia}${conConteo ? `, ${n} ${n === 1 ? "auto" : "autos"}` : ""}`}
              className="cursor-pointer outline-none"
              onClick={() => onSeleccion(activa ? null : p.provincia)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSeleccion(activa ? null : p.provincia);
                }
              }}
            >
              <circle
                cx={p.x}
                cy={p.y}
                r={r}
                className={
                  activa
                    ? "fill-accion stroke-accion"
                    : conConteo && n > 0
                      ? "fill-marca stroke-superficie"
                      : "fill-borde-fuerte stroke-superficie"
                }
                strokeWidth="2"
              />
              {conConteo && n > 0 && (
                <text
                  x={p.x}
                  y={p.y + 3.5}
                  textAnchor="middle"
                  className={`pointer-events-none text-[9px] font-bold ${
                    activa ? "fill-superficie" : "fill-superficie"
                  }`}
                >
                  {n}
                </text>
              )}
              <text
                x={p.x}
                y={p.y - r - 4}
                textAnchor="middle"
                className={`pointer-events-none text-[8.5px] font-semibold ${
                  activa ? "fill-tinta" : "fill-secundario"
                }`}
              >
                {p.corto}
              </text>
            </g>
          );
        })}
      </svg>

      {seleccionada && (
        <button
          type="button"
          onClick={() => onSeleccion(null)}
          className="mt-1 text-xs font-semibold text-secundario underline hover:text-tinta"
        >
          Quitar “{seleccionada}”
        </button>
      )}
    </div>
  );
}
