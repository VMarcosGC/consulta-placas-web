// Cubeta de tiempo para la leyenda flotante del feed ("¿en qué momento estoy?").
// Igual que Facebook Marketplace: Hoy · Ayer · Esta semana · Este mes · <Mes Año>.

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

function aMediaNoche(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Etiqueta de la cubeta a la que pertenece `iso` respecto de `ahora`. "" si no parsea. */
export function cubetaTiempo(iso: string | null | undefined, ahora = new Date()): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";

  const dias = Math.round((aMediaNoche(ahora) - aMediaNoche(d)) / 86_400_000);
  if (dias <= 0) return "Hoy";
  if (dias === 1) return "Ayer";
  if (dias < 7) return "Esta semana";
  if (d.getFullYear() === ahora.getFullYear() && d.getMonth() === ahora.getMonth())
    return "Este mes";

  const mes = MESES[d.getMonth()];
  const capitalizado = mes.charAt(0).toUpperCase() + mes.slice(1);
  return d.getFullYear() === ahora.getFullYear()
    ? capitalizado
    : `${capitalizado} ${d.getFullYear()}`;
}
