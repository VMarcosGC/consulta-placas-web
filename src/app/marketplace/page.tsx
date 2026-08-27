// Portada del COMPRADOR. MC1 (bloques curados) + MC2 (búsqueda server-side).
// Diseño en docs/producto/experiencia_comprador.md §2 y plan_market_autos.md §MC2.
//
// Dos modos, según el querystring de la URL:
//   • SIN filtros → bloques curados de MC1 (favoritos, destacados, verificados, marcas,
//     recientes, presupuesto, referencias). Un bloque sin contenido NO se renderiza.
//   • CON filtros → grilla plana de `GET /marketplace/buscar` (server-side), paginada por
//     cursor ("Cargar más autos"). Los filtros viven en la URL → la búsqueda es compartible.
//
// Los datos vienen de DOS llamadas: `GET /marketplace/feed` (bloques curados, se deriva en
// cliente: marcas, bandas, conteos) y `GET /marketplace/buscar` (la grilla filtrada). El
// frontend NO transforma: lee y pinta. El ♡ favorito y el badge de baja de precio se
// conservan en TODAS las tarjetas.

"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { buscarPublicaciones, obtenerFeedMarketplace } from "@/lib/api";
import { InvitacionFavorito } from "@/components/BotonFavorito";
import { EsqueletoTarjetas } from "@/components/EsqueletoTarjetas";
import { ListingInternaCard, ListingReferenciadaCard } from "@/components/ListingCard";
import { useFavoritos } from "@/hooks/useFavoritos";
import { bajaDePrecio } from "@/lib/favoritos";
import {
  COMBUSTIBLE_LABEL,
  OPCIONES_COMBUSTIBLE,
  OPCIONES_TIPO_CARROCERIA,
  OPCIONES_TRANSMISION,
  TIPO_CARROCERIA_LABEL,
  TRANSMISION_LABEL,
} from "@/lib/ficha";
import {
  OPCIONES_PRECIO,
  claveFiltros,
  conteoAvanzados,
  hayFiltros,
  leerFiltros,
  montoOpcion,
  opcionesAnio,
} from "@/lib/busqueda";
import {
  BANDAS_PRECIO,
  enBanda,
  esTransparente,
  marcasDelStock,
  porMasReciente,
  todasLasInternas,
  type Banda,
} from "@/lib/marketplace";
import { ApiError } from "@/types/api";
import type {
  FeedMarketplace,
  FiltrosBusqueda,
  ItemBusqueda,
  PublicacionInterna,
  PublicacionReferenciada,
} from "@/types/api";

const FEED_VACIO: FeedMarketplace = { premium: [], estandar: [], referenciadas: [] };

// Con poco stock la portada curada (7 bloques de MC1) se ve rota: "★ Destacados" cae a
// una sola tarjeta y quedan cientos de píxeles vacíos. Bajo este umbral se muestra UNA
// sola grilla con todo el stock; a partir de él vuelven los bloques curados tal cual.
const UMBRAL_PORTADA_CURADA = 8;

// El carrusel "★ Destacados" solo tiene sentido como carrusel con 2+ premium. Con 0-1,
// esa única publicación premium ya aparece en la grilla (curada o unificada).
const MIN_PREMIUM_CARRUSEL = 2;

// Entrada de la grilla unificada: interna o referenciada, con su discriminador para
// elegir la tarjeta (mismo criterio que la grilla de búsqueda).
type EntradaStock =
  | { tipo: "interna"; pub: PublicacionInterna }
  | { tipo: "referenciada"; pub: PublicacionReferenciada };

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

// Estado de la grilla de búsqueda (MC2). `clave` ata los resultados al filtro que los
// produjo: si no coincide con el filtro actual, la grilla se pinta "cargando" en vez de
// mostrar resultados viejos (evita el parpadeo de stock que no corresponde).
interface EstadoBusqueda {
  clave: string;
  items: ItemBusqueda[];
  cursor: string | null;
  error: string | null;
}

const BUSQUEDA_INICIAL: EstadoBusqueda = { clave: "", items: [], cursor: null, error: null };

