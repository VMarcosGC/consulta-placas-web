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

// Provincias del mapa (tile grid, `MapaEcuador`), ordenadas de NORTE a SUR y con su
// región. El mapa es una GRILLA de fichas, no un contorno: se lee claro, escala bien y
// no depende de cartografía exacta que no tenemos. Solo las 11 con ciudad en el catálogo.
type Region = "Costa" | "Sierra";
export const PROVINCIAS_TILE: {
  provincia: Provincia;
  corto: string;
  region: Region;
}[] = [
  { provincia: "Esmeraldas", corto: "Esmeraldas", region: "Costa" },
  { provincia: "Imbabura", corto: "Imbabura", region: "Sierra" },
  { provincia: "Santo Domingo de los Tsáchilas", corto: "Sto. Domingo", region: "Costa" },
  { provincia: "Pichincha", corto: "Pichincha", region: "Sierra" },
  { provincia: "Manabí", corto: "Manabí", region: "Costa" },
  { provincia: "Tungurahua", corto: "Tungurahua", region: "Sierra" },
  { provincia: "Chimborazo", corto: "Chimborazo", region: "Sierra" },
  { provincia: "Guayas", corto: "Guayas", region: "Costa" },
  { provincia: "Azuay", corto: "Azuay", region: "Sierra" },
  { provincia: "El Oro", corto: "El Oro", region: "Costa" },
  { provincia: "Loja", corto: "Loja", region: "Sierra" },
];
