// Cliente de la API FastAPI. Wrapper minimo sobre fetch.
// El token JWT se lee del localStorage si esta disponible (auth.ts).

import {
  ApiError,
  CloudinaryError,
  CalificacionCrear,
  CalificacionesVendedor,
  ContactoVendedorSalida,
  ServicioCrear,
  ServicioSalida,
  DistribucionGeografica,
  Favorito,
  FavoritoCrear,
  FeedMarketplace,
  FichaActualizar,
  FichaSalida,
  FiltrosBusqueda,
  FirmaSubida,
  FotoRegistrar,
  FotoSalida,
  FuenteRespuesta,
  GastoCrear,
  GastoSalida,
  GastosVehiculo,
  GoogleLoginEntrada,
  MantenimientoCrear,
  MantenimientoSalida,
  PlanCuidado,
  MiPresencia,
  PresenciaActualizar,
  PresenciaCrear,
  PresenciaSalida,
  PuntoEncuentro,
  PuntoEncuentroDetalle,
  CitaCrear,
  CitaActualizar,
  CitaSalida,
  RespuestaNegocio,
  PublicacionActualizar,
  PublicacionCrear,
  PublicacionDetalle,
  PublicacionInterna,
  PublicacionReferenciada,
  ReferenciaActualizar,
  ReferenciaCrear,
  ResultadoBusqueda,
  Token,
  Usuario,
  Vehiculo,
  VehiculoConsolidado,
  VehiculoCrear,
  VendedorActualizar,
  VendedorPerfilSalida,
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

// NOTA: aquí vivía `consultarPlaca()`, que pegaba a `GET /consultar/{placa}` (la vista
// por fuente). Se eliminó al quitar el disparo desde el wizard de publicación: ese era su
// único llamador y ese endpoint **dispara scraping** (Playwright contra ANT + encolado de
// AMT/EPMTSD). Si algún día hace falta consultar de verdad, se usa `consultarPerfil` sin
// `soloCache`, que es lo que ya hacen `/consultar/[placa]` y `PerfilVehiculo` — los dos
// únicos lugares donde el usuario pidió la consulta explícitamente.

// Perfil consolidado orientado a la entidad (secciones temáticas + estado_fuentes).
// Auth OPCIONAL: si hay token, se envía tal cual (el backend decide qué revela). La
// consulta por placa es gratuita: sin token igual devuelve las secciones públicas.
export function consultarPerfil(
  placa: string,
  opciones: { soloCache?: boolean } = {}
) {
  const token = obtenerToken();
  const query = opciones.soloCache ? "?solo_cache=true" : "";
  return fetchAPI<VehiculoConsolidado>(
    `/consultar/${encodeURIComponent(placa)}/perfil${query}`,
    token ? { headers: { Authorization: `Bearer ${token}` } } : {}
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

// ─── Ingreso con Google (TASK-015) ────────────────────────
// El `credential` de Google Identity Services se canjea por el JWT propio del proyecto.
// El frontend NO decodifica ese token: lo reenvía tal cual y el backend lo verifica,
// lo usa y lo descarta.

// Canjea el ID token de Google por nuestro JWT. Anónimo. La respuesta es el MISMO
// schema `Token` que `/auth/login`, así que a partir de acá la sesión se maneja igual
// (guardarToken + redirección): el frontend no distingue de dónde salió el JWT.
//
// Códigos del contrato: 401 credencial inválida · 409 el correo ya tiene cuenta local y
// el dominio no es autoritativo (la salida es entrar con contraseña y vincular desde
// /mi-cuenta) · 422 claims insuficientes · 503 el backend no tiene GOOGLE_CLIENT_ID.
export function iniciarSesionConGoogle(idToken: string) {
  const cuerpo: GoogleLoginEntrada = { id_token: idToken };
  return fetchAPI<Token>("/auth/google", {
    method: "POST",
    body: JSON.stringify(cuerpo),
  });
}

// Vincula una cuenta de Google a la sesión YA autenticada. Requiere sesión: autenticarse
// es justamente la prueba de posesión que el claim de correo no da, y por eso esta ruta
// es la salida del 409 de arriba.
//
// Devuelve `UsuarioSalida` (el mismo shape de GET /auth/me). 409 si la cuenta ya está
// vinculada a otra cuenta de Google, o si esa cuenta de Google ya es de otro usuario.
export function vincularGoogle(idToken: string) {
  const cuerpo: GoogleLoginEntrada = { id_token: idToken };
  return fetchAPI<Usuario>(
    "/auth/google/vincular",
    { method: "POST", body: JSON.stringify(cuerpo) },
    true
  );
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

// ─── Garage: mantenimientos (auth, dueño) ─────────────────
export function listarMantenimientos(vehiculoId: number) {
  return fetchAPI<MantenimientoSalida[]>(
    `/vehiculos/${vehiculoId}/mantenimientos`,
    {},
    true
  );
}

export function crearMantenimiento(vehiculoId: number, datos: MantenimientoCrear) {
  return fetchAPI<MantenimientoSalida>(
    `/vehiculos/${vehiculoId}/mantenimientos`,
    { method: "POST", body: JSON.stringify(datos) },
    true
  );
}

export function eliminarMantenimiento(vehiculoId: number, mantenimientoId: number) {
  return fetchAPI<void>(
    `/vehiculos/${vehiculoId}/mantenimientos/${mantenimientoId}`,
    { method: "DELETE" },
    true
  );
}

// ─── Garage: control de gastos (auth, dueño) ──────────────
// El GET trae listado + resumen derivado (total, promedio mensual, desglose por tipo).
export function listarGastos(vehiculoId: number) {
  return fetchAPI<GastosVehiculo>(`/vehiculos/${vehiculoId}/gastos`, {}, true);
}

export function crearGasto(vehiculoId: number, datos: GastoCrear) {
  return fetchAPI<GastoSalida>(
    `/vehiculos/${vehiculoId}/gastos`,
    { method: "POST", body: JSON.stringify(datos) },
    true
  );
}

export function eliminarGasto(vehiculoId: number, gastoId: number) {
  return fetchAPI<void>(
    `/vehiculos/${vehiculoId}/gastos/${gastoId}`,
    { method: "DELETE" },
    true
  );
}

// ─── Garage: plan de cuidado por reglas (auth, dueño) ─────
export function obtenerPlanCuidado(vehiculoId: number, km?: number) {
  const qs = km != null ? `?km=${km}` : "";
  return fetchAPI<PlanCuidado>(
    `/vehiculos/${vehiculoId}/plan-cuidado${qs}`,
    {},
    true
  );
}

// ─── Favoritos (auth) ─────────────────────────────────────
// El favorito es por PLACA, no por publicación (tabla desacoplada, ver AGENTS §10.4).

export function listarFavoritos() {
  return fetchAPI<Favorito[]>("/favoritos", {}, true);
}

// Guarda una placa. `precio_al_guardar` es la foto del precio de hoy: sin él no se
// puede avisar después de una baja. 409 si la placa ya estaba guardada (idempotente
// desde la vista del usuario: ya es favorita, que es lo que pidió).
export function agregarFavorito(datos: FavoritoCrear) {
  return fetchAPI<Favorito>(
    "/favoritos",
    { method: "POST", body: JSON.stringify(datos) },
    true
  );
}

export function eliminarFavorito(favoritoId: number) {
  return fetchAPI<void>(`/favoritos/${favoritoId}`, { method: "DELETE" }, true);
}

// ─── Marketplace ──────────────────────────────────────────

// Feed público mixto: premium destacados, light, y referenciados externos.
export function obtenerFeedMarketplace() {
  return fetchAPI<FeedMarketplace>("/marketplace/feed");
}

// Búsqueda plana del comprador (MC2): lista filtrable + paginada por cursor. Pública.
// Arma el querystring omitiendo todo param vacío. `cursor` se reenvía tal cual el
// `siguiente_cursor` de la página previa. Códigos del contrato: 400 cursor corrupto,
// 422 param inválido; nunca 500. `siguiente_cursor: null` = ya no hay más páginas.
export function buscarPublicaciones(filtros: FiltrosBusqueda, cursor?: string) {
  const params = new URLSearchParams();
  const poner = (clave: string, valor: string | number | undefined | null) => {
    if (valor === undefined || valor === null) return;
    const texto = String(valor).trim();
    if (texto === "") return;
    params.set(clave, texto);
  };
  poner("q", filtros.q);
  poner("tipo", filtros.tipo);
  poner("combustible", filtros.combustible);
  poner("transmision", filtros.transmision);
  poner("precio_min", filtros.precio_min);
  poner("precio_max", filtros.precio_max);
  poner("anio_min", filtros.anio_min);
  poner("anio_max", filtros.anio_max);
  poner("provincia", filtros.provincia);
  poner("region", filtros.region);
  poner("cursor", cursor);
  const qs = params.toString();
  return fetchAPI<ResultadoBusqueda>(`/marketplace/buscar${qs ? `?${qs}` : ""}`);
}

// Distribución geográfica de publicaciones activas (portada). Pública, sin sesión.
export function obtenerDistribucionGeografica() {
  return fetchAPI<DistribucionGeografica>("/marketplace/distribucion");
}

// Publica un vehículo. El `plan` (light / premium) se acepta igual, pero publicar es
// gratis: la monetización está suspendida (AGENTS.md §1.0.3).
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

// Edita los datos básicos de una publicación propia (M2.11): título, descripción,
// ciudad, kilometraje y precio. También asciende/baja el plan y cambia el estado.
// Solo el dueño (404 indistinto si no es suya). Es gratis (§1.0.3).
//
// Semántica de "vaciar un campo" (`model_fields_set` en el backend): para `titulo`,
// `descripcion`, `ciudad` y `kilometraje`, OMITIR la clave la deja intacta y enviarla
// en `null` la BORRA. `JSON.stringify` ya descarta las claves `undefined` y conserva las
// `null`, así que el llamador solo tiene que poblar los campos que el vendedor tocó.
// Códigos del contrato: 401 → login · 404 → genérico · 422 → `detail` accionable del
// backend (ciudad fuera de catálogo, kilometraje fuera de rango).
export function actualizarPublicacion(id: number, datos: PublicacionActualizar) {
  return fetchAPI<PublicacionInterna>(
    `/marketplace/publicaciones/${id}`,
    { method: "PATCH", body: JSON.stringify(datos) },
    true
  );
}

// Publica un borrador (borrador → activa). El backend valida el umbral de ficha
// (422 con copy es-EC si no llega). Publicar es gratis en cualquier plan. Es un caso
// particular de `actualizarPublicacion`: lo único que cambia es el estado.
export function publicarBorrador(id: number) {
  return actualizarPublicacion(id, { estado: "activa" });
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
// premium. Es gratis (monetización suspendida); 422 si la publicación no es premium.
export function solicitarVerificacion(id: number) {
  return fetchAPI<PublicacionInterna>(
    `/marketplace/publicaciones/${id}/solicitar-verificacion`,
    { method: "POST" },
    true
  );
}

// El dueño RENUEVA su anuncio: `renovada_en = now()` y vuelve al frente del feed y de
// la búsqueda. Gratis. 422 si el anuncio no está activo o si todavía es vigente
// (renovar es el remedio de un anuncio viejo, no un atajo para saltar la cola).
export function renovarPublicacion(id: number) {
  return fetchAPI<PublicacionInterna>(
    `/marketplace/publicaciones/${id}/renovar`,
    { method: "POST" },
    true
  );
}

// ── Directorio de servicios automotrices ───────────────────────────────────

// Directorio público: solo aprobados + activos. Filtros opcionales.
export function listarServicios(filtros?: {
  categoria?: string;
  provincia?: string;
}) {
  const p = new URLSearchParams();
  if (filtros?.categoria) p.set("categoria", filtros.categoria);
  if (filtros?.provincia) p.set("provincia", filtros.provincia);
  const qs = p.toString();
  return fetchAPI<ServicioSalida[]>(`/marketplace/servicios${qs ? `?${qs}` : ""}`);
}

// Un usuario propone un negocio para el directorio → entra `pendiente`. Requiere sesión.
export function crearServicio(datos: ServicioCrear) {
  return fetchAPI<ServicioSalida>(
    "/marketplace/servicios",
    { method: "POST", body: JSON.stringify(datos) },
    true
  );
}

// El vendedor canjea el código que le dio la mecánica en SU publicación → sello
// "revisado por mecánica". 404 si no es suya, 422 si el código no existe/ya se usó/
// expiró. Requiere sesión.
export function certificarPublicacion(id: number, codigo: string) {
  return fetchAPI<PublicacionInterna>(
    `/marketplace/publicaciones/${id}/certificar`,
    { method: "POST", body: JSON.stringify({ codigo }) },
    true
  );
}

// ── Calificaciones comprador → vendedor ─────────────────────────────────────

// Resumen + comentarios de un vendedor. Público; si hay sesión, `mia` trae tu voto.
export function obtenerCalificacionesVendedor(vendedorId: number) {
  return fetchAPI<CalificacionesVendedor>(
    `/marketplace/vendedores/${vendedorId}/calificaciones`
  );
}

// Deja (o actualiza) tu calificación. Requiere sesión. 404 vendedor inexistente,
// 422 si es tu propio perfil. Devuelve el listado ya actualizado.
export function calificarVendedor(vendedorId: number, datos: CalificacionCrear) {
  return fetchAPI<CalificacionesVendedor>(
    `/marketplace/vendedores/${vendedorId}/calificar`,
    { method: "POST", body: JSON.stringify(datos) },
    true
  );
}

// ─── Vendedor y contacto comprador-vendedor (M5 / TASK-001) ───────────────
// El teléfono del vendedor vive SOLO en estas tres rutas: el perfil propio (privado) y
// la revelación bajo acción explícita del comprador. Ni el feed, ni /buscar, ni el
// detalle de la publicación lo traen — por eso no hay dónde prefetchearlo.

// Perfil de vendedor propio. Requiere sesión.
//
// OJO — **404 = estado de onboarding, no fallo**: el perfil se crea con el PATCH, así que
// una cuenta que todavía no cargó su contacto responde 404. Es la única ruta del proyecto
// donde 404 no significa "no existe o no es tuyo" (TASK-001 §Endpoints). Quien la consuma
// debe atrapar `ApiError` con `status === 404` y abrir el formulario vacío. Un fallo real
// de red NO llega como ApiError (fetch rechaza con TypeError), así que los dos casos se
// distinguen sin ambigüedad.
export function obtenerMiPerfilVendedor() {
  return fetchAPI<VendedorPerfilSalida>("/marketplace/vendedor/mi-perfil", {}, true);
}

// Crea o actualiza el perfil propio (upsert parcial). Requiere sesión. Es gratis.
// Solo se tocan los campos ENVIADOS: omitir uno lo deja intacto, `null` lo borra.
// 422 si el teléfono no es un celular ecuatoriano válido, y también si el estado
// resultante deja teléfono publicado sin `nombre_publico` (opt-in de PII).
export function actualizarMiPerfilVendedor(datos: VendedorActualizar) {
  return fetchAPI<VendedorPerfilSalida>(
    "/marketplace/vendedor/mi-perfil",
    { method: "PATCH", body: JSON.stringify(datos) },
    true
  );
}

// Revela el contacto del vendedor de una publicación. **Público, sin sesión y sin cobro**
// (§1.0.3: contactar es libre). Registra una métrica anónima en el backend, por eso es
// POST y por eso solo se llama cuando el comprador pulsa "Ver teléfono".
// 409 = el vendedor todavía no publicó un teléfono; 404 = anuncio inexistente o no público.
export function revelarContactoVendedor(publicacionId: number) {
  return fetchAPI<ContactoVendedorSalida>(
    `/marketplace/publicaciones/${publicacionId}/contacto`,
    { method: "POST" }
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

// Edita una referencia propia (M2.10). Envía SOLO los campos presentes (edición
// parcial). Cambiar contenido (marca, fotos, descripción…) la devuelve a moderación
// `pendiente` en el backend. 401 sin sesión; 404 si no es tuya; 422 si algún dato no
// valida. Devuelve la referencia ya actualizada, con su nuevo estado de moderación.
export function actualizarReferencia(id: number, datos: ReferenciaActualizar) {
  return fetchAPI<PublicacionReferenciada>(
    `/marketplace/referencias/${id}`,
    { method: "PATCH", body: JSON.stringify(datos) },
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


// ─── Puntos de encuentro seguros (migración 0033) ─────────
// Catálogo público de lugares para negociar en persona + el "anuncio" del vendedor
// (voy a llevar mi auto a X el día Y).
export function listarPuntosEncuentro() {
  return fetchAPI<PuntoEncuentro[]>("/marketplace/puntos-encuentro", {}, false);
}

export function obtenerPuntoEncuentro(id: number) {
  return fetchAPI<PuntoEncuentroDetalle>(
    `/marketplace/puntos-encuentro/${id}`,
    {},
    false
  );
}

// El vendedor anuncia que llevará `publicacion_id` a este punto.
export function anunciarPresencia(puntoId: number, datos: PresenciaCrear) {
  return fetchAPI<PresenciaSalida>(
    `/marketplace/puntos-encuentro/${puntoId}/presencias`,
    { method: "POST", body: JSON.stringify(datos) },
    true
  );
}

export function misPresencias() {
  return fetchAPI<MiPresencia[]>("/marketplace/presencias/mias", {}, true);
}

export function actualizarPresencia(id: number, datos: PresenciaActualizar) {
  return fetchAPI<MiPresencia>(
    `/marketplace/presencias/${id}`,
    { method: "PATCH", body: JSON.stringify(datos) },
    true
  );
}

export function eliminarPresencia(id: number) {
  return fetchAPI<void>(
    `/marketplace/presencias/${id}`,
    { method: "DELETE" },
    true
  );
}


// ─── Agendamiento de citas para servicios (migración 0034) ──
export function pedirCita(servicioId: number, datos: CitaCrear) {
  return fetchAPI<CitaSalida>(
    `/marketplace/servicios/${servicioId}/citas`,
    { method: "POST", body: JSON.stringify(datos) },
    true
  );
}

export function misCitas() {
  return fetchAPI<CitaSalida[]>("/marketplace/citas/mias", {}, true);
}

// Solicitudes a los servicios que YO aporté (o todas, si soy admin).
export function citasRecibidas() {
  return fetchAPI<CitaSalida[]>("/marketplace/citas/recibidas", {}, true);
}

export function actualizarCita(id: number, datos: CitaActualizar) {
  return fetchAPI<CitaSalida>(
    `/marketplace/citas/${id}`,
    { method: "PATCH", body: JSON.stringify(datos) },
    true
  );
}

export function responderCita(id: number, datos: RespuestaNegocio) {
  return fetchAPI<CitaSalida>(
    `/marketplace/citas/${id}/responder`,
    { method: "POST", body: JSON.stringify(datos) },
    true
  );
}
