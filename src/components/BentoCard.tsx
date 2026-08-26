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
      className={`flex flex-col rounded-2xl border border-borde bg-superficie p-5 sm:p-6 sombra-tarjeta ${className}`}
    >
      <header className="mb-4 flex items-center justify-between gap-3">
        {/* `text-secundario` y no el gris tenue de antes: el `slate-400` daba
            2.63:1 sobre blanco (Tailwind 4; en la v3 era #94a3b8 y daba 2.56:1),
            o sea que el título de cada tarjeta fallaba AA. */}
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-secundario">
          {titulo}
        </h2>
        <div className="flex items-center gap-2">
          {cargando && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-secundario">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-secundario" />
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
//
// Cada tono es un TINTE de §2 con el tono oscuro de SU PROPIA familia encima,
// nunca negro ni un gris genérico. Ratios medidos, anotados en cada línea.
//
// `error` es un tono NUEVO y no reemplaza a `peligro`. La diferencia es la que
// §2 marca entre `--error` y `--atencion`, y es de dominio, no de intensidad:
//   · `alerta` / `peligro` → estados DEL VEHÍCULO ("tiene multas", "matrícula
//     vencida", "requiere atención"). Hechos del mundo.
//   · `error` → fallo DE LA INTERFAZ ("no pudimos cargar", "el formulario está
//     mal"). Problema nuestro.
// Pintarlos igual haría que un problema nuestro se lea como un problema del
// auto (§7). `error` todavía no tiene consumidores acá: es el destino de los
// ~96 usos de `rose` que quedan por migrar en 1B/1C.
//
// `peligro` es el TERCER estado del vehículo: `tonoEstadoComponente()` en
// lib/ficha.ts devuelve una escala de tres pasos (bueno → regular →
// requiere_atencion) y ResumenPlaca marca así la matrícula vencida.
//
// Hasta TASK-017 PRESTABA la familia de `--atencion` y se diferenciaba solo
// por un anillo. Eso hacía que `--atencion` significara dos cosas, contra la
// regla dura de §2 (un color, un trabajo). Ahora tiene token propio,
// `--critico`, y el anillo SE QUEDA: la separación de hue con `--error` es de
// 17°, que no alcanza en una pantalla barata a pleno sol, así que el anillo
// sigue siendo lo que carga la distinción — el mismo argumento de §1 sobre la
// tipografía. No lo quites creyendo que el color nuevo ya alcanza.
export type TonoInsignia =
  | "ok"
  | "alerta"
  | "peligro"
  | "error"
  | "info"
  | "neutro"
  | "declarado";

const TONO_INSIGNIA: Record<TonoInsignia, string> = {
  ok: "bg-confirmado-tinte text-confirmado-texto", //      8.48:1
  alerta: "bg-atencion-tinte text-atencion-texto", //      7.72:1
  // Tercer estado del vehículo, en `--critico` (familia propia desde
  // TASK-017). Anillo y NO relleno sólido: la insignia nunca es interactiva
  // y un pill relleno se leería como un control.
  peligro: "bg-critico-tinte text-critico-texto ring-1 ring-critico", // 7.91:1
  error: "bg-error-tinte text-error", //                   5.54:1
  info: "bg-marca-tinte text-marca-texto", //              9.99:1
  neutro: "bg-superficie-tenue text-secundario", //        5.02:1
  // Procedencia: "esto lo dice el vendedor, no un registro". Es el único tono
  // que describe ORIGEN y no estado, y por eso usa la familia cálida (§1).
  declarado: "bg-declarado-tinte text-declarado-texto", // 6.58:1
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
