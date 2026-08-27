// Helpers de PRESENTACIÓN de la búsqueda del comprador (MC2).
//
// El estado de la búsqueda vive en el querystring de /marketplace (URL compartible): esta
// capa solo traduce entre esa URL y el objeto `FiltrosBusqueda` que consume `src/lib/api.ts`.
// No transforma datos del backend — lee params, los valida contra los catálogos y arma las
// opciones de los <select>. La búsqueda real la resuelve el backend (GET /marketplace/buscar).

import {
  OPCIONES_COMBUSTIBLE,
  OPCIONES_TIPO_CARROCERIA,
  OPCIONES_TRANSMISION,
} from "@/lib/ficha";
import type {
  Combustible,
  FiltrosBusqueda,
  TipoCarroceria,
  Transmision,
} from "@/types/api";

// Valores permitidos de cada enum, derivados de los catálogos de la ficha (nunca
// hardcodeados): un valor de URL fuera del catálogo se descarta antes de llamar al backend,
// para no provocar un 422 con un `?tipo=xyz` manipulado a mano.
const TIPOS = OPCIONES_TIPO_CARROCERIA.map((o) => o.valor);
const COMBUSTIBLES = OPCIONES_COMBUSTIBLE.map((o) => o.valor);
const TRANSMISIONES = OPCIONES_TRANSMISION.map((o) => o.valor);

// Claves de filtro "avanzado" (todo lo que no es el buscador de texto `q`). Sirve para
// contar cuántos hay activos y etiquetar el botón "Filtros".
const CLAVES_AVANZADAS = [
  "tipo",
  "combustible",
  "transmision",
  "precio_min",
  "precio_max",
  "anio_min",
  "anio_max",
  "provincia",
  "region",
] as const;

function leerNumero(sp: URLSearchParams, clave: string): number | undefined {
  const bruto = sp.get(clave);
  if (bruto == null || bruto.trim() === "") return undefined;
  const n = Number(bruto);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

function leerEnum<T extends string>(
  sp: URLSearchParams,
  clave: string,
  permitidos: readonly T[]
): T | undefined {
  const bruto = sp.get(clave);
  if (!bruto) return undefined;
  return (permitidos as readonly string[]).includes(bruto) ? (bruto as T) : undefined;
}

// URL → filtros. Un param inválido o desconocido simplemente se ignora (robustez ante
// enlaces compartidos manipulados): así una URL corrupta reproduce una búsqueda parcial en
// vez de romper.
export function leerFiltros(sp: URLSearchParams): FiltrosBusqueda {
  const q = sp.get("q")?.trim();
  // `provincia` / `region` van como texto: el catálogo válido lo tiene el backend
  // (geografia.py) y un valor raro devuelve 422 con las opciones. Acá solo se recorta
  // para no mandar un querystring gigante manipulado a mano.
  const provincia = sp.get("provincia")?.trim();
  const region = sp.get("region")?.trim();
  return {
    q: q ? q.slice(0, 80) : undefined, // el backend valida máx. 80; recortamos por las dudas
    tipo: leerEnum<TipoCarroceria>(sp, "tipo", TIPOS),
    combustible: leerEnum<Combustible>(sp, "combustible", COMBUSTIBLES),
    transmision: leerEnum<Transmision>(sp, "transmision", TRANSMISIONES),
    precio_min: leerNumero(sp, "precio_min"),
    precio_max: leerNumero(sp, "precio_max"),
    anio_min: leerNumero(sp, "anio_min"),
    anio_max: leerNumero(sp, "anio_max"),
    provincia: provincia ? provincia.slice(0, 60) : undefined,
    region: region ? region.slice(0, 20) : undefined,
  };
}

// ¿Hay ALGÚN filtro activo? Decide si la portada muestra los bloques curados (MC1) o la
// grilla plana de resultados (MC2).
export function hayFiltros(f: FiltrosBusqueda): boolean {
  return Object.values(f).some((v) => v !== undefined);
}

// Cuántos filtros avanzados (todo menos el buscador de texto) están activos — para el
// contador del botón "Filtros".
export function conteoAvanzados(f: FiltrosBusqueda): number {
  return CLAVES_AVANZADAS.filter((k) => f[k] !== undefined).length;
}

// Clave estable que identifica una búsqueda: cuando cambia, se relanza la primera página.
// Orden fijo para que dos filtros equivalentes generen la misma clave.
export function claveFiltros(f: FiltrosBusqueda): string {
  return [
    f.q ?? "",
    f.tipo ?? "",
    f.combustible ?? "",
    f.transmision ?? "",
    f.precio_min ?? "",
    f.precio_max ?? "",
    f.anio_min ?? "",
    f.anio_max ?? "",
    f.provincia ?? "",
    f.region ?? "",
  ].join("|");
}

// ── Opciones de los <select> de rango ────────────────────────────────────────

// Escalones de precio en USD para los selects "desde"/"hasta". Cubren el grueso del parque
// automotor ecuatoriano de segunda mano sin saturar el desplegable en un celular.
export const OPCIONES_PRECIO: number[] = [
  2000, 4000, 6000, 8000, 10000, 12000, 15000, 20000, 25000, 30000, 40000, 50000,
];

// Años para los selects "desde"/"hasta": del año en curso hacia atrás hasta 1990.
export function opcionesAnio(): number[] {
  const actual = new Date().getFullYear();
  const anios: number[] = [];
  for (let a = actual; a >= 1990; a--) anios.push(a);
  return anios;
}

// Formato corto de monto para las etiquetas ("$10.000").
export function montoOpcion(valor: number): string {
  return `$${valor.toLocaleString("es-EC")}`;
}
