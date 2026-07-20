// Detalle LOCAL de una referencia externa (M2.9).
//
// Antes, el clic en la tarjeta del feed expulsaba al usuario al portal de origen sin
// haber visto nada. Ahora hay dos interacciones separadas:
//   1. La tarjeta abre ESTA página, con fotos, descripción, ciudad y kilometraje.
//   2. Aquí, un botón explícito lleva al anuncio original en pestaña nueva.
//
// Lo que se muestra lo tecleó el aportante, no la plataforma: la etiqueta
// "Referencia externa · datos no verificados" se mantiene visible y arriba.
// El backend solo sirve referencias aprobadas y activas (404 en cualquier otro caso).

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Insignia } from "@/components/BentoCard";
import { obtenerReferenciaDetalle } from "@/lib/api";
import { ApiError, PublicacionReferenciada } from "@/types/api";

function precioFmt(v: number | null): string {
  if (v == null) return "Consultar";
  return `$${v.toLocaleString("es-EC", { maximumFractionDigits: 0 })}`;
}

function tituloVehiculo(p: PublicacionReferenciada): string {
  const partes = [p.marca, p.modelo, p.anio].filter(Boolean);
  return partes.length ? partes.join(" ") : "Vehículo en venta";
}

// Galería: mismas reglas que el anuncio propio — swipe en móvil, principal +
// miniaturas en escritorio. Placeholder si el aportante no subió nada.
function Galeria({ fotos, titulo }: { fotos: string[]; titulo: string }) {
  const [activa, setActiva] = useState(0);

  if (fotos.length === 0) {
    return (
      <div className="flex aspect-[16/10] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-100 text-slate-300 sm:aspect-[16/8]">
        <span className="text-5xl" aria-hidden>
          🚗
        </span>
        <span className="text-xs font-medium">Sin fotos en la referencia</span>
      </div>
    );
  }

  const principal = fotos[Math.min(activa, fotos.length - 1)];
  return (
    <div>
      <div
        tabIndex={0}
        role="group"
        aria-label={`Fotos de ${titulo}: desliza para verlas`}
        className="-mx-6 flex snap-x snap-mandatory gap-2 overflow-x-auto px-6 pb-2 sm:hidden"
      >
        {fotos.map((url, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={url}
            src={url}
            alt={`Foto ${i + 1} de ${titulo}`}
            className="aspect-[4/3] w-[85%] shrink-0 snap-center rounded-2xl object-cover"
          />
        ))}
      </div>

      <div className="hidden sm:block">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 sombra-tarjeta">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={principal}
            alt={`Foto de ${titulo}`}
            className="aspect-[16/9] w-full object-cover"
          />
        </div>
        {fotos.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {fotos.map((url, i) => (
              <button
                key={url}
                type="button"
                onClick={() => setActiva(i)}
                className={`h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                  i === activa ? "border-blue-500" : "border-transparent hover:border-slate-300"
                }`}
                aria-label={`Ver foto ${i + 1} de ${fotos.length}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Miniatura ${i + 1}`} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {fotos.length > 1 && (
        <p className="mt-2 text-center text-[11px] text-slate-400 sm:hidden">
          Desliza para ver las {fotos.length} fotos
        </p>
      )}
    </div>
  );
}

function Fila({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-2 last:border-b-0">
      <dt className="text-sm text-slate-500">{etiqueta}</dt>
      <dd className="text-right text-sm font-semibold text-slate-900">{children}</dd>
    </div>
  );
}

export default function ReferenciaDetallePage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);

  const [ref, setRef] = useState<PublicacionReferenciada | null>(null);
  const [cargando, setCargando] = useState(true);
  const [noEncontrada, setNoEncontrada] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    (async () => {
      if (!Number.isInteger(id) || id <= 0) {
        if (activo) {
          setNoEncontrada(true);
          setCargando(false);
        }
        return;
      }
      try {
        const detalle = await obtenerReferenciaDetalle(id);
        if (activo) setRef(detalle);
      } catch (err) {
        if (!activo) return;
        if (err instanceof ApiError && err.status === 404) {
          setNoEncontrada(true);
        } else {
          setError("No pudimos cargar la referencia. Intenta recargar.");
        }
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, [id]);

  const titulo = ref ? tituloVehiculo(ref) : "";
  const fotos = ref?.fotos?.length ? ref.fotos : ref?.imagen_url ? [ref.imagen_url] : [];

  return (
    <div className="mx-auto max-w-4xl px-6 py-6 sm:py-10">
      <Link href="/marketplace" className="text-sm text-slate-500 hover:text-slate-900">
        ← Volver al marketplace
      </Link>

      {cargando && <p className="mt-6 text-slate-500">Cargando referencia…</p>}

      {noEncontrada && !cargando && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-10 text-center sombra-tarjeta">
          <p className="text-lg font-semibold text-slate-700">
            No encontramos esta referencia.
          </p>
          <p className="mt-1 text-slate-500">
            Puede que ya no esté disponible o que todavía esté en revisión.
          </p>
          <Link
            href="/marketplace"
            className="mt-4 inline-flex rounded-full bg-brand-gradient px-5 py-2.5 text-sm font-semibold text-white"
          >
            Ver otras publicaciones
          </Link>
        </div>
      )}

      {error && !cargando && (
        <p className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          {error}
        </p>
      )}

      {ref && !cargando && (
        <>
          {/* Aviso arriba del todo: el visitante tiene que saber qué está mirando ANTES
              de leer los datos. Nada de esto lo verificó la plataforma. */}
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-bold text-amber-900">
              Referencia externa · datos no verificados
            </p>
            <p className="mt-0.5 text-sm text-amber-800">
              Este anuncio está publicado en {ref.fuente}. Los datos y las fotos los copió
              quien aportó la referencia; nosotros no los verificamos ni intermediamos en la
              venta.
            </p>
          </div>

          <div className="mt-5">
            <Galeria fotos={fotos} titulo={titulo} />
          </div>

          <header className="mt-5">
            <p className="text-4xl font-black leading-none text-slate-900 sm:text-5xl">
              {precioFmt(ref.precio_usd)}
            </p>
            <h1 className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">{titulo}</h1>
            {ref.placa && (
              <p className="mt-0.5 font-mono text-sm tracking-widest text-slate-400">
                {ref.placa}
              </p>
            )}

            {/* Interacción 2: la ÚNICA forma de salir al portal externo, explícita. */}
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <a
                href={ref.url_externa}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-brand-gradient px-6 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
              >
                Ver anuncio original en {ref.fuente} ↗
              </a>
              {ref.placa && (
                <Link
                  href={`/consultar/${encodeURIComponent(ref.placa)}`}
                  className="rounded-full border border-slate-300 bg-white px-6 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Verificar esta placa
                </Link>
              )}
            </div>
            <p className="mt-2 text-xs text-slate-400">
              El enlace abre en una pestaña nueva, en el sitio de {ref.fuente}.
            </p>
          </header>

          {ref.descripcion && (
            <section className="mt-8">
              <h2 className="mb-2 text-lg font-bold text-slate-900">Descripción</h2>
              <p className="whitespace-pre-line rounded-2xl border border-slate-200 bg-white p-5 text-slate-600 sombra-tarjeta">
                {ref.descripcion}
              </p>
            </section>
          )}

          <section className="mt-8">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-slate-900">Datos del anuncio</h2>
              <Insignia tono="alerta">Sin verificar</Insignia>
            </div>
            <dl className="rounded-2xl border border-slate-200 bg-white p-5 sombra-tarjeta">
              {ref.marca && <Fila etiqueta="Marca">{ref.marca}</Fila>}
              {ref.modelo && <Fila etiqueta="Modelo">{ref.modelo}</Fila>}
              {ref.anio != null && <Fila etiqueta="Año">{ref.anio}</Fila>}
              {ref.ciudad && <Fila etiqueta="Ciudad">{ref.ciudad}</Fila>}
              {ref.kilometraje != null && (
                <Fila etiqueta="Kilometraje">
                  {ref.kilometraje.toLocaleString("es-EC")} km
                </Fila>
              )}
              <Fila etiqueta="Portal de origen">{ref.fuente}</Fila>
            </dl>
          </section>
        </>
      )}
    </div>
  );
}
