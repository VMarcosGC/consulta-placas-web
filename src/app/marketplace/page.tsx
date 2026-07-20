// Portada del COMPRADOR (MC1). Diseño en docs/producto/experiencia_comprador.md §2.
//
// Móvil primero, en bloques verticales curados: buscador → tus favoritos → destacados →
// verificados/transparentes → marcas → recién publicados → presupuesto → referencias.
// Regla dura: un bloque sin contenido NO se renderiza (nada de secciones vacías).
//
// Datos: UNA sola llamada, `GET /marketplace/feed` (trae todas las activas). Las marcas,
// los conteos y las bandas se DERIVAN de ese feed en el cliente — no hay endpoints de
// agregados. La búsqueda de aquí también es en cliente sobre lo ya cargado; la búsqueda
// real con query params + paginación es MC2.

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { obtenerFeedMarketplace } from "@/lib/api";
import { InvitacionFavorito } from "@/components/BotonFavorito";
import { ListingInternaCard, ListingReferenciadaCard } from "@/components/ListingCard";
import { useFavoritos } from "@/hooks/useFavoritos";
import { bajaDePrecio } from "@/lib/favoritos";
import {
  BANDAS_PRECIO,
  coincide,
  enBanda,
  esTransparente,
  marcasDelStock,
  porMasReciente,
  todasLasInternas,
  type Banda,
  type ClaveBanda,
} from "@/lib/marketplace";
import type { FeedMarketplace } from "@/types/api";

const FEED_VACIO: FeedMarketplace = { premium: [], estandar: [], referenciadas: [] };

// Cuántos chips de marca se muestran: más que esto y el bloque deja de ser navegable
// de un vistazo en un celular.
const MAX_CHIPS_MARCA = 12;

// Tope de tarjetas por bloque curado. El feed viene sin límite: pintar cientos de
// tarjetas con sus imágenes hunde un celular de gama baja, que es justo nuestro público.
// El doc §2 pide "los ÚLTIMOS activos", no todos; para llegar al resto está el buscador.
const MAX_POR_BLOQUE = 12;

function montoCorto(valor: number): string {
  return `$${Math.round(valor).toLocaleString("es-EC")}`;
}

// ── Piezas de layout ─────────────────────────────────────────────────────────

function Bloque({
  titulo,
  descripcion,
  accion,
  children,
}: {
  titulo: string;
  descripcion?: string;
  accion?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-slate-900 sm:text-xl">{titulo}</h2>
          {descripcion && <p className="text-sm text-slate-500">{descripcion}</p>}
        </div>
        {accion}
      </div>
      {children}
    </section>
  );
}

// Badge de baja de precio. Solo aparece si el auto está MÁS barato que cuando el
// comprador lo guardó; una subida nunca se anuncia.
function BadgeBaja({ monto }: { monto: number }) {
  return (
    <span className="inline-flex w-fit items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
      ↓ Bajó {montoCorto(monto)}
    </span>
  );
}

// Aviso discreto cuando el bloque muestra solo una parte del stock. Sin "ver todos":
// el buscador ya es la vía para llegar al resto y evita montar cientos de tarjetas.
function NotaTope({
  mostrados,
  total,
  criterio,
}: {
  mostrados: number;
  total: number;
  criterio?: string;
}) {
  if (total <= mostrados) return null;
  return (
    <p className="mt-3 text-sm text-slate-500">
      Mostrando {criterio ? `los ${mostrados} ${criterio}` : mostrados} de {total}. Usa el
      buscador para encontrar el tuyo.
    </p>
  );
}

// ── Página ───────────────────────────────────────────────────────────────────

