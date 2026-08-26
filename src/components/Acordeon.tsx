// Sección plegable, CERRADA por default (M2.7: la consulta era demasiado extensa —
// el detalle no debe aparecer todo de golpe al cargar).
//
// Se usa `<details>/<summary>` nativo a propósito: no necesita estado ni JS, es accesible
// por teclado, funciona sin hidratar y no agrega efectos de React (ni errores de lint).

import type { ReactNode } from "react";

export function Acordeon({
  titulo,
  resumen,
  abiertoPorDefecto = false,
  children,
}: {
  titulo: string;
  /** Pista corta a la derecha (ej. "3 pendientes"), para no obligar a abrir. */
  resumen?: ReactNode;
  abiertoPorDefecto?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      open={abiertoPorDefecto}
      className="group overflow-hidden rounded-2xl border border-borde bg-superficie sombra-tarjeta"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 transition hover:bg-superficie-tenue sm:px-6">
        <span className="text-sm font-semibold text-tinta">{titulo}</span>
        <span className="flex items-center gap-2">
          {resumen}
          {/* Chevron: rota al abrir. `open:` es la variante de Tailwind para <details>. */}
          <span
            aria-hidden
            className="text-secundario transition-transform group-open:rotate-180"
          >
            ▾
          </span>
        </span>
      </summary>
      {/* `borde-suave` y no `borde`: es un divisor INTERNO, debe pesar menos que
          el filete que cierra la tarjeta. */}
      <div className="border-t border-borde-suave px-5 py-5 sm:px-6">{children}</div>
    </details>
  );
}
