// Marketplace público: feed mixto en tres niveles.
//   1) Premium / Verificados (destacados, arriba)
//   2) Estándar (light)
//   3) Referenciados externos (al pie)
// Anónimo (no requiere sesión). El botón "Publicar" lleva al formulario (que sí pide login).

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { obtenerFeedMarketplace } from "@/lib/api";
import { ListingInternaCard, ListingReferenciadaCard } from "@/components/ListingCard";
import type { FeedMarketplace } from "@/types/api";

const FEED_VACIO: FeedMarketplace = { premium: [], estandar: [], referenciadas: [] };

function Seccion({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-slate-900">{titulo}</h2>
        {descripcion && <p className="text-sm text-slate-500">{descripcion}</p>}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}

export default function MarketplacePage() {
  const [feed, setFeed] = useState<FeedMarketplace>(FEED_VACIO);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const data = await obtenerFeedMarketplace();
        if (!activo) return;
        setFeed(data);
        setError(null);
      } catch {
        if (activo) setError("No pudimos cargar el marketplace. Probá recargar.");
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, []);

  const vacio =
    !cargando &&
    feed.premium.length === 0 &&
    feed.estandar.length === 0 &&
    feed.referenciadas.length === 0;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900">
            Marketplace <span className="text-brand-gradient">de vehículos</span>
          </h1>
          <p className="mt-1 text-slate-500">
            Autos publicados por la comunidad y referencias de portales externos.
          </p>
        </div>
        <Link
          href="/marketplace/publicar"
          className="inline-flex items-center justify-center rounded-full bg-brand-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90"
        >
          + Publicar mi auto
        </Link>
      </header>

      {cargando && <p className="text-slate-500">Cargando publicaciones…</p>}
      {error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">{error}</p>
      )}

      {vacio && (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center sombra-tarjeta">
          <p className="text-lg font-semibold text-slate-700">Todavía no hay publicaciones.</p>
          <p className="mt-1 text-slate-500">Sé el primero en publicar tu vehículo.</p>
          <Link
            href="/marketplace/publicar"
            className="mt-4 inline-flex rounded-full bg-brand-gradient px-5 py-2.5 text-sm font-semibold text-white"
          >
            Publicar ahora
          </Link>
        </div>
      )}

      {feed.premium.length > 0 && (
        <Seccion
          titulo="★ Destacados Premium"
          descripcion="Publicaciones verificadas y con historial documentado"
        >
          {feed.premium.map((p) => (
            <ListingInternaCard key={p.id} pub={p} />
          ))}
        </Seccion>
      )}

      {feed.estandar.length > 0 && (
        <Seccion titulo="En venta">
          {feed.estandar.map((p) => (
            <ListingInternaCard key={p.id} pub={p} />
          ))}
        </Seccion>
      )}

      {feed.referenciadas.length > 0 && (
        <Seccion
          titulo="Referencias externas"
          descripcion="Anuncios de otros portales. La plataforma no los verifica."
        >
          {feed.referenciadas.map((p) => (
            <ListingReferenciadaCard key={p.id} pub={p} />
          ))}
        </Seccion>
      )}
    </div>
  );
}
