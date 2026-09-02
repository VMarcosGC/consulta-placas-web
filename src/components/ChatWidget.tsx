// Botón flotante de acceso al CHAT INTERNO (migración 0035).
//
// El chat comprador↔vendedor ya está construido: este widget es el acceso rápido a la
// bandeja (`/mensajes`) desde cualquier página, con el contador de mensajes sin leer.
// El punto verde comunica "la plataforma está activa", no la presencia de otra persona.
//
// `tieneSesion()` NO se llama en render ni en un inicializador de estado (mismatch de
// hidratación): se lee en un efecto post-montaje y se reescucha `sesion-cambiada`.

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconoChat } from "@/components/Iconos";
import { tieneSesion } from "@/lib/auth";
import { contarMensajesNoLeidos } from "@/lib/api";

export function ChatWidget() {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);
  const [haySesion, setHaySesion] = useState(false);
  const [noLeidos, setNoLeidos] = useState(0);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // El reel es una vista inmersiva a pantalla completa: nada flotante encima.
  const oculto = pathname?.startsWith("/marketplace/reel");

  useEffect(() => {
    let vivo = true;
    const leer = async () => {
      if (vivo) setHaySesion(tieneSesion());
    };
    void leer();
    window.addEventListener("sesion-cambiada", leer);
    return () => {
      vivo = false;
      window.removeEventListener("sesion-cambiada", leer);
    };
  }, []);

  useEffect(() => {
    if (!haySesion || oculto) return;
    let vivo = true;
    const traer = async () => {
      try {
        const { total } = await contarMensajesNoLeidos();
        if (vivo) setNoLeidos(total);
      } catch {
        /* sin sesión válida o backend frío: no molestar */
      }
    };
    void traer();
    const t = window.setInterval(traer, 20000);
    return () => {
      vivo = false;
      window.clearInterval(t);
    };
  }, [haySesion, oculto, pathname]);

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
      style={{ bottom: "calc(var(--alto-barra-movil-total, 0px) + 0.75rem)" }}
    >
      {abierto && (
        <div className="animate-fade-in-up w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-borde bg-superficie p-4 text-sm sombra-tarjeta">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-confirmado opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-confirmado" />
            </span>
            <p className="font-bold text-tinta">Chat interno</p>
          </div>

          {haySesion ? (
            <>
              <p className="mt-2 text-secundario">
                Habla con compradores y vendedores dentro de CarStore. El WhatsApp se
                comparte solo cuando el vendedor responde.
              </p>
              <Link
                href="/mensajes"
                onClick={() => setAbierto(false)}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accion px-4 py-2.5 font-semibold text-superficie transition hover:opacity-90"
              >
                Ver mis mensajes
                {noLeidos > 0 && (
                  <span className="rounded-full bg-superficie/25 px-1.5 py-0.5 text-[11px] font-bold">
                    {noLeidos}
                  </span>
                )}
              </Link>
            </>
          ) : (
            <>
              <p className="mt-2 text-secundario">
                Inicia sesión para escribirte con el comprador o el vendedor sin dar tu
                número.
              </p>
              <Link
                href="/login?next=/mensajes"
                onClick={() => setAbierto(false)}
                className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-accion px-4 py-2.5 font-semibold text-superficie transition hover:opacity-90"
              >
                Iniciar sesión
              </Link>
            </>
          )}

          <ul className="mt-3 space-y-1.5 text-secundario">
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
        {haySesion && noLeidos > 0 ? (
          <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full border-2 border-accion bg-error px-1 text-[11px] font-bold text-superficie">
            {noLeidos > 9 ? "9+" : noLeidos}
          </span>
        ) : (
          <span className="absolute right-0.5 top-0.5 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full rounded-full bg-confirmado opacity-60" />
            <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-accion bg-confirmado" />
          </span>
        )}
      </button>
    </div>
  );
}
