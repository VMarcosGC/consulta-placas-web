// Marketplace en modo REEL — un auto por pantalla, scroll vertical con snap, estilo
// feed de Instagram. Pensado para celular (en escritorio se centra una columna
// tipo teléfono). Reusa `GET /marketplace/buscar` con cursor keyset (el endpoint se
// diseñó justamente para esto — ver el comentario "reel MC3" en el backend).
//
// Cada reel muestra la foto a sangre, precio/título/ubicación encima, ♡ favorito, y
// "Ver detalle" que despliega un vistazo rápido con enlace al anuncio completo
// (el "detalle ampliado").
//
// Nota de alcance: `AGENTS.md §1.0.2` listaba "Feed tipo reels" como fuera de alcance;
// Marcos lo repuso el 2026-08-27. El doc se actualiza en consecuencia.

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { buscarPublicaciones } from "@/lib/api";
import { useFavoritos } from "@/hooks/useFavoritos";
import { InvitacionFavorito } from "@/components/BotonFavorito";
import { precioNum } from "@/lib/precio";
import { antiguedadDe } from "@/lib/antiguedad";
import { fichaIncompleta } from "@/lib/ficha";
import type {
  ItemBusqueda,
  PublicacionInterna,
  PublicacionReferenciada,
} from "@/types/api";

function precioFmt(v: number | string | null | undefined): string {
  const n = precioNum(v);
  return n == null ? "Consultar" : `$${n.toLocaleString("es-EC", { maximumFractionDigits: 0 })}`;
}

function titulo(p: {
  titulo?: string | null;
  marca: string | null;
  modelo: string | null;
  anio: number | null;
}): string {
  if (p.titulo) return p.titulo;
  const x = [p.marca, p.modelo, p.anio].filter(Boolean);
  return x.length ? x.join(" ") : "Vehículo en venta";
}

function metaLinea(p: { ciudad?: string | null; kilometraje?: number | null }): string {
  return [
    p.kilometraje != null ? `${p.kilometraje.toLocaleString("es-EC")} km` : null,
    p.ciudad || null,
  ]
    .filter(Boolean)
    .join("  ·  ");
}

// ── Un reel ────────────────────────────────────────────────────────────────

