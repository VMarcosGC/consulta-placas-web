// Helpers del perfil de vendedor (M5 / TASK-001): presentación + la lectura del perfil
// propio con su clasificación de estados.
//
// El backend sigue siendo la autoridad: `normalizar_telefono_ec` valida y normaliza a
// E.164 sin `+`, y devuelve 422 con un mensaje accionable si el número no calza. Estos
// helpers solo evitan que el usuario tenga que hacer un viaje al servidor para enterarse
// de algo que ya sabemos en el formulario; el 422 se maneja igual por si llega.
//
// NO se arma aquí ningún enlace de WhatsApp: `whatsapp_url` viene del backend y se usa
// tal cual (AGENTS §1.0.2 — la API debe bastarle a un cliente que no sea esta web).

import { obtenerMiPerfilVendedor } from "./api";
import { ApiError, type VendedorPerfilSalida } from "@/types/api";

// Mismo mensaje de ayuda que el backend, para que el usuario lea lo mismo lo valide quien
// lo valide.
export const AYUDA_TELEFONO =
  "Ingresa un celular ecuatoriano: 10 dígitos que empiezan con 09 (ej. 0987654321) " +
  "o el formato internacional 593 + 9 dígitos (ej. 593987654321).";

// Copy del backend cuando falta el nombre público (opt-in explícito de PII).
export const AYUDA_NOMBRE_PUBLICO =
  "Para publicar tu número, dinos también con qué nombre quieres que te vean los compradores.";

// ¿El texto tecleado parece un celular ecuatoriano aceptable? Espeja las dos formas que
// admite el backend: 09XXXXXXXX (10 dígitos) y 5939XXXXXXXX (E.164 sin `+`).
// Los convencionales (02…, 07…) quedan fuera a propósito: el canal es WhatsApp.
export function telefonoPareceValido(valor: string): boolean {
  const texto = valor.trim();
  if (!texto) return false;
  // Solo separadores de tecleo; una letra es casi siempre un error real, no ruido.
  if (!/^[0-9 +\-().]+$/.test(texto)) return false;
  const digitos = texto.replace(/\D/g, "");
  if (digitos.length === 10 && digitos.startsWith("09")) return true;
  return digitos.length === 12 && digitos.startsWith("5939");
}

// Muestra el número guardado (E.164 sin `+`, ej. 593987654321) de forma legible:
// "+593 98 765 4321". Es presentación pura; el valor que viaja a la API nunca se toca.
export function telefonoLegible(telefono: string): string {
  const d = telefono.replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("593")) {
    const local = d.slice(3); // 9XXXXXXXX
    return `+593 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5)}`;
  }
  return telefono;
}

// ── Lectura del perfil propio, con el 404-onboarding resuelto en UN solo lugar ────────
//
// `GET /marketplace/vendedor/mi-perfil` responde **404 mientras la cuenta no tenga
// perfil**, porque el perfil nace con el PATCH. Ese 404 es un ESTADO DE ONBOARDING, no
// un fallo, y es la única ruta del proyecto donde 404 no significa "no existe o no es
// tuyo". Para que ningún consumidor lo interprete distinto, la traducción vive acá:
// `sin_perfil` (formulario vacío) queda separado de `fallo` (red caída, 5xx, etc.), que
// sí merece un mensaje de error y un reintento.
//
// Un fallo de red no llega como ApiError (fetch rechaza con TypeError), así que cae en el
// `else` final sin poder confundirse con el 404.

export type PerfilVendedorCargado =
  | { tipo: "perfil"; perfil: VendedorPerfilSalida }
  | { tipo: "sin_perfil" }
  | { tipo: "sesion_expirada" }
  | { tipo: "fallo" };

export async function cargarPerfilVendedor(): Promise<PerfilVendedorCargado> {
  try {
    return { tipo: "perfil", perfil: await obtenerMiPerfilVendedor() };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return { tipo: "sin_perfil" };
    if (err instanceof ApiError && err.status === 401) return { tipo: "sesion_expirada" };
    return { tipo: "fallo" };
  }
}

// ── Aviso de "el perfil cambió", para los que lo muestran fuera de su página ──────────
//
// Mismo patrón que "sesion-cambiada" en `lib/auth.ts`: el Header no se vuelve a montar al
// navegar entre páginas, así que si el vendedor guarda su número el aviso del menú se
// quedaría desactualizado hasta un refresh completo. Quien guarda avisa; quien muestra
// se resuscribe y vuelve a leer.

const EVENTO_PERFIL_VENDEDOR = "perfil-vendedor-cambiado";

export function notificarPerfilVendedorCambiado(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENTO_PERFIL_VENDEDOR));
}

export function suscribirPerfilVendedor(alCambiar: () => void): () => void {
  window.addEventListener(EVENTO_PERFIL_VENDEDOR, alCambiar);
  return () => window.removeEventListener(EVENTO_PERFIL_VENDEDOR, alCambiar);
}
