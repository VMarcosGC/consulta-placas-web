// Helpers de PRESENTACIÓN de la portada del comprador (MC1).
//
// Todo lo de aquí se deriva del feed que YA se trajo (`GET /marketplace/feed` devuelve
// las activas sin límite): no hay endpoints de agregados ni de búsqueda. La búsqueda
// real con query params y paginación es MC2 — cuando exista, este filtro en cliente se
// reemplaza por el del backend y estos helpers se caen solos.

import { CIUDADES_PUBLICACION } from "@/types/api";
import type { CiudadPublicacion, PublicacionInterna } from "@/types/api";

// Forma mínima que necesita un anuncio para entrar al buscador y a los bloques
// derivados. La cumplen tanto las publicaciones internas como las referenciadas.
export interface AnuncioBuscable {
  titulo?: string | null;
  marca: string | null;
  modelo: string | null;
  anio: number | null;
  placa?: string | null;
  precio_usd: number | null;
}

// Sin tildes, sin mayúsculas: en el celular nadie escribe "Chevrolet Ávalon" con tilde.
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita tildes (marcas combinantes)
    .toLowerCase()
    .trim();
}

// (El filtro de texto del buscador ya NO se resuelve en cliente: desde MC2 lo hace el
// backend vía GET /marketplace/buscar. `normalizar` sigue vivo porque `marcasDelStock` lo
// usa para agrupar marcas equivalentes.)

// ── Ciudad del anuncio ───────────────────────────────────────────────────────

// ¿Este texto libre corresponde a una ciudad del catálogo cerrado del backend?
//
// Se usa para PROPONER una ciudad en el formulario de publicar a partir de la
// `ciudad_registro` del garage, que es texto libre (hoy en la BD hay "QUITO", en
// mayúsculas). Solo se normalizan mayúsculas, tildes y espacios: la comparación sigue
// siendo exacta, no hay coincidencias parciales ni "parecidos". "Sto. Domingo",
// "Santo Domingo de los Tsáchilas" o "Quito Norte" devuelven null, y el selector queda
// sin elegir: un prellenado que adivina publicaría el auto en una ciudad que el vendedor
// nunca dijo.
export function ciudadDelCatalogo(
  texto: string | null | undefined
): CiudadPublicacion | null {
  if (!texto) return null;
  const buscado = normalizar(texto).replace(/\s+/g, " ");
  return CIUDADES_PUBLICACION.find((c) => normalizar(c) === buscado) ?? null;
}

// ── Bandas de presupuesto (el comprador real compra por bolsillo) ────────────

export type ClaveBanda = "hasta_10k" | "de_10k_a_20k" | "desde_20k";

export interface Banda {
  clave: ClaveBanda;
  etiqueta: string;
  min: number | null;
  max: number | null;
}

export const BANDAS_PRECIO: Banda[] = [
  { clave: "hasta_10k", etiqueta: "Menos de $10.000", min: null, max: 10000 },
  { clave: "de_10k_a_20k", etiqueta: "$10.000 a $20.000", min: 10000, max: 20000 },
  { clave: "desde_20k", etiqueta: "Más de $20.000", min: 20000, max: null },
];

export function enBanda(precio: number | null | undefined, banda: Banda): boolean {
  if (precio == null) return false; // "Consultar precio" no entra en ninguna banda
  const valor = Number(precio);
  if (!Number.isFinite(valor)) return false;
  if (banda.min != null && valor < banda.min) return false;
  if (banda.max != null && valor >= banda.max) return false;
  return true;
}

// ── Marcas con stock real ────────────────────────────────────────────────────

export interface MarcaConteo {
  marca: string;
  total: number;
}

// Chips de marca DERIVADOS del stock (nunca una lista hardcodeada): si no hay Kia
// publicado, no hay chip de Kia. Ordenadas por cantidad y luego alfabéticamente.
export function marcasDelStock(anuncios: AnuncioBuscable[]): MarcaConteo[] {
  const conteo = new Map<string, { etiqueta: string; total: number }>();
  for (const a of anuncios) {
    const bruta = a.marca?.trim();
    if (!bruta) continue;
    const clave = normalizar(bruta);
    const previo = conteo.get(clave);
    if (previo) previo.total += 1;
    else conteo.set(clave, { etiqueta: titulizar(bruta), total: 1 });
  }
  return [...conteo.values()]
    .map(({ etiqueta, total }) => ({ marca: etiqueta, total }))
    .sort((a, b) => b.total - a.total || a.marca.localeCompare(b.marca, "es-EC"));
}

// "CHEVROLET" y "chevrolet" se ven mal en un chip; "Chevrolet" no.
function titulizar(texto: string): string {
  return texto
    .toLowerCase()
    .split(/\s+/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

// ── Bloque "✓ Verificados y transparentes" ───────────────────────────────────

// Umbral de ficha que basta para entrar al bloque aunque la publicación no tenga el
// sello de la plataforma: una ficha casi completa YA es transparencia.
export const UMBRAL_FICHA_TRANSPARENTE = 80;

export function esTransparente(pub: PublicacionInterna): boolean {
  return pub.verificado === true || (pub.completitud_ficha ?? 0) >= UMBRAL_FICHA_TRANSPARENTE;
}

// ── Orden ────────────────────────────────────────────────────────────────────

// Recién publicados: el backend ya ordena el feed, pero aquí se mezclan premium y
// estándar en una sola lista, así que hay que reordenar por fecha.
export function porMasReciente<T extends { creado_en: string }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime()
  );
}

// Todos los anuncios internos del feed en una sola lista (premium + estándar).
export function todasLasInternas(feed: {
  premium: PublicacionInterna[];
  estandar: PublicacionInterna[];
}): PublicacionInterna[] {
  return [...feed.premium, ...feed.estandar];
}
