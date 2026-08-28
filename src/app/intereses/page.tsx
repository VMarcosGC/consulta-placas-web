// "Tus intereses": en un solo lugar los AUTOS y los SERVICIOS que el cliente guardó.
//
// - Autos: favoritos por placa (backend, `useFavoritos`). Se cruzan contra el feed
//   público para pintar la tarjeta con datos frescos (precio de hoy, etc.).
// - Servicios: guardados en `localStorage` (el directorio aún no tiene backend).

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { obtenerFeedMarketplace } from "@/lib/api";
import { useFavoritos } from "@/hooks/useFavoritos";
import { ListingInternaCard, ListingReferenciadaCard } from "@/components/ListingCard";
import { todasLasInternas } from "@/lib/marketplace";
import {
  alternarServicioGuardado,
  useServiciosGuardados,
} from "@/lib/serviciosGuardados";
import { CATEGORIAS_SERVICIO, SERVICIOS } from "@/config/servicios";
import type {
  FeedMarketplace,
  PublicacionInterna,
  PublicacionReferenciada,
} from "@/types/api";

const FEED_VACIO: FeedMarketplace = { premium: [], estandar: [], referenciadas: [] };

export default function InteresesPage() {
  const { control, mapa, haySesion } = useFavoritos();
  const [feed, setFeed] = useState<FeedMarketplace>(FEED_VACIO);
  const [cargando, setCargando] = useState(true);
  const idsServicios = useServiciosGuardados();

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const f = await obtenerFeedMarketplace();
        if (activo) setFeed(f);
      } catch {
        /* silencioso */
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, []);

  const guardada = (placa: string | null | undefined) =>
    !!placa && mapa.has(placa.toUpperCase());

  const internas = todasLasInternas(feed).filter((p: PublicacionInterna) =>
    guardada(p.placa)
  );
  const referenciadas = feed.referenciadas.filter((p: PublicacionReferenciada) =>
    guardada(p.placa)
  );
  const servicios = idsServicios
    .map((id) => SERVICIOS.find((s) => s.id === id))
    .filter((s): s is (typeof SERVICIOS)[number] => s != null);

  const sinAutos = !cargando && internas.length === 0 && referenciadas.length === 0;

  return (
    <div className="espacio-barra-movil mx-auto max-w-6xl px-6 py-8 sm:py-10">
      <h1 className="text-2xl font-black text-tinta sm:text-3xl">Tus intereses</h1>
      <p className="mt-1 text-sm text-secundario">
        Los autos y servicios que guardaste con ♥.
      </p>

      {/* ── Autos ── */}
      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-secundario">
        Autos guardados
      </h2>
      {!haySesion ? (
        <p className="mt-2 text-sm text-secundario">
          <Link href="/login" className="font-semibold text-marca">
            Inicia sesión
          </Link>{" "}
          para guardar autos y verlos acá.
        </p>
      ) : cargando ? (
        <p className="mt-2 text-sm text-secundario">Cargando…</p>
      ) : sinAutos ? (
        <p className="mt-2 text-sm text-secundario">
          Todavía no guardaste ningún auto. Toca el ♥ en cualquier anuncio del{" "}
          <Link href="/marketplace" className="font-semibold text-marca">
            marketplace
          </Link>
          .
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {internas.map((p) => (
            <ListingInternaCard key={`i-${p.id}`} pub={p} favoritos={control} />
          ))}
          {referenciadas.map((p) => (
            <ListingReferenciadaCard key={`r-${p.id}`} pub={p} favoritos={control} />
          ))}
        </div>
      )}

      {/* ── Servicios ── */}
      <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-secundario">
        Servicios guardados
      </h2>
      {servicios.length === 0 ? (
        <p className="mt-2 text-sm text-secundario">
          Sin servicios guardados. Toca el ♥ en{" "}
          <Link href="/servicios" className="font-semibold text-marca">
            Servicios
          </Link>
          .
        </p>
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {servicios.map((s) => {
            const meta = CATEGORIAS_SERVICIO.find((c) => c.clave === s.categoria);
            return (
              <div
                key={s.id}
                className="flex flex-col rounded-2xl border border-borde bg-superficie p-4 sombra-tarjeta"
              >
                <div className="flex items-center gap-2">
                  <span aria-hidden className="text-lg">
                    {meta?.icono}
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-secundario">
                    {meta?.nombre}
                  </span>
                  <button
                    type="button"
                    onClick={() => alternarServicioGuardado(s.id)}
                    aria-label="Quitar de tus intereses"
                    className="ml-auto text-lg leading-none text-marca"
                  >
                    ♥
                  </button>
                </div>
                <h3 className="mt-2 text-base font-bold text-tinta">{s.nombre}</h3>
                <p className="text-sm text-secundario">
                  {s.ciudad} · {s.provincia}
                </p>
                {s.whatsapp && (
                  <a
                    href={`https://wa.me/${s.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex w-fit rounded-full bg-oscuro px-4 py-1.5 text-sm font-semibold text-superficie transition hover:bg-oscuro-suave"
                  >
                    WhatsApp
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
