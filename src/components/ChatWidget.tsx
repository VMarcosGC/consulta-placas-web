// Botón flotante de "chat interno" con indicador ONLINE.
//
// El chat interno comprador↔vendedor todavía no está construido; este widget deja el
// acceso visible (posición clásica abajo-derecha) y, al abrirlo, es HONESTO: dice que
// está en preparación y ofrece las vías que sí funcionan hoy (teléfono del anuncio,
// puntos de encuentro, agendar un servicio). El punto verde comunica "la plataforma
// está activa", no una presencia real de otra persona.

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconoChat } from "@/components/Iconos";

export function ChatWidget() {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // El reel es una vista inmersiva a pantalla completa: nada flotante encima.
  const oculto = pathname?.startsWith("/marketplace/reel");

  useEffect(() => {
    if (!abierto) return;
    function fuera(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    }
    function esc(e: KeyboardEvent) {
      if (e.key === "Escape") setAbierto(false);
    }
    window.addEventListener("mousedown", fuera);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("mousedown", fuera);
      window.removeEventListener("keydown", esc);
    };
  }, [abierto]);

  if (oculto) return null;

  return (
    <div
      ref={panelRef}
      className="fixed right-4 z-50 flex flex-col items-end gap-2"
      style={{
        bottom: "calc(var(--alto-barra-movil-total, 0px) + 0.75rem)",
      }}
    >
      {abierto && (
        <div className="animate-fade-in-up w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-borde bg-superficie p-4 text-sm sombra-tarjeta">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-confirmado opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-confirmado" />
            </span>
            <p className="font-bold text-tinta">Chat interno</p>
            <span className="rounded-full bg-superficie-tenue px-2 py-0.5 text-[11px] font-semibold text-secundario">
              En preparación
            </span>
          </div>
          <p className="mt-2 text-secundario">
            Pronto vas a poder escribirte aquí con el comprador o el vendedor sin dar tu
            número. Mientras tanto:
          </p>
          <ul className="mt-2 space-y-1.5 text-secundario">
            <li>
              · Mira el <strong className="text-tinta">teléfono del vendedor</strong> en cada
              anuncio.
            </li>
            <li>
              ·{" "}
              <Link
                href="/puntos-encuentro"
                onClick={() => setAbierto(false)}
                className="font-semibold text-tinta underline"
              >
                Coordina un punto de encuentro seguro
              </Link>
              .
            </li>
            <li>
              ·{" "}
              <Link
                href="/servicios"
                onClick={() => setAbierto(false)}
                className="font-semibold text-tinta underline"
              >
                Agenda una cita
              </Link>{" "}
              con un taller o lavadero.
            </li>
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-label={abierto ? "Cerrar chat" : "Abrir chat interno"}
        aria-expanded={abierto}
        className="relative grid h-12 w-12 place-items-center rounded-full bg-accion text-superficie shadow-lg transition hover:opacity-90 active:scale-95"
      >
        <IconoChat className="h-6 w-6" />
        {/* Punto ONLINE: verde desaturado del sistema, sobre el borde del botón. */}
        <span className="absolute right-0.5 top-0.5 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full rounded-full bg-confirmado opacity-60" />
          <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-accion bg-confirmado" />
        </span>
      </button>
    </div>
  );
}
