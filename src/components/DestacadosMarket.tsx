// Destacados del market para la home (M2.6: el producto ES el market de autos).
// Muestra primero las premium y completa con estándar hasta `limite`. Si el feed está
// vacío o falla, degrada a un llamado a publicar — la home nunca se rompe por esto.

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { obtenerFeedMarketplace } from "@/lib/api";
import { ListingInternaCard } from "@/components/ListingCard";
import type { PublicacionInterna } from "@/types/api";

const LIMITE = 6;

export function DestacadosMarket() {
  const [autos, setAutos] = useState<PublicacionInterna[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const feed = await obtenerFeedMarketplace();
        // Premium primero (es el orden del feed); se completa con estándar.
        if (activo) setAutos([...feed.premium, ...feed.estandar].slice(0, LIMITE));
      } catch {
        // Silencioso: la home muestra el estado vacío en vez de un error.
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, []);

  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Autos en venta</h2>
          <p className="mt-1 text-slate-600">
            Publicaciones con ficha técnica declarada y datos oficiales de la placa.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Entrada a la vía 3 (referencias) también desde la home: el flujo existe pero
              nadie lo encontraba si solo vivía dentro de /marketplace (M2.7). */}
          <Link
            href="/marketplace/referenciar"
            className="rounded-full px-4 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            🔗 Referenciar anuncio externo
          </Link>
          <Link
            href="/marketplace"
            className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Ver todos →
          </Link>
        </div>
      </div>

      {cargando && <p className="text-slate-500">Cargando publicaciones…</p>}

      {!cargando && autos.length === 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center sombra-tarjeta">
          <p className="text-lg font-semibold text-slate-700">
            Todavía no hay autos publicados.
          </p>
          <p className="mt-1 text-slate-500">
            Sé el primero: publicar es gratis y toma unos minutos.
          </p>
          <Link
            href="/marketplace/publicar"
            className="mt-5 inline-flex rounded-full bg-brand-gradient px-6 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-90"
          >
            Publicar mi auto
          </Link>
        </div>
      )}

      {autos.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {autos.map((p) => (
            <ListingInternaCard key={p.id} pub={p} />
          ))}
        </div>
      )}
    </section>
  );
}
