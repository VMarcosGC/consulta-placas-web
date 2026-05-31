// Vista del Perfil Consolidado de Vehículo como BENTO GRID: todo el "estado de
// salud" del auto (veredicto, multas, matrícula, datos, condición, legal) cabe en
// el primer pantallazo en desktop/tablet. En mobile colapsa a tarjetas pequeñas
// apiladas. Recibe el objeto ya consolidado por el backend
// (GET /consultar/{placa}/perfil → VehiculoConsolidado); el frontend solo lee y pinta.
//
// Las fuentes NO oficiales se marcan con ⓘ + disclaimer. Los enlaces a portales
// externos (SRI, EPMTSD, ConsultasEcuador) y el tablero de fuentes van AL FINAL.
// Polling silencioso cada 4s mientras una fuente del worker (AMT/FGE) siga en proceso.

"use client";

import { useEffect, useState } from "react";
import { consultarPerfil, reintentarFuente } from "@/lib/api";
import { BentoCard, Insignia, type TonoInsignia } from "@/components/BentoCard";
import {
  estadoDeFuente,
  hayFuentesEnProceso,
  marcarFuenteEnProceso,
} from "@/lib/perfil";
import type {
  CategoriaMulta,
  EstadoFuenteItem,
  MultaDetalle,
  VehiculoConsolidado,
} from "@/types/api";

const INTERVALO_POLLING_MS = 4000;

interface Props {
  inicial: VehiculoConsolidado;
}

// ── Helpers de fuentes no oficiales ─────────────────────────────────────────

function clavesNoOficiales(perfil: VehiculoConsolidado): Set<string> {
  return new Set(
    perfil.estado_fuentes.filter((f) => f.origen === "no_oficial").map((f) => f.clave)
  );
}

function MarcaFuente({ fuente, noOficial }: { fuente: string; noOficial: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide font-semibold text-slate-500">
        {fuente}
      </span>
      {noOficial && (
        <span
          title="Dato de fuente no oficial — referencial, puede no estar actualizado"
          className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700"
        >
          ⓘ no oficial
        </span>
      )}
    </span>
  );
}

