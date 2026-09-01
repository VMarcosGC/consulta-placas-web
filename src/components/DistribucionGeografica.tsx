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

function esperar(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// El backend (Render free) tiene cold start de ~30s tras inactividad: el primer
// fetch de la portada puede fallar por eso, no porque el servicio esté caído. Antes
// un solo intento fallido ocultaba el mapa para siempre (hasta recargar la página).
// Con 2 reintentos con backoff, un cold start típico ya no se nota.
async function traer(): Promise<Distribucion | null> {
  for (const espera of [0, 2000, 5000]) {
    if (espera) await esperar(espera);
    try {
      return await obtenerDistribucionGeografica();
    } catch {
      // sigue al próximo intento; si se acaban, la portada queda igual sin el mapa
    }
  }
  return null;
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

      {/* El MAPA es lo predominante: ancho completo, arriba. */}
      <MapaEcuador
        porProvincia={porProvincia}
        onSeleccion={(prov) => {
          if (prov) router.push(`/marketplace?provincia=${encodeURIComponent(prov)}`);
        }}
      />

      {/* Leyendas en TEXTO, debajo del mapa: región + sus provincias, cada una enlaza. */}
      <div className="mt-6 grid gap-x-8 gap-y-3 sm:grid-cols-2">
        {datos.regiones.map((region) => (
          <div key={region.region}>
            <Link
              href={`/marketplace?region=${encodeURIComponent(region.region)}`}
              className="group flex items-baseline justify-between gap-3 border-b border-borde pb-1"
            >
              <span className="text-sm font-bold text-tinta group-hover:underline">
                {region.region}
              </span>
              <span className="font-mono text-xs text-secundario">
                {region.total} {region.total === 1 ? "auto" : "autos"} →
              </span>
            </Link>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
              {region.provincias.map((p) => (
                <Link
                  key={p.provincia}
                  href={`/marketplace?provincia=${encodeURIComponent(p.provincia)}`}
                  className="text-[13px] text-secundario hover:text-tinta"
                >
                  {p.provincia} <span className="font-mono text-secundario">· {p.total}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
