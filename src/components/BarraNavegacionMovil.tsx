// Barra de navegación inferior — SOLO celular (bajo `md`).
//
// POR QUÉ EXISTE: la navegación del Header es `hidden md:flex`, así que bajo 768px no
// había NINGUNA forma de llegar a Marketplace, Publicar ni Consulta de placa salvo
// adivinando la URL o volviendo al inicio por el logo. El público del producto navega en
// celulares de gama baja (AGENTS.md §1): para ellos el sitio era prácticamente un
// callejón sin salida.
//
// DECISIONES QUE NO SE PUEDEN PERDER AL TOCAR ESTE ARCHIVO:
//
//  1. **Tres entradas, no cuatro.** Precios queda fuera a propósito: el saldo de tokens
//     del Header ya enlaza ahí. Con cuatro entradas las etiquetas no entran a 320px.
//  2. **Destinos `<Link>`, no `div` con onClick.** Se abren en pestaña nueva, se navegan
//     con teclado y el prefetch de Next funciona.
//  3. **La ruta activa se marca dos veces**: en color (para quien ve) y con
//     `aria-current="page"` (para quien escucha).
//  4. **El alto vive en `--alto-barra-movil`** (src/app/globals.css), la misma variable
//     que usa `.espacio-barra-movil` para reservar el hueco al final de la página. Si se
//     cambia el alto acá y no allá, la barra tapa el pie.
//  5. **Sin librerías de iconos**: SVG en línea, como el resto del repo.

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type PropsIcono = { className?: string };

// Iconos: trazo de 1.75 para que se lean en pantallas de baja densidad.
function IconoAuto({ className }: PropsIcono) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M4 16.5V11l1.9-4.3A2 2 0 0 1 7.7 5.5h8.6a2 2 0 0 1 1.8 1.2L20 11v5.5" />
      <path d="M2.8 11h18.4" />
      <circle cx="7.5" cy="16.5" r="1.7" />
      <circle cx="16.5" cy="16.5" r="1.7" />
    </svg>
  );
}

function IconoPublicar({ className }: PropsIcono) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8.3v7.4M8.3 12h7.4" />
    </svg>
  );
}

function IconoLupa({ className }: PropsIcono) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="10.8" cy="10.8" r="6" />
      <path d="m20 20-4.7-4.7" />
    </svg>
  );
}

const RUTA_PUBLICAR = "/marketplace/publicar";

type Entrada = {
  href: string;
  /** Etiqueta visible. Corta a propósito: a 320px cada entrada mide ~106px. */
  etiqueta: string;
  /** Nombre accesible. Debe CONTENER la etiqueta visible (WCAG 2.5.3, control por voz). */
  etiquetaAccesible: string;
  icono: (props: PropsIcono) => React.ReactElement;
  esActiva: (ruta: string) => boolean;
};

const ENTRADAS: Entrada[] = [
  {
    href: "/marketplace",
    etiqueta: "Marketplace",
    etiquetaAccesible: "Marketplace, autos en venta",
    icono: IconoAuto,
    // Todo /marketplace/* cuenta como "estoy en el market" (detalle de anuncio,
    // referencias, mis publicaciones), menos Publicar, que tiene entrada propia.
    esActiva: (ruta) => ruta.startsWith("/marketplace") && !ruta.startsWith(RUTA_PUBLICAR),
  },
  {
    href: RUTA_PUBLICAR,
    etiqueta: "Publicar",
    etiquetaAccesible: "Publicar mi auto",
    icono: IconoPublicar,
    esActiva: (ruta) => ruta.startsWith(RUTA_PUBLICAR),
  },
  {
    href: "/consultar",
    etiqueta: "Consulta",
    etiquetaAccesible: "Consulta de placa",
    icono: IconoLupa,
    esActiva: (ruta) => ruta === "/consultar" || ruta.startsWith("/consultar/"),
  },
];

export function BarraNavegacionMovil() {
  const ruta = usePathname() || "/";

  return (
    <nav
      data-barra-movil
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      <ul className="mx-auto flex max-w-md">
        {ENTRADAS.map((entrada) => {
          const activa = entrada.esActiva(ruta);
          const Icono = entrada.icono;
          return (
            <li key={entrada.href} className="min-w-0 flex-1">
              <Link
                href={entrada.href}
                aria-label={entrada.etiquetaAccesible}
                aria-current={activa ? "page" : undefined}
                // El alto completo de la barra es el área táctil: nadie tiene que
                // apuntarle al ícono.
                className={`relative flex h-[var(--alto-barra-movil)] flex-col items-center justify-center gap-1 px-0.5 transition-colors ${
                  activa ? "text-blue-600" : "text-slate-500 active:text-slate-800"
                }`}
              >
                {/* Barrita superior de la entrada activa: refuerza el color para quien
                    no distingue bien azul de gris a plena luz. */}
                {activa && (
                  <span
                    aria-hidden
                    className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-brand-gradient"
                  />
                )}
                <Icono className="h-6 w-6 shrink-0" />
                <span
                  data-etiqueta
                  className={`max-w-full truncate text-[11px] leading-none ${
                    activa ? "font-bold" : "font-semibold"
                  }`}
                >
                  {entrada.etiqueta}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
