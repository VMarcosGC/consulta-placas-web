// Tipos compartidos con el backend FastAPI.
// Reflejan los schemas Pydantic y respuestas reales de la API.

export type EstadoFuente =
  | "consulta_realizada"
  | "error"
  | "pendiente_integracion"
  | "sin_resultados"
  | "bloqueado_captcha"
  // AMT/FGE vía worker híbrido: encolado (en_proceso) o fuente caída tras reintentos.
  | "en_proceso"
  | "error_fuente"
  // SRI: passthrough al portal oficial (devuelve url_consulta).
  | "consulta_externa";

export interface FuenteRespuesta<TDatos = unknown> {
  fuente: "ANT" | "SRI" | "AMT" | "FGE";
  placa?: string;
  termino?: string;
  estado: EstadoFuente;
  datos: TDatos | null;
  error?: string;
  // Solo presente cuando estado === "consulta_externa" (SRI → portal oficial).
  url_consulta?: string;
  _cache?: boolean;
}

export interface VehiculoANT {
  marca: string | null;
  color: string | null;
  anio_matricula: string | null;
  modelo: string | null;
  clase: string | null;
  fecha_matricula: string | null;
  anio_vehiculo: string | null;
  servicio: string | null;
  fecha_caducidad: string | null;
  polarizado: string | null;
}

export interface CitacionesANT {
  pendientes: number;
  en_impugnacion: number;
  anuladas: number;
  pagadas: number;
  en_convenio: number;
  total_registros: number;
}

export interface DatosANT {
  vehiculo: VehiculoANT;
  citaciones: CitacionesANT;
  tiene_pendientes: boolean;
  tiene_registros: boolean;
}

export interface CategoriaAMT { cantidad: number; monto: number }

export interface DatosAMT {
  infracciones: {
    total_registros: number;
    total_a_pagar: number;
    pendientes: number;
    categorias: Record<string, CategoriaAMT>;
  };
  tiene_pendientes: boolean;
  tiene_registros: boolean;
}

export interface DenunciaFGE {
  ndd: string;
  lugar: string | null;
  fecha: string | null;
  hora: string | null;
  delito: string | null;
  unidad: string | null;
}

export interface DatosFGE {
  denuncias: { total_encontradas: number; detalle: DenunciaFGE[] };
  sin_resultados: boolean;
  tiene_denuncias: boolean;
}

export interface DatosSRI {
  vehiculo: Record<string, string | null>;
  valores: { matricula: number; total_a_pagar: number };
  tiene_valores_pendientes: boolean;
}

export interface ResumenConsulta {
  fuentes_consultadas: number;
  ant_consultado: boolean;
  sri_consultado: boolean;
  amt_consultado: boolean;
  fge_consultado: boolean;
  // Worker híbrido: estado asíncrono de AMT/FGE.
  amt_en_proceso: boolean;
  fge_en_proceso: boolean;
  amt_error_fuente: boolean;
  fge_error_fuente: boolean;
  tiene_citaciones_pendientes_ant: boolean;
  total_citaciones_ant: number;
  valor_pendiente_sri: number;
  tiene_valores_pendientes_sri: boolean;
  // SRI passthrough al portal oficial.
  sri_consulta_externa: boolean;
  url_consulta_sri: string | null;
  total_infracciones_amt: number;
  infracciones_pendientes_amt: number;
  valor_pendiente_amt: number;
  tiene_infracciones_pendientes_amt: boolean;
  total_denuncias_fge: number;
  tiene_denuncias_fge: boolean;
  estado_general: "con_pendientes" | "sin_pendientes";
}

export interface ConsultaPlacaRespuesta {
  placa: string;
  ant: FuenteRespuesta<DatosANT>;
  sri: FuenteRespuesta<DatosSRI>;
  amt: FuenteRespuesta<DatosAMT>;
  fge: FuenteRespuesta<DatosFGE>;
  resumen: ResumenConsulta;
}

