// Helpers de PRESENTACIÓN de la ficha técnica (no transforma datos, solo mapea el
// valor Literal del backend a una etiqueta bonita en español de Ecuador). El backend
// es la fuente de verdad de los catálogos (src/modules/marketplace/schemas.py).

import type {
  BloqueCarroceria,
  BloqueInteriores,
  BloqueMotorSuspension,
  Combustible,
  EstadoComponente,
  EstadoPintura,
  MaterialAsientos,
  TipoCarroceria,
  Traccion,
  Transmision,
} from "@/types/api";

export const COMBUSTIBLE_LABEL: Record<Combustible, string> = {
  gasolina: "Gasolina",
  diesel: "Diésel",
  hibrido: "Híbrido",
  electrico: "Eléctrico",
  glp: "GLP (gas)",
};

export const TRANSMISION_LABEL: Record<Transmision, string> = {
  manual: "Manual",
  automatica: "Automática",
  cvt: "CVT",
  semiautomatica: "Semiautomática",
};

export const TRACCION_LABEL: Record<Traccion, string> = {
  "4x2": "4x2",
  "4x4": "4x4",
  awd: "AWD (todas las ruedas)",
};

export const ESTADO_COMPONENTE_LABEL: Record<EstadoComponente, string> = {
  excelente: "Excelente",
  bueno: "Bueno",
  regular: "Regular",
  requiere_atencion: "Requiere atención",
};

export const TIPO_CARROCERIA_LABEL: Record<TipoCarroceria, string> = {
  sedan: "Sedán",
  suv: "SUV",
  hatchback: "Hatchback",
  camioneta: "Camioneta",
  coupe: "Coupé",
  furgoneta: "Furgoneta",
  van: "Van",
  bus: "Bus",
  buseta: "Buseta",
  camion: "Camión",
  volqueta: "Volqueta",
  tanquero: "Tanquero",
  tractor: "Tractor",
  cabezal: "Cabezal",
  trailer: "Tráiler",
  maquinaria: "Maquinaria",
  moto: "Moto",
  otro: "Otro",
};

// Un ícono (emoji) por tipo, para el filtro y las etiquetas. Se elige el más
// reconocible del set estándar; varios pesados comparten 🚛 porque no hay glifo propio.
export const TIPO_CARROCERIA_ICONO: Record<TipoCarroceria, string> = {
  sedan: "🚗",
  suv: "🚙",
  hatchback: "🚗",
  camioneta: "🛻",
  coupe: "🏎️",
  furgoneta: "🚐",
  van: "🚐",
  bus: "🚌",
  buseta: "🚐",
  camion: "🚚",
  volqueta: "🚛",
  tanquero: "🚛",
  tractor: "🚜",
  cabezal: "🚛",
  trailer: "🚛",
  maquinaria: "🚜",
  moto: "🏍️",
  otro: "🚗",
};

export const ESTADO_PINTURA_LABEL: Record<EstadoPintura, string> = {
  original: "Original de fábrica",
  retoques: "Con retoques",
  repintado_parcial: "Repintado parcial",
  repintado_total: "Repintado total",
};

export const MATERIAL_ASIENTOS_LABEL: Record<MaterialAsientos, string> = {
  tela: "Tela",
  cuero: "Cuero",
  cuerina: "Cuerina",
  mixto: "Mixto",
};

// Tono semántico de los estados de componente, para las insignias del detalle.
export function tonoEstadoComponente(
  estado: EstadoComponente
): "ok" | "alerta" | "peligro" {
  if (estado === "excelente" || estado === "bueno") return "ok";
  if (estado === "regular") return "alerta";
  return "peligro"; // requiere_atencion
}

// Opciones para los <select> del formulario del vendedor. El "" (sin especificar)
// lo agrega el propio componente del formulario.
export const OPCIONES_COMBUSTIBLE = objetoAOpciones(COMBUSTIBLE_LABEL);
export const OPCIONES_TRANSMISION = objetoAOpciones(TRANSMISION_LABEL);
export const OPCIONES_TRACCION = objetoAOpciones(TRACCION_LABEL);
export const OPCIONES_ESTADO_COMPONENTE = objetoAOpciones(ESTADO_COMPONENTE_LABEL);
export const OPCIONES_TIPO_CARROCERIA = objetoAOpciones(TIPO_CARROCERIA_LABEL);
export const OPCIONES_ESTADO_PINTURA = objetoAOpciones(ESTADO_PINTURA_LABEL);
export const OPCIONES_MATERIAL_ASIENTOS = objetoAOpciones(MATERIAL_ASIENTOS_LABEL);

