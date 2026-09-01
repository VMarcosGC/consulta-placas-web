// Página inicial: NO es un feed de autos (eso vive en /marketplace). Es un resumen
// ordenado de lo que hay en la web —comprar, vender, garage— con UN enlace directo a
// cada área, y debajo el mapa de dónde hay stock.
//
// Orden: hero compacto → "¿Qué quieres hacer?" (4 tarjetas, 2×2 en celular) → mapa → publicidad.
// El hero es CHICO a propósito para que en celular se vean ya las tarjetas.
//
// La consulta de placa / datos oficiales quedó en stand-by. Español de Ecuador (tuteo).

import Link from "next/link";
import { DistribucionGeografica } from "@/components/DistribucionGeografica";
import { IconoAuto, IconoGarage, IconoLlave, IconoMegafono } from "@/components/Iconos";
import { PublicidadHome } from "@/components/PublicidadHome";

export default function Home() {
  return (
    <div className="espacio-barra-movil">
      <HeroSection />
      <AccesosSection />
      <DistribucionGeografica />
      <PublicidadHome />
    </div>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="hero-glow pointer-events-none absolute inset-0 -z-10" />
      <div className="mx-auto max-w-2xl px-6 pt-8 pb-7 text-center sm:pt-16 sm:pb-12">
        <span className="inline-flex items-center gap-2 rounded-full border border-borde bg-superficie px-3 py-1 text-[11px] font-medium text-secundario shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-confirmado" />
          Cada anuncio con su ficha técnica
        </span>
        <h1 className="mt-4 text-[26px] font-black leading-[1.1] tracking-tight text-tinta sm:mt-5 sm:text-4xl">
          Compra y vende autos en Ecuador
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-secundario sm:text-base">
          Un solo lugar para ver anuncios y publicar el tuyo, cada uno con su ficha técnica.
        </p>
        <p className="mt-3 text-[11px] text-secundario">
          Publicar es gratis · Ver los anuncios no necesita cuenta
        </p>
      </div>
    </section>
  );
}

// Los tres accesos del inicio. Es la navegación principal — el hero no los repite.
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
        ¿Qué quieres hacer?
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
