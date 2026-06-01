// Cliente de la API FastAPI. Wrapper minimo sobre fetch.
// El token JWT se lee del localStorage si esta disponible (auth.ts).

import {
  ApiError,
  ConsultaPlacaRespuesta,
  FeedMarketplace,
  FuenteRespuesta,
  PublicacionCrear,
  PublicacionInterna,
  PublicacionReferenciada,
  ReferenciaCrear,
  Token,
  Usuario,
  Vehiculo,
  VehiculoConsolidado,
  VehiculoCrear,
} from "@/types/api";
import { obtenerToken } from "./auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// Normaliza el cuerpo de error de FastAPI a un texto legible. `detail` puede ser:
//   - string (errores de negocio: 402/404/409…)
//   - array de objetos {loc, msg, type} (errores de validación 422 de Pydantic)
// Sin esto, un 422 se renderizaba como "[object Object]".
function mensajeError(body: unknown, status: number): string {
  if (typeof body === "string" && body) return body;
  if (typeof body === "object" && body && "detail" in body) {
    const detail = (body as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      const msgs = detail
        .map((d) =>
          typeof d === "object" && d && "msg" in d
            ? String((d as { msg: unknown }).msg)
            : null
        )
        .filter(Boolean);
      if (msgs.length) return msgs.join(". ");
    }
  }
  return `Error ${status}`;
}

async function fetchAPI<T>(
  ruta: string,
  init: RequestInit = {},
  requiereAuth = false
): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body && typeof init.body === "string") {
    headers.set("Content-Type", "application/json");
  }
  if (requiereAuth) {
    const token = obtenerToken();
    if (!token) throw new ApiError(401, "Sesion no iniciada");
    headers.set("Authorization", `Bearer ${token}`);
  }

  const respuesta = await fetch(`${BASE_URL}${ruta}`, { ...init, headers });

  if (!respuesta.ok) {
    let body: unknown;
    try {
      body = await respuesta.json();
    } catch {
      body = await respuesta.text();
    }
    throw new ApiError(respuesta.status, mensajeError(body, respuesta.status), body);
  }

  if (respuesta.status === 204) return undefined as T;
  return respuesta.json();
}

// ─── Publicos ─────────────────────────────────────────────

export function consultarPlaca(placa: string) {
  return fetchAPI<ConsultaPlacaRespuesta>(
    `/consultar/${encodeURIComponent(placa)}`
  );
}

// Perfil consolidado orientado a la entidad (secciones temáticas + estado_fuentes).
// Auth OPCIONAL: si hay token, se envía para que el backend revele los microdesbloqueos
// que el usuario ya pagó para esta placa. Sin token → teaser (todo gateado).
export function consultarPerfil(placa: string) {
  const token = obtenerToken();
  return fetchAPI<VehiculoConsolidado>(
    `/consultar/${encodeURIComponent(placa)}/perfil`,
    token ? { headers: { Authorization: `Bearer ${token}` } } : {}
  );
}

// Desbloquea un producto del catálogo para esta placa (cobra tokens). Requiere sesión.
// Devuelve el perfil ya con la sección revelada. 402 si no alcanza el saldo; 409 si el
// dato no está disponible para esa placa.
export function desbloquearProducto(placa: string, codigo: string) {
  return fetchAPI<VehiculoConsolidado>(
    `/consultar/${encodeURIComponent(placa)}/desbloquear/${codigo}`,
    { method: "POST" },
    true
  );
}

// Fuerza un nuevo intento de una fuente del worker híbrido (AMT/FGE) que quedó
// en error_fuente. Reencola el trabajo; el polling normal recoge el resultado.
export function reintentarFuente(identificador: string, fuente: "AMT" | "FGE") {
  return fetchAPI<FuenteRespuesta>(
    `/consultar/${encodeURIComponent(identificador)}/reintentar/${fuente}`,
    { method: "POST" }
  );
}

// ─── Auth ─────────────────────────────────────────────────

