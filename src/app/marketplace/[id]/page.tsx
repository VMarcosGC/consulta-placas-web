// Detalle público de una publicación del marketplace: el anuncio (título, precio,
// marca/modelo/año, sello "Verificado", resumen de mantenimientos) + la ficha técnica
// por bloques (Motor y suspensión / Carrocería / Interiores / Extras) con barra de
// completitud. Anónimo (sin sesión). 404 si no existe o no está activa.
//
// Regla del proyecto: el frontend NO transforma datos; solo lee y pinta lo que el
// backend consolida. Los estados/booleanos declarativos llevan "declarado por el
// vendedor" porque la plataforma no los verifica.

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { BentoCard, Insignia } from "@/components/BentoCard";
import { listarMisPublicaciones, obtenerPublicacionDetalle } from "@/lib/api";
import { tieneSesion } from "@/lib/auth";
import {
  COMBUSTIBLE_LABEL,
  ESTADO_COMPONENTE_LABEL,
  ESTADO_PINTURA_LABEL,
  MATERIAL_ASIENTOS_LABEL,
  TIPO_CARROCERIA_LABEL,
  TRACCION_LABEL,
  TRANSMISION_LABEL,
  colorCompletitud,
  fichaIncompleta,
  fichaPendiente,
  tonoEstadoComponente,
} from "@/lib/ficha";
import {
  ApiError,
  EstadoComponente,
  FichaSalida,
  FotoSalida,
  PublicacionDetalle,
} from "@/types/api";

function precioFmt(v: number | null): string {
  if (v == null) return "Consultar";
  return `$${v.toLocaleString("es-EC", { maximumFractionDigits: 0 })}`;
}

function tituloVehiculo(p: PublicacionDetalle): string {
  if (p.titulo) return p.titulo;
  const partes = [p.marca, p.modelo, p.anio].filter(Boolean);
  return partes.length ? partes.join(" ") : "Vehículo en venta";
}

// ── Fila de dato de la ficha ────────────────────────────────────────────────
// Los campos declarativos sensibles llevan la etiqueta "declarado por el vendedor".

function Fila({
  etiqueta,
  children,
  sensible,
}: {
  etiqueta: string;
  children: React.ReactNode;
  sensible?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-2 last:border-b-0">
      <dt className="text-sm text-slate-500">
        {etiqueta}
        {sensible && (
          <span className="ml-1.5 align-middle text-[10px] font-medium uppercase tracking-wide text-amber-600">
            declarado por el vendedor
          </span>
        )}
      </dt>
      <dd className="text-right text-sm font-semibold text-slate-900">{children}</dd>
    </div>
  );
}

function ValorEstado({ estado }: { estado: EstadoComponente }) {
  return <Insignia tono={tonoEstadoComponente(estado)}>{ESTADO_COMPONENTE_LABEL[estado]}</Insignia>;
}

function ValorBool({ valor }: { valor: boolean }) {
  return <span>{valor ? "Sí" : "No"}</span>;
}

// Un bloque de la ficha; si no tiene ningún dato, no se renderiza.
function BloqueFicha({
  titulo,
  vacio,
  children,
}: {
  titulo: string;
  vacio: boolean;
  children: React.ReactNode;
}) {
  if (vacio) return null;
  return (
    <BentoCard titulo={titulo}>
      <dl>{children}</dl>
    </BentoCard>
  );
}

// ── Sección de ficha completa ───────────────────────────────────────────────