function DisclaimerNoOficial() {
  return (
    <p className="mt-2 text-[11px] text-amber-700/80">
      ⓘ Datos de fuentes no oficiales; referenciales, pueden no estar actualizados.
    </p>
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
      className="mt-2 inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-200 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {reintentando ? "Reintentando…" : "Reintentar conexión"}
    </button>
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

// Dato compacto label/valor para las grillas internas de las tarjetas.
function Dato({
  label,
  valor,
}: {
  label: string;
  valor: string | number | null | undefined;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="truncate text-sm font-semibold text-slate-900">
        {valor ?? <span className="text-slate-300">—</span>}
      </dd>
    </div>
  );
}

// ── Cálculo del veredicto global ────────────────────────────────────────────

interface Veredicto {
  tienePendientes: boolean;
  totalAPagar: number;
  multasPendientes: number;
  novedades: number;
}

function calcularVeredicto(perfil: VehiculoConsolidado): Veredicto {
  const totalMultas = perfil.multas_detalle.reduce(
    (acc, d) => acc + (d.total_a_pagar_usd ?? 0),
    0
  );
  const totalSri = perfil.valores_tributarios?.total_a_pagar_usd ?? 0;
  const multasPendientes = perfil.multas_detalle.reduce((acc, d) => acc + d.pendientes, 0);
  const novedades = perfil.novedades_legales.length;
  const totalAPagar = totalMultas + totalSri;
  return {
    tienePendientes: totalAPagar > 0 || multasPendientes > 0 || novedades > 0,
    totalAPagar,
    multasPendientes,
    novedades,
  };
}

// ── Hero del veredicto (full width, dominante) ──────────────────────────────

function VeredictoHero({
  perfil,
  cargando,
}: {
  perfil: VehiculoConsolidado;
  cargando: boolean;
}) {
  const b = perfil.datos_basicos;
  const titulo = [b.marca, b.modelo].filter(Boolean).join(" ") || "Vehículo";
  const v = calcularVeredicto(perfil);

  // Mientras una fuente sigue en proceso no damos veredicto definitivo.
  const gradiente = cargando
    ? "from-blue-600 via-sky-500 to-cyan-500"
    : v.tienePendientes
      ? "from-amber-500 via-orange-500 to-rose-500"
      : "from-emerald-500 via-teal-500 to-emerald-400";
  const etiqueta = cargando ? "Consultando…" : v.tienePendientes ? "Con deudas" : "Limpio";
  const emoji = cargando ? "⏳" : v.tienePendientes ? "⚠️" : "✓";

  return (
    <div
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${gradiente} p-5 text-white shadow-lg sm:p-6`}
    >
      <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" aria-hidden />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-widest text-white/70">
            Perfil del vehículo
          </p>
          <h1 className="mt-0.5 truncate text-2xl font-black sm:text-3xl">{titulo}</h1>
          <p className="mt-0.5 font-mono text-base tracking-[0.3em] text-white/80">
            {perfil.placa}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {/* Indicadores rápidos */}
          <div className="flex gap-2">
            {v.totalAPagar > 0 && (
              <div className="rounded-2xl bg-white/15 px-3 py-2 text-center backdrop-blur-sm">
                <p className="text-[10px] uppercase tracking-wide text-white/70">A pagar</p>
                <p className="text-lg font-black leading-none">${v.totalAPagar.toFixed(0)}</p>
              </div>
            )}
            {v.multasPendientes > 0 && (
              <div className="rounded-2xl bg-white/15 px-3 py-2 text-center backdrop-blur-sm">
                <p className="text-[10px] uppercase tracking-wide text-white/70">Multas</p>
                <p className="text-lg font-black leading-none">{v.multasPendientes}</p>
              </div>
            )}
            {v.novedades > 0 && (
              <div className="rounded-2xl bg-white/15 px-3 py-2 text-center backdrop-blur-sm">
                <p className="text-[10px] uppercase tracking-wide text-white/70">Legal</p>
                <p className="text-lg font-black leading-none">{v.novedades}</p>
              </div>
            )}
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-slate-900 shadow-sm">
            {cargando && <span className="h-2 w-2 animate-ping rounded-full bg-blue-500" />}
            <span className="text-lg">{emoji}</span>
            {etiqueta}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Bento: Datos básicos ────────────────────────────────────────────────────

function BentoDatos({ perfil, className }: { perfil: VehiculoConsolidado; className?: string }) {
  const b = perfil.datos_basicos;
  return (
    <BentoCard titulo="Datos del auto" icono="🚗" acento="azul" className={className}>
      <dl className="grid grid-cols-3 gap-x-3 gap-y-3">
        <Dato label="Año" valor={b.anio} />
        <Dato label="Color" valor={b.color} />
        <Dato label="Clase" valor={b.clase} />
        <Dato label="Servicio" valor={b.servicio} />
        <Dato label="Origen" valor={b.pais_origen} />
      </dl>
    </BentoCard>
  );
}

// ── Bento: Matrícula (fechas) ───────────────────────────────────────────────

function BentoMatricula({ perfil, className }: { perfil: VehiculoConsolidado; className?: string }) {
  const b = perfil.datos_basicos;
  // Veredicto de vigencia: si hay fecha de caducidad, indicamos al día / vencida.
  let tono: TonoInsignia = "neutro";
  let etiqueta = "—";
  if (b.fecha_caducidad) {
    const vence = new Date(b.fecha_caducidad);
    const vencida = !Number.isNaN(vence.getTime()) && vence < new Date();
    tono = vencida ? "peligro" : "ok";
    etiqueta = vencida ? "Vencida" : "Vigente";
  }
  return (
    <BentoCard
      titulo="Matrícula"
      icono="📄"
      acento="esmeralda"
      className={className}
      badge={<Insignia tono={tono}>{etiqueta}</Insignia>}
    >
      <dl className="grid grid-cols-1 gap-3">
        <Dato label="Matriculado" valor={b.fecha_matricula} />
        <Dato label="Vence" valor={b.fecha_caducidad} />
      </dl>
    </BentoCard>
  );
}

// ── Bento: Multas e infracciones ────────────────────────────────────────────

function PildoraCategoria({ cat }: { cat: CategoriaMulta }) {
  const esPendiente = cat.etiqueta.toLowerCase().startsWith("pendiente");
  const tono = esPendiente
    ? "bg-amber-100 text-amber-800 border-amber-200"
    : "bg-slate-50 text-slate-600 border-slate-200";
  const monto =
    cat.monto_usd != null && cat.monto_usd > 0 ? ` · $${cat.monto_usd.toFixed(2)}` : "";
  return (
    <span className={`rounded-lg border px-2 py-0.5 text-[11px] font-medium ${tono}`}>
      {cat.etiqueta}: <span className="font-bold">{cat.cantidad}</span>
      {monto}
    </span>
  );
}

function BloqueMulta({ d }: { d: MultaDetalle }) {
  const tienePend = d.pendientes > 0 || (d.total_a_pagar_usd ?? 0) > 0;
  return (
    <div
      className={`rounded-xl border p-3 ${
        tienePend ? "border-amber-200 bg-amber-50/60" : "border-slate-200 bg-slate-50"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MarcaFuente fuente={d.fuente} noOficial={false} />
          <span className="text-xs font-semibold text-slate-700">{d.ambito}</span>
        </div>
        {d.total_a_pagar_usd != null && d.total_a_pagar_usd > 0 && (
          <span className="rounded-lg bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
            ${d.total_a_pagar_usd.toFixed(2)}
          </span>
        )}
      </div>
      {d.categorias.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {d.categorias.map((c) => (
            <PildoraCategoria key={`${d.fuente}-${c.etiqueta}`} cat={c} />
          ))}
        </div>
      ) : (
        <p className="mt-1 text-xs font-medium text-emerald-700">Sin registros ✓</p>
      )}
    </div>
  );
}

function BentoMultas({
  perfil,
  cargandoAmt,
  amtErrorFuente,
  onReintentar,
  reintentando,
  className,
}: {
  perfil: VehiculoConsolidado;
  cargandoAmt: boolean;
  amtErrorFuente: boolean;
  onReintentar: () => void;
  reintentando: boolean;
  className?: string;
}) {
  const detalle = perfil.multas_detalle;
  const totalPend = detalle.reduce((acc, d) => acc + d.pendientes, 0);
  const badge =
    detalle.length === 0 && cargandoAmt ? null : totalPend > 0 ? (
      <Insignia tono="alerta">{totalPend} pendientes</Insignia>
    ) : (
      <Insignia tono="ok">Limpio</Insignia>
    );
  return (
    <BentoCard
      titulo="Multas e infracciones"
      icono="🚦"
      acento="ambar"
      cargando={cargandoAmt}
      badge={badge}
      className={className}
    >
      {amtErrorFuente && (
        <div className="mb-2 rounded-xl border border-rose-200 bg-rose-50 p-3">
          <p className="text-xs text-rose-700">
            No pudimos consultar las infracciones municipales (AMT).
          </p>
          <BotonReintentar onReintentar={onReintentar} reintentando={reintentando} />
        </div>
      )}
      {detalle.length === 0 ? (
        cargandoAmt ? (
          <SkeletonLista />
        ) : (
          <p className="text-sm font-medium text-emerald-700">
            Sin multas ni infracciones registradas ✓
          </p>
        )
      ) : (
        <div className="space-y-2">
          {detalle.map((d) => (
            <BloqueMulta key={d.fuente} d={d} />
          ))}
          {cargandoAmt && <SkeletonLista filas={1} />}
        </div>
      )}
    </BentoCard>
  );
}

// ── Bento: Valores tributarios (SRI) ────────────────────────────────────────

function BentoValores({
  perfil,
  className,
}: {
  perfil: VehiculoConsolidado;
  className?: string;
}) {
  const v = perfil.valores_tributarios;
  // El SRI es consulta_externa (reCAPTCHA): el enlace al portal va al pie (lo deriva
  // el padre); aquí solo indicamos que se consulta allá.
  const externo = v?.url_consulta != null;
  const conValores = (v?.total_a_pagar_usd ?? 0) > 0;
  return (
    <BentoCard
      titulo="Valores SRI"
      icono="💵"
      acento="cian"
      className={className}
      badge={
        v && !externo ? (
          <Insignia tono={conValores ? "alerta" : "ok"}>
            {conValores ? "Con valores" : "Al día"}
          </Insignia>
        ) : undefined
      }
    >
      {!v ? (
        <p className="text-sm text-slate-500">Sin datos disponibles.</p>
      ) : externo ? (
        <p className="text-xs text-slate-500">
          El portal del SRI usa reCAPTCHA; consultá los valores en el enlace oficial
          (al pie de la página).
        </p>
      ) : (
        <dl className="grid grid-cols-1 gap-3">
          <Dato
            label="Matrícula"
            valor={v.matricula_usd != null ? `$${v.matricula_usd.toFixed(2)}` : null}
          />
          <Dato
            label="Total a pagar"
            valor={v.total_a_pagar_usd != null ? `$${v.total_a_pagar_usd.toFixed(2)}` : null}
          />
        </dl>
      )}
    </BentoCard>
  );
}

// ── Bento: Identificación (VIN/motor/chasis ofuscados) ──────────────────────

function BentoIdentificacion({
  perfil,
  noOficiales,
  className,
}: {
  perfil: VehiculoConsolidado;
  noOficiales: Set<string>;
  className?: string;
}) {
  const id = perfil.identificacion;
  const hayDatos =
    !!id.vin_ofuscado ||
    !!id.numero_motor_ofuscado ||
    !!id.numero_chasis_ofuscado ||
    !!id.pais_origen;

  // ConsultasEcuador (no oficial) aportaría chasis/VIN, pero está tras reCAPTCHA:
  // se expone como enlace externo (al pie, lo deriva el padre).
  const urlExterna = urlConsultasEcuador(perfil);

  if (!hayDatos && !urlExterna) return null;

  const muestraNoOficial = hayDatos && noOficiales.has("ConsultasEcuador");

  return (
    <BentoCard titulo="Identificación" icono="🔐" acento="indigo" className={className}>
      {hayDatos ? (
        <dl className="grid grid-cols-1 gap-3">
          <Dato label="VIN" valor={id.vin_ofuscado} />
          <Dato label="N° motor" valor={id.numero_motor_ofuscado} />
          <Dato label="N° chasis" valor={id.numero_chasis_ofuscado} />
        </dl>
      ) : (
        <p className="text-xs text-slate-500">
          El VIN/chasis no se obtiene automáticamente; consultá el enlace al pie.
        </p>
      )}
      {muestraNoOficial && <DisclaimerNoOficial />}
    </BentoCard>
  );
}

// ── Bento: Novedades legales (FGE) ──────────────────────────────────────────

function BentoLegal({
  perfil,
  cargandoFge,
  fgeErrorFuente,
  onReintentar,
  reintentando,
  noOficiales,
  className,
}: {
  perfil: VehiculoConsolidado;
  cargandoFge: boolean;
  fgeErrorFuente: boolean;
  onReintentar: () => void;
  reintentando: boolean;
  noOficiales: Set<string>;
  className?: string;
}) {
  const novedades = perfil.novedades_legales;
  const hayNoOficial = novedades.some((n) => noOficiales.has(n.fuente));
  const badge =
    novedades.length === 0 && cargandoFge ? null : novedades.length > 0 ? (
      <Insignia tono="peligro">{novedades.length}</Insignia>
    ) : (
      <Insignia tono="ok">Sin novedades</Insignia>
    );
  return (
    <BentoCard
      titulo="Novedades legales"
      icono="⚖️"
      acento="rosa"
      cargando={cargandoFge}
      badge={badge}
      className={className}
    >
      {fgeErrorFuente ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
          <p className="text-xs text-rose-700">No pudimos consultar la Fiscalía (FGE).</p>
          <BotonReintentar onReintentar={onReintentar} reintentando={reintentando} />
        </div>
      ) : novedades.length === 0 && cargandoFge ? (
        <SkeletonLista />
      ) : novedades.length === 0 ? (
        <p className="text-sm font-medium text-emerald-700">
          Sin noticias del delito asociadas ✓
        </p>
      ) : (
        <>
          <ul className="space-y-2">
            {novedades.map((n, i) => (
              <li
                key={n.ndd ?? `${n.fuente}-${i}`}
                className="rounded-xl border border-rose-100 bg-rose-50/50 p-3"
              >
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <MarcaFuente fuente={n.fuente} noOficial={noOficiales.has(n.fuente)} />
                  <span className="text-[11px] text-slate-500">{n.fecha}</span>
                </div>
                <p className="text-sm font-semibold text-slate-900">{n.delito}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {[n.lugar, n.unidad].filter(Boolean).join(" · ")}
                </p>
              </li>
            ))}
          </ul>
          {hayNoOficial && <DisclaimerNoOficial />}
        </>
      )}
    </BentoCard>
  );
}

// ── Bento: Condición y antecedentes (EPMTSD, enlace oficial) ────────────────

function BentoCondicion({ className }: { className?: string }) {
  const items = ["Robo", "Prendas", "Prohibición de enajenar", "Remarcado", "Traspasos", "RTV"];
  return (
    <BentoCard
      titulo="Condición y antecedentes"
      icono="🛡️"
      acento="indigo"
      className={className}
      badge={<Insignia tono="info">EPMTSD</Insignia>}
    >
      <p className="text-xs text-slate-500">
        Para una compra segura, verificá gravámenes y estado legal en el servicio oficial
        (enlace al pie):
      </p>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {items.map((t) => (
          <li
            key={t}
            className="rounded-lg border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700"
          >
            {t}
          </li>
        ))}
      </ul>
    </BentoCard>
  );
}

// ── Pie: enlaces externos + tablero de fuentes ──────────────────────────────

interface EnlaceExterno {
  etiqueta: string;
  descripcion: string;
  url: string;
  oficial: boolean;
}

const URL_EPMTSD_CONDICION = "https://servicios.epmtsd.gob.ec/vehiculo_seguro/";

// URL del portal ConsultasEcuador si la fuente vino como consulta_externa.
function urlConsultasEcuador(perfil: VehiculoConsolidado): string | null {
  const ce = perfil.estado_fuentes.find((f) => f.clave === "ConsultasEcuador");
  return ce?.estado === "consulta_externa" && ce.detalle?.startsWith("http")
    ? ce.detalle
    : null;
}

// Construye la lista de portales externos a mostrar al pie, de forma determinista
// (sin efectos secundarios en el render de las tarjetas).
function derivarEnlaces(perfil: VehiculoConsolidado): EnlaceExterno[] {
  const enlaces: EnlaceExterno[] = [];
  const urlSri = perfil.valores_tributarios?.url_consulta;
  if (urlSri) {
    enlaces.push({
      etiqueta: "Valores SRI",
      descripcion: "Consultar matrícula e impuestos en el portal oficial",
      url: urlSri,
      oficial: true,
    });
  }
  enlaces.push({
    etiqueta: "Condición del vehículo",
    descripcion: "Robo, prendas, remarcado, traspasos y RTV (EPMTSD oficial)",
    url: URL_EPMTSD_CONDICION,
    oficial: true,
  });
  const urlCe = urlConsultasEcuador(perfil);
  if (urlCe) {
    enlaces.push({
      etiqueta: "VIN / chasis",
      descripcion: "Consultar en ConsultasEcuador (fuente no oficial)",
      url: urlCe,
      oficial: false,
    });
  }
  return enlaces;
}

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
  completada: "bg-emerald-50 text-emerald-700 border-emerald-200",
  sin_resultados: "bg-slate-100 text-slate-500 border-slate-200",
  en_proceso: "bg-blue-50 text-blue-700 border-blue-200",
  error_fuente: "bg-rose-50 text-rose-700 border-rose-200",
  error: "bg-red-50 text-red-700 border-red-200",
  consulta_externa: "bg-blue-50 text-blue-700 border-blue-200",
  no_integrada: "bg-slate-100 text-slate-500 border-slate-200",
};

