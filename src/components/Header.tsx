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
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/85 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-gradient text-white text-sm font-black shadow-sm">
            RC
          </span>
          <span>
            Revisa tu <span className="text-brand-gradient">Carro</span>
            <span className="ml-1 align-top text-[10px] font-bold text-slate-400">EC</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-6 text-sm text-slate-500">
          <Link href="/consultar" className="hover:text-slate-900">Consultar</Link>
          <Link href="/precios" className="hover:text-slate-900">Precios</Link>
          {logueado && (
            <Link href="/mi-garage" className="hover:text-slate-900">Mi garage</Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          {logueado ? (
            <button
              onClick={salir}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:border-slate-400 hover:text-slate-900"
            >
              Salir
            </button>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden sm:inline rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/registro"
                className="rounded-lg bg-brand-gradient px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:opacity-90"
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
