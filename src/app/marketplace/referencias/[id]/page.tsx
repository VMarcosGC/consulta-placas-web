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
import { precioNum } from "@/lib/precio";
import { ApiError, PublicacionReferenciada } from "@/types/api";

// `v` llega tipado `number` pero el backend lo manda como string decimal; se
// normaliza con `precioNum` antes de formatear (ver src/lib/precio.ts).
function precioFmt(v: number | string | null | undefined): string {
  const n = precioNum(v);
  if (n == null) return "Consultar";
  return `$${n.toLocaleString("es-EC", { maximumFractionDigits: 0 })}`;
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
      <div className="flex aspect-[16/10] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-borde bg-superficie-tenue text-secundario sm:aspect-[16/8]">
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
        <div className="overflow-hidden rounded-2xl border border-borde bg-superficie-tenue sombra-tarjeta">
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
                  i === activa ? "border-marca" : "border-transparent hover:border-borde-fuerte"
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
        <p className="mt-2 text-center text-[11px] text-secundario sm:hidden">
          Desliza para ver las {fotos.length} fotos
        </p>
      )}
    </div>
  );
}

function Fila({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-borde-suave py-2 last:border-b-0">
      <dt className="text-sm text-secundario">{etiqueta}</dt>
      <dd className="text-right text-sm font-semibold text-tinta">{children}</dd>
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
      <Link href="/marketplace" className="text-sm text-secundario hover:text-tinta">
        ← Volver al marketplace
      </Link>

      {cargando && <p className="mt-6 text-secundario">Cargando referencia…</p>}

      {noEncontrada && !cargando && (
        <div className="mt-6 rounded-2xl border border-borde bg-superficie p-10 text-center sombra-tarjeta">
          <p className="text-lg font-semibold text-secundario">
            No encontramos esta referencia.
          </p>
          <p className="mt-1 text-secundario">
            Puede que ya no esté disponible o que todavía esté en revisión.
          </p>
          <Link
            href="/marketplace"
            className="mt-4 inline-flex rounded-full bg-oscuro px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-oscuro-suave"
          >
            Ver otras publicaciones
          </Link>
        </div>
      )}

      {error && !cargando && (
        <p className="mt-6 rounded-xl border border-error bg-error-tinte p-4 text-error">
          {error}
        </p>
      )}

      {ref && !cargando && (
        <>
          {/* Aviso arriba del todo: el visitante tiene que saber qué está mirando ANTES
              de leer los datos. Nada de esto lo verificó la plataforma. */}
          <div className="mt-4 rounded-2xl border border-declarado bg-declarado-tinte p-4">
            <p className="text-sm font-bold text-declarado-texto">
              Referencia externa · datos no verificados
            </p>
            <p className="mt-0.5 text-sm text-declarado-texto">
              Este anuncio está publicado en {ref.fuente}. Los datos y las fotos los copió
              quien aportó la referencia; nosotros no los verificamos ni intermediamos en la
              venta.
            </p>
          </div>

          <div className="mt-5">
            <Galeria fotos={fotos} titulo={titulo} />
          </div>

          <header className="mt-5">
            <p className="text-4xl font-black leading-none text-tinta sm:text-5xl">
              {precioFmt(ref.precio_usd)}
            </p>
            <h1 className="mt-2 text-xl font-bold text-tinta sm:text-2xl">{titulo}</h1>
            {ref.placa && (
              <p className="mt-0.5 font-mono text-sm tracking-widest text-secundario">
                {ref.placa}
              </p>
            )}

            {/* Interacción 2: la ÚNICA forma de salir al portal externo, explícita. */}
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <a
                href={ref.url_externa}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-accion px-6 py-3 text-center text-sm font-semibold text-superficie shadow-sm transition hover:opacity-90"
              >
                Ver anuncio original en {ref.fuente} ↗
              </a>
              {ref.placa && (
                <Link
                  href={`/consultar/${encodeURIComponent(ref.placa)}`}
                  className="rounded-full border border-borde-fuerte bg-superficie px-6 py-3 text-center text-sm font-semibold text-secundario transition hover:bg-superficie-tenue"
                >
                  Verificar esta placa
                </Link>
              )}
            </div>
            <p className="mt-2 text-xs text-secundario">
              El enlace abre en una pestaña nueva, en el sitio de {ref.fuente}.
            </p>
          </header>

          {ref.descripcion && (
            <section className="mt-8">
              <h2 className="mb-2 text-lg font-bold text-tinta">Descripción</h2>
              <p className="whitespace-pre-line rounded-2xl border border-borde bg-superficie p-5 text-secundario sombra-tarjeta">
                {ref.descripcion}
              </p>
            </section>
          )}

          <section className="mt-8">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-tinta">Datos del anuncio</h2>
              <Insignia tono="neutro">Sin verificar</Insignia>
            </div>
            <dl className="rounded-2xl border border-borde bg-superficie p-5 sombra-tarjeta">
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