export function registrarUsuario(datos: {
  email: string;
  password: string;
  nombre?: string;
}) {
  return fetchAPI<Usuario>("/auth/registro", {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

export function iniciarSesion(email: string, password: string) {
  const body = new URLSearchParams({ username: email, password }).toString();
  return fetchAPI<Token>("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
}

export function obtenerPerfil() {
  return fetchAPI<Usuario>("/auth/me", {}, true);
}

// ─── Vehiculos (auth) ─────────────────────────────────────

export function listarVehiculos() {
  return fetchAPI<Vehiculo[]>("/vehiculos", {}, true);
}

export function crearVehiculo(datos: VehiculoCrear) {
  return fetchAPI<Vehiculo>(
    "/vehiculos",
    { method: "POST", body: JSON.stringify(datos) },
    true
  );
}

export function eliminarVehiculo(id: number) {
  return fetchAPI<void>(`/vehiculos/${id}`, { method: "DELETE" }, true);
}

// ─── Marketplace ──────────────────────────────────────────

// Feed público mixto: premium destacados, light, y referenciados externos.
export function obtenerFeedMarketplace() {
  return fetchAPI<FeedMarketplace>("/marketplace/feed");
}

// Publica un vehículo. plan="premium" debita tokens (402 si no alcanza el saldo).
export function crearPublicacion(datos: PublicacionCrear) {
  return fetchAPI<PublicacionInterna>(
    "/marketplace/publicaciones",
    { method: "POST", body: JSON.stringify(datos) },
    true
  );
}

export function listarMisPublicaciones() {
  return fetchAPI<PublicacionInterna[]>("/marketplace/publicaciones/mias", {}, true);
}

export function eliminarPublicacion(id: number) {
  return fetchAPI<void>(
    `/marketplace/publicaciones/${id}`,
    { method: "DELETE" },
    true
  );
}

// El dueño solicita la verificación "Verificado por la plataforma" de su publicación
// premium (cobra tokens). 402 si no alcanza; 422 si la publicación no es premium.
export function solicitarVerificacion(id: number) {
  return fetchAPI<PublicacionInterna>(
    `/marketplace/publicaciones/${id}/solicitar-verificacion`,
    { method: "POST" },
    true
  );
}

// ─── Referencias externas aportadas por el usuario ────────

// Aporta una referencia (link externo + datos). Es gratis. Entra en moderación
// "pendiente": no aparece en el feed hasta que un admin la apruebe.
export function crearReferencia(datos: ReferenciaCrear) {
  return fetchAPI<PublicacionReferenciada>(
    "/marketplace/referencias",
    { method: "POST", body: JSON.stringify(datos) },
    true
  );
}

export function listarMisReferencias() {
  return fetchAPI<PublicacionReferenciada[]>(
    "/marketplace/referencias/mias",
    {},
    true
  );
}

export function eliminarReferencia(id: number) {
  return fetchAPI<void>(
    `/marketplace/referencias/${id}`,
    { method: "DELETE" },
    true
  );
}

// ─── Moderación de referencias (solo admin) ───────────────

// Cola de referencias pendientes de aprobar. 403 si el usuario no es admin.
export function listarReferenciasPendientes() {
  return fetchAPI<PublicacionReferenciada[]>(
    "/marketplace/referencias/pendientes",
    {},
    true
  );
}

// Aprueba o rechaza una referencia. 403 si no es admin.
export function moderarReferencia(id: number, decision: "aprobada" | "rechazada") {
  return fetchAPI<PublicacionReferenciada>(
    `/marketplace/referencias/${id}/moderar`,
    { method: "POST", body: JSON.stringify({ decision }) },
    true
  );
}

// ─── Verificación de publicaciones premium (solo admin) ───

// Cola de publicaciones premium pendientes de verificación. 403 si no es admin.
export function listarPublicacionesPendientesVerificacion() {
  return fetchAPI<PublicacionInterna[]>(
    "/marketplace/publicaciones/pendientes-verificacion",
    {},
    true
  );
}

// Marca una publicación premium como verificada o rechazada. 403 si no es admin.
export function verificarPublicacion(id: number, decision: "verificado" | "rechazado") {
  return fetchAPI<PublicacionInterna>(
    `/marketplace/publicaciones/${id}/verificar`,
    { method: "POST", body: JSON.stringify({ decision }) },
    true
  );
}