function ChipFuente({ fuente }: { fuente: EstadoFuenteItem }) {
  const color = COLOR_ESTADO[fuente.estado] ?? COLOR_ESTADO.error;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${color}`}
      title={fuente.detalle ?? fuente.nombre}
    >
      {fuente.estado === "en_proceso" && (
        <span className="h-1.5 w-1.5 animate-ping rounded-full bg-blue-500" />
      )}
      <span className="font-semibold">{fuente.clave}</span>
      <span className="opacity-70">{ETIQUETA_ESTADO[fuente.estado] ?? fuente.estado}</span>
      {fuente.origen === "no_oficial" && (
        <span title="Fuente no oficial" className="text-amber-600">
          ⓘ
        </span>
      )}
    </span>
  );
}

function PieFuentes({
  perfil,
  enlaces,
}: {
  perfil: VehiculoConsolidado;
  enlaces: EnlaceExterno[];
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 sombra-tarjeta">
      {enlaces.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            Consultar en portales oficiales
          </h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {enlaces.map((e) => (
              <a
                key={e.url}
                href={e.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm transition hover:brightness-[0.98] ${
                  e.oficial
                    ? "border-blue-200 bg-blue-50 text-blue-800"
                    : "border-amber-200 bg-amber-50 text-amber-800"
                }`}
              >
                <span className="min-w-0">
                  <span className="block font-semibold">{e.etiqueta} ↗</span>
                  <span className="block truncate text-[11px] opacity-70">{e.descripcion}</span>
                </span>
              </a>
            ))}
          </div>
        </div>
      )}
      <div>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
          Fuentes consultadas
        </h3>
        <div className="flex flex-wrap gap-2">
          {perfil.estado_fuentes.map((f) => (
            <ChipFuente key={f.clave} fuente={f} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ────────────────────────────────────────────────────

export function PerfilVehiculo({ inicial }: Props) {
  const [perfil, setPerfil] = useState<VehiculoConsolidado>(inicial);
  const [reintentando, setReintentando] = useState<{ AMT?: boolean; FGE?: boolean }>({});

  const cargando = hayFuentesEnProceso(perfil);

  // Polling silencioso cada 4s mientras alguna fuente del worker siga en proceso.
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

  async function reintentar(fuente: "AMT" | "FGE") {
    setReintentando((r) => ({ ...r, [fuente]: true }));
    setPerfil((prev) => marcarFuenteEnProceso(prev, fuente));
    try {
      await reintentarFuente(perfil.placa, fuente);
    } catch {
      // El polling reintenta igual; el reencolado puede haberse hecho.
    }
    setReintentando((r) => ({ ...r, [fuente]: false }));
  }

  const noOficiales = clavesNoOficiales(perfil);
  // Enlaces a portales externos, derivados del perfil; se pintan todos juntos al
  // pie (requisito: enlaces externos al final).
  const enlaces = derivarEnlaces(perfil);

  return (
    <div className="space-y-4">
      <VeredictoHero perfil={perfil} cargando={cargando} />

      {/* Bento Grid: denso, sin scroll en desktop/tablet; apila en mobile. */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4 lg:grid-flow-dense">
        <BentoMultas
          perfil={perfil}
          cargandoAmt={estadoDeFuente(perfil, "AMT") === "en_proceso"}
          amtErrorFuente={estadoDeFuente(perfil, "AMT") === "error_fuente"}
          onReintentar={() => reintentar("AMT")}
          reintentando={!!reintentando.AMT}
          className="md:col-span-2 lg:col-span-2 lg:row-span-2"
        />
        <BentoDatos perfil={perfil} className="lg:col-span-2" />
        <BentoMatricula perfil={perfil} className="lg:col-span-1" />
        <BentoValores perfil={perfil} className="lg:col-span-1" />
        <BentoLegal
          perfil={perfil}
          cargandoFge={estadoDeFuente(perfil, "FGE") === "en_proceso"}
          fgeErrorFuente={estadoDeFuente(perfil, "FGE") === "error_fuente"}
          onReintentar={() => reintentar("FGE")}
          reintentando={!!reintentando.FGE}
          noOficiales={noOficiales}
          className="md:col-span-2 lg:col-span-2"
        />
        <BentoIdentificacion
          perfil={perfil}
          noOficiales={noOficiales}
          className="lg:col-span-1"
        />
        <BentoCondicion className="md:col-span-2 lg:col-span-3" />
      </div>

      <PieFuentes perfil={perfil} enlaces={enlaces} />
    </div>
  );
}
