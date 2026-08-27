"use client";

// Interruptor claro / oscuro. Escribe `data-theme` en <html> y lo persiste en
// `localStorage.tema`; el no-flash de `layout.tsx` lo relee en el próximo arranque.
//
// Estados del sistema de diseño (globals.css): sin `data-theme` → manda
// `prefers-color-scheme`. Este botón solo alterna entre las dos elecciones
// EXPLÍCITAS ("light"/"dark"); no expone un "auto" (control simple, a un toque).
//
// Lectura del tema sin romper la hidratación: `useSyncExternalStore` — el
// snapshot de servidor es "light" y el del cliente sale del DOM/`matchMedia`;
// React reconcilia la diferencia post-hidratación sin warning (mismo patrón que
// `Header.tsx` para el estado de sesión). Nada de `setState` dentro de un efecto.

import { useSyncExternalStore } from "react";

type Tema = "light" | "dark";

function suscribir(alCambiar: () => void) {
  window.addEventListener("tema-cambiado", alCambiar);
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", alCambiar);
  return () => {
    window.removeEventListener("tema-cambiado", alCambiar);
    mq.removeEventListener("change", alCambiar);
  };
}

function leerTema(): Tema {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "light" || attr === "dark") return attr;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const tema = useSyncExternalStore<Tema>(suscribir, leerTema, () => "light");
  const esOscuro = tema === "dark";

  function alternar() {
    const siguiente: Tema = esOscuro ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", siguiente);
    try {
      localStorage.setItem("tema", siguiente);
    } catch {
      /* storage bloqueado (navegación privada): vale solo esta sesión */
    }
    window.dispatchEvent(new Event("tema-cambiado"));
  }

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={esOscuro ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      title={esOscuro ? "Tema claro" : "Tema oscuro"}
      className={className}
    >
      {esOscuro ? (
        // Sol: estás en oscuro, el clic te lleva a claro.
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        // Luna: estás en claro, el clic te lleva a oscuro.
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  );
}
