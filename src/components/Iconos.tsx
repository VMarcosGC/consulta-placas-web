// Set de iconos MONOCROMOS en línea (currentColor), mismo trazo que
// `BarraNavegacionMovil` (1.75, sin puntas). Existen para sacar los EMOJI de color
// (🔧🛡️💡✨🫧🏭🔍🚗) de los tiles/categorías: en el sistema "Grafito" (casi
// monocromo) un emoji de color rompe la paleta más que cualquier otra cosa — es
// justo lo que hace que "los colores no hagan juego entre zonas". El ícono hereda
// el color del texto que lo envuelve (tinta/marca/secundario/superficie…), así que
// siempre calza con el tema y con el tinte del bloque donde vive.
//
// Sin librería de iconos (igual que el resto del repo): SVG a mano, 24×24.

export type PropsIcono = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function IconoAuto({ className }: PropsIcono) {
  return (
    <svg {...base} className={className}>
      <path d="M4 16.5V11l1.9-4.3A2 2 0 0 1 7.7 5.5h8.6a2 2 0 0 1 1.8 1.2L20 11v5.5" />
      <path d="M2.8 11h18.4" />
      <circle cx="7.5" cy="16.5" r="1.7" />
      <circle cx="16.5" cy="16.5" r="1.7" />
    </svg>
  );
}

export function IconoMegafono({ className }: PropsIcono) {
  return (
    <svg {...base} className={className}>
      <path d="M3 10v4a1 1 0 0 0 1 1h2l1.2 4.2a1 1 0 0 0 1 .8H10l-.8-5" />
      <path d="M6 10 16.5 5v14L6 14" />
      <path d="M16.5 8.2c1.6.6 2.5 1.9 2.5 3.8s-.9 3.2-2.5 3.8" />
    </svg>
  );
}

export function IconoGarage({ className }: PropsIcono) {
  return (
    <svg {...base} className={className}>
      <path d="M3.5 20V10.2L12 4l8.5 6.2V20" />
      <path d="M3.5 20h17" />
      <path d="M6.5 20v-6.5h11V20" />
      <path d="M9 20v-3.2M15 20v-3.2" />
    </svg>
  );
}

export function IconoLlave({ className }: PropsIcono) {
  return (
    <svg {...base} className={className}>
      <path d="M14.7 6.3a3.5 3.5 0 0 0-4.6 4.6l-6 6a1.6 1.6 0 0 0 2.3 2.3l6-6a3.5 3.5 0 0 0 4.6-4.6l-2 2-2-2 2-2z" />
    </svg>
  );
}

export function IconoEscudo({ className }: PropsIcono) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3.5 5 6v5.5c0 4.4 2.9 7.6 7 9 4.1-1.4 7-4.6 7-9V6l-7-2.5Z" />
      <path d="m9 12 2.1 2.1L15.3 10" />
    </svg>
  );
}

export function IconoFabrica({ className }: PropsIcono) {
  return (
    <svg {...base} className={className}>
      <path d="M3.5 20V12l4.5 3V12l4.5 3V12l4-2.8V20" />
      <path d="M3.5 20h17" />
      <path d="M16.5 9.2V6l2-1.5V9.2" />
    </svg>
  );
}

export function IconoGota({ className }: PropsIcono) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3.5c2.8 3.6 5.5 6.9 5.5 10.2a5.5 5.5 0 1 1-11 0c0-3.3 2.7-6.6 5.5-10.2Z" />
    </svg>
  );
}

export function IconoBombilla({ className }: PropsIcono) {
  return (
    <svg {...base} className={className}>
      <path d="M9 18h6" />
      <path d="M10 21h4" />
      <path d="M12 3.5a5.5 5.5 0 0 0-3.2 10c.7.5 1.2 1.3 1.2 2.2v.3h4v-.3c0-.9.5-1.7 1.2-2.2a5.5 5.5 0 0 0-3.2-10Z" />
    </svg>
  );
}

export function IconoChispa({ className }: PropsIcono) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3.5c.5 3 1.9 4.4 4.9 4.9-3 .5-4.4 1.9-4.9 4.9-.5-3-1.9-4.4-4.9-4.9 3-.5 4.4-1.9 4.9-4.9Z" />
      <path d="M18.5 14.5c.3 1.6 1 2.3 2.6 2.6-1.6.3-2.3 1-2.6 2.6-.3-1.6-1-2.3-2.6-2.6 1.6-.3 2.3-1 2.6-2.6Z" />
    </svg>
  );
}

export function IconoPuntos({ className }: PropsIcono) {
  return (
    <svg {...base} className={className}>
      <circle cx="6" cy="12" r="1.4" />
      <circle cx="12" cy="12" r="1.4" />
      <circle cx="18" cy="12" r="1.4" />
    </svg>
  );
}

export function IconoLupa({ className }: PropsIcono) {
  return (
    <svg {...base} className={className}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m20 20-4.8-4.8" />
    </svg>
  );
}

export function IconoPin({ className }: PropsIcono) {
  return (
    <svg {...base} className={className}>
      <path d="M12 21s-6.5-5.9-6.5-11A6.5 6.5 0 0 1 18.5 10c0 5.1-6.5 11-6.5 11Z" />
      <circle cx="12" cy="10" r="2.2" />
    </svg>
  );
}

export function IconoReloj({ className }: PropsIcono) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

export function IconoAgenda({ className }: PropsIcono) {
  return (
    <svg {...base} className={className}>
      <rect x="4" y="5.5" width="16" height="15" rx="2" />
      <path d="M4 10h16" />
      <path d="M8 3.5v3.5M16 3.5v3.5" />
      <path d="M8.5 14h2M8.5 17h5" />
    </svg>
  );
}

export function IconoChat({ className }: PropsIcono) {
  return (
    <svg {...base} className={className}>
      <path d="M4 5.5h16a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5H9l-4 3.5V16.5H4A1.5 1.5 0 0 1 2.5 15V7A1.5 1.5 0 0 1 4 5.5Z" />
      <path d="M7.5 10h9M7.5 13h6" />
    </svg>
  );
}
