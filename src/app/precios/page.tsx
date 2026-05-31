import Link from "next/link";

export const metadata = {
  title: "Precios | Revisa tu Carro EC",
  description: "Planes simples para usar Revisa tu Carro EC: Gratis, Pro y Compra-Venta.",
};

const planes = [
  {
    nombre: "Gratis",
    precio: "$0",
    unidad: "/mes",
    descripcion: "Para uso ocasional",
    beneficios: [
      "5 consultas públicas / mes",
      "1 vehículo en tu garage",
      "Datos de ANT, AMT y Fiscalía",
      "Soporte por email",
    ],
    cta: { label: "Crear cuenta gratis", href: "/registro" },
    destacado: false,
  },
  {
    nombre: "Pro",
    precio: "$4.99",
    unidad: "/mes",
    descripcion: "Para dueños activos",
    beneficios: [
      "Consultas ilimitadas",
      "Garage ilimitado",
      "Alertas por email de nuevas citaciones",
      "Exportar a PDF",
      "Soporte prioritario",
    ],
    cta: { label: "Próximamente — súmate a la espera", href: "/registro" },
    destacado: true,
  },
  {
    nombre: "Compra-Venta",
    precio: "$1.99",
    unidad: "/ token",
    descripcion: "Pago por uso",
    beneficios: [
      "Link compartible del historial completo",
      "Tú decides qué campos ver",
      "Token caduca en 7 días",
      "Pack de 5 tokens por $7.99",
      "Ideal para vender tu auto con confianza",
    ],
    cta: { label: "Próximamente", href: "/registro" },
    destacado: false,
  },
];

export default function PreciosPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="text-center">
        <h1 className="text-4xl sm:text-5xl font-bold">
          Planes <span className="text-brand-gradient">simples</span>
        </h1>
        <p className="mt-3 text-slate-600">
          Empieza gratis. Escala cuando lo necesites. Sin contratos ni letra chica.
        </p>
      </div>

      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {planes.map((p) => (
          <article
            key={p.nombre}
            className={`relative rounded-3xl border p-6 sombra-tarjeta ${
              p.destacado
                ? "border-blue-300 bg-white ring-2 ring-blue-500/30"
                : "border-slate-200 bg-white"
            }`}
          >
            {p.destacado && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-gradient px-3 py-1 text-xs font-semibold text-white shadow-sm">
                Más popular
              </span>
            )}
            <h3 className="text-xl font-bold text-slate-900">{p.nombre}</h3>
            <p className="text-sm text-slate-500">{p.descripcion}</p>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-black text-slate-900">{p.precio}</span>
              <span className="text-sm text-slate-400">{p.unidad}</span>
            </div>
            <ul className="mt-5 space-y-2 text-sm text-slate-700">
              {p.beneficios.map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-brand-gradient" />
                  {b}
                </li>
              ))}
            </ul>
            <Link
              href={p.cta.href}
              className={`mt-6 block rounded-xl px-4 py-2.5 text-center text-sm font-semibold ${
                p.destacado
                  ? "bg-brand-gradient text-white shadow-sm hover:opacity-90"
                  : "border border-slate-300 text-slate-700 hover:bg-slate-100"
              }`}
            >
              {p.cta.label}
            </Link>
          </article>
        ))}
      </div>

      <section className="mt-16 sombra-tarjeta rounded-3xl border border-slate-200 bg-white p-8 text-center">
        <h2 className="text-2xl font-bold text-slate-900">¿Por qué cobramos?</h2>
        <p className="mt-3 mx-auto max-w-2xl text-sm text-slate-600">
          Cada consulta dispara hasta 4 procesos automatizados que extraen datos en tiempo real
          de fuentes oficiales. El plan Gratis cubre uso esporádico; los planes pagos sostienen
          la infraestructura y nos permiten agregar features (alertas, OCR, integración con más fuentes).
        </p>
      </section>
    </div>
  );
}