function objetoAOpciones<K extends string>(
  mapa: Record<K, string>
): { valor: K; etiqueta: string }[] {
  return (Object.keys(mapa) as K[]).map((valor) => ({ valor, etiqueta: mapa[valor] }));
}

// La completitud es metadato de la publicación, no estado del vehículo: se mantiene
// neutra incluso cuando falta mucho por llenar.
export function colorCompletitud(pct: number): string {
  if (pct >= 70) return "bg-confirmado";
  return "bg-secundario";
}

// ── Umbrales de completitud (M2.5) ──────────────────────────────────────────
// Publicar es libre: el vendedor puede posponer la ficha. Pero la transparencia se
// señaliza — al comprador con una etiqueta honesta, al vendedor con un CTA persistente.

// Bajo este %, el feed y el detalle público muestran "Ficha incompleta" en lugar del
// chip de porcentaje: un 12 % no informa, y decirlo claro vale más que el número.
export const UMBRAL_FICHA_INCOMPLETA = 30;

// Mientras la ficha no llegue a este %, el dueño ve el CTA "Completa tu ficha (N %)".
export const FICHA_COMPLETA = 100;

// Vista del comprador: ¿la ficha aporta tan poco que conviene decirlo? `null` = el
// vendedor ni siquiera la creó, que es el caso más incompleto de todos.
export function fichaIncompleta(pct: number | null | undefined): boolean {
  return (pct ?? 0) < UMBRAL_FICHA_INCOMPLETA;
}

// Vista del dueño: ¿todavía le falta algo por llenar?
export function fichaPendiente(pct: number | null | undefined): boolean {
  return (pct ?? 0) < FICHA_COMPLETA;
}

// Completitud mínima para PUBLICAR un borrador (M2.8). Espejo de
// `UMBRAL_FICHA_PUBLICACION` del backend, que es la autoridad real: aquí solo sirve para
// deshabilitar el botón y decir cuánto falta. Si los dos valores se desalinean, el
// backend responde 422 y el frontend muestra ese mensaje — nunca se publica de más.
export const UMBRAL_FICHA_PUBLICACION = Number(
  process.env.NEXT_PUBLIC_UMBRAL_FICHA_PUBLICACION ?? 30
);

// ¿Se puede publicar ya este borrador?
export function puedePublicar(pct: number | null | undefined): boolean {
  return (pct ?? 0) >= UMBRAL_FICHA_PUBLICACION;
}

// ── Filas de un bloque de la ficha ─────────────────────────────────────────
// Fuente ÚNICA de qué campos y en qué orden muestra cada bloque. La usan el detalle
// del anuncio (sección "Ficha técnica") y el panel flotante por foto de la galería.
// `estado` = valor de condición → se pinta con color (Insignia) donde se pueda; el
// panel lo muestra como texto. `sensible` = "declarado por el vendedor, sin verificar".
export type FilaFicha =
  | { etiqueta: string; valor: string; sensible?: boolean }
  | { etiqueta: string; estado: EstadoComponente; sensible?: boolean };

const _si_no = (v: boolean) => (v ? "Sí" : "No");

export function filasMotorSuspension(b: BloqueMotorSuspension | null | undefined): FilaFicha[] {
  if (!b) return [];
  const f: FilaFicha[] = [];
  if (b.combustible) f.push({ etiqueta: "Combustible", valor: COMBUSTIBLE_LABEL[b.combustible] });
  if (b.cilindraje_cc != null)
    f.push({ etiqueta: "Cilindraje", valor: `${b.cilindraje_cc.toLocaleString("es-EC")} cc` });
  if (b.transmision) f.push({ etiqueta: "Transmisión", valor: TRANSMISION_LABEL[b.transmision] });
  if (b.traccion) f.push({ etiqueta: "Tracción", valor: TRACCION_LABEL[b.traccion] });
  if (b.estado_motor) f.push({ etiqueta: "Estado del motor", estado: b.estado_motor, sensible: true });
  if (b.estado_suspension)
    f.push({ etiqueta: "Estado de la suspensión", estado: b.estado_suspension, sensible: true });
  if (b.fugas_visibles != null)
    f.push({ etiqueta: "Fugas visibles", valor: _si_no(b.fugas_visibles), sensible: true });
  if (b.cambios_recientes) f.push({ etiqueta: "Cambios recientes", valor: b.cambios_recientes });
  if (b.observaciones) f.push({ etiqueta: "Observaciones", valor: b.observaciones });
  return f;
}

