// "¿Dónde están los autos?" — bloque de la portada.
//
// Muestra cuántas publicaciones activas hay por REGIÓN y PROVINCIA, y cada una es un
// enlace que abre el marketplace ya filtrado (`?region=` / `?provincia=`). Los datos
// salen de `GET /marketplace/distribucion` (derivado de `ciudad` en el backend).
//
// No es un mapa SVG (peso en gama baja + solo ~11 provincias con datos): es una lista
// por región con barras de proporción. Si algún día se quiere el mapa del Ecuador,
// va encima de esto sin tocar el resto.
//
// NO invasivo: si la llamada falla o no hay stock ubicado, el bloque no se renderiza
// y la portada sigue igual. Lint: ningún setState corre síncrono en el efecto (todos
// después del await), mismo patrón que useFavoritos / DestacadosMarket.

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { obtenerDistribucionGeografica } from "@/lib/api";
import type { DistribucionGeografica } from "@/types/api";

async function traer(): Promise<DistribucionGeografica | null> {
  try {
    return await obtenerDistribucionGeografica();
  } catch {
    return null; // la portada debe seguir viva si el backend está caído
  }
}

export function DistribucionGeografica() {
  const [datos, setDatos] = useState<DistribucionGeografica | null>(null);

  useEffect(() => {
    let activo = true;
    (async () => {
      const d = await traer();
      if (activo) setDatos(d);
    })();
    return () => {
      activo = false;
    };
  }, []);

  if (!datos || datos.con_ubicacion === 0) return null;

  const maxProvincia = Math.max(
    1,
    ...datos.regiones.flatMap((r) => r.provincias.map((p) => p.total))
  );

  return (
    <section className="mx-auto max-w-5xl px-6 pb-20">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-secundario">
          ¿Dónde están los autos?
        </h2>
        <p className="font-mono text-xs text-secundario">
          {datos.con_ubicacion} de {datos.total} ubicados
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {datos.regiones.map((region) => (
          <div
            key={region.region}
            className="sombra-tarjeta rounded-3xl border border-borde bg-superficie p-5"
          >
            <Link
              href={`/marketplace?region=${encodeURIComponent(region.region)}`}
              className="group flex items-baseline justify-between gap-2"
            >
              <span className="text-base font-semibold text-tinta group-hover:underline">
                {region.region}
              </span>
              <span className="font-mono text-xs text-secundario">
                {region.total} {region.total === 1 ? "auto" : "autos"} →
              </span>
            </Link>

            <ul className="mt-3 space-y-2">
              {region.provincias.map((prov) => (
                <li key={prov.provincia}>
                  <Link
                    href={`/marketplace?provincia=${encodeURIComponent(prov.provincia)}`}
                    className="group block"
                  >
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="truncate text-secundario group-hover:text-tinta">
                        {prov.provincia}
                      </span>
                      <span className="shrink-0 font-mono text-xs text-secundario">
                        {prov.total}
                      </span>
                    </div>
                    {/* Barra de proporción — decorativa, `--marca` (gris templado). */}
                    <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-superficie-tenue">
                      <div
                        className="h-full rounded-full bg-marca transition-all"
                        style={{ width: `${(prov.total / maxProvincia) * 100}%` }}
                      />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
