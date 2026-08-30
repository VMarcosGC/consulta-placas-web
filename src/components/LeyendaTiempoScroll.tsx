// Leyenda flotante de "¿en qué momento del feed estoy?" — como el encabezado de fecha
// de Facebook Marketplace. Aparece MIENTRAS te desplazas y se desvanece al parar.
//
// No necesita saber nada del feed: lee los elementos con `[data-fecha]` que haya en la
// página (las tarjetas los marcan) y muestra la cubeta de tiempo de la tarjeta que está
// a la altura de lectura (~120px del borde superior del viewport).

"use client";

import { useEffect, useRef, useState } from "react";
import { cubetaTiempo } from "@/lib/tiempoRelativo";

const LINEA_LECTURA = 120; // px desde el tope del viewport
const OCULTAR_TRAS = 1200; // ms sin scroll → se desvanece
const MIN_TARJETAS = 5; // por debajo de esto no vale la pena

export function LeyendaTiempoScroll({
  selector = "[data-fecha]",
  scrollTarget,
}: {
  selector?: string;
  /** Elemento que emite `scroll` (p. ej. el contenedor del reel). Por defecto, window. */
  scrollTarget?: HTMLElement | null;
}) {
  const [etiqueta, setEtiqueta] = useState("");
  const [visible, setVisible] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafPend = useRef(false);

  useEffect(() => {
    const objetivo: HTMLElement | Window = scrollTarget ?? window;

    function calcular() {
      rafPend.current = false;
      const nodos = document.querySelectorAll<HTMLElement>(selector);
      if (nodos.length < MIN_TARJETAS) {
        setVisible(false);
        return;
      }
      // La tarjeta "que estoy leyendo" = la última cuya parte superior ya pasó la
      // línea de lectura; si ninguna pasó (estoy arriba del todo), la primera.
      let elegida: HTMLElement | null = null;
      for (const n of nodos) {
        if (n.getBoundingClientRect().top <= LINEA_LECTURA) elegida = n;
        else break;
      }
      elegida = elegida ?? nodos[0];
      const cubeta = cubetaTiempo(elegida.dataset.fecha);
      if (!cubeta) {
        setVisible(false);
        return;
      }
      setEtiqueta(cubeta);
      setVisible(true);
      if (timeout.current) clearTimeout(timeout.current);
      timeout.current = setTimeout(() => setVisible(false), OCULTAR_TRAS);
    }

    function onScroll() {
      if (rafPend.current) return;
      rafPend.current = true;
      requestAnimationFrame(calcular);
    }

    objetivo.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      objetivo.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (timeout.current) clearTimeout(timeout.current);
    };
  }, [selector, scrollTarget]);

  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed left-1/2 z-[60] -translate-x-1/2 transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      style={{ top: "calc(env(safe-area-inset-top) + 64px)" }}
    >
      <span className="rounded-full bg-tinta/85 px-3.5 py-1.5 text-xs font-bold text-lienzo shadow-lg backdrop-blur">
        {etiqueta}
      </span>
    </div>
  );
}
