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

// Posición aproximada de cada provincia en el mapa esquemático (`MapaEcuador`).
// viewBox 0 0 320 400 — x: oeste→este, y: norte→sur. NO es cartografía exacta.
export const PROVINCIAS_MAPA: {
  provincia: Provincia;
  corto: string;
  x: number;
  y: number;
}[] = [
  { provincia: "Esmeraldas", corto: "Esmeraldas", x: 92, y: 78 },
  { provincia: "Imbabura", corto: "Imbabura", x: 168, y: 92 },
  { provincia: "Santo Domingo de los Tsáchilas", corto: "Sto. Domingo", x: 104, y: 128 },
  { provincia: "Pichincha", corto: "Pichincha", x: 158, y: 130 },
  { provincia: "Manabí", corto: "Manabí", x: 66, y: 162 },
  { provincia: "Tungurahua", corto: "Tungurahua", x: 162, y: 176 },
  { provincia: "Chimborazo", corto: "Chimborazo", x: 150, y: 210 },
  { provincia: "Guayas", corto: "Guayas", x: 92, y: 236 },
  { provincia: "Azuay", corto: "Azuay", x: 150, y: 262 },
  { provincia: "El Oro", corto: "El Oro", x: 96, y: 292 },
  { provincia: "Loja", corto: "Loja", x: 140, y: 306 },
];