export interface Usuario {
  id: number;
  email: string;
  nombre: string | null;
  saldo_tokens?: number;
  // True si el email está en ADMIN_EMAILS (lo expone /auth/me). Habilita moderación.
  es_admin?: boolean;
  creado_en: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface Vehiculo {
  id: number;
  placa: string;
  vin: string | null;
  numero_motor: string | null;
  numero_chasis: string | null;
  marca: string | null;
  modelo: string | null;
  anio: number | null;
  color: string | null;
  ciudad_registro: string | null;
  creado_en: string;
  actualizado_en: string;
}

export interface VehiculoCrear {
  placa: string;
  vin?: string;
  numero_motor?: string;
  numero_chasis?: string;
  marca?: string;
  modelo?: string;
  anio?: number;
  color?: string;
  ciudad_registro?: string;
}

// ── Favoritos del usuario ────────────────────────────────────────────────────
// Mirror de src/modules/vehiculos/schemas/favorito.py del backend.
// OJO: el favorito es por PLACA (String, no FK), no por publicación. Una placa puede
// no tener anuncio en nuestro feed y aun así estar en favoritos.

export interface Favorito {
  id: number;
  placa: string;
  nota: string | null;
  // Precio del anuncio en el momento de guardarlo (Numeric en el backend). Es lo que
  // habilita el badge de baja de precio: se compara contra el precio actual del feed.
  // null = se guardó sin referencia de precio → sin badge, silencioso.
  precio_al_guardar: number | null;
  creado_en: string;
}

export interface FavoritoCrear {
  placa: string;
  nota?: string;
  precio_al_guardar?: number;
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
  }
}

// Error de la subida directa a Cloudinary (host externo). Se distingue de ApiError para
// no confundir sus códigos HTTP (401/409 de Cloudinary) con los del backend propio.
export class CloudinaryError extends Error {}

// ── Perfil Consolidado de Vehículo ──────────────────────────────────────────
// Refleja `VehiculoConsolidadoResponse` del backend (src/modules/consulta/schemas.py).
// El backend entrega el objeto ya consolidado vía GET /consultar/{placa}/perfil; el
// frontend solo lee y pinta (helpers de lectura en src/lib/perfil.ts).

export type EstadoFuenteConsolidada =
  | "completada"
  | "sin_resultados"
  | "en_proceso"
  | "error_fuente"
  | "error"
  | "consulta_externa"
  | "no_integrada"
  | "no_consultada";

export interface EstadoFuenteItem {
  clave: string;
  nombre: string;
  prioridad: "alta" | "media" | "baja";
  origen: "oficial" | "no_oficial";
  estado: EstadoFuenteConsolidada;
  detalle?: string | null;
  // ISO-8601 de cuándo se obtuvo el dato (caché o consulta recién hecha). null si la
  // fuente no entregó datos (en_proceso / error / no_integrada / no_consultada). Lo usa la sección
  // "Datos oficiales" del anuncio para decir "consultado el …".
  consultado_en?: string | null;
}

export interface DatosBasicos {
  marca: string | null;
  modelo: string | null;
  anio: number | string | null;
  color: string | null;
  clase: string | null;
  servicio: string | null;
  fecha_matricula: string | null;
  fecha_caducidad: string | null;
  pais_origen: string | null;
  matricula_vigente: boolean | null;
  bloqueado: boolean;
}

export interface CategoriaMulta {
  etiqueta: string;
  cantidad: number;
  monto_usd: number | null;
}

export interface MultaDetalle {
  fuente: string;
  ambito: string;
  total_registros: number;
  pendientes: number;
  total_a_pagar_usd: number | null;
  categorias: CategoriaMulta[];
}

export interface Identificacion {
  // bloqueado=true → solo *_ofuscado; tras pagar tokens (POST .../desbloquear) llegan
  // los campos en claro (vin/numero_motor/numero_chasis) y bloqueado=false.
  bloqueado: boolean;
  vin: string | null;
  numero_motor: string | null;
  numero_chasis: string | null;
  vin_ofuscado: string | null;
  numero_motor_ofuscado: string | null;
  numero_chasis_ofuscado: string | null;
  pais_origen: string | null;
}

