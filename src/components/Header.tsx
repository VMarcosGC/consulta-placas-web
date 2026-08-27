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
  const [usuarioCargado, setUsuarioCargado] = useState<Usuario | null>(null);
  // Sin sesión no hay a quién mostrar: el valor guardado se ignora hasta el próximo
  // login (así el efecto nunca hace setState de forma síncrona al cerrar sesión).
  const usuario = logueado ? usuarioCargado : null;
  useEffect(() => {
    if (!logueado) return;
    let activo = true;
    obtenerPerfil()
      .then((u) => {
        if (activo) setUsuarioCargado(u);
      })
      .catch(() => {
        if (activo) setUsuarioCargado(null);
      });
    return () => {
      activo = false;
    };
  }, [logueado]);

  const nombreCorto = usuario?.nombre?.trim() || usuario?.email?.split("@")[0] || "Mi cuenta";

  // Botón-ícono del cluster derecho (estilo tienda): círculo con filete frío, realce
  // sutil al pasar y anillo de foco en `--marca`. El tamaño (h-10/w-10 = 40px) sale de
  // la Dirección C; queda apenas bajo el pill de la cuenta (min-h-11) pero centrado en
  // la fila, sin mover el ajuste medido a 320-400px.
  const claseIconoHeader =
    "inline-flex h-10 w-10 items-center justify-center rounded-full border border-borde " +
    "bg-superficie text-lg leading-none transition-colors hover:bg-superficie-tenue " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marca";

  function salir() {
    cerrarSesion(); // dispara "sesion-cambiada" → el header se actualiza solo
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-borde bg-superficie/85 backdrop-blur-xl">
      {/* Padding y gap más chicos en celular: a 360px el logo y el menú de la cuenta
          tienen que entrar en la misma fila sin encimarse. */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:gap-6 sm:px-6">
        <Link
          href="/"
          aria-label="CarStore Ec — inicio"
          className="flex shrink items-center gap-2 text-base font-semibold text-tinta sm:text-lg"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-gradient text-superficie text-[13px] font-black tracking-tight shadow-sm">
            CS
          </span>
          {/* Bajo 400px queda solo el monograma "CS": es la vía segura para que la fila
              (logo + "Entrar" + "Crear cuenta") entre sin partirse en gama baja (iPhone
              12-15 y Pixel 8 rondan los 390-393px, el equipo típico del público §1). El
              nombre accesible lo lleva el aria-label, así que no se pierde. */}
          <span className="hidden min-[400px]:inline">
            Car<span className="text-brand-gradient">Store</span>
            <span className="ml-1 align-top text-[10px] font-bold text-secundario">Ec</span>
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
              {/* Favoritos: no hay página propia; los favoritos guardados se ven en la
                  portada del market ("Tus favoritos"). Solo con sesión: sin cuenta no
                  hay favoritos que mostrar. El ♡ va en `--marca` (identidad/favorito),
                  no en `--accion`. */}
              <Link
                href="/marketplace"
                aria-label="Tus favoritos"
                className={`${claseIconoHeader} text-marca`}
              >
                <span aria-hidden>♡</span>
              </Link>
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
