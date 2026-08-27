// Antigüedad de una publicación, para mostrar "hace N semanas" y marcar las rezagadas.
//
// El backend (migración 0026) ya manda `semanas_publicada` y `vigente` derivados de
// `renovada_en` (internas) o `creado_en` (referencias). Este helper solo les da forma
// de texto es-EC. Si el backend es viejo y no manda `semanas_publicada`, se cae a
// calcular desde `renovada_en` / `creado_en`; si tampoco hay fecha, no se muestra nada.
//
// Regla de producto: a las 3 semanas sin renovar (`vigente === false`) el anuncio baja
// al final del feed y de la búsqueda, y el dueño puede renovarlo.

type EntradaAntiguedad = {
  semanas_publicada?: number;
  vigente?: boolean;
  renovada_en?: string;
  creado_en?: string;
};

export type Antiguedad = {
  /** "Publicado esta semana" · "hace 1 semana" · "hace 4 semanas" */
  texto: string;
  /** true = ya perdió vigencia (rezagada). El backend lo dice con `vigente=false`. */
  vencido: boolean;
  semanas: number;
};

function semanasDesde(iso: string): number | null {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const dias = Math.floor((Date.now() - t) / 86_400_000);
  return Math.max(0, Math.floor(dias / 7));
}

export function antiguedadDe(p: EntradaAntiguedad): Antiguedad | null {
  let semanas = p.semanas_publicada;
  if (semanas == null) {
    const iso = p.renovada_en ?? p.creado_en;
    if (!iso) return null;
    const calc = semanasDesde(iso);
    if (calc == null) return null;
    semanas = calc;
  }

  const texto =
    semanas <= 0
      ? "Publicado esta semana"
      : `Publicado hace ${semanas} ${semanas === 1 ? "semana" : "semanas"}`;

  // Si el backend no mandó `vigente`, se infiere con el mismo umbral (3 semanas).
  const vencido = p.vigente === undefined ? semanas >= 3 : !p.vigente;

  return { texto, vencido, semanas };
}
