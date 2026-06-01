// Perfil Consolidado de Vehículo. Prioriza la lectura: encabezado con el veredicto,
// enseguida los DATOS DEL AUTO (para identificar el vehículo), luego multas, matrícula
// y la consulta a portales oficiales (que hoy es lo más útil). Las fuentes que todavía
// no aportan datos accionables (FGE, EPMTSD-municipal) quedan DESACTIVADAS hasta tener
// una solución. Paleta sobria: color reservado al estado. Español de Ecuador (tuteo).
// El frontend solo lee y pinta lo que el backend consolidó (GET /consultar/{placa}/perfil).

"use client";

import { useEffect, useState } from "react";
import { consultarPerfil, desbloquearProducto, reintentarFuente } from "@/lib/api";
import { tieneSesion } from "@/lib/auth";
import { BentoCard, Insignia, type TonoInsignia } from "@/components/BentoCard";
import {
  estadoDeFuente,
  hayFuentesEnProceso,
  marcarFuenteEnProceso,
} from "@/lib/perfil";
import {
  ApiError,
  type CategoriaMulta,
  type EstadoFuenteItem,
  type MultaDetalle,
  type ProductoEstado,
  type VehiculoConsolidado,
} from "@/types/api";

// Callback que reemplaza el perfil tras un desbloqueo (lo provee el componente raíz).
type AlDesbloquear = (perfil: VehiculoConsolidado) => void;

function productoDe(perfil: VehiculoConsolidado, codigo: string): ProductoEstado | undefined {
  return perfil.productos?.find((p) => p.codigo === codigo);
}

const INTERVALO_POLLING_MS = 4000;

// Fuentes desactivadas temporalmente: aún no aportan datos accionables para el usuario
// (FGE pasó a consulta externa por captcha; EPMTSD-municipal solo cubre Santo Domingo).
// Se ocultan del perfil y del tablero hasta tener una solución para traer esos atributos.
const FUENTES_INACTIVAS = new Set(["FGE", "EPMTSD"]);

interface Props {
  inicial: VehiculoConsolidado;
}

// ── Helpers de fuentes no oficiales ─────────────────────────────────────────

// Detalle de multas de fuentes ACTIVAS (excluye las desactivadas, p. ej. EPMTSD).
function multasActivas(perfil: VehiculoConsolidado): MultaDetalle[] {
  return perfil.multas_detalle.filter((d) => !FUENTES_INACTIVAS.has(d.fuente));
}

function MarcaFuente({ fuente }: { fuente: string }) {
  return (
    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide font-semibold text-slate-500">
      {fuente}
    </span>
  );
}

function BotonReintentar({
  onReintentar,
  reintentando,
}: {
  onReintentar: () => void;
  reintentando: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onReintentar}
      disabled={reintentando}
      className="mt-2 inline-flex items-center gap-2 rounded-full border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {reintentando && (
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-rose-300 border-t-transparent" />
      )}
      {reintentando ? "Reintentando…" : "Reintentar conexión"}
    </button>
  );
}

