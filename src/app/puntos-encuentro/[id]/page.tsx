// Punto de encuentro — detalle + matriz de autos anunciados + "voy a llevar mi auto".
//
// El comprador ve QUÉ autos van a estar ahí y cuándo. El vendedor con sesión anuncia
// una de sus publicaciones activas (fecha + franja). Todo en una sola página: no hay
// wizard aparte.

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  anunciarPresencia,
  listarMisPublicaciones,
  obtenerPuntoEncuentro,
} from "@/lib/api";
import { tieneSesion } from "@/lib/auth";
import { IconoPin, IconoReloj } from "@/components/Iconos";
import {
  ApiError,
  FRANJA_LEGIBLE,
  type FranjaPresencia,
  type PublicacionInterna,
  type PuntoEncuentroDetalle,
} from "@/types/api";

const usd = (v: string) =>
  `$${Number(v).toLocaleString("es-EC", { maximumFractionDigits: 0 })}`;
const HOY = () => new Date().toISOString().slice(0, 10);
const fechaLarga = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

const FRANJAS: FranjaPresencia[] = ["manana", "tarde", "noche", "todo_el_dia"];

export default function PuntoEncuentroDetallePage() {
  const params = useParams<{ id: string }>();
  const puntoId = Number(params.id);

  const [punto, setPunto] = useState<PuntoEncuentroDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(() => {
    return obtenerPuntoEncuentro(puntoId)
      .then(setPunto)
      .catch(() => setError("No encontramos este punto de encuentro."));
  }, [puntoId]);

  useEffect(() => {
    let vivo = true;
    obtenerPuntoEncuentro(puntoId)
      .then((p) => vivo && setPunto(p))
      .catch(() => vivo && setError("No encontramos este punto de encuentro."))
      .finally(() => vivo && setCargando(false));
    return () => {
      vivo = false;
    };
  }, [puntoId]);

  if (cargando) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center text-secundario">
        Cargando…
      </div>
    );
  }
  if (error || !punto) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="text-secundario">{error ?? "Punto no encontrado."}</p>
        <Link
          href="/puntos-encuentro"
          className="mt-4 inline-flex rounded-full border border-borde-fuerte bg-superficie px-4 py-2 text-sm font-semibold text-secundario hover:bg-superficie-tenue"
        >
          ← Todos los puntos
        </Link>
      </div>
    );
  }

  return (
    <div className="espacio-barra-movil mx-auto max-w-3xl px-6 py-8 sm:py-10">
      <Link
        href="/puntos-encuentro"
        className="text-sm text-secundario hover:text-tinta"
      >
        ← Puntos de encuentro
      </Link>

      <header className="mt-3 mb-5 flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-marca bg-marca-tinte text-marca-texto">
          <IconoPin className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-xl font-black text-tinta sm:text-2xl">{punto.nombre}</h1>
          <p className="text-sm text-secundario">
            {[punto.sector, punto.ciudad].filter(Boolean).join(" · ")}
          </p>
        </div>
      </header>

      {/* Datos del punto. */}
      <div className="rounded-2xl border border-borde bg-superficie p-4 sm:p-5 sombra-tarjeta">
        <dl className="grid gap-2.5 text-sm">
          <div className="flex gap-2">
            <dt className="shrink-0 text-secundario">
              <IconoPin className="h-4 w-4" />
            </dt>
            <dd className="text-tinta">
              {punto.direccion}
              {punto.referencia && (
                <span className="block text-xs text-secundario">{punto.referencia}</span>
              )}
            </dd>
          </div>
          {punto.horario && (
            <div className="flex gap-2">
              <dt className="shrink-0 text-secundario">
                <IconoReloj className="h-4 w-4" />
              </dt>
              <dd className="text-secundario">{punto.horario}</dd>
            </div>
          )}
        </dl>
        {punto.notas && (
          <p className="mt-3 rounded-lg bg-superficie-tenue px-3 py-2 text-xs text-secundario">
            {punto.notas}
          </p>
        )}
        {!punto.tiene_seguridad && (
          <p className="mt-2 text-xs text-secundario">
            Sin seguridad privada ni policial asignada por ahora — más adelante algunos
            puntos podrían tenerla.
          </p>
        )}
      </div>

      {/* Matriz de autos anunciados. */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-secundario">
          Autos anunciados aquí ({punto.presencias.length})
        </h2>
        {punto.presencias.length === 0 ? (
          <p className="rounded-xl border border-borde bg-superficie p-6 text-center text-sm text-secundario sombra-tarjeta">
            Nadie anunció un auto todavía. Si vas a vender, sé el primero.
          </p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {punto.presencias.map((pr) => {
              const t =
                pr.vehiculo.titulo ||
                [pr.vehiculo.marca, pr.vehiculo.modelo, pr.vehiculo.anio]
                  .filter(Boolean)
                  .join(" ") ||
                pr.vehiculo.placa;
              return (
                <li
                  key={pr.id}
                  className="flex items-center gap-3 rounded-xl border border-borde bg-superficie p-3 sombra-tarjeta"
                >
                  <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-superficie-tenue">
                    {pr.vehiculo.foto_portada ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={pr.vehiculo.foto_portada}
                        alt={t}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="grid h-full w-full place-items-center text-xs text-secundario">
                        —
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/marketplace/${pr.vehiculo.publicacion_id}`}
                      className="truncate text-sm font-semibold text-tinta hover:underline"
                    >
                      {t}
                    </Link>
                    <p className="text-sm text-secundario">
                      {usd(pr.vehiculo.precio_usd)}
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-marca-texto">
                      {fechaLarga(pr.fecha)} · {FRANJA_LEGIBLE[pr.franja]}
                    </p>
                    {pr.nota && (
                      <p className="text-xs text-secundario">“{pr.nota}”</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Anunciar mi auto. */}
      <AnunciarMiAuto puntoId={puntoId} onAnunciado={recargar} />
    </div>
  );
}

// ── Form: el vendedor elige una publicación suya + fecha + franja ─────────────
function AnunciarMiAuto({
  puntoId,
  onAnunciado,
}: {
  puntoId: number;
  onAnunciado: () => Promise<unknown>;
}) {
  const [haySesion, setHaySesion] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [pubs, setPubs] = useState<PublicacionInterna[]>([]);
  const [pubId, setPubId] = useState<string>("");
  const [fecha, setFecha] = useState(HOY());
  const [franja, setFranja] = useState<FranjaPresencia>("tarde");
  const [nota, setNota] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let vivo = true;
    const leer = async () => {
      if (!vivo) return;
      setHaySesion(tieneSesion());
      if (tieneSesion()) {
        try {
          const lista = await listarMisPublicaciones();
          if (vivo) setPubs(lista.filter((p) => p.estado === "activa"));
        } catch {
          /* noop */
        }
      }
    };
    leer();
    window.addEventListener("sesion-cambiada", leer);
    return () => {
      vivo = false;
      window.removeEventListener("sesion-cambiada", leer);
    };
  }, [abierto]);

  const activas = useMemo(() => pubs, [pubs]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!pubId) {
      setError("Elige cuál de tus autos vas a llevar.");
      return;
    }
    setEnviando(true);
    try {
      await anunciarPresencia(puntoId, {
        publicacion_id: Number(pubId),
        fecha,
        franja,
        nota: nota.trim() || undefined,
      });
      await onAnunciado();
      setOk(true);
      setAbierto(false);
      setNota("");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message || "No pudimos registrar tu anuncio."
          : "No pudimos registrar tu anuncio."
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-borde bg-superficie-tenue p-4 sm:p-5">
      <h2 className="text-base font-bold text-tinta">¿Vas a llevar tu auto aquí?</h2>
      <p className="mt-1 text-sm text-secundario">
        Anuncia a qué punto lo llevas y cuándo. Los compradores lo ven en esta página y
        pueden coordinar contigo.
      </p>

      {ok && (
        <p className="mt-3 rounded-xl border border-confirmado bg-confirmado-tinte px-4 py-2.5 text-sm font-medium text-confirmado-texto">
          ✓ Listo. Tu auto ya aparece en la lista de este punto.
        </p>
      )}

      {!haySesion ? (
        <p className="mt-3 text-sm text-secundario">
          <Link href="/login" className="font-semibold text-tinta underline">
            Inicia sesión
          </Link>{" "}
          para anunciar tu auto.
        </p>
      ) : !abierto ? (
        <button
          type="button"
          onClick={() => {
            setAbierto(true);
            setOk(false);
          }}
          className="mt-3 inline-flex rounded-full bg-accion px-6 py-2.5 text-sm font-semibold text-superficie shadow-sm transition hover:opacity-90"
        >
          Voy a llevar mi auto
        </button>
      ) : activas.length === 0 ? (
        <p className="mt-3 text-sm text-secundario">
          No tienes publicaciones activas.{" "}
          <Link href="/marketplace/publicar" className="font-semibold text-tinta underline">
            Publica tu auto
          </Link>{" "}
          y vuelve a este punto.
        </p>
      ) : (
        <form onSubmit={enviar} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="font-semibold text-tinta">Auto</span>
            <select
              value={pubId}
              onChange={(e) => setPubId(e.target.value)}
              className="rounded-lg border border-borde bg-superficie px-3 py-2"
            >
              <option value="">Elige…</option>
              {activas.map((p) => (
                <option key={p.id} value={p.id}>
                  {(p.titulo ||
                    [p.marca, p.modelo, p.anio].filter(Boolean).join(" ") ||
                    p.placa) + ` · $${Number(p.precio_usd).toLocaleString("es-EC")}`}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-tinta">Día</span>
            <input
              type="date"
              value={fecha}
              min={HOY()}
              onChange={(e) => setFecha(e.target.value)}
              className="rounded-lg border border-borde bg-superficie px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-tinta">Franja</span>
            <select
              value={franja}
              onChange={(e) => setFranja(e.target.value as FranjaPresencia)}
              className="rounded-lg border border-borde bg-superficie px-3 py-2"
            >
              {FRANJAS.map((f) => (
                <option key={f} value={f}>
                  {FRANJA_LEGIBLE[f]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="font-semibold text-tinta">Nota (opcional)</span>
            <input
              maxLength={300}
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Ej.: puedo llegar 10 min antes; llevo la matrícula y el historial"
              className="rounded-lg border border-borde bg-superficie px-3 py-2"
            />
          </label>
          {error && (
            <p className="text-sm font-medium text-error sm:col-span-2">{error}</p>
          )}
          <div className="flex gap-2 sm:col-span-2">
            <button
              type="submit"
              disabled={enviando}
              className="inline-flex rounded-full bg-accion px-6 py-2.5 text-sm font-semibold text-superficie shadow-sm transition hover:opacity-90 disabled:opacity-60"
            >
              {enviando ? "Anunciando…" : "Anunciar"}
            </button>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="inline-flex rounded-full border border-borde-fuerte bg-superficie px-5 py-2.5 text-sm font-semibold text-secundario hover:bg-superficie-tenue"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
