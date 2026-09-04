// Organización por PANTALLAS. El sitio tiene tres "mundos":
//
//   1. Landing (`/`)      — el front inicial: elige a dónde ir. Chooser limpio.
//   2. Verificar (`/verificar…`) — consulta de datos del vehículo por placa.
//   3. Marketplace (todo lo demás) — comprar, vender, servicios, garage, intereses…
//
// El mundo 3 lleva el chrome completo (Header con su nav, Footer, barra de celular,
// widget de chat). Los mundos 1 y 2 NO: cada uno tiene su propia barra mínima, para
// que "entrar a la landing y desde ahí ir al market o solo a consultar" se lea claro.

const PREFIJOS_AISLADOS = ["/verificar"];

// True en `/verificar…` — superficie propia de la consulta, sin chrome del marketplace.
export function esRutaVerificar(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return PREFIJOS_AISLADOS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

// True en la landing (`/` exacta) — el chooser inicial, también sin chrome del market.
export function esLanding(pathname: string | null | undefined): boolean {
  return pathname === "/";
}

// True donde NO se debe pintar el chrome del marketplace (Header/Footer/barra/chat).
export function sinChromeMarketplace(pathname: string | null | undefined): boolean {
  return esLanding(pathname) || esRutaVerificar(pathname);
}

// Alias histórico (lo usaba `ChromeSlot` antes de sumar la landing).
export const esRutaAislada = esRutaVerificar;
