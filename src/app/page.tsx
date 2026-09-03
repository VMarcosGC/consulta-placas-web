// Página inicial = HUB: reparte entre los dos servicios de CarStore —
//   1. Verificar un vehículo (consulta de datos por placa, superficie aislada /verificar)
//   2. Comprar, vender y servicios (el marketplace)
// Debajo, accesos directos a las áreas del market + el mapa de stock + publicidad.
//
// Orden: dos puertas → "Entra directo a" (4 tarjetas) → mapa → publicidad.
// Español de Ecuador (tuteo).

import Link from "next/link";
import { DistribucionGeografica } from "@/components/DistribucionGeografica";
import {
  IconoAuto,
  IconoGarage,
  IconoLlave,
  IconoLupa,
  IconoMegafono,
} from "@/components/Iconos";
import { PublicidadHome } from "@/components/PublicidadHome";

export default function Home() {
  return (
    <div className="espacio-barra-movil">
      <PuertasSection />
      <AccesosSection />
      <DistribucionGeografica />
      <PublicidadHome />
    </div>
  );
}

// Las DOS puertas de entrada. Es la decisión de primer nivel: ¿vengo a averiguar algo
// de un auto, o a comprar/vender? Todo lo demás cuelga de la segunda.
function PuertasSection() {
  const puertas = [
    {
      chip: "Consultar",
      titulo: "Verificar un vehículo",
      texto:
        "Escribe una placa y mira su identificación, estado de matrícula y multas. Lo básico es gratis, sin cuenta.",
      Icono: IconoLupa,
      href: "/verificar",
      cta: "Consultar una placa",
    },
    {
      chip: "Comprar y vender",
      titulo: "Marketplace y servicios",
      texto:
        "Anuncios con ficha técnica, publica el tuyo gratis, y encuentra talleres y lavaderos de tu ciudad.",
      Icono: IconoAuto,
      href: "/marketplace",
      cta: "Entrar al marketplace",
    },
  ];
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="hero-glow pointer-events-none absolute inset-0 -z-10" />
      <div className="mx-auto max-w-4xl px-6 pt-8 pb-6 sm:pt-14 sm:pb-10">
        <h1 className="text-center text-[26px] font-black leading-[1.1] tracking-tight text-tinta sm:text-4xl">
          Tu garage local en Ecuador
        </h1>
        <p className="mx-auto mt-3 max-w-md text-center text-sm text-secundario sm:text-base">
          Averigua los datos de un auto, o compra y vende con su ficha técnica.
        </p>
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          {puertas.map((p) => (
            <Link
              key={p.titulo}
              href={p.href}
              className="group sombra-tarjeta flex flex-col rounded-2xl border border-borde bg-superficie p-5 transition hover:-translate-y-0.5 hover:border-borde-fuerte"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-marca-tinte text-marca-texto transition group-hover:scale-105">
                  <p.Icono className="h-5 w-5" />
                </span>
                <span className="rounded-full border border-borde px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secundario">
                  {p.chip}
                </span>
              </div>
              <h2 className="mt-3 text-lg font-black leading-tight text-tinta">
                {p.titulo}
              </h2>
              <p className="mt-1.5 flex-1 text-sm text-secundario">{p.texto}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-tinta">
                {p.cta}
                <span className="transition group-hover:translate-x-0.5">→</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// Accesos directos a las áreas del marketplace (cuelgan de la 2ª puerta).
function AccesosSection() {
  const accesos = [
    {
      chip: "Comprar",
      titulo: "Ver autos en venta",
      texto: "Busca por marca, precio o ciudad y filtra por lo que te importa.",
      Icono: IconoAuto,
      href: "/marketplace",
      cta: "Ir al marketplace",
    },
    {
      chip: "Vender",
      titulo: "Publicar mi auto",
      texto: "Datos, ficha técnica y fotos. Gratis y tu anuncio aparece al instante.",
      Icono: IconoMegafono,
      href: "/marketplace/publicar",
      cta: "Publicar ahora",
    },
    {
      chip: "Tu historial",
      titulo: "Mi garage",
      texto: "Kilometraje, mantenimientos y dueños. Un historial documentado vende mejor.",
      Icono: IconoGarage,
      href: "/mi-garage",
      cta: "Abrir mi garage",
    },
    {
      chip: "Servicios",
      titulo: "Servicios para tu auto",
      texto: "Mecánicas, centros de servicio, lavaderos, luces y accesorios de tu ciudad.",
      Icono: IconoLlave,
      href: "/servicios",
      cta: "Ver servicios",
    },
  ];
  return (
    <section className="mx-auto max-w-5xl px-6 pb-12">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-secundario">
        Entra directo a
      </h2>
      {/* 2×2 en celular (compacto, entra en una pantalla), 4 en línea desde lg. */}
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {accesos.map((a) => (
          <Link
            key={a.titulo}
            href={a.href}
            className="group sombra-tarjeta flex flex-col rounded-xl border border-borde bg-superficie p-3 transition hover:-translate-y-0.5 hover:border-borde-fuerte sm:p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-marca-tinte text-marca-texto transition group-hover:scale-105">
                <a.Icono className="h-[18px] w-[18px]" />
              </span>
              <span className="rounded-full border border-borde px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-secundario">
                {a.chip}
              </span>
            </div>
            <h3 className="mt-2.5 text-sm font-bold leading-tight text-tinta sm:text-base">
              {a.titulo}
            </h3>
            <p className="mt-1 hidden flex-1 text-xs text-secundario sm:block">{a.texto}</p>
            <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-tinta sm:text-sm">
              {a.cta}
              <span className="transition group-hover:translate-x-0.5">→</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
