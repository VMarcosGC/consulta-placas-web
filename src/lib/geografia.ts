// Espejo mínimo de `src/modules/marketplace/geografia.py` del backend: las provincias
// y regiones con stock posible (las que tienen al menos una ciudad del catálogo).
// El backend es la fuente de verdad — un valor fuera de esta lista devuelve 422 con
// las opciones. Acá solo alimenta el <select> del filtro y la validación de la URL.

export const REGIONES = ["Costa", "Sierra", "Amazonía", "Insular"] as const;

// Ordenadas alfabéticamente, igual que `geografia.PROVINCIAS` en el backend.
export const PROVINCIAS = [
  "Azuay",
  "Chimborazo",
  "El Oro",
  "Esmeraldas",
  "Guayas",
  "Imbabura",
  "Loja",
  "Manabí",
  "Pichincha",
  "Santo Domingo de los Tsáchilas",
  "Tungurahua",
] as const;

export type Provincia = (typeof PROVINCIAS)[number];

// Ciudad del catálogo → provincia. Espejo parcial de `geografia.CIUDAD_A_PROVINCIA`
// del backend (solo lo que el frontend necesita para contar por provincia desde el
// feed). Si el backend agrega una ciudad, sumar acá también.
export const CIUDAD_A_PROVINCIA: Record<string, Provincia> = {
  Quito: "Pichincha",
  Guayaquil: "Guayas",
  Cuenca: "Azuay",
  Ambato: "Tungurahua",
  Manta: "Manabí",
  Loja: "Loja",
  Machala: "El Oro",
  "Santo Domingo": "Santo Domingo de los Tsáchilas",
  Portoviejo: "Manabí",
  Ibarra: "Imbabura",
  Riobamba: "Chimborazo",
  Esmeraldas: "Esmeraldas",
};

export function provinciaDeCiudad(ciudad: string | null | undefined): Provincia | null {
  if (!ciudad) return null;
  return CIUDAD_A_PROVINCIA[ciudad.trim()] ?? null;
}

// Polígonos de cada provincia para el mapa coroplético (`MapaEcuador`).
// viewBox 0 0 300 400 — x: oeste→este, y: norte→sur. Es una geografía ESTILIZADA
// (contornos simplificados a mano) pero con la silueta y las posiciones relativas del
// Ecuador; no es cartografía exacta. Solo las 11 provincias con ciudad en el catálogo.
// `cx/cy` = ancla de la etiqueta. `puntos` = lista "x,y x,y …" para <polygon>.
export const PROVINCIAS_MAPA: {
  provincia: Provincia;
  corto: string;
  puntos: string;
  cx: number;
  cy: number;
}[] = [
  {
    provincia: "Esmeraldas",
    corto: "Esmeraldas",
    puntos: "44,44 116,40 128,92 96,118 46,112 30,74",
    cx: 78,
    cy: 76,
  },
  {
    provincia: "Imbabura",
    corto: "Imbabura",
    puntos: "128,50 186,46 194,102 132,104 128,58",
    cx: 160,
    cy: 78,
  },
  {
    provincia: "Santo Domingo de los Tsáchilas",
    corto: "Sto. Domingo",
    puntos: "54,116 106,110 118,152 72,164 48,138",
    cx: 82,
    cy: 138,
  },
  {
    provincia: "Pichincha",
    corto: "Pichincha",
    puntos: "118,104 190,102 196,158 122,158 118,108",
    cx: 156,
    cy: 132,
  },
  {
    provincia: "Manabí",
    corto: "Manabí",
    puntos: "18,150 66,148 72,214 40,240 14,206 12,172",
    cx: 40,
    cy: 190,
  },
  {
    provincia: "Tungurahua",
    corto: "Tungurahua",
    puntos: "122,160 188,158 192,198 126,204",
    cx: 156,
    cy: 182,
  },
  {
    provincia: "Chimborazo",
    corto: "Chimborazo",
    puntos: "118,206 192,200 186,252 122,256",
    cx: 152,
    cy: 230,
  },
  {
    provincia: "Guayas",
    corto: "Guayas",
    puntos: "40,242 116,236 122,296 74,312 34,282 30,258",
    cx: 74,
    cy: 274,
  },
  {
    provincia: "Azuay",
    corto: "Azuay",
    puntos: "122,258 186,254 180,312 126,312",
    cx: 152,
    cy: 286,
  },
  {
    provincia: "El Oro",
    corto: "El Oro",
    puntos: "48,300 116,296 112,340 62,346 42,322",
    cx: 78,
    cy: 322,
  },
  {
    provincia: "Loja",
    corto: "Loja",
    puntos: "118,300 178,312 168,364 122,368 110,332",
    cx: 142,
    cy: 338,
  },
];

// Fondo no interactivo: el resto del país (Sierra norte/centro, Amazonía). Da la
// silueta completa del Ecuador detrás de las provincias con datos.
export const CONTORNO_ECUADOR =
  "M44,42 C110,32 170,36 198,50 C226,64 240,66 252,86 " +
  "C266,110 268,150 264,210 C260,270 262,320 252,350 " +
  "C240,378 200,384 168,372 C140,362 120,368 96,352 " +
  "C74,338 56,346 44,328 C30,308 18,300 16,270 " +
  "C14,232 12,214 12,180 C12,146 22,120 30,94 " +
  "C36,72 30,54 44,42 Z";
