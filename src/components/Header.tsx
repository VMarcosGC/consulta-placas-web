"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cerrarSesion, tieneSesion } from "@/lib/auth";
import { useRouter } from "next/navigation";

export function Header() {
  const [logueado, setLogueado] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setLogueado(tieneSesion());
    // Refresca el estado si otro tab cambia el token.
    const handler = () => setLogueado(tieneSesion());
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  function salir() {
    cerrarSesion();
    setLogueado(false);
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
