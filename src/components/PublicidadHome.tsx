// Zona de publicidad de la portada. No invasiva: si no hay pauta activa
// (`PUBLICIDAD_HOME === null`) no se renderiza nada. Cuando la hay, es UNA tarjeta,
// etiquetada "Publicidad", que se integra con el ritmo de la portada (mismo ancho,
// misma sombra) sin gritar. El enlace sale del sitio en pestaña nueva y marcado como
// `sponsored`.

import { PUBLICIDAD_HOME } from "@/config/publicidad";

export function PublicidadHome() {
  const pauta = PUBLICIDAD_HOME;
  if (!pauta) return null;

  return (
    <section className="mx-auto max-w-5xl px-6 pb-16">
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded-full border border-borde px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secundario">
          Publicidad
        </span>
        {pauta.anunciante && (
          <span className="text-[11px] text-secundario">Pauta de {pauta.anunciante}</span>
        )}
      </div>

      <a
        href={pauta.href}
        target="_blank"
        rel="sponsored noopener noreferrer"
        className="group relative block overflow-hidden rounded-3xl border border-borde bg-superficie-tenue sombra-tarjeta"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={pauta.imagen}
          alt={pauta.alt}
          loading="lazy"
          className="aspect-[3/1] w-full object-cover transition duration-300 group-hover:scale-[1.02]"
        />
        {pauta.cta && (
          <span className="absolute bottom-3 left-3 rounded-full bg-black/55 px-3 py-1 text-xs font-semibold text-white">
            {pauta.cta}
          </span>
        )}
      </a>
    </section>
  );
}