export default function MarketplacePage() {
  const [feed, setFeed] = useState<FeedMarketplace>(FEED_VACIO);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [banda, setBanda] = useState<ClaveBanda | null>(null);

  const { control, mapa, haySesion, invitacion, cerrarInvitacion } = useFavoritos();

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const data = await obtenerFeedMarketplace();
        if (!activo) return;
        setFeed(data);
        setError(null);
      } catch {
        if (activo) setError("No pudimos cargar el marketplace. Intenta recargar.");
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, []);

  const internas = useMemo(() => todasLasInternas(feed), [feed]);
  const referenciadas = feed.referenciadas;

  // Marcas con stock real (internas + referencias). Nunca una lista fija.
  const marcas = useMemo(
    () => marcasDelStock([...internas, ...referenciadas]).slice(0, MAX_CHIPS_MARCA),
    [internas, referenciadas]
  );

  // Conteo por banda de presupuesto, para no ofrecer bandas vacías.
  const bandasConStock = useMemo(
    () =>
      BANDAS_PRECIO.map((b) => ({
        banda: b,
        total:
          internas.filter((p) => enBanda(p.precio_usd, b)).length +
          referenciadas.filter((p) => enBanda(p.precio_usd, b)).length,
      })).filter((x) => x.total > 0),
    [internas, referenciadas]
  );

  const consulta = texto.trim();
  const filtroActivo = consulta.length > 0 || banda !== null;
  const bandaActiva: Banda | null =
    BANDAS_PRECIO.find((b) => b.clave === banda) ?? null;

  const internasFiltradas = useMemo(
    () =>
      internas.filter(
        (p) =>
          coincide(p, consulta) && (bandaActiva ? enBanda(p.precio_usd, bandaActiva) : true)
      ),
    [internas, consulta, bandaActiva]
  );
  const referenciadasFiltradas = useMemo(
    () =>
      referenciadas.filter(
        (p) =>
          coincide(p, consulta) && (bandaActiva ? enBanda(p.precio_usd, bandaActiva) : true)
      ),
    [referenciadas, consulta, bandaActiva]
  );

  // "Tus favoritos": los anuncios del feed cuya placa el usuario ya guardó.
  const favoritosInternos = useMemo(
    () => internas.filter((p) => mapa.has(p.placa.toUpperCase())),
    [internas, mapa]
  );
  const favoritosReferenciados = useMemo(
    () => referenciadas.filter((p) => p.placa && mapa.has(p.placa.toUpperCase())),
    [referenciadas, mapa]
  );

  const transparentes = useMemo(() => internas.filter(esTransparente), [internas]);
  const recientes = useMemo(() => porMasReciente(internas), [internas]);

  // El badge "↓ Bajó $X" no es exclusivo de "Tus favoritos": si el comprador guardó un
  // auto, la buena noticia debe seguirlo por toda la portada (destacados, recientes,
  // resultados de búsqueda). `distintivo` ya es prop genérica de ListingCard.
  function distintivoBaja(placa: string | null | undefined, precioActual: number | null) {
    const baja = bajaDePrecio(mapa.get((placa ?? "").toUpperCase()), precioActual);
    return baja != null ? <BadgeBaja monto={baja} /> : null;
  }

  const feedVacio =
    !cargando && internas.length === 0 && referenciadas.length === 0 && !error;
  const totalResultados = internasFiltradas.length + referenciadasFiltradas.length;

  function limpiarBusqueda() {
    setTexto("");
    setBanda(null);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">
          Autos <span className="text-brand-gradient">en venta</span>
        </h1>
        <p className="mt-1 text-sm text-slate-500 sm:text-base">
          Cada anuncio muestra la ficha técnica del vendedor y los datos oficiales de su
          placa. También hay referencias de portales externos, sin verificar.
        </p>
      </header>

      {/* ── 1. Buscador protagonista ───────────────────────────────────────── */}
      <div className="mb-8">
        <label htmlFor="buscador-autos" className="sr-only">
          ¿Qué auto buscas?
        </label>
        <div className="relative">
          <span
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-slate-400"
            aria-hidden
          >
            🔍
          </span>
          <input
            id="buscador-autos"
            type="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="¿Qué auto buscas? Marca, modelo o placa"
            className="w-full rounded-2xl border border-slate-300 bg-white py-4 pl-12 pr-4 text-base text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
          />
        </div>

        {/* Chips rápidos: bandas de presupuesto con stock. */}
        {bandasConStock.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {bandasConStock.map(({ banda: b, total }) => {
              const activa = banda === b.clave;
              return (
                <button
                  key={b.clave}
                  type="button"
                  aria-pressed={activa}
                  onClick={() => setBanda(activa ? null : b.clave)}
                  className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
                    activa
                      ? "bg-brand-gradient text-white"
                      : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {b.etiqueta} <span className="opacity-70">({total})</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Entradas del vendedor: publicar y referenciar. No se pierden en el rediseño. */}
      <div className="mb-8 flex flex-wrap items-center gap-2">
        <Link
          href="/marketplace/publicar"
          className="inline-flex items-center justify-center rounded-full bg-brand-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90"
        >
          + Publicar mi auto
        </Link>
        <Link
          href="/marketplace/mis-publicaciones"
          className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Mis publicaciones
        </Link>
        <Link
          href="/marketplace/mis-referencias"
          className="inline-flex items-center justify-center rounded-full px-3 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          Mis referencias
        </Link>
      </div>

      {cargando && <p className="text-slate-500">Cargando publicaciones…</p>}
      {error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          {error}
        </p>
      )}

      {feedVacio && (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center sombra-tarjeta">
          <p className="text-lg font-semibold text-slate-700">
            Todavía no hay publicaciones.
          </p>
          <p className="mt-1 text-slate-500">Sé el primero en publicar tu vehículo.</p>
          <Link
            href="/marketplace/publicar"
            className="mt-4 inline-flex rounded-full bg-brand-gradient px-5 py-2.5 text-sm font-semibold text-white"
          >
            Publicar ahora
          </Link>
        </div>
      )}

      {/* ── Resultados de búsqueda: reemplazan los bloques curados ─────────── */}
      {filtroActivo && !cargando && (
        <section className="mb-10">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-900">
                {totalResultados === 1
                  ? "1 resultado"
                  : `${totalResultados} resultados`}
              </h2>
              <p className="text-sm text-slate-500">
                {[
                  consulta ? `Buscaste “${consulta}”` : null,
                  bandaActiva?.etiqueta ?? null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <button
              type="button"
              onClick={limpiarBusqueda}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Limpiar búsqueda
            </button>
          </div>

          {totalResultados === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center sombra-tarjeta">
              <p className="font-semibold text-slate-700">
                No encontramos autos con esa búsqueda.
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Prueba con menos palabras, por ejemplo solo la marca.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
              {internasFiltradas.map((p) => (
                <ListingInternaCard
                  key={`i-${p.id}`}
                  pub={p}
                  favoritos={control}
                  distintivo={distintivoBaja(p.placa, p.precio_usd)}
                />
              ))}
              {referenciadasFiltradas.map((p) => (
                <ListingReferenciadaCard
                  key={`r-${p.id}`}
                  pub={p}
                  favoritos={control}
                  distintivo={distintivoBaja(p.placa, p.precio_usd)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Bloques curados (solo sin filtro activo) ───────────────────────── */}
      {!filtroActivo && !cargando && (
        <>
          {/* 2. Tus favoritos — retención pasiva, va arriba de todo. */}
          {haySesion &&
            favoritosInternos.length + favoritosReferenciados.length > 0 && (
              <Bloque
                titulo="♥ Tus favoritos"
                descripcion="Los autos que guardaste. Si alguno baja de precio, te lo marcamos aquí."
              >
                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
                  {favoritosInternos.map((p) => (
                    <ListingInternaCard
                      key={`fi-${p.id}`}
                      pub={p}
                      favoritos={control}
                      distintivo={distintivoBaja(p.placa, p.precio_usd)}
                    />
                  ))}
                  {favoritosReferenciados.map((p) => (
                    <ListingReferenciadaCard
                      key={`fr-${p.id}`}
                      pub={p}
                      favoritos={control}
                      distintivo={distintivoBaja(p.placa, p.precio_usd)}
                    />
                  ))}
                </div>
              </Bloque>
            )}

          {/* 3. Destacados premium — carrusel horizontal con scroll-snap (sin librerías). */}
          {feed.premium.length > 0 && (
            <Bloque
              titulo="★ Destacados"
              descripcion="Publicaciones premium, con historial documentado."
            >
              <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
                {feed.premium.map((p) => (
                  <div key={p.id} className="w-56 shrink-0 snap-start sm:w-64">
                    <ListingInternaCard
                      pub={p}
                      favoritos={control}
                      distintivo={distintivoBaja(p.placa, p.precio_usd)}
                    />
                  </div>
                ))}
              </div>
            </Bloque>
          )}

          {/* 4. Verificados y transparentes — nuestro diferenciador. */}
          {transparentes.length > 0 && (
            <Bloque
              titulo="✓ Verificados y transparentes"
              descripcion="Con sello de la plataforma o con la ficha técnica casi completa."
            >
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
                {transparentes.slice(0, MAX_POR_BLOQUE).map((p) => (
                  <ListingInternaCard
                    key={p.id}
                    pub={p}
                    favoritos={control}
                    distintivo={distintivoBaja(p.placa, p.precio_usd)}
                  />
                ))}
              </div>
              <NotaTope mostrados={MAX_POR_BLOQUE} total={transparentes.length} />
            </Bloque>
          )}

          {/* 5. Explora por marca — chips derivados del stock real. */}
          {marcas.length > 0 && (
            <Bloque titulo="Explora por marca" descripcion="Marcas con autos publicados ahora.">
              <div className="flex flex-wrap gap-2">
                {marcas.map(({ marca, total }) => (
                  <button
                    key={marca}
                    type="button"
                    onClick={() => setTexto(marca)}
                    className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-400 hover:text-sky-700"
                  >
                    {marca} <span className="text-slate-400">({total})</span>
                  </button>
                ))}
              </div>
            </Bloque>
          )}

          {/* 6. Recién publicados. */}
          {recientes.length > 0 && (
            <Bloque titulo="Recién publicados" descripcion="Lo último que entró al mercado.">
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
                {recientes.slice(0, MAX_POR_BLOQUE).map((p) => (
                  <ListingInternaCard
                    key={p.id}
                    pub={p}
                    favoritos={control}
                    distintivo={distintivoBaja(p.placa, p.precio_usd)}
                  />
                ))}
              </div>
              <NotaTope
                mostrados={MAX_POR_BLOQUE}
                total={recientes.length}
                criterio="más recientes"
              />
            </Bloque>
          )}

          {/* 7. Por presupuesto — el comprador real compra por bolsillo. */}
          {bandasConStock.length > 0 && (
            <Bloque titulo="Por presupuesto" descripcion="Elige tu rango y mira solo lo que te alcanza.">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {bandasConStock.map(({ banda: b, total }) => (
                  <button
                    key={b.clave}
                    type="button"
                    onClick={() => setBanda(b.clave)}
                    className="rounded-2xl border border-slate-200 bg-white p-5 text-left sombra-tarjeta transition hover:border-sky-400"
                  >
                    <p className="text-base font-bold text-slate-900">{b.etiqueta}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {total === 1 ? "1 auto disponible" : `${total} autos disponibles`}
                    </p>
                  </button>
                ))}
              </div>
            </Bloque>
          )}

          {/* 8. Referencias externas — al pie, con su etiqueta de "no verificados". */}
          {referenciadas.length > 0 && (
            <Bloque
              titulo="Referencias externas"
              descripcion="Anuncios de otros portales aportados por usuarios. La plataforma no los verifica."
            >
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
                {referenciadas.map((p) => (
                  <ListingReferenciadaCard key={p.id} pub={p} favoritos={control} />
                ))}
              </div>
            </Bloque>
          )}
        </>
      )}

      {/* Vía 3 de publicación: referenciar un anuncio externo. Se conserva del diseño
          anterior — es la entrada que hace descubrible el flujo de referencias. */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800">
            🔗 ¿Viste un auto en Facebook u OLX?
          </p>
          <p className="mt-0.5 text-sm text-slate-500">
            Pega el link y lo sumamos al feed como referencia externa. No hace falta que sea
            tuyo y es gratis.
          </p>
        </div>
        <Link
          href="/marketplace/referenciar"
          className="inline-flex shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Referenciar anuncio externo
        </Link>
      </div>

      {/* Anónimo que tocó un ♡: invitación amable, nunca un 401 ni una redirección. */}
      {invitacion && <InvitacionFavorito onCerrar={cerrarInvitacion} />}
    </div>
  );
}
