// Helper para persistir el JWT en localStorage. Solo cliente.
// Patron simple — sin SSR para reducir complejidad del MVP.

const CLAVE = "consulta_placas_token";

// Notifica a los suscriptores del MISMO tab que la sesión cambió. El evento
// "storage" del navegador solo se dispara en OTRAS pestañas, así que sin esto el
// Header no se entera de un login/logout hecho en esta misma pestaña (y parece
// que seguís deslogueado tras iniciar sesión).
function notificarCambioSesion(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("sesion-cambiada"));
}

export function guardarToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CLAVE, token);
  notificarCambioSesion();
}

export function obtenerToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(CLAVE);
}

export function cerrarSesion(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CLAVE);
  notificarCambioSesion();
}

export function tieneSesion(): boolean {
  return obtenerToken() !== null;
}
