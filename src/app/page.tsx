// Página inicial: NO es un feed de autos (eso vive en /marketplace). Es un resumen
// de lo que hay en la web —comprar, vender, garage— con UN enlace directo a cada área.
//
// Sin dobles interacciones: el hero no lleva botones; la navegación del inicio son las
// tres tarjetas de abajo, una por destino y sin repetirse entre sí.
//
// La consulta de placa / datos oficiales quedó en stand-by (pendiente de resolver de
// dónde salen los datos), así que no aparece acá. Español de Ecuador (tuteo), sin
// lenguaje agresivo.

import Link from "next/link";

export default function Home() {
  return (
    // `espacio-barra-movil`: reserva abajo el alto de la barra de navegación de celular
    // (fixed) para que el último bloque no quede tapado. 0 desde `md`.
    <div className="espacio-barra-movil">
      <HeroSection />
      <ResumenSection />
    </div>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="hero-glow pointer-events-none absolute inset-0 -z-10" />
      <div className="mx-auto max-w-3xl px-6 pt-12 pb-10 text-center sm:pt-24 sm:pb-14">
        <span className="inline-flex items-center gap-2 rounded-full border border-borde bg-superficie px-3 py-1 text-xs font-medium text-secundario shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-confirmado" />
          Cada anuncio con su ficha técnica
        </span>
        <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight text-tinta sm:mt-6 sm:text-6xl">
          Compra y vende autos en Ecuador
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-secundario">
          Un solo lugar para ver anuncios y publicar el tuyo. Cada auto viene con la
          ficha técnica que declara el vendedor.
        </p>
        <p className="mt-5 text-xs text-secundario">
          Publicar es gratis · Ver los anuncios no necesita cuenta
        </p>
      </div>
    </section>
  );
}

// Resumen de lo que hay en la web: una tarjeta por área, cada una con enlace directo.
// Es la navegación principal del inicio, por eso el hero no repite estos accesos.
function ResumenSection() {
  const areas = [
    {
      titulo: "Ver autos en venta",
      texto:
        "Explora el marketplace. Busca por marca, precio o ciudad y filtra por lo que te importa.",
      emoji: "🚗",
      href: "/marketplace",
    },
    {
      titulo: "Publicar mi auto",
      texto:
        "Datos básicos, ficha técnica y fotos. Es gratis y tu anuncio aparece al instante.",
      emoji: "📢",
      href: "/marketplace/publicar",
    },
    {
      titulo: "Mi garage",
      texto:
        "Kilometraje, mantenimientos y dueños históricos. Un historial documentado vende mejor.",
      emoji: "🔧",
      href: "/mi-garage",
    },
  ];
  return (
    <section className="mx-auto max-w-5xl px-6 pb-24">
      <div className="grid gap-4 sm:grid-cols-3">
        {areas.map((a) => (
          <Link
            key={a.titulo}
            href={a.href}
            className="group sombra-tarjeta flex flex-col rounded-3xl border border-borde bg-superficie p-6 transition hover:-translate-y-0.5 hover:border-borde-fuerte"
          >
            <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-superficie-tenue text-2xl">
              {a.emoji}
            </div>
            <h3 className="text-lg font-semibold text-tinta">
              {a.titulo}
              <span className="ml-1 inline-block text-secundario transition group-hover:translate-x-0.5 group-hover:text-tinta">
                →
              </span>
            </h3>
            <p className="mt-2 text-sm text-secundario">{a.texto}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
