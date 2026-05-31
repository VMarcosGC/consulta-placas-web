// Perfil Consolidado de Vehículo. Prioriza la lectura: un encabezado claro con el
// veredicto, luego las tarjetas de datos ordenadas por importancia (multas → matrícula
// → datos → valores → legal → identificación), y al final lo accesorio (condición) y los
// enlaces a portales externos + tablero de fuentes. Paleta sobria: superficies blancas,
// color reservado al estado. El frontend solo lee y pinta lo que el backend consolidó
// (GET /consultar/{placa}/perfil). Polling silencioso mientras AMT/FGE estén en proceso.

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
          className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700"
        >
          ⓘ no oficial
        </span>
      )}
    </span>
  );
}

function DisclaimerNoOficial() {
  return (
    <p className="mt-3 text-[11px] text-slate-400">
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
      className="mt-2 inline-flex items-center gap-2 rounded-full border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
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

// Dato label/valor, con buen aire y jerarquía tipográfica clara.
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

// ── Veredicto global ────────────────────────────────────────────────────────

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

// Métrica del encabezado: rótulo pequeño + número grande. Tono solo si hay pendiente.
function Metrica({
  label,
  valor,
  alerta,
}: {
  label: string;
  valor: string;
  alerta?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
      <p
        className={`mt-0.5 text-2xl font-bold tabular-nums ${
          alerta ? "text-amber-600" : "text-slate-900"
        }`}
      >
        {valor}
      </p>
    </div>
  );
}

// ── Encabezado limpio con el veredicto ──────────────────────────────────────

function Encabezado({
  perfil,
  cargando,
}: {
  perfil: VehiculoConsolidado;
  cargando: boolean;
}) {
  const b = perfil.datos_basicos;
  const titulo = [b.marca, b.modelo].filter(Boolean).join(" ") || "Vehículo";
  const v = calcularVeredicto(perfil);

  const pill = cargando
    ? { clase: "bg-slate-100 text-slate-500", texto: "Consultando…", icono: null }
    : v.tienePendientes
      ? { clase: "bg-amber-500 text-white", texto: "Con pendientes", icono: "⚠" }
      : { clase: "bg-emerald-500 text-white", texto: "Limpio", icono: "✓" };

  const hayMetricas = !cargando && (v.totalAPagar > 0 || v.multasPendientes > 0 || v.novedades > 0);

  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white p-6 sm:p-8 sombra-tarjeta">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Perfil del vehículo
          </p>
          <h1 className="mt-1.5 truncate text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            {titulo}
          </h1>
          <p className="mt-1.5 font-mono text-sm tracking-[0.35em] text-slate-400">
            {perfil.placa}
          </p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold ${pill.clase}`}
        >
          {cargando && <span className="h-2 w-2 animate-pulse rounded-full bg-slate-400" />}
          {pill.icono && <span className="text-base leading-none">{pill.icono}</span>}
          {pill.texto}
        </span>
      </div>

      {hayMetricas && (
        <div className="mt-6 grid max-w-md grid-cols-3 gap-4 border-t border-slate-100 pt-5">
          <Metrica
            label="A pagar"
            valor={v.totalAPagar > 0 ? `$${v.totalAPagar.toFixed(0)}` : "—"}
            alerta={v.totalAPagar > 0}
          />
          <Metrica
            label="Multas"
            valor={String(v.multasPendientes)}
            alerta={v.multasPendientes > 0}
          />
          <Metrica
            label="Legal"
            valor={String(v.novedades)}
            alerta={v.novedades > 0}
          />
        </div>
      )}
    </div>
  );
}

// ── Multas e infracciones (tarjeta prioritaria) ─────────────────────────────

function PildoraCategoria({ cat }: { cat: CategoriaMulta }) {
  const esPendiente = cat.etiqueta.toLowerCase().startsWith("pendiente");
  const tono = esPendiente
    ? "bg-amber-50 text-amber-700"
    : "bg-slate-50 text-slate-500";
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
          <MarcaFuente fuente={d.fuente} noOficial={false} />
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
    detalle.length === 0 && cargandoAmt ? undefined : totalPend > 0 ? (
      <Insignia tono="alerta">{totalPend} pendientes</Insignia>
    ) : (
      <Insignia tono="ok">Al día</Insignia>
    );

  return (
    <BentoCard
      titulo="Multas e infracciones"
      cargando={cargandoAmt}
      badge={badge}
      className={className}
    >
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

function CardMatricula({
  perfil,
  className,
}: {
  perfil: VehiculoConsolidado;
  className?: string;
}) {
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

// ── Datos del auto ──────────────────────────────────────────────────────────

function CardDatos({
  perfil,
  className,
}: {
  perfil: VehiculoConsolidado;
  className?: string;
}) {
  const b = perfil.datos_basicos;
  return (
    <BentoCard titulo="Datos del auto" className={className}>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
        <Dato label="Año" valor={b.anio} />
        <Dato label="Color" valor={b.color} />
        <Dato label="Clase" valor={b.clase} />
        <Dato label="Servicio" valor={b.servicio} />
        {b.pais_origen && <Dato label="Origen" valor={b.pais_origen} />}
      </dl>
    </BentoCard>
  );
}

// ── Valores tributarios (SRI) ───────────────────────────────────────────────

function CardValores({
  perfil,
  className,
}: {
  perfil: VehiculoConsolidado;
  className?: string;
}) {
  const v = perfil.valores_tributarios;
  const externo = v?.url_consulta != null;
  const conValores = (v?.total_a_pagar_usd ?? 0) > 0;
  return (
    <BentoCard
      titulo="Valores SRI"
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
        <p className="text-sm leading-relaxed text-slate-500">
          El portal del SRI usa reCAPTCHA; consultá los valores en el enlace oficial al pie.
        </p>
      ) : (
        <dl className="space-y-4">
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

// ── Novedades legales (FGE) ─────────────────────────────────────────────────

function CardLegal({
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
    novedades.length === 0 && cargandoFge ? undefined : novedades.length > 0 ? (
      <Insignia tono="peligro">{novedades.length}</Insignia>
    ) : (
      <Insignia tono="ok">Sin novedades</Insignia>
    );
  return (
    <BentoCard titulo="Novedades legales" cargando={cargandoFge} badge={badge} className={className}>
      {fgeErrorFuente ? (
        <div className="rounded-xl border border-rose-100 bg-rose-50/70 p-3">
          <p className="text-xs text-rose-600">No pudimos consultar la Fiscalía (FGE).</p>
          <BotonReintentar onReintentar={onReintentar} reintentando={reintentando} />
        </div>
      ) : novedades.length === 0 && cargandoFge ? (
        <SkeletonLista />
      ) : novedades.length === 0 ? (
        <p className="text-sm font-medium text-emerald-600">Sin noticias del delito asociadas.</p>
      ) : (
        <>
          <ul className="space-y-2.5">
            {novedades.map((n, i) => (
              <li
                key={n.ndd ?? `${n.fuente}-${i}`}
                className="rounded-xl border border-slate-100 bg-slate-50/60 p-3"
              >
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <MarcaFuente fuente={n.fuente} noOficial={noOficiales.has(n.fuente)} />
                  <span className="text-[11px] text-slate-400">{n.fecha}</span>
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

// ── Identificación (VIN/motor/chasis ofuscados) ─────────────────────────────

function CardIdentificacion({
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

  const urlExterna = urlConsultasEcuador(perfil);
  if (!hayDatos && !urlExterna) return null;

  const muestraNoOficial = hayDatos && noOficiales.has("ConsultasEcuador");

  return (
    <BentoCard titulo="Identificación" className={className}>
      {hayDatos ? (
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Dato label="VIN" valor={id.vin_ofuscado} />
          <Dato label="N° motor" valor={id.numero_motor_ofuscado} />
          <Dato label="N° chasis" valor={id.numero_chasis_ofuscado} />
        </dl>
      ) : (
        <p className="text-sm text-slate-500">
          El VIN/chasis no se obtiene automáticamente; consultá el enlace al pie.
        </p>
      )}
      {muestraNoOficial && <DisclaimerNoOficial />}
    </BentoCard>
  );
}

// ── Condición y antecedentes (CTA a EPMTSD, accesorio → va más abajo) ────────

function CardCondicion({ className }: { className?: string }) {
  const items = ["Robo", "Prendas", "Prohibición de enajenar", "Remarcado", "Traspasos", "RTV"];
  return (
    <BentoCard
      titulo="Condición y antecedentes"
      className={className}
      badge={<Insignia tono="info">EPMTSD</Insignia>}
    >
      <p className="text-sm leading-relaxed text-slate-500">
        Para una compra segura, verificá gravámenes y estado legal en el servicio oficial
        (enlace al pie).
      </p>
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {items.map((t) => (
          <li
            key={t}
            className="rounded-lg bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-500"
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

function urlConsultasEcuador(perfil: VehiculoConsolidado): string | null {
  const ce = perfil.estado_fuentes.find((f) => f.clave === "ConsultasEcuador");
  return ce?.estado === "consulta_externa" && ce.detalle?.startsWith("http")
    ? ce.detalle
    : null;
}

function derivarEnlaces(perfil: VehiculoConsolidado): EnlaceExterno[] {
  const enlaces: EnlaceExterno[] = [];
  const urlSri = perfil.valores_tributarios?.url_consulta;
  if (urlSri) {
    enlaces.push({
      etiqueta: "Valores SRI",
      descripcion: "Matrícula e impuestos en el portal oficial",
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
      descripcion: "ConsultasEcuador (fuente no oficial)",
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

function PieFuentes({
  perfil,
  enlaces,
}: {
  perfil: VehiculoConsolidado;
  enlaces: EnlaceExterno[];
}) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-5 sm:p-6 sombra-tarjeta">
      {enlaces.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
            Consultar en portales oficiales
          </h3>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {enlaces.map((e) => (
              <a
                key={e.url}
                href={e.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-3 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    e.oficial ? "bg-sky-500" : "bg-amber-400"
                  }`}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-900">
                    {e.etiqueta}
                    <span className="ml-1 text-slate-400 transition group-hover:text-slate-600">↗</span>
                  </span>
                  <span className="block truncate text-[11px] text-slate-400">{e.descripcion}</span>
                </span>
              </a>
            ))}
          </div>
        </div>
      )}
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
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
  const enlaces = derivarEnlaces(perfil);

  return (
    <div className="space-y-5">
      <Encabezado perfil={perfil} cargando={cargando} />

      {/* Grilla ordenada por prioridad: multas (dinero) → matrícula → datos →
          valores → legal → identificación. Cards uniformes, con aire. */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <CardMultas
          perfil={perfil}
          cargandoAmt={estadoDeFuente(perfil, "AMT") === "en_proceso"}
          amtErrorFuente={estadoDeFuente(perfil, "AMT") === "error_fuente"}
          onReintentar={() => reintentar("AMT")}
          reintentando={!!reintentando.AMT}
          className="lg:col-span-2 lg:row-span-2"
        />
        <CardMatricula perfil={perfil} />
        <CardValores perfil={perfil} />
        <CardDatos perfil={perfil} className="lg:col-span-2" />
        <CardLegal
          perfil={perfil}
          cargandoFge={estadoDeFuente(perfil, "FGE") === "en_proceso"}
          fgeErrorFuente={estadoDeFuente(perfil, "FGE") === "error_fuente"}
          onReintentar={() => reintentar("FGE")}
          reintentando={!!reintentando.FGE}
          noOficiales={noOficiales}
        />
        <CardIdentificacion perfil={perfil} noOficiales={noOficiales} className="lg:col-span-2" />
        <CardCondicion className="lg:col-span-3" />
      </div>

      <PieFuentes perfil={perfil} enlaces={enlaces} />
    </div>
  );
}