function mensajeBusqueda(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 422) {
      return e.message || "Alguno de los filtros no es válido. Ajusta tu búsqueda.";
    }
    if (e.status === 400) {
      return "Reinicia la búsqueda: el enlace de la página dejó de ser válido.";
    }
    return e.message || "No pudimos completar la búsqueda. Intenta de nuevo.";
  }
  return "No pudimos completar la búsqueda. Intenta de nuevo.";
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
          <h2 className="text-lg font-bold text-tinta sm:text-xl">{titulo}</h2>
          {descripcion && <p className="text-sm text-secundario">{descripcion}</p>}
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
    <span className="inline-flex w-fit items-center rounded-full bg-confirmado-tinte px-2 py-0.5 text-[11px] font-bold text-confirmado-texto">
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
    <p className="mt-3 text-sm text-secundario">
      Mostrando {criterio ? `los ${mostrados} ${criterio}` : mostrados} de {total}. Usa el
      buscador para encontrar el tuyo.
    </p>
  );
}

// <select> de filtro con etiqueta, estilo "confianza clara".
function Selector({
  etiqueta,
  valor,
  onChange,
  children,
}: {
  etiqueta: string;
  valor: string;
  onChange: (valor: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-secundario">{etiqueta}</span>
      <select
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-borde-fuerte bg-superficie px-3 py-2.5 text-tinta outline-none focus:border-marca focus:ring-2 focus:ring-marca/25"
      >
        {children}
      </select>
    </label>
  );
}

// ── Contenido (usa useSearchParams → debe ir bajo un límite de Suspense) ───────

function ContenidoMarketplace() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL → filtros. Un param inválido se descarta en `leerFiltros` (robustez ante enlaces
  // manipulados). Nueva identidad solo cuando cambia el querystring.
  const filtros = useMemo<FiltrosBusqueda>(
    () => leerFiltros(new URLSearchParams(searchParams.toString())),
    [searchParams]
  );
  const clave = claveFiltros(filtros);
  const busquedaActiva = hayFiltros(filtros);
  const nAvanzados = conteoAvanzados(filtros);

  // Buscador de texto: estado local, se confirma a la URL al enviar (no en cada tecla, para
  // no disparar una llamada por pulsación en una red lenta). Se siembra desde la URL.
  const [texto, setTexto] = useState(() => filtros.q ?? "");
  // Panel de filtros avanzados: abierto de entrada si el enlace ya trae filtros avanzados.
  const [panelAbierto, setPanelAbierto] = useState(() => conteoAvanzados(filtros) > 0);

  const [feed, setFeed] = useState<FeedMarketplace>(FEED_VACIO);
  const [cargandoFeed, setCargandoFeed] = useState(true);
  const [errorFeed, setErrorFeed] = useState<string | null>(null);

  const [busqueda, setBusqueda] = useState<EstadoBusqueda>(BUSQUEDA_INICIAL);
  const [cargandoMas, setCargandoMas] = useState(false);

  const { control, mapa, haySesion, invitacion, cerrarInvitacion } = useFavoritos();

  // Feed para los bloques curados. Una sola vez. (Patrón lint-safe: el setState cae SIEMPRE
  // después del await, nunca de forma síncrona dentro del efecto.)
  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const data = await obtenerFeedMarketplace();
        if (!activo) return;
        setFeed(data);
        setErrorFeed(null);
      } catch {
        if (activo) setErrorFeed("No pudimos cargar el marketplace. Intenta recargar.");
      } finally {
        if (activo) setCargandoFeed(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, []);

  // Búsqueda server-side: se relanza la PRIMERA página cada vez que cambian los filtros.
  // Sin cursor (el cursor no vive en la URL compartible, solo en el estado de paginación),
  // así que un 400 aquí es inalcanzable. setState siempre tras el await.
  useEffect(() => {
    if (!busquedaActiva) return;
    let vivo = true;
    (async () => {
      try {
        const res = await buscarPublicaciones(filtros);
        if (!vivo) return;
        setBusqueda({ clave, items: res.items, cursor: res.siguiente_cursor, error: null });
      } catch (e) {
        if (!vivo) return;
        setBusqueda({ clave, items: [], cursor: null, error: mensajeBusqueda(e) });
      }
    })();
    return () => {
      vivo = false;
    };
  }, [busquedaActiva, clave, filtros]);

  // Paginación por cursor. Va en un handler (no en un efecto): aquí setState síncrono es
  // válido. Un 400 = cursor corrupto → reinicia desde la primera página sin romper.
  async function cargarMas() {
    if (cargandoMas || !busqueda.cursor) return;
    setCargandoMas(true);
    try {
      const res = await buscarPublicaciones(filtros, busqueda.cursor);
      setBusqueda((b) => ({
        ...b,
        items: [...b.items, ...res.items],
        cursor: res.siguiente_cursor,
      }));
    } catch (e) {
      if (e instanceof ApiError && e.status === 400) {
        try {
          const res = await buscarPublicaciones(filtros);
          setBusqueda({ clave, items: res.items, cursor: res.siguiente_cursor, error: null });
        } catch (e2) {
          setBusqueda((b) => ({ ...b, cursor: null, error: mensajeBusqueda(e2) }));
        }
      } else {
        setBusqueda((b) => ({ ...b, cursor: null, error: mensajeBusqueda(e) }));
      }
    } finally {
      setCargandoMas(false);
    }
  }

  // ── Escritura de la URL (single source of truth de la búsqueda) ─────────────
  function actualizarUrl(cambios: Record<string, string | number | null | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(cambios)) {
      if (v === null || v === undefined || v === "") params.delete(k);
      else params.set(k, String(v));
    }
    const qs = params.toString();
    router.replace(qs ? `/marketplace?${qs}` : "/marketplace", { scroll: false });
  }

  function enviarTexto(e: React.FormEvent) {
    e.preventDefault();
    actualizarUrl({ q: texto.trim() || null });
  }

  function buscarMarca(marca: string) {
    setTexto(marca);
    actualizarUrl({ q: marca });
  }

  function aplicarBanda(b: Banda) {
    actualizarUrl({ precio_min: b.min ?? null, precio_max: b.max ?? null });
  }

  function limpiarFiltros() {
    setTexto("");
    setPanelAbierto(false);
    router.replace("/marketplace", { scroll: false });
  }

  // ── Derivados del feed para los bloques curados ─────────────────────────────
  const internas = useMemo(() => todasLasInternas(feed), [feed]);
  const referenciadas = feed.referenciadas;

  const marcasStock = useMemo(
    () => marcasDelStock([...internas, ...referenciadas]),
    [internas, referenciadas]
  );
  const marcas = useMemo(() => marcasStock.slice(0, MAX_CHIPS_MARCA), [marcasStock]);

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

  // Stock total y modo de portada. Bajo el umbral se muestra una sola grilla con todo
  // (internas + referenciadas), no los 7 bloques curados de MC1.
  const totalStock = internas.length + referenciadas.length;
  const portadaCurada = totalStock >= UMBRAL_PORTADA_CURADA;

  // Línea de estadística de la portada (Dirección C · ESTORE). Se deriva del feed que ya
  // está en cliente —sin endpoint nuevo—: total de autos, marcas distintas y cuántos son
  // "verificados o con ficha" (`esTransparente`). Una parte con conteo 0 se omite; con el
  // feed cargando o vacío `partes` queda vacío y no se pinta la línea.
  const lineaEstadistica = [
    totalStock > 0 &&
      `${totalStock.toLocaleString("es-EC")} ${totalStock === 1 ? "auto" : "autos"}`,
    marcasStock.length > 0 &&
      `${marcasStock.length} ${marcasStock.length === 1 ? "marca" : "marcas"}`,
    transparentes.length > 0 &&
      `${transparentes.length} ${
        transparentes.length === 1 ? "verificado o con ficha" : "verificados o con ficha"
      }`,
  ]
    .filter(Boolean)
    .join(" · ");

  // Grilla unificada (solo en modo poco stock): internas + referenciadas en una lista,
  // de lo más reciente a lo más antiguo. Las premium se distinguen solas por su `ring-2`.
  const stockUnificado = useMemo<EntradaStock[]>(() => {
    const entradas: EntradaStock[] = [
      ...internas.map((pub) => ({ tipo: "interna" as const, pub })),
      ...referenciadas.map((pub) => ({ tipo: "referenciada" as const, pub })),
    ];
    return entradas.sort(
      (a, b) => new Date(b.pub.creado_en).getTime() - new Date(a.pub.creado_en).getTime()
    );
  }, [internas, referenciadas]);

  // El badge "↓ Bajó $X" sigue al auto guardado por toda la portada (destacados, recientes,
  // resultados de búsqueda), no solo en "Tus favoritos". `distintivo` es prop de ListingCard.
  // `precioActual` llega tipado `number` pero el backend lo manda como string decimal;
  // `bajaDePrecio` lo normaliza (ver src/lib/precio.ts).
  function distintivoBaja(
    placa: string | null | undefined,
    precioActual: number | string | null | undefined
  ) {
    const baja = bajaDePrecio(mapa.get((placa ?? "").toUpperCase()), precioActual);
    return baja != null ? <BadgeBaja monto={baja} /> : null;
  }

  const feedVacio =
    !cargandoFeed && internas.length === 0 && referenciadas.length === 0 && !errorFeed;

  // Accesos del vendedor. El comprador entra a ver autos, no a gestionar los suyos:
  // esta fila va DESPUÉS de la primera grilla, nunca antes. Publicar también vive en el
  // Header y en la barra de navegación de celular.
  const accionesVendedor = (
    <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-borde bg-superficie-tenue/70 p-4">
      <p className="mr-1 w-full text-sm font-semibold text-tinta sm:w-auto">
        ¿Vendes tu auto?
      </p>
      <Link
        href="/marketplace/publicar"
        className="inline-flex items-center justify-center rounded-full bg-accion px-5 py-2.5 text-sm font-semibold text-superficie shadow-sm hover:opacity-90"
      >
        + Publicar mi auto
      </Link>
      <Link
        href="/marketplace/mis-publicaciones"
        className="inline-flex items-center justify-center rounded-full border border-borde-fuerte bg-superficie px-4 py-2.5 text-sm font-semibold text-secundario shadow-sm hover:bg-superficie-tenue"
      >
        Mis publicaciones
      </Link>
      <Link
        href="/marketplace/mis-referencias"
        className="inline-flex items-center justify-center rounded-full px-3 py-2.5 text-sm font-semibold text-secundario hover:text-tinta"
      >
        Mis referencias
      </Link>
    </div>
  );

  // ── Estado de la grilla de búsqueda ─────────────────────────────────────────
  const resultadosListos = busqueda.clave === clave;
  const cargandoBusqueda = busquedaActiva && !resultadosListos;
  const nResultados = busqueda.items.length;

  // Pills de filtros activos (cada uno se quita con su ×). Reproduce la búsqueda exacta.
  const pills: { clave: keyof FiltrosBusqueda; texto: string }[] = [];
  if (filtros.q) pills.push({ clave: "q", texto: `“${filtros.q}”` });
  if (filtros.tipo) pills.push({ clave: "tipo", texto: TIPO_CARROCERIA_LABEL[filtros.tipo] });
  if (filtros.combustible)
    pills.push({ clave: "combustible", texto: COMBUSTIBLE_LABEL[filtros.combustible] });
  if (filtros.transmision)
    pills.push({ clave: "transmision", texto: TRANSMISION_LABEL[filtros.transmision] });
  if (filtros.precio_min != null)
    pills.push({ clave: "precio_min", texto: `Desde ${montoOpcion(filtros.precio_min)}` });
  if (filtros.precio_max != null)
    pills.push({ clave: "precio_max", texto: `Hasta ${montoOpcion(filtros.precio_max)}` });
  if (filtros.anio_min != null)
    pills.push({ clave: "anio_min", texto: `Desde ${filtros.anio_min}` });
  if (filtros.anio_max != null)
    pills.push({ clave: "anio_max", texto: `Hasta ${filtros.anio_max}` });

  function quitarPill(claveFiltro: keyof FiltrosBusqueda) {
    if (claveFiltro === "q") setTexto("");
    actualizarUrl({ [claveFiltro]: null });
  }

  const aniosAnio = opcionesAnio();

  return (
    // `espacio-barra-movil`: reserva abajo el alto de la barra de navegación de celular
    // (fixed) para que la última tarjeta / el CTA no queden tapados. 0 desde `md`.
    <div className="espacio-barra-movil">
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-black text-tinta sm:text-3xl">
          Autos <span className="text-marca">en venta</span>
        </h1>
        {/* Línea de estadística (Dirección C): conteos del inventario en `font-mono`
            —es un dato, no copy—. Se arma en `lineaEstadistica` desde el feed en cliente. */}
        {lineaEstadistica.length > 0 && (
          <p className="mt-1.5 font-mono text-xs text-secundario">{lineaEstadistica}</p>
        )}
        <p className="mt-1 text-sm text-secundario sm:text-base">
          Cada anuncio muestra la ficha técnica del vendedor y los datos oficiales de su
          placa. También hay referencias de portales externos, sin verificar.
        </p>
      </header>

      {/* ── 1. Buscador protagonista + filtros ─────────────────────────────── */}
      <div className="mb-8">
        <form onSubmit={enviarTexto}>
          <label htmlFor="buscador-autos" className="sr-only">
            ¿Qué auto buscas? Marca, modelo o placa
          </label>
          <div className="relative">
            <span
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-secundario"
              aria-hidden
            >
              🔍
            </span>
            <input
              id="buscador-autos"
              type="search"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="¿Qué auto buscas?"
              className="w-full rounded-2xl border border-borde-fuerte bg-superficie py-4 pl-12 pr-28 text-base text-tinta shadow-sm outline-none placeholder:text-secundario focus:border-marca focus:ring-2 focus:ring-marca/25"
            />
            <button
              type="submit"
              /* Píldora oscura, no `--accion`: buscar es navegación, no conversión —
                 misma familia que "Cargar más autos" (§2). */
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-oscuro px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-oscuro-suave"
            >
              Buscar
            </button>
          </div>
        </form>

        {/* Chips rápidos de presupuesto (con stock) + botón "Filtros". */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {bandasConStock.map(({ banda: b, total }) => {
            const activa =
              (filtros.precio_min ?? null) === (b.min ?? null) &&
              (filtros.precio_max ?? null) === (b.max ?? null);
            return (
              <button
                key={b.clave}
                type="button"
                aria-pressed={activa}
                onClick={() => (activa ? actualizarUrl({ precio_min: null, precio_max: null }) : aplicarBanda(b))}
                // Chip ACTIVO en píldora OSCURA (`--oscuro`), estilo ESTORE (Dirección C):
                // un filtro aplicado es estado de selección de segundo nivel, no la acción
                // de conversión —§2 reserva `--accion` (esmeralda) para esa sola cosa—. La
                // píldora oscura es el lenguaje del sistema para "seleccionado / secundario
                // sólido"; el botón "Filtros" de acá al lado marca su estado activo igual.
                className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
                  activa
                    ? "bg-oscuro text-white"
                    : "border border-borde-fuerte bg-superficie text-secundario hover:bg-superficie-tenue"
                }`}
              >
                {b.etiqueta} <span className="opacity-70">({total})</span>
              </button>
            );
          })}
          <button
            type="button"
            aria-expanded={panelAbierto}
            onClick={() => setPanelAbierto((v) => !v)}
            className={`ml-auto inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
              nAvanzados > 0
                ? "border-oscuro bg-oscuro text-white"
                : "border-borde-fuerte bg-superficie text-secundario hover:bg-superficie-tenue"
            }`}
          >
            Filtros
            {nAvanzados > 0 && (
              // Contador de filtros activos: metadato, no acción. Va SOBRE la píldora oscura
              // del botón activo, así que blanco sólido con el número en oscuro: se lee como
              // badge de notificación y no gasta `--accion` (§2).
              <span className="grid h-5 w-5 place-items-center rounded-full bg-white text-[11px] font-black text-oscuro">
                {nAvanzados}
              </span>
            )}
            <span aria-hidden>{panelAbierto ? "▲" : "▼"}</span>
          </button>
        </div>

        {/* Panel de filtros avanzados (colapsable en móvil para no saturar). */}
        {panelAbierto && (
          <div className="mt-3 grid grid-cols-1 gap-3 rounded-2xl border border-borde bg-superficie p-4 sombra-tarjeta sm:grid-cols-2 lg:grid-cols-3">
            <Selector
              etiqueta="Tipo de vehículo"
              valor={filtros.tipo ?? ""}
              onChange={(v) => actualizarUrl({ tipo: v || null })}
            >
              <option value="">Cualquiera</option>
              {OPCIONES_TIPO_CARROCERIA.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.etiqueta}
                </option>
              ))}
            </Selector>

            <Selector
              etiqueta="Combustible"
              valor={filtros.combustible ?? ""}
              onChange={(v) => actualizarUrl({ combustible: v || null })}
            >
              <option value="">Cualquiera</option>
              {OPCIONES_COMBUSTIBLE.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.etiqueta}
                </option>
              ))}
            </Selector>

            <Selector
              etiqueta="Transmisión"
              valor={filtros.transmision ?? ""}
              onChange={(v) => actualizarUrl({ transmision: v || null })}
            >
              <option value="">Cualquiera</option>
              {OPCIONES_TRANSMISION.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.etiqueta}
                </option>
              ))}
            </Selector>

            <Selector
              etiqueta="Precio desde"
              valor={filtros.precio_min != null ? String(filtros.precio_min) : ""}
              onChange={(v) => actualizarUrl({ precio_min: v || null })}
            >
              <option value="">Sin mínimo</option>
              {OPCIONES_PRECIO.map((p) => (
                <option key={p} value={p}>
                  {montoOpcion(p)}
                </option>
              ))}
            </Selector>

            <Selector
              etiqueta="Precio hasta"
              valor={filtros.precio_max != null ? String(filtros.precio_max) : ""}
              onChange={(v) => actualizarUrl({ precio_max: v || null })}
            >
              <option value="">Sin máximo</option>
              {OPCIONES_PRECIO.map((p) => (
                <option key={p} value={p}>
                  {montoOpcion(p)}
                </option>
              ))}
            </Selector>

            <div className="grid grid-cols-2 gap-3">
              <Selector
                etiqueta="Año desde"
                valor={filtros.anio_min != null ? String(filtros.anio_min) : ""}
                onChange={(v) => actualizarUrl({ anio_min: v || null })}
              >
                <option value="">Cualquiera</option>
                {aniosAnio.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </Selector>
              <Selector
                etiqueta="Año hasta"
                valor={filtros.anio_max != null ? String(filtros.anio_max) : ""}
                onChange={(v) => actualizarUrl({ anio_max: v || null })}
              >
                <option value="">Cualquiera</option>
                {aniosAnio.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </Selector>
            </div>

            {busquedaActiva && (
              <div className="flex items-end sm:col-span-2 lg:col-span-3">
                <button
                  type="button"
                  onClick={limpiarFiltros}
                  className="rounded-full border border-borde-fuerte bg-superficie px-4 py-2 text-sm font-semibold text-secundario hover:bg-superficie-tenue"
                >
                  Limpia todos los filtros
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Los accesos del vendedor (`accionesVendedor`) ya NO van aquí arriba: se
          renderizan después de la primera grilla de autos (punto C). */}

      {errorFeed && !busquedaActiva && (
        <p className="rounded-xl border border-error bg-error-tinte p-4 text-error">
          {errorFeed}
        </p>
      )}

      {/* ── Grilla de búsqueda: reemplaza los bloques curados ────────────────── */}
      {busquedaActiva && (
        <section className="mb-10">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-tinta">
                {cargandoBusqueda
                  ? "Buscando autos…"
                  : nResultados === 1
                    ? "1 auto encontrado"
                    : `${nResultados} autos encontrados`}
              </h2>
              {pills.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {pills.map((p) => (
                    <button
                      key={p.clave}
                      type="button"
                      onClick={() => quitarPill(p.clave)}
                      className="inline-flex items-center gap-1 rounded-full border border-borde-fuerte bg-superficie px-3 py-1 text-xs font-semibold text-secundario hover:bg-superficie-tenue"
                    >
                      {p.texto}
                      <span className="text-secundario" aria-hidden>
                        ×
                      </span>
                      <span className="sr-only">Quitar filtro</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={limpiarFiltros}
              className="shrink-0 rounded-full border border-borde-fuerte bg-superficie px-4 py-2 text-sm font-semibold text-secundario hover:bg-superficie-tenue"
            >
              Limpiar filtros
            </button>
          </div>

          {cargandoBusqueda ? (
            <EsqueletoTarjetas />
          ) : busqueda.error ? (
            <div className="rounded-2xl border border-error bg-error-tinte p-6 text-center">
              <p className="font-semibold text-error">{busqueda.error}</p>
              <button
                type="button"
                onClick={limpiarFiltros}
                className="mt-3 inline-flex rounded-full border border-error bg-superficie px-4 py-2 text-sm font-semibold text-error hover:bg-error-tinte"
              >
                Reiniciar búsqueda
              </button>
            </div>
          ) : nResultados === 0 ? (
            <div className="rounded-2xl border border-borde bg-superficie p-8 text-center sombra-tarjeta">
              <p className="font-semibold text-secundario">
                No encontramos autos con esos filtros.
              </p>
              <p className="mt-1 text-sm text-secundario">Prueba con menos filtros.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {busqueda.items.map((item) =>
                  item.tipo_publicacion === "interna" && item.interna ? (
                    <ListingInternaCard
                      key={`i-${item.interna.id}`}
                      pub={item.interna}
                      favoritos={control}
                      distintivo={distintivoBaja(item.interna.placa, item.interna.precio_usd)}
                    />
                  ) : item.referenciada ? (
                    <ListingReferenciadaCard
                      key={`r-${item.referenciada.id}`}
                      pub={item.referenciada}
                      favoritos={control}
                      distintivo={distintivoBaja(
                        item.referenciada.placa,
                        item.referenciada.precio_usd
                      )}
                    />
                  ) : null
                )}
              </div>

              {busqueda.cursor && (
                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    onClick={cargarMas}
                    disabled={cargandoMas}
                    // Píldora OSCURA, no `--accion`: "cargar más" es navegación, no
                    // conversión. El esmeralda queda reservado para publicar/contactar (§2).
                    className="rounded-full bg-oscuro px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-oscuro-suave disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {cargandoMas ? "Cargando…" : "Cargar más autos"}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* ── Portada del comprador (solo sin búsqueda activa) ────────────────── */}
      {!busquedaActiva && (
        <>
          {cargandoFeed && <EsqueletoTarjetas />}

          {feedVacio && (
            <div className="rounded-2xl border border-borde bg-superficie p-8 text-center sombra-tarjeta">
              <p className="text-lg font-semibold text-tinta">
                Todavía no hay autos publicados
              </p>
              <p className="mx-auto mt-1 max-w-md text-secundario">
                Sé el primero en publicar tu auto. Es gratis y aparece al instante.
              </p>
              <Link
                href="/marketplace/publicar"
                className="mt-4 inline-flex rounded-full bg-accion px-5 py-2.5 text-sm font-semibold text-superficie shadow-sm hover:opacity-90"
              >
                Publicar mi auto
              </Link>
            </div>
          )}

          {/* Tus favoritos — retención pasiva, va arriba de todo EN AMBOS MODOS. */}
          {haySesion &&
            favoritosInternos.length + favoritosReferenciados.length > 0 && (
              <Bloque
                titulo="♥ Tus favoritos"
                descripcion="Los autos que guardaste. Si alguno baja de precio, te lo marcamos aquí."
              >
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
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

          {/* ── MODO POCO STOCK (< UMBRAL): una sola grilla con TODO el stock ──
              Internas + referenciadas juntas, de lo más reciente a lo más antiguo.
              Las premium se distinguen solas por su `ring-2`. Sin bloques curados:
              con este volumen "★ Destacados" sería una tarjeta y ~400px de vacío. */}
          {!portadaCurada && totalStock > 0 && (
            <>
              <Bloque
                titulo={
                  totalStock === 1 ? "1 auto en venta" : `${totalStock} autos en venta`
                }
                descripcion="Todo lo publicado ahora mismo, de lo más reciente a lo más antiguo."
              >
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {stockUnificado.map((e) =>
                    e.tipo === "interna" ? (
                      <ListingInternaCard
                        key={`i-${e.pub.id}`}
                        pub={e.pub}
                        favoritos={control}
                        distintivo={distintivoBaja(e.pub.placa, e.pub.precio_usd)}
                      />
                    ) : (
                      <ListingReferenciadaCard
                        key={`r-${e.pub.id}`}
                        pub={e.pub}
                        favoritos={control}
                        distintivo={distintivoBaja(e.pub.placa, e.pub.precio_usd)}
                      />
                    )
                  )}
                </div>
              </Bloque>

              {/* Accesos del vendedor: después de la primera (y única) grilla. */}
              {accionesVendedor}
            </>
          )}

          {/* ── MODO PORTADA CURADA (>= UMBRAL): los bloques MC1 tal cual ────── */}
          {portadaCurada && (
            <>
              {/* Destacados premium — carrusel horizontal (sin librerías). Solo tiene
                  sentido como carrusel con 2+ premium; con 0-1 esa publicación ya cae
                  en "Verificados" / "Recién publicados". */}
              {feed.premium.length >= MIN_PREMIUM_CARRUSEL && (
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

              {/* Verificados y transparentes — nuestro diferenciador. */}
              {transparentes.length > 0 && (
                <Bloque
                  titulo="✓ Verificados y transparentes"
                  descripcion="Con sello de la plataforma o con la ficha técnica casi completa."
                >
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
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

              {/* Explora por marca — chips derivados del stock real. */}
              {marcas.length > 0 && (
                <Bloque titulo="Explora por marca" descripcion="Marcas con autos publicados ahora.">
                  <div className="flex flex-wrap gap-2">
                    {marcas.map(({ marca, total }) => (
                      <button
                        key={marca}
                        type="button"
                        onClick={() => buscarMarca(marca)}
                        className="rounded-full border border-borde-fuerte bg-superficie px-4 py-2 text-sm font-semibold text-secundario shadow-sm transition hover:border-marca hover:text-marca-texto"
                      >
                        {marca} <span className="text-secundario">({total})</span>
                      </button>
                    ))}
                  </div>
                </Bloque>
              )}

              {/* Recién publicados. */}
              {recientes.length > 0 && (
                <Bloque titulo="Recién publicados" descripcion="Lo último que entró al mercado.">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
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

              {/* Accesos del vendedor: después de la primera grilla de autos. */}
              {accionesVendedor}

              {/* Por presupuesto — el comprador real compra por bolsillo. */}
              {bandasConStock.length > 0 && (
                <Bloque titulo="Por presupuesto" descripcion="Elige tu rango y mira solo lo que te alcanza.">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {bandasConStock.map(({ banda: b, total }) => (
                      <button
                        key={b.clave}
                        type="button"
                        onClick={() => aplicarBanda(b)}
                        className="rounded-2xl border border-borde bg-superficie p-5 text-left sombra-tarjeta transition hover:border-marca"
                      >
                        <p className="text-base font-bold text-tinta">{b.etiqueta}</p>
                        <p className="mt-1 text-sm text-secundario">
                          {total === 1 ? "1 auto disponible" : `${total} autos disponibles`}
                        </p>
                      </button>
                    ))}
                  </div>
                </Bloque>
              )}

              {/* Referencias externas — al pie, con su etiqueta de "no verificados".
                  En modo poco stock NO se repite: las referenciadas ya salen en la
                  grilla unificada de arriba. */}
              {referenciadas.length > 0 && (
                <Bloque
                  titulo="Referencias externas"
                  descripcion="Anuncios de otros portales aportados por usuarios. La plataforma no los verifica."
                >
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {referenciadas.map((p) => (
                      <ListingReferenciadaCard key={p.id} pub={p} favoritos={control} />
                    ))}
                  </div>
                </Bloque>
              )}
            </>
          )}
        </>
      )}

      {/* Vía 3 de publicación: referenciar un anuncio externo. Se conserva del diseño
          anterior — es la entrada que hace descubrible el flujo de referencias. */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-borde bg-superficie-tenue/70 p-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-tinta">
            🔗 ¿Viste un auto en Facebook u OLX?
          </p>
          <p className="mt-0.5 text-sm text-secundario">
            Pega el link y lo sumamos al feed como referencia externa. No hace falta que sea
            tuyo y es gratis.
          </p>
        </div>
        <Link
          href="/marketplace/referenciar"
          className="inline-flex shrink-0 items-center justify-center rounded-full border border-borde-fuerte bg-superficie px-5 py-2.5 text-sm font-semibold text-secundario shadow-sm hover:bg-superficie-tenue"
        >
          Referenciar anuncio externo
        </Link>
      </div>

      {/* Anónimo que tocó un ♡: invitación amable, nunca un 401 ni una redirección. */}
      {invitacion && <InvitacionFavorito onCerrar={cerrarInvitacion} />}
    </div>
    </div>
  );
}

// ── Página ───────────────────────────────────────────────────────────────────
// `ContenidoMarketplace` usa useSearchParams (los filtros viven en la URL), que en Next 16
// exige un límite de Suspense para no romper el prerender de la ruta.
export default function MarketplacePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          <p className="text-secundario">Cargando marketplace…</p>
        </div>
      }
    >
      <ContenidoMarketplace />
    </Suspense>
  );
}
