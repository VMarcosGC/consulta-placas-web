// Mapa coroplético del Ecuador para elegir provincia. Geografía ESTILIZADA (contornos
// simplificados a mano) con la silueta y las posiciones relativas del país; no es
// cartografía exacta. Cada provincia se rellena con `--color-marca` a una OPACIDAD
// proporcional al conteo: más autos → color más saturado. Tocar una provincia filtra.
//
// Un solo <svg> inline, sin librerías ni assets. Solo las 11 provincias con ciudad en
// el catálogo del backend (`geografia.py` / `lib/geografia.ts`).

"use client";

import { CONTORNO_ECUADOR, PROVINCIAS_MAPA } from "@/lib/geografia";

type Props = {
  /** provincia → conteo. La opacidad del relleno escala con esto. */
  porProvincia?: Record<string, number>;
  seleccionada?: string | null;
  onSeleccion: (provincia: string | null) => void;
  className?: string;
};

// Opacidad del relleno según la parte del máximo (0 → 1). Piso 0.12 para que una
// provincia con 1 auto igual se distinga del fondo.
function opacidad(n: number, max: number): number {
  if (n <= 0) return 0;
  return 0.12 + (n / max) * 0.78;
}

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
      <svg
        viewBox="0 0 300 400"
        className="w-full"
        role="group"
        aria-label="Mapa del Ecuador: elige una provincia"
      >
        {/* Silueta del país detrás (el resto del territorio sin datos). */}
        <path
          d={CONTORNO_ECUADOR}
          className="fill-superficie-tenue stroke-borde-fuerte"
          strokeWidth="1.25"
        />

        {PROVINCIAS_MAPA.map((p) => {
          const n = porProvincia?.[p.provincia] ?? 0;
          const activa = seleccionada === p.provincia;
          return (
            <g
              key={p.provincia}
              role="button"
              tabIndex={0}
              aria-pressed={activa}
              aria-label={`${p.provincia}${conConteo ? `, ${n} ${n === 1 ? "auto" : "autos"}` : ""}`}
              className="cursor-pointer outline-none [&:focus-visible_polygon]:stroke-marca"
              onClick={() => onSeleccion(activa ? null : p.provincia)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSeleccion(activa ? null : p.provincia);
                }
              }}
            >
              <polygon
                points={p.puntos}
                className={
                  activa
                    ? "fill-accion stroke-accion"
                    : "fill-marca stroke-superficie transition-[fill-opacity]"
                }
                style={activa ? undefined : { fillOpacity: conConteo ? opacidad(n, max) : 0.22 }}
                strokeWidth={activa ? 2.5 : 1}
              />
              <text
                x={p.cx}
                y={p.cy}
                textAnchor="middle"
                className={`pointer-events-none text-[8px] font-bold ${
                  activa || (conConteo && n / max > 0.55)
                    ? "fill-superficie"
                    : "fill-tinta"
                }`}
              >
                {p.corto}
              </text>
              {conConteo && n > 0 && (
                <text
                  x={p.cx}
                  y={p.cy + 10}
                  textAnchor="middle"
                  className={`pointer-events-none text-[9px] font-black ${
                    activa || n / max > 0.55 ? "fill-superficie" : "fill-tinta"
                  }`}
                >
                  {n}
                </text>
              )}
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