// Botón de microdesbloqueo: cobra tokens y revela una sección. Maneja 401/402/409.
function BotonDesbloqueo({
  placa,
  producto,
  alDesbloquear,
}: {
  placa: string;
  producto: ProductoEstado | undefined;
  alDesbloquear: AlDesbloquear;
}) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Si la fuente no entrega ese dato para la placa, no ofrecemos el botón (no se cobra).
  if (!producto || !producto.disponible) return null;
  const prod = producto; // narrow estable para el closure async

  async function desbloquear() {
    if (!tieneSesion()) {
      window.location.href = `/login?next=/consultar/${placa}`;
      return;
    }
    setCargando(true);
    setError(null);
    try {
      alDesbloquear(await desbloquearProducto(placa, prod.codigo));
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          window.location.href = `/login?next=/consultar/${placa}`;
          return;
        }
        if (err.status === 402) setError("No te alcanzan los tokens. Recarga para continuar.");
        else if (err.status === 409) setError("Ese dato no está disponible para esta placa por ahora.");
        else setError(err.message || "No se pudo desbloquear.");
      } else {
        setError("No se pudo desbloquear.");
      }
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={desbloquear}
        disabled={cargando}
        className="inline-flex items-center gap-2 rounded-full bg-brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
      >
        {cargando ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        ) : (
          <span aria-hidden>🔓</span>
        )}
        Desbloquear · {producto.tokens} {producto.tokens === 1 ? "token" : "tokens"}
      </button>
      {error && <p className="mt-1.5 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

function SkeletonLista({ filas = 2 }: { filas?: number }) {
  return (
    <div className="animate-pulse space-y-2" aria-busy="true" aria-live="polite">
      {Array.from({ length: filas }).map((_, i) => (
        <div key={i} className="h-10 rounded-xl bg-slate-100" />
      ))}
    </div>
  );
}

// Dato label/valor con jerarquía tipográfica clara.
function Dato({
  label,
  valor,
}: {
  label: string;
  valor: string | number | null | undefined;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-1 truncate text-[15px] font-semibold text-slate-900">
        {valor ?? <span className="text-slate-300">—</span>}
      </dd>
    </div>
  );
}

// ── Veredicto global (solo fuentes activas) ─────────────────────────────────

interface Veredicto {
  tienePendientes: boolean;
  totalAPagar: number;
  multasPendientes: number;
  detalleDisponible: boolean;
}

function calcularVeredicto(perfil: VehiculoConsolidado): Veredicto {
  const activas = multasActivas(perfil);
  const totalMultas = activas.reduce((acc, d) => acc + (d.total_a_pagar_usd ?? 0), 0);
  const totalSri = perfil.valores_tributarios?.total_a_pagar_usd ?? 0;
  const multasPendientes = activas.reduce((acc, d) => acc + d.pendientes, 0);
  return {
    // Veredicto GRATIS: lo decide el backend (vale aunque el detalle esté bloqueado).
    tienePendientes: perfil.tiene_pendientes,
    totalAPagar: totalMultas + totalSri,
    multasPendientes,
    // Los montos/conteos solo se conocen si el detalle de multas está desbloqueado.
    detalleDisponible: !perfil.multas_bloqueado,
  };
}

function Metrica({ label, valor, alerta }: { label: string; valor: string; alerta?: boolean }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-0.5 text-2xl font-bold tabular-nums ${alerta ? "text-amber-600" : "text-slate-900"}`}>
        {valor}
      </p>
    </div>
  );
}

// ── Encabezado (nombre legible en móvil + veredicto) ────────────────────────

function Encabezado({ perfil, cargando }: { perfil: VehiculoConsolidado; cargando: boolean }) {
  const b = perfil.datos_basicos;
  const titulo = [b.marca, b.modelo].filter(Boolean).join(" ") || "Vehículo";
  const v = calcularVeredicto(perfil);

  const pill = cargando
    ? { clase: "bg-slate-100 text-slate-500", texto: "Consultando…", icono: null }
    : v.tienePendientes
      ? { clase: "bg-amber-500 text-white", texto: "Con pendientes", icono: "⚠" }
      : { clase: "bg-emerald-500 text-white", texto: "Limpio", icono: "✓" };

  // Métricas con cifras solo si el detalle de multas está desbloqueado; si no, el
  // veredicto (pill) ya comunica "con pendientes / limpio" sin revelar montos.
  const hayMetricas =
    !cargando && v.detalleDisponible && (v.totalAPagar > 0 || v.multasPendientes > 0);

  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white p-6 sm:p-8 sombra-tarjeta">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Perfil del vehículo
          </p>
          {/* break-words + sin truncate: el nombre se lee completo en móvil. */}
          <h1 className="mt-1.5 text-2xl font-extrabold leading-tight tracking-tight text-slate-900 break-words sm:text-4xl">
            {titulo}
          </h1>
          <p className="mt-1.5 font-mono text-sm tracking-[0.3em] text-slate-400">{perfil.placa}</p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-2 self-start rounded-full px-5 py-2.5 text-sm font-bold ${pill.clase}`}
        >
          {cargando && <span className="h-2 w-2 animate-pulse rounded-full bg-slate-400" />}
          {pill.icono && <span className="text-base leading-none">{pill.icono}</span>}
          {pill.texto}
        </span>
      </div>

      {hayMetricas && (
        <div className="mt-6 grid max-w-xs grid-cols-2 gap-4 border-t border-slate-100 pt-5">
          <Metrica
            label="A pagar"
            valor={v.totalAPagar > 0 ? `$${v.totalAPagar.toFixed(0)}` : "—"}
            alerta={v.totalAPagar > 0}
          />
          <Metrica label="Multas" valor={String(v.multasPendientes)} alerta={v.multasPendientes > 0} />
        </div>
      )}
    </div>
  );
}

