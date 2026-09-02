// Directorio de servicios automotrices (talleres, mecánicas certificadas, centros de
// servicio, lavaderos, luces, accesorios/lujos). VERSIÓN 1: sin backend.
//
// `SERVICIOS_DEMO` son ~80 ejemplos SIMULADOS para navegar la sección mientras no hay
// negocios reales. Cuando entren negocios de verdad se agregan a `SERVICIOS_REALES` (y,
// más adelante, a su propio módulo con alta desde la web). La página muestra la unión.
// El alta de negocios NO es automática: llegan por el CTA "Súmate".
//
// `icono` es un componente SVG monocromo (`Iconos.tsx`), no un emoji: un emoji de
// color (🛡️💡✨🫧) rompe la paleta "Grafito" casi monocroma más que cualquier otra
// cosa en la página. El componente hereda `currentColor`, así que calza con el tema.

import {
  IconoBombilla,
  IconoChispa,
  IconoFabrica,
  IconoGota,
  IconoLlave,
  IconoPuntos,
} from "@/components/Iconos";

// "Mecánica certificada" salió como sección propia (decisión Marcos, 2026-08-30): no
// hay todavía un proceso real de certificación de talleres, así que separar la
// categoría prometía algo que no cumplimos. Los negocios que el backend traiga con
// `categoria = "mecanica_certificada"` se muestran bajo "Mecánica general"
// (ver `desdeApi` en app/servicios/page.tsx). El backend conserva el valor válido.
export const CATEGORIAS_SERVICIO = [
  { clave: "mecanica", nombre: "Mecánica general", icono: IconoLlave },
  { clave: "centro_servicio", nombre: "Centro de servicio", icono: IconoFabrica },
  { clave: "lavadero", nombre: "Lavadero", icono: IconoGota },
  { clave: "luces", nombre: "Luces y eléctrico", icono: IconoBombilla },
  { clave: "accesorios", nombre: "Accesorios y lujos", icono: IconoChispa },
  { clave: "otro", nombre: "Otro", icono: IconoPuntos },
] as const;

export type CategoriaServicio = (typeof CATEGORIAS_SERVICIO)[number]["clave"];

export type Servicio = {
  id: string;
  nombre: string;
  categoria: CategoriaServicio;
  ciudad: string;
  provincia: string;
  descripcion?: string;
  /** Teléfono en E.164 sin `+` (ej. 593987654321) para armar el enlace de WhatsApp. */
  whatsapp?: string;
  telefono?: string;
  direccion?: string;
  /** Texto libre ("Lun a Vie 8:00–18:00 · Sáb 8:00–13:00"). */
  horario?: string;
  /** true = la plataforma revisó sus credenciales (mecánica certificada). */
  certificado?: boolean;
  /** true = el negocio recibe solicitudes de cita en línea (agendamiento, migración 0034). */
  acepta_agendamiento?: boolean;
  /** DEMO = ejemplo simulado, no un negocio real. */
  demo?: boolean;
};

// Horario de atención típico de un taller/negocio automotriz en Ecuador. Se usa como
// relleno para los ejemplos demo; los negocios reales cargan el suyo.
const HORARIOS_DEMO = [
  "Lun a Vie 8:00–18:00 · Sáb 8:00–13:00",
  "Lun a Sáb 8:30–17:30",
  "Lun a Vie 9:00–19:00 · Sáb 9:00–14:00",
  "Lun a Vie 8:00–17:00",
];

// Negocios reales (se llenan a mano cuando alguien se suma por el CTA).
export const SERVICIOS_REALES: Servicio[] = [];

// ── Generación de los ~80 ejemplos simulados ────────────────────────────────
const CIUDADES: [string, string][] = [
  ["Quito", "Pichincha"],
  ["Guayaquil", "Guayas"],
  ["Cuenca", "Azuay"],
  ["Ambato", "Tungurahua"],
  ["Manta", "Manabí"],
  ["Portoviejo", "Manabí"],
  ["Machala", "El Oro"],
  ["Santo Domingo", "Santo Domingo de los Tsáchilas"],
  ["Loja", "Loja"],
  ["Ibarra", "Imbabura"],
  ["Riobamba", "Chimborazo"],
  ["Esmeraldas", "Esmeraldas"],
];

const APELLIDOS = [
  "Vera", "Cedeño", "Pérez", "Loor", "Zambrano", "Guerrero", "Andrade",
  "Chávez", "Mera", "Ponce", "Salazar", "Quiroz", "Bravo", "Cabrera",
];
const SECTORES = [
  "Centro", "Norte", "Sur", "La Y", "El Recreo", "Terminal", "Vía a la Costa",
  "Los Ceibos", "La Bahía", "Ejido", "Redondel",
];

const PLANTILLAS: Record<CategoriaServicio, (a: string, c: string, s: string) => { nombre: string; descripcion: string }> = {
  mecanica: (a, c) => ({ nombre: `Taller ${a}`, descripcion: `Mecánica general, frenos y suspensión en ${c}.` }),
  centro_servicio: (_a, c) => ({ nombre: `AutoService ${c}`, descripcion: `Mantenimiento por kilometraje, ABC de motor y aceites.` }),
  lavadero: (_a, c, s) => ({ nombre: `Lavadero Express ${s}`, descripcion: `Lavado a presión, aspirado y encerado en ${c}.` }),
  luces: (_a, c) => ({ nombre: `AutoLuces ${c}`, descripcion: `Instalación de luces LED, xenón y revisión eléctrica.` }),
  accesorios: (_a, c) => ({ nombre: `Accesorios y Lujos ${c}`, descripcion: `Láminas de seguridad, forros, molduras y sonido.` }),
  otro: (_a, c) => ({ nombre: `Servicio Automotriz ${c}`, descripcion: `Servicios varios para tu auto en ${c}.` }),
};

function _telefono(i: number): string {
  // 09 + 8 dígitos → E.164 sin `+`: 593 9 XXXXXXXX
  return `5939${String(10_000_000 + (i * 811_237) % 89_999_999)}`;
}

const SERVICIOS_DEMO: Servicio[] = (() => {
  const cats = CATEGORIAS_SERVICIO.map((c) => c.clave);
  const out: Servicio[] = [];
  let i = 0;
  for (const [ciudad, provincia] of CIUDADES) {
    for (const cat of cats) {
      // ~1 por (ciudad, categoría) = 12 × 7 = 84
      const a = APELLIDOS[i % APELLIDOS.length];
      const s = SECTORES[i % SECTORES.length];
      const { nombre, descripcion } = PLANTILLAS[cat](a, ciudad, s);
      out.push({
        id: `demo-${i}`,
        nombre,
        categoria: cat,
        ciudad,
        provincia,
        descripcion,
        whatsapp: _telefono(i),
        telefono: _telefono(i),
        direccion: `Av. ${s} y Calle ${a}, ${ciudad}`,
        horario: HORARIOS_DEMO[i % HORARIOS_DEMO.length],
        demo: true,
      });
      i += 1;
    }
  }
  return out;
})();

export const SERVICIOS: Servicio[] = [...SERVICIOS_REALES, ...SERVICIOS_DEMO];

// A dónde escribe un negocio que quiere aparecer. wa.me con mensaje prellenado.
export const CONTACTO_ALTA_NEGOCIO =
  "https://wa.me/593000000000?text=" +
  encodeURIComponent(
    "Hola, tengo un negocio de servicio automotriz y quiero sumarlo a CarStore Ec."
  );
