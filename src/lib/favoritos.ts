// Helpers de PRESENTACIÓN de favoritos (MC1, carril comprador).
// No transforman datos del backend: solo indexan la lista que ya vino y calculan la
// diferencia de precio que pinta el badge. El estado vive en src/hooks/usarFavoritos.ts.

import type { Favorito } from "@/types/api";

// Contrato que una tarjeta necesita para pintar y operar su ♡. Se pasa como una sola
// prop opcional: donde no hay favoritos (home, mis-publicaciones) simplemente se omite
// y la tarjeta sigue funcionando igual que antes.
export interface ControlFavoritos {
  /** ¿Esta placa ya está guardada? */
  esFavorito: (placa: string) => boolean;
  /** Hay una operación en vuelo para esta placa (deshabilita el botón). */
  ocupado: (placa: string) => boolean;
  /** Alterna el favorito. `precioActual` se guarda como referencia de precio. */
  alternar: (placa: string, precioActual: number | null) => void;
}

// Índice placa → favorito. La placa es la clave real del módulo de favoritos.
export function indexarPorPlaca(favoritos: Favorito[]): Map<string, Favorito> {
  return new Map(favoritos.map((f) => [f.placa.toUpperCase(), f]));
}

// Cuánto bajó el precio desde que el usuario lo guardó, o null si no aplica.
// Reglas: sin precio guardado o sin precio actual → null (badge silencioso). Una SUBIDA
// nunca se anuncia (no es una buena noticia para el comprador y ensucia la lista).
// `precio_al_guardar` llega del backend como Numeric; se normaliza con Number por si
// el serializador lo entrega como texto.
export function bajaDePrecio(
  favorito: Favorito | undefined,
  precioActual: number | null | undefined
): number | null {
  if (!favorito || favorito.precio_al_guardar == null) return null;
  if (precioActual == null) return null;
  const guardado = Number(favorito.precio_al_guardar);
  const actual = Number(precioActual);
  if (!Number.isFinite(guardado) || !Number.isFinite(actual)) return null;
  const diferencia = guardado - actual;
  return diferencia > 0 ? diferencia : null;
}
