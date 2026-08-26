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
    <header className="sticky top-0 z-40 border-b border-borde bg-superficie/85 backdrop-blur-xl">
      {/* Padding y gap más chicos en celular: a 360px el logo, el saldo y el menú de la
          cuenta tienen que entrar en la misma fila sin encimarse. */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:gap-6 sm:px-6">
        <Link
          href="/"
          aria-label="Revisa tu Carro EC — inicio"
          className="flex shrink items-center gap-2 text-base font-semibold text-tinta sm:text-lg"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand-gradient text-superficie text-sm font-black shadow-sm">
            RC
          </span>
          {/* Bajo 400px queda solo el monograma. Medido: el nombre completo ocupa ~143px
              y el conjunto logo + "Entrar" + "Crear cuenta" necesita 393px, así que a
              320/360/375 no entra (antes se partía en dos líneas). El umbral es 400 y no
              420 a propósito: el iPhone 12-15 y el Pixel 8 rondan los 390-393px y son el
              equipo típico del público objetivo (§1) — a 400px conservan el nombre con
              7px de holgura. El nombre accesible lo lleva el aria-label, así que nadie
              lo pierde en pantallas más chicas. */}
          <span className="hidden min-[400px]:inline">
            Revisa tu <span className="text-brand-gradient">Carro</span>
            <span className="ml-1 align-top text-[10px] font-bold text-secundario">EC</span>
          </span>
        </Link>

        {/* Market primero (M2.6): el producto es el market de autos; la consulta de placa
            es una herramienta de apoyo y por eso va después. */}
        <div className="hidden md:flex items-center gap-6 text-sm text-secundario">
          <Link href="/marketplace" className="font-semibold text-tinta hover:text-tinta">
            Marketplace
          </Link>
          <Link href="/marketplace/publicar" className="hover:text-tinta">Publicar</Link>
          <Link href="/consultar" className="hover:text-tinta">Consulta de placa</Link>
          <Link href="/precios" className="hover:text-tinta">Precios</Link>
          {logueado && (
            <Link href="/mi-garage" className="hover:text-tinta">Mi garage</Link>
          )}
          {/* Accesos de admin DUPLICADOS a propósito: viven acá y también en MenuCuenta.
              Estaban solo acá, dentro de este bloque `hidden md:flex`, así que un admin
              en celular no los alcanzaba; por eso se sumaron al menú. Se conservan
              además en escritorio porque quitarle un clic al admin vale más que el
              ahorro de mantener una sola lista: son dos entradas estables y el riesgo de
              que se desincronicen es bajo. Si se agrega una tercera, revisar los dos
              lugares. */}
          {usuario?.es_admin && (
            <>
              <Link href="/admin/moderacion" className="font-semibold text-marca hover:text-marca-texto">
                Moderar
              </Link>
              <Link href="/admin/verificaciones" className="font-semibold text-marca hover:text-marca-texto">
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
                  className="inline-flex items-center gap-1 rounded-full bg-superficie-tenue px-2.5 py-1.5 text-sm font-bold text-secundario transition hover:opacity-90"
                  title="Tus tokens — toca para ver precios"
                >
                  <span aria-hidden>🪙</span>
                  {usuario.saldo_tokens}
                </Link>
              )}
              {/* Menú de la cuenta: única entrada a "Mis publicaciones" y "Mi contacto",
                  que no tenían enlace propio en el Header. Visible en todos los anchos
                  (en celular queda solo el círculo con la inicial). */}
              <MenuCuenta
                nombre={nombreCorto}
                esAdmin={usuario?.es_admin ?? false}
                alSalir={salir}
              />
            </>
          ) : (
            <>
              {/* Se ve en TODOS los anchos. Antes era `hidden sm:inline`: bajo 640px
                  un usuario con cuenta solo veía "Crear cuenta" y no tenía por dónde
                  volver a entrar. En celular la etiqueta se acorta a "Entrar" para que
                  quepa junto al CTA principal. Sin `aria-label`: el nombre accesible
                  sale del span visible (el oculto es `display:none` y no cuenta), así
                  que siempre coincide con lo que se lee en pantalla. */}
              <Link
                href="/login"
                /* `min-h-11` = 44px, el mínimo táctil. Se fija por altura y no por
                   `py`/tamaño de fuente para no desalinear la fila del header a 320px:
                   el ancho no cambia, así que el ajuste medido a esos anchos se conserva. */
                className="inline-flex min-h-11 items-center justify-center rounded-lg px-2 py-1.5 text-sm text-secundario hover:text-tinta sm:px-3"
              >
                <span className="sm:hidden">Entrar</span>
                <span className="hidden sm:inline">Iniciar sesión</span>
              </Link>
              <Link
                href="/registro"
                /* Mismo mínimo táctil que "Entrar": son vecinos y quedarían dispares. */
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-accion px-3 py-1.5 text-sm font-semibold text-superficie shadow-sm hover:opacity-90"
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
