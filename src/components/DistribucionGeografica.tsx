// "¿Dónde están los autos?" — bloque de la portada.
//
// Un MAPA visual del Ecuador con el conteo de publicaciones activas por provincia;
// tocar una provincia abre el marketplace ya filtrado (`?provincia=`). Debajo, un
// resumen por región (también enlaza, `?region=`). Datos de `GET /marketplace/distribucion`.
//
// NO invasivo: si la llamada falla o no hay stock ubicado, no se renderiza y la
// portada sigue igual. Lint: ningún setState corre síncrono en el efecto.

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapaEcuador } from "@/components/MapaEcuador";
import { obtenerDistribucionGeografica } from "@/lib/api";
import type { DistribucionGeografica as Distribucion } from "@/types/api";

async function traer(): Promise<Distribucion | null> {
  try {
    return await obtenerDistribucionGeografica();
  } catch {
    return null; // la portada debe seguir viva si el backend está caído
  }
}

export function DistribucionGeografica() {
  const router = useRouter();
  const [datos, setDatos] = useState<Distribucion | null>(null);

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

  const porProvincia: Record<string, number> = {};
  for (const r of datos.regiones) {
    for (const p of r.provincias) porProvincia[p.provincia] = p.total;
  }

  return (
    <section className="mx-auto max-w-5xl px-6 pb-20">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-secundario">
          ¿Dónde están los autos?
        </h2>
        <p className="font-mono text-xs text-secundario">
          {datos.con_ubicacion} de {datos.total} ubicados
        </p>
      </div>

      <div className="grid items-center gap-6 sm:grid-cols-[minmax(0,320px)_1fr]">
        <MapaEcuador
          porProvincia={porProvincia}
          onSeleccion={(prov) => {
            if (prov) router.push(`/marketplace?provincia=${encodeURIComponent(prov)}`);
          }}
        />

        {/* Resumen por región — enlaces directos. */}
        <ul className="space-y-2">
          {datos.regiones.map((region) => (
            <li key={region.region}>
              <Link
                href={`/marketplace?region=${encodeURIComponent(region.region)}`}
                className="group flex items-baseline justify-between gap-3 rounded-2xl border border-borde bg-superficie px-4 py-3 transition hover:border-borde-fuerte"
              >
                <span className="font-semibold text-tinta group-hover:underline">
                  {region.region}
                </span>
                <span className="font-mono text-xs text-secundario">
                  {region.total} {region.total === 1 ? "auto" : "autos"} →
                </span>
              </Link>
              <div className="mt-1 flex flex-wrap gap-1.5 px-1">
                {region.provincias.map((p) => (
                  <Link
                    key={p.provincia}
                    href={`/marketplace?provincia=${encodeURIComponent(p.provincia)}`}
                    className="rounded-full border border-borde px-2 py-0.5 text-[11px] text-secundario hover:border-borde-fuerte hover:text-tinta"
                  >
                    {p.provincia} · {p.total}
                  </Link>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