export interface MultaItem {
  fuente: string;
  concepto: string | null;
  valor_usd: number | null;
  estado: string | null;
  fecha: string | null;
}

export interface NovedadLegal {
  fuente: string;
  ndd: string | null;
  delito: string | null;
  fecha: string | null;
  lugar: string | null;
  unidad: string | null;
}

export interface ValoresTributarios {
  fuente: string;
  matricula_usd: number | null;
  total_a_pagar_usd: number | null;
  url_consulta: string | null;
}

// Validación del titular (PII). El backend NUNCA envía el nombre completo: como máximo,
// validación (sí hay titular registrado) + nombre ofuscado (iniciales). Producto
// `titular_validado`. Ver politica_datos_sensibles.md del backend.
export interface Titular {
  bloqueado: boolean;
  disponible: boolean;
  validado: boolean | null;
  nombre_ofuscado: string | null;
  mensaje: string | null;
}

export interface ProductoEstado {
  codigo: string;
  nombre: string;
  tokens: number;
  precio_referencial_usd?: string | number | null;
  sensibilidad: string;
  descripcion: string;
  desbloqueado: boolean;
  disponible: boolean;
}

export interface VehiculoConsolidado {
  placa: string;
  datos_basicos: DatosBasicos;
  identificacion: Identificacion;
  titular: Titular;
  valores_tributarios: ValoresTributarios | null;
  multas_pendientes: MultaItem[];
  multas_detalle: MultaDetalle[];
  multas_bloqueado: boolean;
  novedades_legales: NovedadLegal[];
  estado_fuentes: EstadoFuenteItem[];
  productos: ProductoEstado[];
  tiene_pendientes: boolean;
}

// ── Marketplace (Pilar 4): publicaciones internas + referenciadas ────────────
// Refleja src/modules/marketplace/schemas.py del backend.

export type PlanPublicacion = "light" | "premium";
// `borrador` (M2.8) es el estado inicial: solo lo ve su dueño, nunca el feed ni la URL
// pública. Pasa a `activa` cuando la ficha llega al umbral de publicación.
export type EstadoPublicacion = "borrador" | "activa" | "pausada" | "vendida";
export type EstadoVerificacion = "no_verificado" | "pendiente" | "verificado" | "rechazado";

// Catálogo CERRADO de ciudades donde puede estar un auto en venta (migración 0023).
// Espejo de `CiudadPublicacion` de src/modules/marketplace/schemas.py, mismo orden.
// Los valores ya vienen listos para mostrar (no son claves snake_case como los catálogos
// de la ficha), así que no necesitan tabla de etiquetas: la tarjeta pinta lo que llega.
export type CiudadPublicacion =
  | "Quito"
  | "Guayaquil"
  | "Cuenca"
  | "Ambato"
  | "Manta"
  | "Loja"
  | "Machala"
  | "Santo Domingo"
  | "Portoviejo"
  | "Ibarra"
  | "Riobamba"
  | "Esmeraldas";

// Opciones del <select> del formulario. Es el catálogo del backend en el mismo orden;
// escribir una ciudad fuera de esta lista devuelve 422 al crear o editar.
export const CIUDADES_PUBLICACION: readonly CiudadPublicacion[] = [
  "Quito",
  "Guayaquil",
  "Cuenca",
  "Ambato",
  "Manta",
  "Loja",
  "Machala",
  "Santo Domingo",
  "Portoviejo",
  "Ibarra",
  "Riobamba",
  "Esmeraldas",
];

export interface ResumenMantenimientos {
  total: number;
  ultima_fecha: string | null;
  ultimo_kilometraje: number | null;
}

