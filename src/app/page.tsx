// Landing market-first (M2.6). El producto ES el market de autos: comprar y vender con
// transparencia. La consulta por placa baja a "Herramientas" — sigue accesible y completa,
// pero deja de ser la promesa principal mientras las fuentes estatales sigan bloqueadas.
// Español de Ecuador (tuteo), tono no agresivo.

import Link from "next/link";
import { ConsultaForm } from "@/components/ConsultaForm";
import { DestacadosMarket } from "@/components/DestacadosMarket";

export default function Home() {
  return (
    <div>
      <HeroSection />
      <DestacadosMarket />
      <ValoresSection />
      <HerramientasSection />
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
          Ficha técnica declarada + datos oficiales de la placa
        </span>
        <h1 className="mt-6 text-5xl sm:text-7xl font-black tracking-tight leading-[1.05] text-slate-900">
          Compra y vende autos<br />
          con <span className="text-brand-gradient">transparencia</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
          Cada anuncio muestra la ficha técnica que declara el vendedor y, junto a ella, los
          datos oficiales de la placa: matrícula e infracciones. Así sabes qué estás viendo
          antes de ir a verlo.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/marketplace"
            className="w-full rounded-full bg-brand-gradient px-8 py-3.5 text-center text-sm font-semibold text-white shadow-sm transition hover:opacity-90 sm:w-auto"
          >
            Ver autos en venta
          </Link>
          <Link
            href="/marketplace/publicar"
            className="w-full rounded-full border border-slate-300 bg-white px-8 py-3.5 text-center text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:w-auto"
          >
            Publica tu auto
          </Link>
        </div>
        <p className="mt-4 text-xs text-slate-400">
          Publicar es gratis. Ver los anuncios no necesita cuenta.
        </p>
      </div>
    </section>
  );
}

function ValoresSection() {
  const items = [
    {
      titulo: "Ficha técnica completa",
      texto: "Motor y suspensión, carrocería e interiores. El vendedor declara lo que sabe y el anuncio muestra qué tan completa está su ficha.",
      emoji: "📋",
      href: "/marketplace",
    },
    {
      titulo: "Datos oficiales de la placa",
      texto: "Junto a lo declarado, el anuncio muestra matrícula e infracciones consultadas en las fuentes públicas (ANT, AMT).",
      emoji: "🔍",
      href: "/consultar",
    },
    {
      titulo: "Tu garage privado",
      texto: "Kilometraje, mantenimientos y dueños históricos. Un historial documentado es tu mejor argumento al vender.",
      emoji: "🔧",
      href: "/mi-garage",
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

// Consulta por placa: ahora es una HERRAMIENTA de apoyo al market, no la promesa principal.
// Sigue accesible y completa en /consultar; acá solo pierde protagonismo.
function HerramientasSection() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-16">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 sombra-tarjeta sm:p-10">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Herramientas
        </span>
        <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
          Consulta el historial de una placa
        </h2>
        <p className="mt-2 max-w-2xl text-slate-600">
          ¿Te interesa un auto que viste en otro lado? Consulta su placa: matriculación e
          infracciones de las fuentes públicas disponibles. Los datos básicos son gratis y
          no necesitas cuenta.
        </p>
        <div className="mt-6 max-w-md">
          <ConsultaForm tamanio="compacto" />
        </div>
      </div>
    </section>
  );
}

function PlanesSection() {
  return (
    <section id="planes" className="mx-auto max-w-6xl px-6 py-20">
      <div className="text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Precios claros</h2>
        <p className="mt-2 text-slate-600">
          Publicar y completar tu ficha es gratis. Pagas con tokens solo lo que tiene costo
          o valor real.
        </p>
      </div>
      <div className="mt-10 grid gap-5 md:grid-cols-2">
        <PlanCard
          nombre="Gratis"
          precio="$0"
          unidad="siempre"
          descripcion="Publicar y navegar el market"
          beneficios={[
            "Publica tu auto en el feed estándar",
            "Ficha técnica completa y fotos",
            "Ver todos los anuncios sin cuenta",
            "Consulta pública de placa: datos básicos",
          ]}
          cta={{ label: "Publicar gratis", href: "/marketplace/publicar" }}
          destacado={false}
        />
        <PlanCard
          nombre="Datos por tokens"
          precio="$0.04"
          unidad="/ token"
          descripcion="Destaca tu anuncio o desbloquea datos"
          beneficios={[
            "Publicación Premium destacada y verificable",
            "Identificadores técnicos y multas con valores",
            "Desde $1 = 25 tokens",
            "5 tokens de cortesía al registrarte",
          ]}
          cta={{ label: "Ver precios", href: "/precios" }}
          destacado
        />
      </div>
      <p className="mt-8 text-center text-xs text-slate-400">
        1 token ≈ USD 0.04. Los pagos llegan cuando integremos el gateway local
        (PlaceToPay/MercadoPago). Mientras tanto, regístrate y recibe 5 tokens de cortesía.
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
      <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
        ¿Vendes tu auto?
      </h2>
      <p className="mt-3 text-slate-600">
        Publicar es gratis. Mientras más completa la ficha, más confianza genera tu anuncio
        — y completarla no cuesta tokens.
      </p>
      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          href="/marketplace/publicar"
          className="w-full rounded-full bg-brand-gradient px-8 py-3.5 text-center text-sm font-semibold text-white shadow-sm transition hover:opacity-90 sm:w-auto"
        >
          Publicar mi auto
        </Link>
        <Link
          href="/marketplace"
          className="w-full rounded-full border border-slate-300 bg-white px-8 py-3.5 text-center text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:w-auto"
        >
          Ver autos en venta
        </Link>
      </div>
    </section>
  );
}
