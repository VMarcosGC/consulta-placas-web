// Helper de PRESENTACIÓN del precio.
//
// El backend serializa `precio_usd` (y `precio_al_guardar`) como STRING decimal
// ("22000.00"), aunque el mirror de tipos lo declare `number` para calzar con el
// contrato OpenAPI. Antes de formatear, comparar o restar hay que normalizarlo a
// número en el borde con esta función.
//
// Por qué importa: `String.prototype.toLocaleString()` IGNORA las opciones, así que
// `"22000.00".toLocaleString("es-EC", { maximumFractionDigits: 0 })` devuelve
// "22000.00" tal cual y en pantalla se ve "$22000.00" en vez de "$22.000".
//
// No transforma datos (el frontend lee y pinta): solo castea el string del contrato
// al number que el resto del código ya asumía.
export function precioNum(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}