export interface PublicacionInterna {
  id: number;
  placa: string;
  titulo: string | null;
  descripcion: string | null;
  // Ciudad donde está el auto en venta. `string | null` y NO `CiudadPublicacion`: el
  // catálogo se impone al ESCRIBIR (422 en alta y edición), pero la salida es texto libre
  // para que una fila vieja siga leyéndose si mañana se retira una ciudad de la lista.
  // Mismo tipo que `PublicacionReferenciada.ciudad`, así la tarjeta las trata igual —
  // incluida la opcionalidad: en el OpenAPI el campo es nullable y **no requerido**.
  ciudad?: string | null;
  precio_usd: number;
  plan: PlanPublicacion;
  estado: EstadoPublicacion;
  estado_verificacion: EstadoVerificacion;
  destacado: boolean;
  verificado: boolean;
  verificado_en: string | null;
  marca: string | null;
  modelo: string | null;
  anio: number | null;
  mantenimientos: ResumenMantenimientos | null;
  // % de completitud de la ficha técnica. null = el vendedor aún no la crea.
  completitud_ficha?: number | null;
  // URL de la primera foto (portada del feed). null si la publicación no tiene fotos.
  foto_portada?: string | null;
  creado_en: string;
}

export type EstadoModeracion = "pendiente" | "aprobada" | "rechazada";

export interface PublicacionReferenciada {
  id: number;
  placa: string | null;
  marca: string | null;
  modelo: string | null;
  anio: number | null;
  precio_usd: number | null;
  fuente: string;
  url_externa: string;
  imagen_url: string | null;
  // Referencias ricas (M2.8): el aportante copia el detalle del anuncio original.
  // Siguen siendo datos NO verificados por la plataforma.
  descripcion?: string | null;
  ciudad?: string | null;
  kilometraje?: number | null;
  fotos?: string[];
  // El feed público solo trae aprobadas; "mias" puede traer cualquier estado.
  estado_moderacion: EstadoModeracion;
  activa: boolean;
  creado_en: string;
}

// Referencia que aporta el usuario: pega el link de un anuncio externo (Facebook
// Marketplace, OLX…) y completa los datos a mano. No raspamos el portal. La `fuente`
// la deriva el backend del dominio del link. Entra en moderación "pendiente".
export interface ReferenciaCrear {
  url_externa: string;
  marca?: string;
  modelo?: string;
  anio?: number;
  precio_usd?: number;
  imagen_url?: string;
  placa?: string;
  // Campos ricos (M2.8), todos opcionales. `fotos`: máx. 5 (el backend valida).
  descripcion?: string;
  ciudad?: string;
  kilometraje?: number;
  fotos?: string[];
}

// Edición parcial de una referencia (M2.10). Mirror de
// PublicacionReferenciadaActualizar del backend: todos los campos opcionales. Cambiar
// cualquier campo de CONTENIDO devuelve la referencia a moderación `pendiente` (lo
// decide el router, anti bait-and-switch); `activa` permite pausarla sin re-moderar.
export interface ReferenciaActualizar {
  marca?: string;
  modelo?: string;
  anio?: number;
  precio_usd?: number;
  imagen_url?: string;
  placa?: string;
  descripcion?: string;
  ciudad?: string;
  kilometraje?: number;
  fotos?: string[];
  activa?: boolean;
}

// Tope de fotos por referencia externa. Espejo de MAX_FOTOS_REFERENCIA del backend.
export const MAX_FOTOS_REFERENCIA = 5;

export interface FeedMarketplace {
  premium: PublicacionInterna[];
  estandar: PublicacionInterna[];
  referenciadas: PublicacionReferenciada[];
}

export interface PublicacionCrear {
  placa: string;
  titulo?: string;
  descripcion?: string;
  // Opcional: publicar sin ciudad es válido. Al ENVIAR sí va tipada con el catálogo,
  // porque el backend valida contra él (una ciudad fuera de lista → 422). Admite `null`
  // además de omitirse, que es lo que declara el OpenAPI (`anyOf: [enum, null]`).
  ciudad?: CiudadPublicacion | null;
  precio_usd: number;
  plan: PlanPublicacion;
  vehiculo_id?: number;
}

// ── Ficha técnica de la publicación (market de autos) ────────────────────────
// Mirror de los schemas de src/modules/marketplace/schemas.py (bloque §Ficha).
// 3 bloques (motor_suspensión / carrocería / interiores) + extras. Todos los campos
// de bloque son opcionales/nullable: el vendedor llena lo que sabe. Es gratis
// (transparencia, no se cobra). Las etiquetas legibles es-EC viven en src/lib/ficha.ts.

