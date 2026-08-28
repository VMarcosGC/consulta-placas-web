// Publicidad de la portada. NO hay backend de anuncios: cuando entra un promotor o
// contrato, se llena `PUBLICIDAD_HOME` acá (o se apunta a un endpoint más adelante) y
// se redespliega. `null` = no hay pauta → la zona no se renderiza (no invasiva).
//
// Reglas: la tarjeta SIEMPRE lleva la etiqueta "Publicidad" (transparencia), el enlace
// abre en pestaña nueva con `rel="sponsored noopener noreferrer"`, y la imagen debe ser
// del mismo origen permitido por la CSP/Next (Cloudinary u otro host ya configurado en
// next.config). Una sola pauta a la vez.

export type PublicidadHome = {
  /** Texto alternativo de la imagen (accesibilidad). Obligatorio. */
  alt: string;
  /** URL de la imagen del anuncio (horizontal, ~3:1). */
  imagen: string;
  /** A dónde lleva el clic. */
  href: string;
  /** Nombre del anunciante, para el pie "Pauta de …". Opcional. */
  anunciante?: string;
  /** CTA corto sobre la imagen. Opcional. */
  cta?: string;
};

export const PUBLICIDAD_HOME: PublicidadHome | null = null;
