// LANDING (`/`) = el front inicial. Una sola decisión: ¿vengo a consultar una placa,
// o al marketplace (y todo lo demás: publicar, servicios, garage, intereses)?
//
// Pantalla limpia y aislada: NO lleva el Header del marketplace ni su nav (eso vive
// dentro del market). Solo su barra mínima (`BarraLanding`), las dos puertas, y el
// mapa de stock como señal de que hay inventario real. Español de Ecuador (tuteo).

import Link from "next/link";
import { BarraLanding } from "@/components/BarraLanding";
import { DistribucionGeografica } from "@/components/DistribucionGeografica";
import { IconoAuto, IconoLupa } from "@/components/Iconos";

const PUERTAS = [
  {
    chip: "Consultar",
    titulo: "Consultar una placa",
    texto:
      "Escribe una placa y mira su identificación, estado de matrícula y multas. Lo básico es gratis, sin cuenta.",
    Icono: IconoLupa,
    href: "/verificar",
    cta: "Ir a consultar",
  },
  {
    chip: "Comprar y vender",
    titulo: "Marketplace y servicios",
    texto:
      "Anuncios con ficha técnica, publica el tuyo gratis, tu garage, y talleres de tu ciudad.",
    Icono: IconoAuto,
    href: "/marketplace",
    cta: "Entrar al marketplace",
  },
];

export default function Landing() {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-lienzo">
      <BarraLanding />

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div aria-hidden className="hero-glow pointer-events-none absolute inset-0 -z-10" />
          <div className="mx-auto max-w-3xl px-6 pt-10 pb-8 sm:pt-16 sm:pb-12">
            <h1 className="text-center text-[28px] font-black leading-[1.1] tracking-tight text-tinta sm:text-4xl">
              Tu garage local en Ecuador
            </h1>
            <p className="mx-auto mt-3 max-w-md text-center text-sm text-secundario sm:text-base">
              ¿A qué vienes hoy?
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {PUERTAS.map((p) => (
                <Link
                  key={p.titulo}
                  href={p.href}
                  className="group sombra-tarjeta flex flex-col rounded-2xl border border-borde bg-superficie p-6 transition hover:-translate-y-0.5 hover:border-borde-fuerte"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-marca-tinte text-marca-texto transition group-hover:scale-105">
                      <p.Icono className="h-6 w-6" />
                    </span>
                    <span className="rounded-full border border-borde px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secundario">
                      {p.chip}
                    </span>
                  </div>
                  <h2 className="mt-4 text-xl font-black leading-tight text-tinta">
                    {p.titulo}
                  </h2>
                  <p className="mt-2 flex-1 text-sm text-secundario">{p.texto}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-tinta">
                    {p.cta}
                    <span className="transition group-hover:translate-x-0.5">→</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Señal de inventario real. No es navegación: es "hay autos de verdad acá". */}
        <div className="mx-auto max-w-5xl px-6 pb-14">
          <DistribucionGeografica />
        </div>
      </main>

      <footer className="border-t border-borde px-5 py-6 text-center text-xs text-secundario">
        CarStore Ec · Tu garage local para comprar y vender
      </footer>
    </div>
  );
}
