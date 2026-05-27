// Helper para persistir el JWT en localStorage. Solo cliente.
// Patron simple — sin SSR para reducir complejidad del MVP.

const CLAVE = "consulta_placas_token";

export function guardarToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CLAVE, token);
}

export function obtenerToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(CLAVE);
}

export function cerrarSesion(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CLAVE);
}

export function tieneSesion(): boolean {
  return obtenerToken() !== null;
}