// ── Datos del auto (enseguida del nombre, para identificar el vehículo) ──────

function CardDatos({
  perfil,
  alDesbloquear,
  className,
}: {
  perfil: VehiculoConsolidado;
  alDesbloquear: AlDesbloquear;
  className?: string;
}) {
  const b = perfil.datos_basicos;
  // Marca/modelo/año/color son gratis (teaser); clase/servicio/fechas quedan tras
  // `vehiculo_basico`. La vigencia de matrícula es gratis (sin revelar la fecha).
  return (
    <BentoCard
      titulo="Datos del auto"
      className={className}
      badge={b.bloqueado ? <Insignia tono="neutro">🔒 ampliado</Insignia> : undefined}
    >
      <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
        <Dato label="Año" valor={b.anio} />
        <Dato label="Color" valor={b.color} />
        <Dato label="Clase" valor={b.bloqueado ? "🔒" : b.clase} />
        <Dato label="Servicio" valor={b.bloqueado ? "🔒" : b.servicio} />
        {!b.bloqueado && b.pais_origen && <Dato label="Origen" valor={b.pais_origen} />}
      </dl>
      {b.bloqueado && (
        <BotonDesbloqueo
          placa={perfil.placa}
          producto={productoDe(perfil, "vehiculo_basico")}
          alDesbloquear={alDesbloquear}
        />
      )}
    </BentoCard>
  );
}

// ── Multas e infracciones (fuentes activas: ANT, AMT) ───────────────────────

function PildoraCategoria({ cat }: { cat: CategoriaMulta }) {
  const esPendiente = cat.etiqueta.toLowerCase().startsWith("pendiente");
  const tono = esPendiente ? "bg-amber-50 text-amber-700" : "bg-slate-50 text-slate-500";
  const monto =
    cat.monto_usd != null && cat.monto_usd > 0 ? ` · $${cat.monto_usd.toFixed(2)}` : "";
  return (
    <span className={`rounded-lg px-2 py-1 text-[11px] font-medium ${tono}`}>
      {cat.etiqueta}: <span className="font-bold">{cat.cantidad}</span>
      {monto}
    </span>
  );
}