export type Combustible = "gasolina" | "diesel" | "hibrido" | "electrico" | "glp";
export type Transmision = "manual" | "automatica" | "cvt" | "semiautomatica";
export type Traccion = "4x2" | "4x4" | "awd";
export type EstadoComponente = "excelente" | "bueno" | "regular" | "requiere_atencion";
export type TipoCarroceria =
  | "sedan"
  | "suv"
  | "hatchback"
  | "camioneta"
  | "coupe"
  | "furgoneta"
  | "bus"
  | "camion"
  | "moto"
  | "otro";
export type EstadoPintura =
  | "original"
  | "retoques"
  | "repintado_parcial"
  | "repintado_total";
export type MaterialAsientos = "tela" | "cuero" | "cuerina" | "mixto";

export interface BloqueMotorSuspension {
  combustible?: Combustible | null;
  cilindraje_cc?: number | null; // 49–10000
  transmision?: Transmision | null;
  traccion?: Traccion | null;
  estado_motor?: EstadoComponente | null;
  estado_suspension?: EstadoComponente | null;
  fugas_visibles?: boolean | null;
  cambios_recientes?: string | null; // <= 500
  observaciones?: string | null; // <= 1000
}

export interface BloqueCarroceria {
  tipo?: TipoCarroceria | null;
  numero_puertas?: number | null; // 0–6
  color?: string | null; // <= 40
  estado_pintura?: EstadoPintura | null;
  choques_reparados?: boolean | null;
  oxido_visible?: boolean | null;
  estado_general?: EstadoComponente | null;
  observaciones?: string | null; // <= 1000
}

export interface BloqueInteriores {
  material_asientos?: MaterialAsientos | null;
  estado_asientos?: EstadoComponente | null;
  aire_acondicionado?: boolean | null;
  sistema_audio?: string | null; // <= 120
  estado_tablero?: EstadoComponente | null;
  observaciones?: string | null; // <= 1000
}

export interface ExtraVehiculo {
  nombre: string; // 2–80
  detalle?: string | null; // <= 300
}

export interface FichaSalida {
  motor_suspension: BloqueMotorSuspension | null;
  carroceria: BloqueCarroceria | null;
  interiores: BloqueInteriores | null;
  extras: ExtraVehiculo[];
  completitud: number; // 0–100
  actualizado_en: string | null;
}

// Edición parcial: enviar un bloque lo REEMPLAZA completo; null lo borra; omitirlo lo
// deja intacto (el backend usa model_fields_set). extras: la lista enviada reemplaza.
export interface FichaActualizar {
  motor_suspension?: BloqueMotorSuspension | null;
  carroceria?: BloqueCarroceria | null;
  interiores?: BloqueInteriores | null;
  extras?: ExtraVehiculo[];
}

// ── Fotos de la publicación (M2) ─────────────────────────────────────────────
// El navegador sube directo a Cloudinary con una firma que da el backend; luego se
// registra la URL. Ver src/lib/api.ts (firmarSubidaFoto/subirACloudinary/registrarFoto).

export type BloqueFoto = "motor_suspension" | "carroceria" | "interiores" | "general";

// Datos que devuelve el backend para subir directo a Cloudinary (firmado).
export interface FirmaSubida {
  cloud_name: string;
  api_key: string;
  timestamp: number;
  signature: string;
  folder: string;
}

// Registro de una foto ya subida a Cloudinary (solo se persiste la URL).
export interface FotoRegistrar {
  url: string;
  bloque?: BloqueFoto | null;
  orden?: number | null;
}

export interface FotoSalida {
  id: number;
  url: string;
  bloque: string | null;
  orden: number;
}

// Detalle público de una publicación: todo lo del feed + la ficha técnica + las fotos.
export interface PublicacionDetalle extends PublicacionInterna {
  ficha: FichaSalida | null;
  fotos: FotoSalida[];
}

