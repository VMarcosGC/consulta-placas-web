// Helpers de PRESENTACIÓN de la ficha técnica (no transforma datos, solo mapea el
// valor Literal del backend a una etiqueta bonita en español de Ecuador). El backend
// es la fuente de verdad de los catálogos (src/modules/marketplace/schemas.py).

import type {
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
  bus: "Bus",
  camion: "Camión",
  moto: "Moto",
  otro: "Otro",
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
