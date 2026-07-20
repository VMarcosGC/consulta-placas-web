// Cliente de la API FastAPI. Wrapper minimo sobre fetch.
// El token JWT se lee del localStorage si esta disponible (auth.ts).

import {
  ApiError,
  CloudinaryError,
  ConsultaPlacaRespuesta,
  FeedMarketplace,
  FichaActualizar,
  FichaSalida,
  FirmaSubida,
  FotoRegistrar,
  FotoSalida,
  FuenteRespuesta,
  PublicacionCrear,
  PublicacionDetalle,
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

// Detalle público de una publicación (anuncio + ficha técnica). Sin sesión.
// 404 si no existe o no está activa.
export function obtenerPublicacionDetalle(id: number) {
  return fetchAPI<PublicacionDetalle>(`/marketplace/publicaciones/${id}`);
}

// Detalle de MI publicación en cualquier estado, incluido `borrador` (M2.8).
// Lo usan los editores de ficha y de fotos para prellenar: el endpoint público solo
// sirve publicaciones `activa`, así que sin esto un borrador (o una pausada) no se
// podría terminar de completar. 404 si no es tuya.
export function obtenerMiPublicacionDetalle(id: number) {
  return fetchAPI<PublicacionDetalle>(
    `/marketplace/publicaciones/${id}/mia`,
    {},
    true
  );
}

// Publica un borrador (borrador → activa). El backend valida el umbral de ficha
// (422 con copy es-EC si no llega) y es donde se cobra el plan premium.
export function publicarBorrador(id: number) {
  return fetchAPI<PublicacionInterna>(
    `/marketplace/publicaciones/${id}`,
    { method: "PATCH", body: JSON.stringify({ estado: "activa" }) },
    true
  );
}

// Actualiza la ficha técnica (solo el dueño). Guardado parcial: se envía SOLO el
// bloque editado; los demás se omiten para no tocarlos. Es gratis (no cobra tokens).
// 404 si la publicación no es tuya.
export function actualizarFichaPublicacion(id: number, ficha: FichaActualizar) {
  return fetchAPI<FichaSalida>(
    `/marketplace/publicaciones/${id}/ficha`,
    { method: "PATCH", body: JSON.stringify(ficha) },
    true
  );
}

// ─── Fotos de la publicación (M2) ─────────────────────────────────────────
// Flujo: 1) pedir firma al backend, 2) subir el archivo DIRECTO a Cloudinary,
// 3) registrar la URL devuelta. Solo el dueño. 503 si Cloudinary no está configurado.

// 1) Firma de subida (solo el dueño). 503 si el backend no tiene Cloudinary configurado.
export function firmarSubidaFoto(id: number) {
  return fetchAPI<FirmaSubida>(
    `/marketplace/publicaciones/${id}/fotos/firma`,
    { method: "POST" },
    true
  );
}

// 2) Sube el archivo DIRECTO a Cloudinary (host externo, no nuestro backend) y devuelve
// la `secure_url`. No usa el wrapper fetchAPI (que apunta al backend).
export async function subirACloudinary(firma: FirmaSubida, archivo: File): Promise<string> {
  const form = new FormData();
  form.append("file", archivo);
  form.append("api_key", firma.api_key);
  form.append("timestamp", String(firma.timestamp));
  form.append("signature", firma.signature);
  form.append("folder", firma.folder);

  const url = `https://api.cloudinary.com/v1_1/${firma.cloud_name}/image/upload`;
  let respuesta: Response;
  try {
    respuesta = await fetch(url, { method: "POST", body: form });
  } catch {
    throw new CloudinaryError("No pudimos conectar con el servicio de imágenes. Revisa tu conexión.");
  }
  if (!respuesta.ok) {
    // CloudinaryError (no ApiError): su status HTTP no debe interpretarse como el del backend.
    let detalle = "No pudimos subir la imagen. Intenta de nuevo.";
    try {
      const body = await respuesta.json();
      detalle = body?.error?.message || detalle;
    } catch {
      /* respuesta no-JSON: dejamos el mensaje genérico */
    }
    throw new CloudinaryError(detalle);
  }
  const datos = (await respuesta.json()) as { secure_url?: string };
  if (!datos.secure_url) throw new CloudinaryError("El servicio de imágenes no devolvió una URL válida.");
  return datos.secure_url;
}

// 3) Registra la URL ya subida en nuestro backend (solo el dueño).
// 400 si la URL no es de nuestro cloud; 409 si ya hay 12 fotos.
export function registrarFoto(id: number, datos: FotoRegistrar) {
  return fetchAPI<FotoSalida>(
    `/marketplace/publicaciones/${id}/fotos`,
    { method: "POST", body: JSON.stringify(datos) },
    true
  );
}

// Nuevo orden de la galería: lista de foto_id en la secuencia deseada. 422 si no calza
// exactamente con las fotos de la publicación. Devuelve la lista ya reordenada.
export function reordenarFotos(id: number, ordenIds: number[]) {
  return fetchAPI<FotoSalida[]>(
    `/marketplace/publicaciones/${id}/fotos/orden`,
    { method: "PATCH", body: JSON.stringify({ orden: ordenIds }) },
    true
  );
}

export function eliminarFoto(id: number, fotoId: number) {
  return fetchAPI<void>(
    `/marketplace/publicaciones/${id}/fotos/${fotoId}`,
    { method: "DELETE" },
    true
  );
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

// Firma para subir una foto de referencia a Cloudinary (M2.8). Mismo flujo que las
// fotos de publicación: firma → subida directa → la URL viaja en el alta/edición.
// Carpeta propia por usuario (la referencia aún no tiene id). 503 sin Cloudinary.
export function firmarSubidaFotoReferencia() {
  return fetchAPI<FirmaSubida>(
    "/marketplace/referencias/firma-foto",
    { method: "POST" },
    true
  );
}

// Aporta una referencia (link externo + datos). Es gratis. Entra en moderación
// "pendiente": no aparece en el feed hasta que un admin la apruebe.
export function crearReferencia(datos: ReferenciaCrear) {
  return fetchAPI<PublicacionReferenciada>(
    "/marketplace/referencias",
    { method: "POST", body: JSON.stringify(datos) },
    true
  );
}

// Detalle público de una referencia externa (M2.9). Alimenta la página LOCAL
// /marketplace/referencias/{id}: el visitante ve fotos y detalle antes de decidir salir
// al portal de origen. Solo sirve aprobadas y activas; si no, 404.
export function obtenerReferenciaDetalle(id: number) {
  return fetchAPI<PublicacionReferenciada>(`/marketplace/referencias/${id}`);
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