function ReelInterna({
  pub,
  control,
}: {
  pub: PublicacionInterna;
  control: ReturnType<typeof useFavoritos>["control"];
}) {
  const [abierto, setAbierto] = useState(false);
  const ant = antiguedadDe(pub);
  const guardado = control.esFavorito(pub.placa);

  return (
    <section className="relative h-[100dvh] w-full shrink-0 snap-start snap-always overflow-hidden bg-black">
      {pub.foto_portada ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={pub.foto_portada}
          alt={titulo(pub)}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-superficie-tenue text-6xl">
          🚗
        </div>
      )}

      {/* Scrim para que el texto se lea sobre cualquier foto. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

      {/* Rail derecho estilo IG. */}
      <div className="absolute bottom-28 right-3 flex flex-col items-center gap-4 text-white">
        <button
          type="button"
          onClick={() => control.alternar(pub.placa, pub.precio_usd)}
          aria-label={guardado ? "Quitar de favoritos" : "Guardar en favoritos"}
          aria-pressed={guardado}
          className="grid h-12 w-12 place-items-center rounded-full bg-white/10 text-2xl backdrop-blur transition hover:bg-white/20"
        >
          <span aria-hidden>{guardado ? "♥" : "♡"}</span>
        </button>
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          className="grid h-12 w-12 place-items-center rounded-full bg-white/10 text-lg backdrop-blur transition hover:bg-white/20"
          aria-label="Ver detalle"
          aria-expanded={abierto}
        >
          <span aria-hidden>{abierto ? "▾" : "ℹ"}</span>
        </button>
      </div>

      {/* Bloque inferior: precio, título, meta. */}
      <div className="absolute inset-x-0 bottom-0 p-5 pb-24 text-white">
        <div className="flex flex-wrap items-center gap-1.5">
          {pub.plan === "premium" && (
            <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-black backdrop-blur">
              ★ Premium
            </span>
          )}
          {pub.verificado && (
            <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold backdrop-blur">
              ✓ Verificado
            </span>
          )}
          {!pub.verificado && fichaIncompleta(pub.completitud_ficha) && (
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] backdrop-blur">
              Ficha incompleta
            </span>
          )}
        </div>

        <p className="mt-2 text-4xl font-black leading-none">{precioFmt(pub.precio_usd)}</p>
        <h2 className="mt-1 text-lg font-semibold">{titulo(pub)}</h2>
        {metaLinea(pub) && <p className="mt-0.5 text-sm text-white/80">{metaLinea(pub)}</p>}
        <p className="mt-0.5 font-mono text-xs tracking-widest text-white/70">{pub.placa}</p>

        {abierto && (
          <div className="mt-3 rounded-2xl bg-white/10 p-3 text-sm backdrop-blur">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-white/85">
              {pub.completitud_ficha != null && (
                <span>Ficha {pub.completitud_ficha}%</span>
              )}
              {pub.mantenimientos && pub.mantenimientos.total > 0 && (
                <span>{pub.mantenimientos.total} mantenimiento{pub.mantenimientos.total === 1 ? "" : "s"}</span>
              )}
              {ant && <span>{ant.texto}</span>}
            </div>
            {pub.descripcion && (
              <p className="mt-1.5 line-clamp-3 text-white/80">{pub.descripcion}</p>
            )}
            <Link
              href={`/marketplace/${pub.id}`}
              className="mt-3 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-black"
            >
              Abrir anuncio completo →
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

function ReelReferenciada({ pub }: { pub: PublicacionReferenciada }) {
  const portada = pub.fotos?.[0] ?? pub.imagen_url;
  return (
    <section className="relative h-[100dvh] w-full shrink-0 snap-start snap-always overflow-hidden bg-black">
      {portada ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={portada} alt={titulo(pub)} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-superficie-tenue text-6xl">
          🚗
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-5 pb-24 text-white">
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] backdrop-blur">
          ⓘ Referencia externa · sin verificar
        </span>
        <p className="mt-2 text-4xl font-black leading-none">{precioFmt(pub.precio_usd)}</p>
        <h2 className="mt-1 text-lg font-semibold">{titulo(pub)}</h2>
        {metaLinea(pub) && <p className="mt-0.5 text-sm text-white/80">{metaLinea(pub)}</p>}
        <Link
          href={`/marketplace/referencias/${pub.id}`}
          className="mt-3 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-black"
        >
          Ver referencia →
        </Link>
      </div>
    </section>
  );
}

// ── Página ─────────────────────────────────────────────────────────────────

export default function ReelPage() {
  const { control, invitacion, cerrarInvitacion } = useFavoritos();
  const [items, setItems] = useState<ItemBusqueda[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [fin, setFin] = useState(false);
  const [error, setError] = useState(false);
  const cargando = useRef(false);
  const primeraLista = useRef(false);
  const sentinela = useRef<HTMLDivElement | null>(null);

  // Trae la SIGUIENTE página de `/buscar` (la primera la carga el efecto de montaje).
  // El setState cae siempre después del await (patrón lint-safe de useFavoritos).
  const cargarMas = useCallback(async () => {
    if (cargando.current || fin || !primeraLista.current) return;
    cargando.current = true;
    try {
      const r = await buscarPublicaciones({}, cursor ?? undefined);
      setItems((prev) => [...prev, ...r.items]);
      setCursor(r.siguiente_cursor);
      if (!r.siguiente_cursor) setFin(true);
    } catch {
      setError(true);
    } finally {
      cargando.current = false;
    }
  }, [cursor, fin]);

  // Primera página: IIFE async inline (no llama a `cargarMas` desde el cuerpo del
  // efecto — el lint marca el setState-en-efecto aunque sea tras await).
  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const r = await buscarPublicaciones({});
        if (!activo) return;
        setItems(r.items);
        setCursor(r.siguiente_cursor);
        if (!r.siguiente_cursor) setFin(true);
        primeraLista.current = true;
      } catch {
        if (activo) setError(true);
      }
    })();
    return () => {
      activo = false;
    };
  }, []);

  // Carga la siguiente página cuando el centinela entra en viewport.
  useEffect(() => {
    const nodo = sentinela.current;
    if (!nodo) return;
    const obs = new IntersectionObserver(
      (entradas) => {
        if (entradas[0]?.isIntersecting) void cargarMas();
      },
      { rootMargin: "600px" }
    );
    obs.observe(nodo);
    return () => obs.disconnect();
  }, [cargarMas]);

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Barra superior mínima. */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 py-3 text-white/80">
        <span className="text-sm font-semibold">Reel</span>
        <Link
          href="/marketplace"
          className="rounded-full bg-white/10 px-3 py-1.5 text-sm text-white transition hover:bg-white/20"
        >
          Salir ✕
        </Link>
      </div>

      <div className="mx-auto h-full max-w-[480px] snap-y snap-mandatory overflow-y-scroll overscroll-contain">
        {items.map((it) =>
          it.tipo_publicacion === "interna" && it.interna ? (
            <ReelInterna key={`i-${it.interna.id}`} pub={it.interna} control={control} />
          ) : it.referenciada ? (
            <ReelReferenciada key={`r-${it.referenciada.id}`} pub={it.referenciada} />
          ) : null
        )}

        <div ref={sentinela} />

        {items.length === 0 && !error && (
          <div className="flex h-[100dvh] items-center justify-center text-white/60">
            Cargando autos…
          </div>
        )}
        {error && items.length === 0 && (
          <div className="flex h-[100dvh] flex-col items-center justify-center gap-3 px-8 text-center text-white/70">
            No pudimos cargar el reel.
            <Link href="/marketplace" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black">
              Volver al marketplace
            </Link>
          </div>
        )}
        {fin && items.length > 0 && (
          <section className="flex h-[60vh] snap-start flex-col items-center justify-center gap-3 text-center text-white/60">
            Llegaste al final.
            <Link
              href="/marketplace/publicar"
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black"
            >
              Publica el tuyo
            </Link>
          </section>
        )}
      </div>

      {invitacion && <InvitacionFavorito onCerrar={cerrarInvitacion} />}
    </div>
  );
}
