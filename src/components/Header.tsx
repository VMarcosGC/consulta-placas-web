"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { cerrarSesion, tieneSesion } from "@/lib/auth";
import { obtenerPerfil } from "@/lib/api";
import type { Usuario } from "@/types/api";
import { useRouter } from "next/navigation";
import { MenuCuenta } from "./MenuCuenta";

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

  // Datos del usuario logueado (nombre para mostrarlo, es_admin para moderación).
  // Se resuelve consultando /auth/me y se reevalúa al cambiar la sesión.
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  useEffect(() => {
    let activo = true;
    if (!logueado) {
      setUsuario(null);
      return () => {
        activo = false;
      };
    }
    obtenerPerfil()
      .then((u) => activo && setUsuario(u))
      .catch(() => activo && setUsuario(null));
    return () => {
      activo = false;
    };
  }, [logueado]);

  const nombreCorto = usuario?.nombre?.trim() || usuario?.email?.split("@")[0] || "Mi cuenta";

  function salir() {
    cerrarSesion(); // dispara "sesion-cambiada" → el header se actualiza solo
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/85 backdrop-blur-xl">
      {/* Padding y gap más chicos en celular: a 360px el logo, el saldo y el menú de la
          cuenta tienen que entrar en la misma fila sin encimarse. */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:gap-6 sm:px-6">
        <Link
          href="/"
          className="flex shrink items-center gap-2 text-base font-semibold text-slate-900 sm:text-lg"
        >
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-gradient text-white text-sm font-black shadow-sm">
            RC
          </span>
          <span>
            Revisa tu <span className="text-brand-gradient">Carro</span>
            <span className="ml-1 align-top text-[10px] font-bold text-slate-400">EC</span>
          </span>
        </Link>

        {/* Market primero (M2.6): el producto es el market de autos; la consulta de placa
            es una herramienta de apoyo y por eso va después. */}
        <div className="hidden md:flex items-center gap-6 text-sm text-slate-500">
          <Link href="/marketplace" className="font-semibold text-slate-800 hover:text-slate-900">
            Marketplace
          </Link>
          <Link href="/marketplace/publicar" className="hover:text-slate-900">Publicar</Link>
          <Link href="/consultar" className="hover:text-slate-900">Consulta de placa</Link>
          <Link href="/precios" className="hover:text-slate-900">Precios</Link>
          {logueado && (
            <Link href="/mi-garage" className="hover:text-slate-900">Mi garage</Link>
          )}
          {usuario?.es_admin && (
            <>
              <Link href="/admin/moderacion" className="font-semibold text-blue-600 hover:text-blue-800">
                Moderar
              </Link>
              <Link href="/admin/verificaciones" className="font-semibold text-blue-600 hover:text-blue-800">
                Verificar
              </Link>
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {logueado ? (
            <>
              {/* Saldo de tokens: visible para que el usuario sepa con qué cuenta para desbloquear. */}
              {typeof usuario?.saldo_tokens === "number" && (
                <Link
                  href="/precios"
                  className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1.5 text-sm font-bold text-amber-700 hover:bg-amber-100"
                  title="Tus tokens — toca para ver precios"
                >
                  <span aria-hidden>🪙</span>
                  {usuario.saldo_tokens}
                </Link>
              )}
              {/* Menú de la cuenta: única entrada a "Mis publicaciones" y "Mi contacto",
                  que no tenían enlace propio en el Header. Visible en todos los anchos
                  (en celular queda solo el círculo con la inicial). */}
              <MenuCuenta nombre={nombreCorto} alSalir={salir} />
            </>
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
