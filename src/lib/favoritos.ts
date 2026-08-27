// Helpers de PRESENTACIÓN de favoritos (MC1, carril comprador).
// No transforman datos del backend: solo indexan la lista que ya vino y calculan la
// diferencia de precio que pinta el badge. El estado vive en src/hooks/usarFavoritos.ts.

import { precioNum } from "@/lib/precio";
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
// Tanto `precio_al_guardar` como el precio actual llegan del backend como string
// decimal; se normalizan en el borde con `precioNum` (ver src/lib/precio.ts).
export function bajaDePrecio(
  favorito: Favorito | undefined,
  precioActual: number | string | null | undefined
): number | null {
  if (!favorito) return null;
  const guardado = precioNum(favorito.precio_al_guardar);
  const actual = precioNum(precioActual);
  if (guardado == null || actual == null) return null;
  const diferencia = guardado - actual;
  return diferencia > 0 ? diferencia : null;
}
