"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { cerrarSesion, tieneSesion } from "@/lib/auth";
import { useRouter } from "next/navigation";

// Suscripción al estado de sesión (un store externo: localStorage).
// "storage" cubre cambios desde otra pestaña; "sesion-cambiada" los del mismo tab.
function suscribirSesion(alCambiar: () => void) {
  window.addEventListener("storage", alCambiar);
  window.addEventListener("sesion-cambiada", alCambiar);
  return () => {
    window.removeEventListener("storage", alCambiar);
    window.removeEventListener("sesion-cambiada", alCambiar);
  };
}

export function Header() {
  const router = useRouter();
  // useSyncExternalStore lee el snapshot del cliente y, en SSR, el del servidor
  // (false), evitando el setState-en-effect y los mismatches de hidratación.
  const logueado = useSyncExternalStore(
    suscribirSesion,
    () => tieneSesion(),
    () => false,
  );

  function salir() {
    cerrarSesion();
    // Notifica al store en el mismo tab (el evento "storage" no se auto-dispara).
    window.dispatchEvent(new Event("sesion-cambiada"));
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-gradient text-zinc-950 text-sm font-black">
            CP
          </span>
          <span>
            Consulta<span className="text-brand-gradient">Placas</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-6 text-sm text-zinc-400">
          <Link href="/consultar" className="hover:text-zinc-100">Consultar</Link>
          <Link href="/precios" className="hover:text-zinc-100">Precios</Link>
          {logueado && (
            <Link href="/mi-garage" className="hover:text-zinc-100">Mi garage</Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          {logueado ? (
            <button
              onClick={salir}
              className="rounded-lg border border-zinc-800 px-3 py-1.5 text-sm text-zinc-300 hover:border-zinc-700 hover:text-zinc-100"
            >
              Salir
            </button>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden sm:inline rounded-lg px-3 py-1.5 text-sm text-zinc-300 hover:text-zinc-100"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/registro"
                className="rounded-lg bg-brand-gradient px-3 py-1.5 text-sm font-medium text-zinc-950 hover:opacity-90"
              >
                Crear cuenta
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
