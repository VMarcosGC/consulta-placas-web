// Envoltura que OCULTA el chrome del sitio (Header, Footer, barra de navegación de
// celular, widget de chat) en las rutas aisladas — hoy `/verificar` (consulta de datos).
//
// Los componentes hijos igual se renderizan en el servidor; acá solo se decide si su
// salida entra o no en el árbol del cliente. Es barato y centraliza la lista de rutas
// aisladas en un solo lugar (`lib/rutas.ts`).

"use client";

import { usePathname } from "next/navigation";
import { esRutaAislada } from "@/lib/rutas";

export function ChromeSlot({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (esRutaAislada(pathname)) return null;
  return <>{children}</>;
}