// ── Búsqueda del comprador (MC2 — lista plana paginada por cursor) ────────────
// Mirror de ItemBusqueda / ResultadoBusquedaSalida (src/modules/marketplace/schemas.py).
// A diferencia del feed (3 cubos curados), la búsqueda devuelve una LISTA PLANA filtrable
// y paginada por cursor keyset. Cada item lleva el discriminador `tipo_publicacion` para
// elegir la tarjeta; solo uno de `interna`/`referenciada` viene lleno. Se reusan los mismos
// shapes del feed → misma garantía de privacidad (ni VIN ni nombre del dueño).

export interface ItemBusqueda {
  tipo_publicacion: "interna" | "referenciada";
  interna: PublicacionInterna | null;
  referenciada: PublicacionReferenciada | null;
}

export interface ResultadoBusqueda {
  items: ItemBusqueda[];
  // Token opaco (base64) que se reenvía tal cual para traer la siguiente página.
  // null cuando ya no hay más resultados.
  siguiente_cursor: string | null;
}

// Parámetros de GET /marketplace/buscar. Todos opcionales; los enums reusan los catálogos
// de la ficha técnica. Si `tipo`/`combustible`/`transmision` está activo, las referencias
// externas NO aparecen (no tienen ficha) — lo decide el backend.
export interface FiltrosBusqueda {
  q?: string; // texto libre sobre título/marca/modelo (máx. 80)
  tipo?: TipoCarroceria;
  combustible?: Combustible;
  transmision?: Transmision;
  precio_min?: number;
  precio_max?: number;
  anio_min?: number;
  anio_max?: number;
}

// ── Vendedor y contacto comprador-vendedor (TASK-001 / M5) ───────────────────
// Mirror de VendedorActualizar / VendedorPerfilSalida / ContactoVendedorSalida
// (src/modules/marketplace/schemas.py, bloque "Vendedor y contacto").
//
// PRIVACIDAD (§9): `telefono` existe en DOS lugares y en ninguno más. (1) el perfil
// PROPIO del vendedor, detrás de sesión; (2) la respuesta del endpoint de contacto, que
// solo se llama cuando el comprador pulsa "Ver teléfono". NUNCA en el feed, la búsqueda
// ni el detalle de la publicación: un número servido en un listado público lo cosechan
// bots en días, y esa acción explícita es la barrera.

// `patio` está declarado en el backend desde ya, pero en esta etapa todo vendedor es
// `particular` (el `tipo` no se acepta del cliente).
export type TipoVendedor = "particular" | "patio";

// Perfil de vendedor PROPIO (GET/PATCH /marketplace/vendedor/mi-perfil).
// OJO: el GET responde **404 cuando la cuenta todavía no tiene perfil**, porque el perfil
// nace con el PATCH. Ese 404 es un estado de onboarding, no un fallo (ver src/lib/api.ts).
export interface VendedorPerfilSalida {
  id: number;
  tipo: TipoVendedor;
  nombre_publico: string | null;
  telefono: string | null;
  // Reservado por el backend (verificación por SMS/OTP): hoy siempre false y no se pinta.
  telefono_verificado: boolean;
  creado_en: string;
}

// Edición parcial: omitir un campo lo deja intacto; enviar `null` lo borra.
// `nombre_publico` y `telefono` viajan JUNTOS: el backend responde 422 si queda un
// teléfono publicado sin nombre público (opt-in explícito de PII, compuerta M5).
export interface VendedorActualizar {
  nombre_publico?: string | null;
  telefono?: string | null;
}

// Respuesta de POST /marketplace/publicaciones/{id}/contacto: el único lugar público
// con el teléfono. `whatsapp_url` viene ARMADA del backend (con el mensaje prellenado);
// se usa tal cual, jamás se reconstruye en el cliente — la API tiene que ser
// autosuficiente para un cliente que no sea esta web (AGENTS §1.0.2).
export interface ContactoVendedorSalida {
  telefono: string;
  nombre_publico: string | null;
  whatsapp_url: string;
}
