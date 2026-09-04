// Envoltura que OCULTA el chrome del marketplace (Header con su nav, Footer, barra de
// navegación de celular, widget de chat) en la LANDING (`/`) y en `/verificar…`. Cada
// una de esas pantallas trae su propia barra mínima; el chrome del market solo va
// dentro del market. Ver `lib/rutas.ts`.
//
// Los componentes hijos igual se renderizan en el servidor; acá solo se decide si su
// salida entra o no en el árbol del cliente.

"use client";

import { usePathname } from "next/navigation";
import { sinChromeMarketplace } from "@/lib/rutas";

export function ChromeSlot({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (sinChromeMarketplace(pathname)) return null;
  return <>{children}</>;
}
