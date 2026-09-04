// Barra mínima de la LANDING (`/`). La landing no lleva el Header del marketplace
// (ese chrome vive dentro del market); solo esto: wordmark + tema + acceso a la cuenta.
// El estado de sesión se lee con `useSyncExternalStore` (mismo store que el Header) para
// no romper la hidratación.

"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { tieneSesion } from "@/lib/auth";
import { ThemeToggle } from "@/components/ThemeToggle";

function suscribirSesion(alCambiar: () => void) {
  window.addEventListener("storage", alCambiar);
  window.addEventListener("sesion-cambiada", alCambiar);
  return () => {
    window.removeEventListener("storage", alCambiar);
    window.removeEventListener("sesion-cambiada", alCambiar);
  };
}

export function BarraLanding() {
  const logueado = useSyncExternalStore(
    suscribirSesion,
    () => tieneSesion(),
    () => false,
  );

  return (
    <header className="border-b border-borde bg-superficie">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-5 py-3">
        <span className="leading-none">
          <span className="text-lg font-black tracking-tight text-tinta">
            CarStore
            <span className="ml-1 align-top text-[10px] font-bold text-secundario">Ec</span>
          </span>
        </span>
        <div className="flex items-center gap-3">
          <Link
            href={logueado ? "/mi-cuenta" : "/login"}
            className="text-xs font-semibold text-secundario transition hover:text-tinta"
          >
            {logueado ? "Mi cuenta" : "Iniciar sesión"}
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
