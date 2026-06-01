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

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
  }
}

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
  | "no_integrada";

export interface EstadoFuenteItem {
  clave: string;
  nombre: string;
  prioridad: "alta" | "media" | "baja";
  origen: "oficial" | "no_oficial";
  estado: EstadoFuenteConsolidada;
  detalle?: string | null;
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

export interface ProductoEstado {
  codigo: string;
  nombre: string;
  tokens: number;
  sensibilidad: string;
  descripcion: string;
  desbloqueado: boolean;
  disponible: boolean;
}

export interface VehiculoConsolidado {
  placa: string;
  datos_basicos: DatosBasicos;
  identificacion: Identificacion;
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
export type EstadoPublicacion = "activa" | "pausada" | "vendida";
export type EstadoVerificacion = "no_verificado" | "pendiente" | "verificado" | "rechazado";

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
}

export interface FeedMarketplace {
  premium: PublicacionInterna[];
  estandar: PublicacionInterna[];
  referenciadas: PublicacionReferenciada[];
}

export interface PublicacionCrear {
  placa: string;
  titulo?: string;
  descripcion?: string;
  precio_usd: number;
  plan: PlanPublicacion;
  vehiculo_id?: number;
}
