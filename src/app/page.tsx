import Link from "next/link";
import { ConsultaForm } from "@/components/ConsultaForm";

export default function Home() {
  return (
    <div>
      <HeroSection />
      <ValoresSection />
      <PlanesSection />
      <CtaSection />
    </div>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Glow de fondo claro */}
      <div aria-hidden className="hero-glow pointer-events-none absolute inset-0 -z-10" />
      <div className="mx-auto max-w-4xl px-6 pt-20 pb-16 text-center sm:pt-28">
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          ANT · AMT · SRI · Fiscalía — en una sola consulta
        </span>
        <h1 className="mt-6 text-5xl sm:text-7xl font-black tracking-tight leading-[1.05] text-slate-900">
          Conoce el <span className="text-brand-gradient">estado real</span><br />
          de cualquier vehículo<br />
          del Ecuador
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
          Matriculación, citaciones, infracciones municipales y denuncias asociadas.
          Datos oficiales agregados en segundos. Sin registro para consultas básicas.
        </p>
        <div className="mt-10 mx-auto max-w-xl">
          <ConsultaForm tamanio="hero" />
        </div>
      </div>
    </section>
  );
}

function ValoresSection() {
  const items = [
    {
      titulo: "Datos oficiales",
      texto: "Consultamos en tiempo real ANT, AMT y Fiscalía. No almacenamos información sensible.",
      emoji: "🔍",
      href: "/consultar",
    },
    {
      titulo: "Historial privado",
      texto: "Tu garage personal con kilometraje, mantenimientos y dueños históricos. Solo para ti.",
      emoji: "📋",
      href: "/mi-garage",
    },
    {
      titulo: "Modo compra-venta",
      texto: "Publica tu auto o comparte un enlace temporal con un comprador. Tú decides qué ve.",
      emoji: "🤝",
      href: "/marketplace",
    },
  ];
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <div className="grid gap-6 sm:grid-cols-3">
        {items.map((it) => (
          <Link
            key={it.titulo}
            href={it.href}
            className="group sombra-tarjeta block rounded-3xl border border-slate-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-blue-300"
          >
            <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-brand-gradient text-2xl shadow-sm">
              {it.emoji}
            </div>
            <h3 className="text-lg font-semibold text-slate-900">
              {it.titulo}
              <span className="ml-1 text-slate-300 transition group-hover:text-blue-500">→</span>
            </h3>
            <p className="mt-2 text-sm text-slate-600">{it.texto}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function PlanesSection() {
  return (
    <section id="planes" className="mx-auto max-w-6xl px-6 py-20">
      <div className="text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Planes simples</h2>
        <p className="mt-2 text-slate-600">Empieza gratis, escala cuando lo necesites.</p>
      </div>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        <PlanCard
          nombre="Gratis"
          precio="$0"
          unidad="/mes"
          descripcion="Para uso ocasional"
          beneficios={[
            "5 consultas públicas / mes",
            "1 vehículo en tu garage",
            "Soporte por email",
          ]}
          cta={{ label: "Empezar", href: "/registro" }}
          destacado={false}
        />
        <PlanCard
          nombre="Pro"
          precio="$4.99"
          unidad="/mes"
          descripcion="Para dueños activos"
          beneficios={[
            "Consultas ilimitadas",
            "Garage ilimitado",
            "Alertas por email de nuevas citaciones",
            "Exportar a PDF",
          ]}
          cta={{ label: "Próximamente", href: "#" }}
          destacado
        />
        <PlanCard
          nombre="Compra-Venta"
          precio="$1.99"
          unidad="/ token"
          descripcion="Pago por uso"
          beneficios={[
            "Link compartible del historial",
            "Tú decides qué campos ver",
            "Caduca en 7 días",
            "Pack de 5 tokens: $7.99",
          ]}
          cta={{ label: "Próximamente", href: "#" }}
          destacado={false}
        />
      </div>
      <p className="mt-8 text-center text-xs text-slate-400">
        Los pagos llegan cuando integremos el gateway local (PlaceToPay/MercadoPago). Mientras tanto, regístrate gratis y reserva tu lugar.
      </p>
    </section>
  );
}

interface PlanProps {
  nombre: string;
  precio: string;
  unidad: string;
  descripcion: string;
  beneficios: string[];
  cta: { label: string; href: string };
  destacado: boolean;
}

function PlanCard({ nombre, precio, unidad, descripcion, beneficios, cta, destacado }: PlanProps) {
  return (
    <article
      className={`relative rounded-3xl border p-6 ${
        destacado
          ? "border-blue-300 bg-white ring-2 ring-blue-500/30 sombra-tarjeta"
          : "border-slate-200 bg-white sombra-tarjeta"
      }`}
    >
      {destacado && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-gradient px-3 py-1 text-xs font-semibold text-white shadow-sm">
          Más popular
        </span>
      )}
      <h3 className="text-xl font-bold text-slate-900">{nombre}</h3>
      <p className="text-sm text-slate-500">{descripcion}</p>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-4xl font-black text-slate-900">{precio}</span>
        <span className="text-sm text-slate-400">{unidad}</span>
      </div>
      <ul className="mt-5 space-y-2 text-sm text-slate-700">
        {beneficios.map((b) => (
          <li key={b} className="flex items-start gap-2">
            <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-brand-gradient" />
            {b}
          </li>
        ))}
      </ul>
      <Link
        href={cta.href}
        className={`mt-6 block rounded-xl px-4 py-2.5 text-center text-sm font-semibold ${
          destacado
            ? "bg-brand-gradient text-white shadow-sm hover:opacity-90"
            : "border border-slate-300 text-slate-700 hover:bg-slate-100"
        }`}
      >
        {cta.label}
      </Link>
    </article>
  );
}

function CtaSection() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-20 text-center">
      <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">¿Consultas una placa ahora?</h2>
      <p className="mt-3 text-slate-600">
        En menos de un minuto te decimos todo lo que sabe el Estado sobre ese vehículo.
      </p>
      <div className="mt-6 mx-auto max-w-md">
        <ConsultaForm tamanio="compacto" />
      </div>
    </section>
  );
}