export function filasCarroceria(b: BloqueCarroceria | null | undefined): FilaFicha[] {
  if (!b) return [];
  const f: FilaFicha[] = [];
  if (b.tipo) f.push({ etiqueta: "Tipo", valor: TIPO_CARROCERIA_LABEL[b.tipo] });
  if (b.numero_puertas != null) f.push({ etiqueta: "Puertas", valor: String(b.numero_puertas) });
  if (b.color) f.push({ etiqueta: "Color", valor: b.color });
  if (b.estado_pintura)
    f.push({ etiqueta: "Estado de la pintura", valor: ESTADO_PINTURA_LABEL[b.estado_pintura], sensible: true });
  if (b.choques_reparados != null)
    f.push({ etiqueta: "Choques reparados", valor: _si_no(b.choques_reparados), sensible: true });
  if (b.oxido_visible != null)
    f.push({ etiqueta: "Óxido visible", valor: _si_no(b.oxido_visible), sensible: true });
  if (b.estado_general)
    f.push({ etiqueta: "Estado general", estado: b.estado_general, sensible: true });
  if (b.observaciones) f.push({ etiqueta: "Observaciones", valor: b.observaciones });
  return f;
}

export function filasInteriores(b: BloqueInteriores | null | undefined): FilaFicha[] {
  if (!b) return [];
  const f: FilaFicha[] = [];
  if (b.material_asientos)
    f.push({ etiqueta: "Material de asientos", valor: MATERIAL_ASIENTOS_LABEL[b.material_asientos] });
  if (b.estado_asientos)
    f.push({ etiqueta: "Estado de asientos", estado: b.estado_asientos, sensible: true });
  if (b.aire_acondicionado != null)
    f.push({ etiqueta: "Aire acondicionado", valor: _si_no(b.aire_acondicionado), sensible: true });
  if (b.sistema_audio) f.push({ etiqueta: "Sistema de audio", valor: b.sistema_audio });
  if (b.estado_tablero)
    f.push({ etiqueta: "Estado del tablero", estado: b.estado_tablero, sensible: true });
  if (b.observaciones) f.push({ etiqueta: "Observaciones", valor: b.observaciones });
  return f;
}

// Metadatos de cada bloque (para títulos e íconos, y para casar `foto.bloque`).
export const BLOQUES_FICHA = [
  { clave: "motor_suspension", titulo: "Motor y suspensión", icono: "⚙️", filas: filasMotorSuspension },
  { clave: "carroceria", titulo: "Carrocería", icono: "🚙", filas: filasCarroceria },
  { clave: "interiores", titulo: "Interiores", icono: "🪑", filas: filasInteriores },
] as const;

// RESUMEN transversal de la ficha (para la tira flotante en cualquier foto, incluida
// una sin bloque asignado). Toma los datos "titular" de los tres bloques, en orden de
// lo que más decide una visita, y corta corto. Vacío si la ficha no tiene nada.
export function resumenFicha(
  ficha: {
    motor_suspension?: BloqueMotorSuspension | null;
    carroceria?: BloqueCarroceria | null;
    interiores?: BloqueInteriores | null;
  } | null | undefined
): FilaFicha[] {
  if (!ficha) return [];
  const ms = ficha.motor_suspension;
  const ca = ficha.carroceria;
  const it = ficha.interiores;
  const f: FilaFicha[] = [];
  if (ca?.tipo) f.push({ etiqueta: "Tipo", valor: TIPO_CARROCERIA_LABEL[ca.tipo] });
  if (ms?.combustible) f.push({ etiqueta: "Combustible", valor: COMBUSTIBLE_LABEL[ms.combustible] });
  if (ms?.transmision) f.push({ etiqueta: "Transmisión", valor: TRANSMISION_LABEL[ms.transmision] });
  if (ms?.cilindraje_cc != null)
    f.push({ etiqueta: "Cilindraje", valor: `${ms.cilindraje_cc.toLocaleString("es-EC")} cc` });
  if (ms?.traccion) f.push({ etiqueta: "Tracción", valor: TRACCION_LABEL[ms.traccion] });
  if (ca?.color) f.push({ etiqueta: "Color", valor: ca.color });
  if (ca?.numero_puertas != null) f.push({ etiqueta: "Puertas", valor: String(ca.numero_puertas) });
  if (ca?.estado_general)
    f.push({ etiqueta: "Estado general", estado: ca.estado_general, sensible: true });
  else if (ms?.estado_motor)
    f.push({ etiqueta: "Estado del motor", estado: ms.estado_motor, sensible: true });
  if (it?.aire_acondicionado != null)
    f.push({ etiqueta: "A/C", valor: _si_no(it.aire_acondicionado), sensible: true });
  return f;
}
