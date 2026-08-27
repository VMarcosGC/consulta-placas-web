// Destacados del market para la home (M2.6: el producto ES el market de autos).
// Muestra primero las premium y completa con estándar hasta `limite`. Si el feed está
// vacío o falla, degrada a un llamado a publicar — la home nunca se rompe por esto.

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { obtenerFeedMarketplace } from "@/lib/api";
import { EsqueletoTarjetas } from "@/components/EsqueletoTarjetas";
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
          <h2 className="text-3xl font-bold text-tinta">Autos en venta</h2>
          <p className="mt-1 text-secundario">
            Publicaciones con ficha técnica declarada y datos oficiales de la placa.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Entrada a la vía 3 (referencias) también desde la home: el flujo existe pero
              nadie lo encontraba si solo vivía dentro de /marketplace (M2.7). */}
          <Link
            href="/marketplace/referenciar"
            className="rounded-full px-4 py-2.5 text-sm font-semibold text-secundario hover:text-tinta"
          >
            🔗 Referenciar anuncio externo
          </Link>
          <Link
            href="/marketplace"
            className="rounded-full border border-borde-fuerte bg-superficie px-5 py-2.5 text-sm font-semibold text-secundario shadow-sm hover:bg-superficie-tenue"
          >
            Ver todos →
          </Link>
        </div>
      </div>

      {cargando && <EsqueletoTarjetas cantidad={6} />}

      {!cargando && autos.length === 0 && (
        <div className="rounded-3xl border border-borde bg-superficie p-10 text-center sombra-tarjeta">
          <p className="text-lg font-semibold text-secundario">
            Todavía no hay autos publicados.
          </p>
          <p className="mt-1 text-secundario">
            Sé el primero: publicar es gratis y toma unos minutos.
          </p>
          <Link
            href="/marketplace/publicar"
            className="mt-5 inline-flex rounded-full bg-accion px-6 py-3 text-sm font-semibold text-superficie shadow-sm hover:opacity-90"
          >
            Publicar mi auto
          </Link>
        </div>
      )}

      {autos.length > 0 && (
        // 2 columnas en móvil, igual que la grilla de `/marketplace`: una tarjeta por
        // fila obligaba a seis pantallas de scroll para ver seis autos en la home. En
        // desktop sube a la densidad de la Dirección C (hasta 4 por fila).
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {autos.map((p) => (
            <ListingInternaCard key={p.id} pub={p} />
          ))}
        </div>
      )}
    </section>
  );
}