function FichaTecnica({ ficha }: { ficha: FichaSalida }) {
  const ms = ficha.motor_suspension;
  const ca = ficha.carroceria;
  const it = ficha.interiores;
  const tieneAlgo =
    ms != null || ca != null || it != null || ficha.extras.length > 0;

  return (
    <section className="mt-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-900">Ficha técnica</h2>
        {/* Bajo el umbral el porcentaje no aporta; se dice claro (M2.5). */}
        {fichaIncompleta(ficha.completitud) ? (
          <Insignia tono="alerta">Ficha incompleta</Insignia>
        ) : (
          <BarraCompletitud pct={ficha.completitud} />
        )}
      </div>

      {!tieneAlgo && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center sombra-tarjeta">
          <p className="text-slate-600">
            El vendedor aún no completó la ficha técnica de este vehículo.
          </p>
        </div>
      )}

      {tieneAlgo && (
        <>
          <p className="mb-4 text-xs text-slate-400">
            Los datos de estado y condición son declarados por el vendedor; la plataforma
            no los verifica.
          </p>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <BloqueFicha titulo="Motor y suspensión" vacio={ms == null}>
              {ms?.combustible && (
                <Fila etiqueta="Combustible">{COMBUSTIBLE_LABEL[ms.combustible]}</Fila>
              )}
              {ms?.cilindraje_cc != null && (
                <Fila etiqueta="Cilindraje">{ms.cilindraje_cc.toLocaleString("es-EC")} cc</Fila>
              )}
              {ms?.transmision && (
                <Fila etiqueta="Transmisión">{TRANSMISION_LABEL[ms.transmision]}</Fila>
              )}
              {ms?.traccion && <Fila etiqueta="Tracción">{TRACCION_LABEL[ms.traccion]}</Fila>}
              {ms?.estado_motor && (
                <Fila etiqueta="Estado del motor" sensible>
                  <ValorEstado estado={ms.estado_motor} />
                </Fila>
              )}
              {ms?.estado_suspension && (
                <Fila etiqueta="Estado de la suspensión" sensible>
                  <ValorEstado estado={ms.estado_suspension} />
                </Fila>
              )}
              {ms?.fugas_visibles != null && (
                <Fila etiqueta="Fugas visibles" sensible>
                  <ValorBool valor={ms.fugas_visibles} />
                </Fila>
              )}
              {ms?.cambios_recientes && (
                <Fila etiqueta="Cambios recientes">{ms.cambios_recientes}</Fila>
              )}
              {ms?.observaciones && (
                <Fila etiqueta="Observaciones">{ms.observaciones}</Fila>
              )}
            </BloqueFicha>

            <BloqueFicha titulo="Carrocería" vacio={ca == null}>
              {ca?.tipo && <Fila etiqueta="Tipo">{TIPO_CARROCERIA_LABEL[ca.tipo]}</Fila>}
              {ca?.numero_puertas != null && (
                <Fila etiqueta="Puertas">{ca.numero_puertas}</Fila>
              )}
              {ca?.color && <Fila etiqueta="Color">{ca.color}</Fila>}
              {ca?.estado_pintura && (
                <Fila etiqueta="Estado de la pintura" sensible>
                  {ESTADO_PINTURA_LABEL[ca.estado_pintura]}
                </Fila>
              )}
              {ca?.choques_reparados != null && (
                <Fila etiqueta="Choques reparados" sensible>
                  <ValorBool valor={ca.choques_reparados} />
                </Fila>
              )}
              {ca?.oxido_visible != null && (
                <Fila etiqueta="Óxido visible" sensible>
                  <ValorBool valor={ca.oxido_visible} />
                </Fila>
              )}
              {ca?.estado_general && (
                <Fila etiqueta="Estado general" sensible>
                  <ValorEstado estado={ca.estado_general} />
                </Fila>
              )}
              {ca?.observaciones && (
                <Fila etiqueta="Observaciones">{ca.observaciones}</Fila>
              )}
            </BloqueFicha>

            <BloqueFicha titulo="Interiores" vacio={it == null}>
              {it?.material_asientos && (
                <Fila etiqueta="Material de asientos">
                  {MATERIAL_ASIENTOS_LABEL[it.material_asientos]}
                </Fila>
              )}
              {it?.estado_asientos && (
                <Fila etiqueta="Estado de asientos" sensible>
                  <ValorEstado estado={it.estado_asientos} />
                </Fila>
              )}
              {it?.aire_acondicionado != null && (
                <Fila etiqueta="Aire acondicionado" sensible>
                  <ValorBool valor={it.aire_acondicionado} />
                </Fila>
              )}
              {it?.sistema_audio && (
                <Fila etiqueta="Sistema de audio">{it.sistema_audio}</Fila>
              )}
              {it?.estado_tablero && (
                <Fila etiqueta="Estado del tablero" sensible>
                  <ValorEstado estado={it.estado_tablero} />
                </Fila>
              )}
              {it?.observaciones && (
                <Fila etiqueta="Observaciones">{it.observaciones}</Fila>
              )}
            </BloqueFicha>

            {ficha.extras.length > 0 && (
              <BentoCard titulo="Extras">
                <ul className="space-y-2">
                  {ficha.extras.map((e, i) => (
                    <li key={i} className="rounded-xl bg-slate-50 px-3 py-2">
                      <p className="text-sm font-semibold text-slate-900">{e.nombre}</p>
                      {e.detalle && <p className="text-xs text-slate-500">{e.detalle}</p>}
                    </li>
                  ))}
                </ul>
              </BentoCard>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function BarraCompletitud({ pct }: { pct: number }) {
  const seguro = Math.max(0, Math.min(100, Math.round(pct)));
  return (
    <div className="w-full max-w-xs">
      <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
        <span>Ficha completada</span>
        <span className="font-semibold text-slate-700">{seguro}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full transition-all ${colorCompletitud(seguro)}`}
          style={{ width: `${seguro}%` }}
        />
      </div>
    </div>
  );
}

// ── Galería de fotos (solo lectura, vista pública) ──────────────────────────

function GaleriaFotos({ fotos, titulo }: { fotos: FotoSalida[]; titulo: string }) {
  const [activa, setActiva] = useState(0);
  if (fotos.length === 0) return null;
  const principal = fotos[Math.min(activa, fotos.length - 1)];
  return (
    <section className="mt-6">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 sombra-tarjeta">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={principal.url}
          alt={`Foto del ${titulo}`}
          className="max-h-[28rem] w-full object-contain"
        />
      </div>
      {fotos.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {fotos.map((f, i) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setActiva(i)}
              className={`h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                i === activa ? "border-blue-500" : "border-transparent hover:border-slate-300"
              }`}
              aria-label={`Ver foto ${i + 1} de ${fotos.length}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.url} alt={`Miniatura ${i + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

// ── Página ──────────────────────────────────────────────────────────────────

export default function PublicacionDetallePage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);

  const [pub, setPub] = useState<PublicacionDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [noEncontrada, setNoEncontrada] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // ¿El visitante es el dueño de este anuncio? Solo entonces mostramos el CTA de la ficha.
  // La página es pública, así que se resuelve en el cliente y solo si hay sesión.
  const [esMia, setEsMia] = useState(false);

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
        const detalle = await obtenerPublicacionDetalle(id);
        if (activo) setPub(detalle);
      } catch (err) {
        if (!activo) return;
        if (err instanceof ApiError && err.status === 404) {
          setNoEncontrada(true);
        } else {
          setError("No pudimos cargar la publicación. Intenta recargar.");
        }
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, [id]);

  // Propiedad del anuncio: se compara contra "mis publicaciones". Si falla o no hay sesión,
  // simplemente no se muestra el CTA (la vista pública queda igual).
  useEffect(() => {
    if (!tieneSesion() || !Number.isInteger(id) || id <= 0) return;
    let activo = true;
    (async () => {
      try {
        const mias = await listarMisPublicaciones();
        if (activo) setEsMia(mias.some((p) => p.id === id));
      } catch {
        // Silencioso: el CTA del dueño es un extra, no puede romper el detalle público.
      }
    })();
    return () => {
      activo = false;
    };
  }, [id]);

  const pctFicha = pub?.ficha?.completitud ?? pub?.completitud_ficha ?? 0;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Link href="/marketplace" className="text-sm text-slate-500 hover:text-slate-900">
        ← Volver al marketplace
      </Link>

      {cargando && <p className="mt-6 text-slate-500">Cargando publicación…</p>}

      {noEncontrada && !cargando && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-10 text-center sombra-tarjeta">
          <p className="text-lg font-semibold text-slate-700">
            No encontramos esta publicación.
          </p>
          <p className="mt-1 text-slate-500">
            Puede que ya no esté disponible o se haya pausado.
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

      {pub && !cargando && (
        <>
          <header className="mt-4">
            <div className="flex flex-wrap items-center gap-1.5">
              {pub.plan === "premium" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-gradient px-2.5 py-0.5 text-xs font-black text-white">
                  ★ Premium
                </span>
              )}
              {pub.verificado && (
                <Insignia tono="ok">✓ Verificado por la plataforma</Insignia>
              )}
            </div>
            <h1 className="mt-3 text-3xl font-black text-slate-900">{tituloVehiculo(pub)}</h1>
            <p className="mt-1 font-mono text-sm tracking-widest text-slate-400">{pub.placa}</p>

            <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
              <p className="text-4xl font-black text-slate-900">{precioFmt(pub.precio_usd)}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                {pub.marca && <span>Marca: <b className="text-slate-700">{pub.marca}</b></span>}
                {pub.modelo && <span>Modelo: <b className="text-slate-700">{pub.modelo}</b></span>}
                {pub.anio != null && <span>Año: <b className="text-slate-700">{pub.anio}</b></span>}
              </div>
            </div>

            {pub.descripcion && (
              <p className="mt-4 whitespace-pre-line text-slate-600">{pub.descripcion}</p>
            )}
          </header>

          {/* CTA persistente del dueño (M2.5): solo lo ve él, y solo mientras falte ficha. */}
          {esMia && fichaPendiente(pctFicha) && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  Completa tu ficha ({pctFicha} %)
                </p>
                <p className="mt-0.5 text-sm text-amber-700">
                  Es gratis y los anuncios con ficha completa generan más confianza.
                </p>
              </div>
              <Link
                href="/marketplace/mis-publicaciones"
                className="shrink-0 rounded-full bg-brand-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90"
              >
                Completar ahora
              </Link>
            </div>
          )}

          {/* Galería de fotos (si el vendedor subió alguna) */}
          <GaleriaFotos fotos={pub.fotos} titulo={tituloVehiculo(pub)} />

          {/* Resumen de mantenimientos documentados (argumento premium) */}
          {pub.mantenimientos && pub.mantenimientos.total > 0 && (
            <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                Historial documentado
              </p>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                <span>
                  <b className="text-slate-900">{pub.mantenimientos.total}</b> mantenimiento
                  {pub.mantenimientos.total === 1 ? "" : "s"} registrado
                  {pub.mantenimientos.total === 1 ? "" : "s"}
                </span>
                {pub.mantenimientos.ultimo_kilometraje != null && (
                  <span>
                    Último:{" "}
                    <b className="text-slate-900">
                      {pub.mantenimientos.ultimo_kilometraje.toLocaleString("es-EC")} km
                    </b>
                  </span>
                )}
                {pub.mantenimientos.ultima_fecha && <span>· {pub.mantenimientos.ultima_fecha}</span>}
              </div>
            </div>
          )}

          {pub.ficha ? (
            <FichaTecnica ficha={pub.ficha} />
          ) : (
            <section className="mt-8">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-slate-900">Ficha técnica</h2>
                <Insignia tono="alerta">Ficha incompleta</Insignia>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center sombra-tarjeta">
                <p className="text-slate-600">
                  El vendedor aún no completó la ficha técnica de este vehículo.
                </p>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
