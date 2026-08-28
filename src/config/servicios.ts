// Directorio de servicios automotrices (talleres, mecánicas certificadas, centros de
// servicio, lavaderos, luces, accesorios/lujos). VERSIÓN 1: sin backend — la lista se
// llena aquí a mano cuando un negocio se suma (mismo patrón que `publicidad.ts`).
// Cuando haya volumen se moverá a su propio módulo con alta desde la web.
//
// El alta de negocios NO es automática: llegan por el CTA "Súmate" y se agregan acá.

export const CATEGORIAS_SERVICIO = [
  { clave: "mecanica", nombre: "Mecánica general", icono: "🔧" },
  { clave: "mecanica_certificada", nombre: "Mecánica certificada", icono: "🛡️" },
  { clave: "centro_servicio", nombre: "Centro de servicio", icono: "🏭" },
  { clave: "lavadero", nombre: "Lavadero", icono: "🫧" },
  { clave: "luces", nombre: "Luces y eléctrico", icono: "💡" },
  { clave: "accesorios", nombre: "Accesorios y lujos", icono: "✨" },
  { clave: "otro", nombre: "Otro", icono: "🚗" },
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
  /** true = la plataforma revisó sus credenciales (mecánica certificada). */
  certificado?: boolean;
};

// Vacío hasta que se sumen negocios reales. La página muestra el estado vacío + el CTA.
export const SERVICIOS: Servicio[] = [];

// A dónde escribe un negocio que quiere aparecer. wa.me con mensaje prellenado.
export const CONTACTO_ALTA_NEGOCIO =
  "https://wa.me/593000000000?text=" +
  encodeURIComponent(
    "Hola, tengo un negocio de servicio automotriz y quiero sumarlo a CarStore Ec."
  );
