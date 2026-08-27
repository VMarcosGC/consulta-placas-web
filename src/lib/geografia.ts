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
