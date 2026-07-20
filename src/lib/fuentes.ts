// Stand-by de fuentes (M2.5). La web solo muestra las fuentes que hoy entregan datos
// sin captcha: ANT y AMT/EPMTSD (worker con IP residencial). SRI y FGE quedan fuera de
// la UI —incluidas sus tarjetas passthrough y sus enlaces oficiales— porque su portal
// exige un captcha que no podemos resolver y mostrarlas solo genera expectativa vacía.
//
// El backend NO se toca: `consultar_sri` y `consultar_fiscalia` siguen vivos y dormidos
// (ver AGENTS.md §8). Esto es una decisión de PRESENTACIÓN, reversible sin redeploy:
// basta cambiar la variable de entorno y reiniciar/rebuildear.
//
//   NEXT_PUBLIC_FUENTES_INACTIVAS="sri,fge"   → default (stand-by vigente)
//   NEXT_PUBLIC_FUENTES_INACTIVAS=""          → reactiva TODAS las fuentes
//   NEXT_PUBLIC_FUENTES_INACTIVAS="fge"       → reactiva solo SRI
//
// Nota: en Next.js las `NEXT_PUBLIC_*` se inlinean en build, por eso la variable se lee
// literal (no por índice dinámico) una sola vez a nivel de módulo.

const DEFAULT_INACTIVAS = "sri,fge";

// Claves normalizadas a minúsculas para comparar sin importar cómo las escriba el backend
// (el catálogo de fuentes usa "SRI", "FGE", "ANT", "AMT", "EPMTSD", "ConsultasEcuador").
const crudo = process.env.NEXT_PUBLIC_FUENTES_INACTIVAS ?? DEFAULT_INACTIVAS;

export const FUENTES_INACTIVAS: ReadonlySet<string> = new Set(
  crudo
    .split(",")
    .map((c) => c.trim().toLowerCase())
    .filter((c) => c.length > 0)
);

// True si la fuente está en stand-by y NO debe aparecer en ninguna parte de la UI.
export function fuenteInactiva(clave: string): boolean {
  return FUENTES_INACTIVAS.has(clave.trim().toLowerCase());
}

// Inversa, para leer más natural en los renders condicionales.
export function fuenteActiva(clave: string): boolean {
  return !fuenteInactiva(clave);
}