function BloqueMulta({ d }: { d: MultaDetalle }) {
  const tienePend = d.pendientes > 0 || (d.total_a_pagar_usd ?? 0) > 0;
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MarcaFuente fuente={d.fuente} />
          <span className="text-sm font-semibold text-slate-700">{d.ambito}</span>
        </div>
        {tienePend && d.total_a_pagar_usd != null && d.total_a_pagar_usd > 0 ? (
          <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-sm font-bold text-amber-700">
            ${d.total_a_pagar_usd.toFixed(2)}
          </span>
        ) : null}
      </div>
      {d.categorias.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {d.categorias.map((c) => (
            <PildoraCategoria key={`${d.fuente}-${c.etiqueta}`} cat={c} />
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm font-medium text-emerald-600">Sin registros</p>
      )}
    </div>
  );
}

function CardMultas({
  perfil,
  cargandoAmt,
  amtErrorFuente,
  onReintentar,
  reintentando,
  alDesbloquear,
  className,
}: {
  perfil: VehiculoConsolidado;
  cargandoAmt: boolean;
  amtErrorFuente: boolean;
  onReintentar: () => void;
  reintentando: boolean;
  alDesbloquear: AlDesbloquear;
  className?: string;
}) {
  // Bloqueado: el teaser solo dice si hay pendientes (gratis); el detalle con montos
  // se revela con `vehiculo_multas`.
  if (perfil.multas_bloqueado) {
    return (
      <BentoCard
        titulo="Multas e infracciones"
        cargando={cargandoAmt}
        badge={
          perfil.tiene_pendientes ? (
            <Insignia tono="alerta">Con pendientes</Insignia>
          ) : (
            <Insignia tono="ok">Al día</Insignia>
          )
        }
        className={className}
      >
        <p className="text-sm text-slate-600">
          {perfil.tiene_pendientes
            ? "Este vehículo tiene multas o infracciones registradas. Desbloquea el detalle con montos por fuente (ANT/AMT)."
            : "Sin multas ni infracciones pendientes. Desbloquea el detalle completo si quieres verlo."}
        </p>
        <BotonDesbloqueo
          placa={perfil.placa}
          producto={productoDe(perfil, "vehiculo_multas")}
          alDesbloquear={alDesbloquear}
        />
      </BentoCard>
    );
  }

  const detalle = multasActivas(perfil);
  const totalPend = detalle.reduce((acc, d) => acc + d.pendientes, 0);
  const badge =
    detalle.length === 0 && cargandoAmt ? undefined : totalPend > 0 ? (
      <Insignia tono="alerta">{totalPend} pendientes</Insignia>
    ) : (
      <Insignia tono="ok">Al día</Insignia>
    );

  return (
    <BentoCard titulo="Multas e infracciones" cargando={cargandoAmt} badge={badge} className={className}>
      {amtErrorFuente && (
        <div className="mb-3 rounded-xl border border-rose-100 bg-rose-50/70 p-3">
          <p className="text-xs text-rose-600">
            No pudimos consultar las infracciones municipales (AMT).
          </p>
          <BotonReintentar onReintentar={onReintentar} reintentando={reintentando} />
        </div>
      )}
      {detalle.length === 0 ? (
        cargandoAmt ? (
          <SkeletonLista />
        ) : (
          <p className="text-sm font-medium text-emerald-600">
            Sin multas ni infracciones registradas.
          </p>
        )
      ) : (
        <div className="space-y-3">
          {detalle.map((d) => (
            <BloqueMulta key={d.fuente} d={d} />
          ))}
          {cargandoAmt && <SkeletonLista filas={1} />}
        </div>
      )}
    </BentoCard>
  );
}

// ── Matrícula ───────────────────────────────────────────────────────────────

function CardMatricula({ perfil, className }: { perfil: VehiculoConsolidado; className?: string }) {
  const b = perfil.datos_basicos;
  let tono: TonoInsignia = "neutro";
  let etiqueta = "—";
  if (b.fecha_caducidad) {
    const vence = new Date(b.fecha_caducidad);
    const vencida = !Number.isNaN(vence.getTime()) && vence < new Date();
    tono = vencida ? "peligro" : "ok";
    etiqueta = vencida ? "Vencida" : "Vigente";
  }
  return (
    <BentoCard titulo="Matrícula" className={className} badge={<Insignia tono={tono}>{etiqueta}</Insignia>}>
      <dl className="space-y-4">
        <Dato label="Matriculado" valor={b.fecha_matricula} />
        <Dato label="Vence" valor={b.fecha_caducidad} />
      </dl>
    </BentoCard>
  );
}

// ── Valores tributarios (SRI): solo si hay valores en línea ─────────────────
// Si el SRI es consulta externa (no entrega valores), NO se muestra esta tarjeta;
// el acceso queda en "Consultar oficial" (que tiene más valor hoy).

function CardValores({ perfil, className }: { perfil: VehiculoConsolidado; className?: string }) {
  const v = perfil.valores_tributarios;
  if (!v || v.url_consulta != null) return null;
  const conValores = (v.total_a_pagar_usd ?? 0) > 0;
  return (
    <BentoCard
      titulo="Valores SRI"
      className={className}
      badge={<Insignia tono={conValores ? "alerta" : "ok"}>{conValores ? "Con valores" : "Al día"}</Insignia>}
    >
      <dl className="space-y-4">
        <Dato label="Matrícula" valor={v.matricula_usd != null ? `$${v.matricula_usd.toFixed(2)}` : null} />
        <Dato label="Total a pagar" valor={v.total_a_pagar_usd != null ? `$${v.total_a_pagar_usd.toFixed(2)}` : null} />
      </dl>
    </BentoCard>
  );
}

// ── Identificación (VIN/motor/chasis ofuscados): solo si hay datos ──────────

function CardIdentificacion({
  perfil,
  alDesbloquear,
  className,
}: {
  perfil: VehiculoConsolidado;
  alDesbloquear: AlDesbloquear;
  className?: string;
}) {
  const id = perfil.identificacion;
  const hayDatos =
    !!id.vin_ofuscado || !!id.numero_motor_ofuscado || !!id.numero_chasis_ofuscado;
  if (!hayDatos) return null;
  return (
    <BentoCard
      titulo="Identificación"
      className={className}
      badge={id.bloqueado ? <Insignia tono="neutro">🔒 ofuscado</Insignia> : <Insignia tono="ok">visible</Insignia>}
    >
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Dato label="VIN" valor={id.vin ?? id.vin_ofuscado} />
        <Dato label="N° motor" valor={id.numero_motor ?? id.numero_motor_ofuscado} />
        <Dato label="N° chasis" valor={id.numero_chasis ?? id.numero_chasis_ofuscado} />
      </dl>
      {id.bloqueado && (
        <BotonDesbloqueo
          placa={perfil.placa}
          producto={productoDe(perfil, "vehiculo_identificadores")}
          alDesbloquear={alDesbloquear}
        />
      )}
    </BentoCard>
  );
}

// ── Consulta a portales oficiales (subida: hoy es lo más útil) ──────────────

interface EnlaceExterno {
  etiqueta: string;
  descripcion: string;
  url: string;
  destacado: boolean;
}

const URL_EPMTSD_CONDICION = "https://servicios.epmtsd.gob.ec/vehiculo_seguro/";

function urlConsultasEcuador(perfil: VehiculoConsolidado): string | null {
  const ce = perfil.estado_fuentes.find((f) => f.clave === "ConsultasEcuador");
  return ce?.estado === "consulta_externa" && ce.detalle?.startsWith("http") ? ce.detalle : null;
}

function derivarEnlaces(perfil: VehiculoConsolidado): EnlaceExterno[] {
  const enlaces: EnlaceExterno[] = [];
  const urlSri = perfil.valores_tributarios?.url_consulta;
  if (urlSri) {
    enlaces.push({
      etiqueta: "Valores del SRI",
      descripcion: "Matrícula e impuestos en el portal oficial",
      url: urlSri,
      destacado: true,
    });
  }
  enlaces.push({
    etiqueta: "Condición del vehículo",
    descripcion: "Robo, prendas, remarcado, traspasos y RTV (EPMTSD oficial)",
    url: URL_EPMTSD_CONDICION,
    destacado: false,
  });
  const urlCe = urlConsultasEcuador(perfil);
  if (urlCe) {
    enlaces.push({
      etiqueta: "VIN / chasis",
      descripcion: "ConsultasEcuador (fuente no oficial)",
      url: urlCe,
      destacado: false,
    });
  }
  return enlaces;
}

function BotonEnlace({ e }: { e: EnlaceExterno }) {
  if (e.destacado) {
    return (
      <a
        href={e.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between gap-2 rounded-xl bg-brand-gradient px-4 py-3 text-white shadow-sm transition hover:opacity-90"
      >
        <span className="min-w-0">
          <span className="block text-sm font-bold">{e.etiqueta} ↗</span>
          <span className="block truncate text-[11px] text-white/80">{e.descripcion}</span>
        </span>
      </a>
    );
  }
  return (
    <a
      href={e.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:border-slate-300 hover:bg-slate-50"
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-slate-900">
          {e.etiqueta}
          <span className="ml-1 text-slate-400 transition group-hover:text-slate-600">↗</span>
        </span>
        <span className="block truncate text-[11px] text-slate-400">{e.descripcion}</span>
      </span>
    </a>
  );
}

function CardConsultaOficial({
  enlaces,
  className,
}: {
  enlaces: EnlaceExterno[];
  className?: string;
}) {
  if (enlaces.length === 0) return null;
  return (
    <BentoCard titulo="Consultar en portales oficiales" className={className}>
      <p className="mb-4 text-sm leading-relaxed text-slate-500">
        Los valores del SRI y la condición legal del vehículo se consultan directamente en
        los portales oficiales (no se pueden automatizar por su captcha).
      </p>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {enlaces.map((e) => (
          <BotonEnlace key={e.url} e={e} />
        ))}
      </div>
    </BentoCard>
  );
}

// ── Pie: tablero de fuentes (solo activas) ──────────────────────────────────

const ETIQUETA_ESTADO: Record<string, string> = {
  completada: "lista",
  sin_resultados: "sin resultados",
  en_proceso: "consultando…",
  error_fuente: "no disponible",
  error: "error",
  consulta_externa: "ver en portal",
  no_integrada: "pendiente",
};

const COLOR_ESTADO: Record<string, string> = {
  completada: "bg-emerald-50 text-emerald-700",
  sin_resultados: "bg-slate-100 text-slate-500",
  en_proceso: "bg-sky-50 text-sky-700",
  error_fuente: "bg-rose-50 text-rose-700",
  error: "bg-rose-50 text-rose-700",
  consulta_externa: "bg-sky-50 text-sky-700",
  no_integrada: "bg-slate-100 text-slate-400",
};

function ChipFuente({ fuente }: { fuente: EstadoFuenteItem }) {
  const color = COLOR_ESTADO[fuente.estado] ?? COLOR_ESTADO.error;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${color}`}
      title={fuente.detalle ?? fuente.nombre}
    >
      {fuente.estado === "en_proceso" && (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-500" />
      )}
      <span className="font-semibold">{fuente.clave}</span>
      <span className="opacity-70">{ETIQUETA_ESTADO[fuente.estado] ?? fuente.estado}</span>
      {fuente.origen === "no_oficial" && (
        <span title="Fuente no oficial" className="text-amber-500">
          ⓘ
        </span>
      )}
    </span>
  );
}

function PieFuentes({ perfil }: { perfil: VehiculoConsolidado }) {
  const fuentes = perfil.estado_fuentes.filter((f) => !FUENTES_INACTIVAS.has(f.clave));
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-5 sm:p-6 sombra-tarjeta">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
        Fuentes consultadas
      </h3>
      <div className="flex flex-wrap gap-2">
        {fuentes.map((f) => (
          <ChipFuente key={f.clave} fuente={f} />
        ))}
      </div>
    </div>
  );
}

// ── Componente principal ────────────────────────────────────────────────────

export function PerfilVehiculo({ inicial }: Props) {
  const [perfil, setPerfil] = useState<VehiculoConsolidado>(inicial);
  const [reintentando, setReintentando] = useState(false);

  const cargando = hayFuentesEnProceso(perfil);

  useEffect(() => {
    if (!cargando) return;
    const t = setTimeout(async () => {
      try {
        setPerfil(await consultarPerfil(perfil.placa));
      } catch {
        // Silencioso: conservar datos previos y reintentar en el próximo ciclo.
      }
    }, INTERVALO_POLLING_MS);
    return () => clearTimeout(t);
  }, [perfil, cargando]);

  // El perfil inicial llega del server SIN sesión (teaser). Si hay sesión en el cliente,
  // re-consultamos CON token para aplicar los microdesbloqueos ya pagados de esta placa.
  useEffect(() => {
    if (!tieneSesion()) return;
    let activo = true;
    (async () => {
      try {
        const p = await consultarPerfil(inicial.placa);
        if (activo) setPerfil(p);
      } catch {
        // Silencioso: si falla, queda el teaser.
      }
    })();
    return () => {
      activo = false;
    };
  }, [inicial.placa]);

  async function reintentarAmt() {
    setReintentando(true);
    setPerfil((prev) => marcarFuenteEnProceso(prev, "AMT"));
    try {
      await reintentarFuente(perfil.placa, "AMT");
    } catch {
      // El polling reintenta igual; el reencolado puede haberse hecho.
    }
    setReintentando(false);
  }

  const enlaces = derivarEnlaces(perfil);

  // Tarjetas accesorias: solo se muestran si traen datos (valores SRI en línea o
  // identificadores ofuscados). Si ambas vienen vacías, no pintamos el bloque.
  const id = perfil.identificacion;
  const hayValoresInline =
    perfil.valores_tributarios != null && perfil.valores_tributarios.url_consulta == null;
  const hayIdentificacion = !!(
    id.vin_ofuscado || id.numero_motor_ofuscado || id.numero_chasis_ofuscado
  );
  const hayAccesorias = hayValoresInline || hayIdentificacion;

  return (
    <div className="space-y-5">
      <Encabezado perfil={perfil} cargando={cargando} />

      {/* Datos del auto enseguida del nombre, para identificar el vehículo. */}
      <CardDatos perfil={perfil} alDesbloquear={setPerfil} />

      {/* Multas e infracciones (izquierda) + Matrícula (derecha) en un mismo bloque. */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <CardMultas
          perfil={perfil}
          cargandoAmt={estadoDeFuente(perfil, "AMT") === "en_proceso"}
          amtErrorFuente={estadoDeFuente(perfil, "AMT") === "error_fuente"}
          onReintentar={reintentarAmt}
          reintentando={reintentando}
          alDesbloquear={setPerfil}
          className="md:col-span-2"
        />
        <CardMatricula perfil={perfil} />
      </div>

      {/* Consulta oficial: subida porque hoy es lo más útil. */}
      <CardConsultaOficial enlaces={enlaces} />

      {/* Accesorias, solo si traen datos. */}
      {hayAccesorias && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <CardValores perfil={perfil} />
          <CardIdentificacion perfil={perfil} alDesbloquear={setPerfil} className="lg:col-span-2" />
        </div>
      )}

      <PieFuentes perfil={perfil} />
    </div>
  );
}
