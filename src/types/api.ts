// Tipos compartidos con el backend FastAPI.
// Reflejan los schemas Pydantic y respuestas reales de la API.

export type EstadoFuente =
  | "consulta_realizada"
  | "error"
  | "pendiente_integracion"
  | "sin_resultados"
  | "bloqueado_captcha";

export interface FuenteRespuesta<TDatos = unknown> {
  fuente: "ANT" | "SRI" | "AMT" | "FGE";
  placa?: string;
  termino?: string;
  estado: EstadoFuente;
  datos: TDatos | null;
  error?: string;
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
  tiene_citaciones_pendientes_ant: boolean;
  total_citaciones_ant: number;
  valor_pendiente_sri: number;
  tiene_valores_pendientes_sri: boolean;
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
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
  }
}
