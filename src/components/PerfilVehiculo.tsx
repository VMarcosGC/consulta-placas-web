// Vista del Perfil Consolidado de Vehículo. Orientada a la ENTIDAD (una gran
// tarjeta del auto + secciones temáticas: Identificación, Multas, Legal, Valores),
// no a los proveedores de datos. Recibe el objeto ya consolidado por el backend
// (GET /consultar/{placa}/perfil → VehiculoConsolidado).
//
// Los datos de fuentes NO oficiales se marcan con ⓘ + disclaimer (referenciales).
// Polling silencioso cada 4s mientras alguna fuente del worker (AMT/FGE/…) esté
// `en_proceso`, y botón de reintento si una fuente cae.

"use client";

import { useEffect, useState } from "react";
import { consultarPerfil, reintentarFuente } from "@/lib/api";
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

// ── Tablero de estado de fuentes ────────────────────────────────────────────

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
  // Para fuentes consulta_externa (SRI, portales no oficiales) el `detalle` es la URL
  // del portal → el chip se vuelve un enlace para ir a consultar ahí.
  const url =
    fuente.estado === "consulta_externa" && fuente.detalle?.startsWith("http")
      ? fuente.detalle
      : null;
  const clase = `inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${color}`;
  const contenido = (
    <>
      {fuente.estado === "en_proceso" && (
        <span className="h-1.5 w-1.5 animate-ping rounded-full bg-blue-500" />
      )}
      <span className="font-semibold">{fuente.clave}</span>
      <span className="opacity-70">
        {ETIQUETA_ESTADO[fuente.estado] ?? fuente.estado}
        {url && " ↗"}
      </span>
      {fuente.origen === "no_oficial" && (
        <span title="Fuente no oficial" className="text-amber-600">
          ⓘ
        </span>
      )}
    </>
  );
  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`${clase} transition hover:brightness-125`}
        title={`${fuente.nombre} — abrir portal`}
      >
        {contenido}
      </a>
    );
  }
  return (
    <span className={clase} title={fuente.detalle ?? fuente.nombre}>
      {contenido}
    </span>
  );
}

function TableroFuentes({ fuentes }: { fuentes: EstadoFuenteItem[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {fuentes.map((f) => (
        <ChipFuente key={f.clave} fuente={f} />
      ))}
    </div>
  );
}

// ── Marcadores de fuente no oficial ─────────────────────────────────────────

// Claves de fuentes no oficiales del perfil (derivadas del catálogo vía estado_fuentes).
function clavesNoOficiales(perfil: VehiculoConsolidado): Set<string> {
  return new Set(
    perfil.estado_fuentes.filter((f) => f.origen === "no_oficial").map((f) => f.clave)
  );
}

// Badge de la fuente de un dato; agrega ⓘ "no oficial" si corresponde.
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

// Nota al pie de una sección que mezcla datos no oficiales.
function DisclaimerNoOficial() {
  return (
    <p className="mt-3 text-[11px] text-amber-700/80">
      ⓘ Los datos marcados provienen de fuentes no oficiales; son referenciales y
      pueden no estar actualizados.
    </p>
  );
}

// ── Secciones genéricas ─────────────────────────────────────────────────────

function Seccion({
  titulo,
  descripcion,
  cargando,
  children,
}: {
  titulo: string;
  descripcion?: string;
  cargando?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="sombra-tarjeta rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 animate-fade-in-up">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{titulo}</h2>
          {descripcion && <p className="text-sm text-slate-500">{descripcion}</p>}
        </div>
        {cargando && (
          <span className="inline-flex items-center gap-2 text-xs text-blue-600">
            <span className="h-1.5 w-1.5 animate-ping rounded-full bg-blue-500" />
            actualizando…
          </span>
        )}
      </header>
      {children}
    </section>
  );
}

function SkeletonLista() {
  return (
    <div className="animate-pulse space-y-3" aria-busy="true" aria-live="polite">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="h-16 rounded-2xl bg-slate-100" />
      ))}
      <p className="text-xs text-blue-500">
        Consultando la fuente oficial… esto puede tardar unos segundos.
      </p>
    </div>
  );
}

function Campo({
  label,
  valor,
}: {
  label: string;
  valor: string | number | null | undefined;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-slate-900">
        {valor ?? <span className="text-slate-300">—</span>}
      </dd>
    </div>
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
      className="mt-3 inline-flex items-center gap-2 rounded-full bg-rose-100 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-200 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {reintentando ? "Reintentando…" : "Reintentar conexión con la fuente"}
    </button>
  );
}

// ── Cabecera: tarjeta principal del auto ────────────────────────────────────

function TarjetaVehiculo({
  perfil,
  cargando,
}: {
  perfil: VehiculoConsolidado;
  cargando: boolean;
}) {
  const b = perfil.datos_basicos;
  const tienePendientes =
    perfil.multas_pendientes.length > 0 || perfil.novedades_legales.length > 0;
  const titulo = [b.marca, b.modelo].filter(Boolean).join(" ") || "Vehículo";

  // Mientras alguna fuente sigue en proceso no damos un veredicto definitivo:
  // un auto "Sin pendientes" podría volverse "Tiene pendientes" al llegar AMT/FGE.
  const borde = cargando
    ? "border-slate-200 bg-white"
    : tienePendientes
      ? "border-amber-200 bg-amber-50"
      : "border-emerald-200 bg-emerald-50";
  const badge = cargando
    ? "bg-blue-100 text-blue-700"
    : tienePendientes
      ? "bg-amber-100 text-amber-800"
      : "bg-emerald-100 text-emerald-800";
  const etiquetaVeredicto = cargando
    ? "Consultando…"
    : tienePendientes
      ? "Tiene pendientes"
      : "Sin pendientes";

  return (
    <div className={`sombra-tarjeta rounded-3xl border p-6 sm:p-8 ${borde}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Perfil del vehículo</p>
          <h1 className="mt-1 text-3xl sm:text-4xl font-black text-slate-900">{titulo}</h1>
          <p className="mt-1 font-mono text-lg tracking-widest text-slate-500">
            {perfil.placa}
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${badge}`}
        >
          {cargando && (
            <span className="h-1.5 w-1.5 animate-ping rounded-full bg-blue-500" />
          )}
          {etiquetaVeredicto}
        </span>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Campo label="Año" valor={b.anio} />
        <Campo label="Color" valor={b.color} />
        <Campo label="Clase" valor={b.clase} />
        <Campo label="Servicio" valor={b.servicio} />
        <Campo label="Matrícula" valor={b.fecha_matricula} />
        <Campo label="Vence" valor={b.fecha_caducidad} />
        {b.pais_origen && <Campo label="Origen" valor={b.pais_origen} />}
      </dl>

      <div className="mt-6 border-t border-slate-200 pt-4">
        <TableroFuentes fuentes={perfil.estado_fuentes} />
      </div>
    </div>
  );
}

// ── Secciones temáticas ─────────────────────────────────────────────────────

// Pastilla de categoría: "Pendientes: 2 · $45.50". Pendientes resaltadas en ámbar.
function PildoraCategoria({ cat }: { cat: CategoriaMulta }) {
  const esPendiente = cat.etiqueta.toLowerCase().startsWith("pendiente");
  const tono = esPendiente
    ? "bg-amber-100 text-amber-800 border-amber-200"
    : "bg-white text-slate-600 border-slate-200";
  const monto =
    cat.monto_usd != null && cat.monto_usd > 0 ? ` · $${cat.monto_usd.toFixed(2)}` : "";
  return (
    <span className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${tono}`}>
      {cat.etiqueta}: <span className="font-bold">{cat.cantidad}</span>
      {monto}
    </span>
  );
}

// Bloque de detalle por fuente (ANT/AMT/EPMTSD): ámbito, totales y categorías.
function BloqueMulta({ d }: { d: MultaDetalle }) {
  const tienePend = d.pendientes > 0 || (d.total_a_pagar_usd ?? 0) > 0;
  return (
    <div
      className={`rounded-2xl border p-4 ${
        tienePend ? "border-amber-200 bg-amber-50/60" : "border-slate-200 bg-slate-50"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MarcaFuente fuente={d.fuente} noOficial={false} />
          <span className="text-sm font-semibold text-slate-700">{d.ambito}</span>
        </div>
        {d.total_a_pagar_usd != null && d.total_a_pagar_usd > 0 && (
          <span className="rounded-lg bg-amber-100 px-2.5 py-1 text-sm font-bold text-amber-800">
            A pagar ${d.total_a_pagar_usd.toFixed(2)}
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {d.total_registros} registro{d.total_registros === 1 ? "" : "s"}
        {d.pendientes > 0 ? ` · ${d.pendientes} pendiente${d.pendientes === 1 ? "" : "s"}` : ""}
      </p>
      {d.categorias.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {d.categorias.map((c) => (
            <PildoraCategoria key={`${d.fuente}-${c.etiqueta}`} cat={c} />
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm font-medium text-emerald-700">Sin registros. ✓</p>
      )}
    </div>
  );
}

function SeccionMultas({
  perfil,
  cargandoAmt,
  amtErrorFuente,
  onReintentar,
  reintentando,
}: {
  perfil: VehiculoConsolidado;
  cargandoAmt: boolean;
  amtErrorFuente: boolean;
  onReintentar: () => void;
  reintentando: boolean;
}) {
  const detalle = perfil.multas_detalle;
  return (
    <Seccion
      titulo="Multas e infracciones"
      descripcion="Citaciones de tránsito (ANT) e infracciones municipales (AMT, EPMTSD)"
      cargando={cargandoAmt}
    >
      {amtErrorFuente && (
        <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm text-rose-700">
            No pudimos consultar las infracciones municipales (AMT) tras varios intentos.
          </p>
          <BotonReintentar onReintentar={onReintentar} reintentando={reintentando} />
        </div>
      )}
      {detalle.length === 0 ? (
        cargandoAmt ? (
          <SkeletonLista />
        ) : (
          <p className="text-sm font-medium text-emerald-700">
            Sin multas ni infracciones registradas.
          </p>
        )
      ) : (
        <div className="space-y-3">
          {detalle.map((d) => (
            <BloqueMulta key={d.fuente} d={d} />
          ))}
          {cargandoAmt && <SkeletonLista />}
        </div>
      )}
    </Seccion>
  );
}

function SeccionLegal({
  perfil,
  cargandoFge,
  fgeErrorFuente,
  onReintentar,
  reintentando,
}: {
  perfil: VehiculoConsolidado;
  cargandoFge: boolean;
  fgeErrorFuente: boolean;
  onReintentar: () => void;
  reintentando: boolean;
}) {
  const novedades = perfil.novedades_legales;
  const noOficiales = clavesNoOficiales(perfil);
  const hayNoOficial = novedades.some((n) => noOficiales.has(n.fuente));
  return (
    <Seccion
      titulo="Novedades legales"
      descripcion="Noticias del delito asociadas (Fiscalía General del Estado)"
      cargando={cargandoFge}
    >
      {fgeErrorFuente ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm text-rose-700">
            No pudimos consultar la Fiscalía (FGE) tras varios intentos.
          </p>
          <BotonReintentar onReintentar={onReintentar} reintentando={reintentando} />
        </div>
      ) : novedades.length === 0 && cargandoFge ? (
        <SkeletonLista />
      ) : novedades.length === 0 ? (
        <p className="text-sm font-medium text-emerald-700">Sin novedades legales registradas.</p>
      ) : (
        <>
          <ul className="space-y-3">
            {novedades.map((n, i) => (
              <li
                key={n.ndd ?? `${n.fuente}-${i}`}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <MarcaFuente fuente={n.fuente} noOficial={noOficiales.has(n.fuente)} />
                  <span className="text-xs text-slate-500">{n.fecha}</span>
                </div>
                {n.ndd && (
                  <span className="font-mono text-xs text-slate-400">NDD {n.ndd}</span>
                )}
                <p className="mt-1 text-sm font-semibold text-slate-900">{n.delito}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {[n.lugar, n.unidad].filter(Boolean).join(" · ")}
                </p>
              </li>
            ))}
          </ul>
          {hayNoOficial && <DisclaimerNoOficial />}
        </>
      )}
    </Seccion>
  );
}

function SeccionIdentificacion({
  perfil,
  noOficiales,
}: {
  perfil: VehiculoConsolidado;
  noOficiales: Set<string>;
}) {
  const id = perfil.identificacion;
  const hayDatos =
    !!id.vin_ofuscado ||
    !!id.numero_motor_ofuscado ||
    !!id.numero_chasis_ofuscado ||
    !!id.pais_origen;

  // ConsultasEcuador (no oficial) aportaría chasis/VIN, pero está tras reCAPTCHA:
  // se expone como enlace externo (consulta_externa), sin scraping. Tomamos su URL
  // del tablero de fuentes (detalle = url_consulta).
  const ce = perfil.estado_fuentes.find((f) => f.clave === "ConsultasEcuador");
  const urlExterna = ce?.estado === "consulta_externa" ? ce.detalle : null;

  // Nada que mostrar si no hay dato ofuscado ni enlace externo.
  if (!hayDatos && !urlExterna) return null;

  const muestraNoOficial = hayDatos && noOficiales.has("ConsultasEcuador");

  return (
    <Seccion
      titulo="Identificación"
      descripcion="VIN, motor y chasis (ofuscados por privacidad)"
    >
      {hayDatos && (
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Campo label="VIN" valor={id.vin_ofuscado} />
          <Campo label="N° de motor" valor={id.numero_motor_ofuscado} />
          <Campo label="N° de chasis" valor={id.numero_chasis_ofuscado} />
          {id.pais_origen && <Campo label="Origen" valor={id.pais_origen} />}
        </dl>
      )}
      {urlExterna && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-900">
            El VIN/chasis no se obtiene automáticamente (el portal usa reCAPTCHA).
            Podés consultarlo en <span className="font-semibold">ConsultasEcuador</span>,
            una <span className="font-semibold">fuente no oficial</span> (referencial).
          </p>
          <a
            href={urlExterna}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600"
          >
            Consultar VIN/chasis en ConsultasEcuador ↗
          </a>
        </div>
      )}
      {muestraNoOficial && <DisclaimerNoOficial />}
    </Seccion>
  );
}

function SeccionValores({ perfil }: { perfil: VehiculoConsolidado }) {
  const v = perfil.valores_tributarios;
  return (
    <Seccion titulo="Valores tributarios" descripcion="Matrícula e impuestos (SRI)">
      {!v ? (
        <p className="text-sm text-slate-500">Sin datos disponibles.</p>
      ) : v.url_consulta ? (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm text-blue-900">
            El portal del SRI no permite la consulta automatizada (reCAPTCHA). Consultá los
            valores directamente en el sitio oficial con la placa{" "}
            <span className="font-mono font-semibold text-blue-700">{perfil.placa}</span>.
          </p>
          <a
            href={v.url_consulta}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            Consultar en el portal del SRI ↗
          </a>
        </div>
      ) : (
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Campo
            label="Matrícula"
            valor={v.matricula_usd != null ? `$${v.matricula_usd.toFixed(2)}` : null}
          />
          <Campo
            label="Total a pagar"
            valor={v.total_a_pagar_usd != null ? `$${v.total_a_pagar_usd.toFixed(2)}` : null}
          />
          <Campo
            label="Estado"
            valor={(v.total_a_pagar_usd ?? 0) > 0 ? "Con valores" : "Al día"}
          />
        </dl>
      )}
    </Seccion>
  );
}

// Acceso destacado a la herramienta oficial de EPMTSD "Condición del vehículo".
// Trae los datos más decisivos para una compra (robo, prendas, remarcado, traspasos,
// RTV), pero su consulta es lenta (~50s) y solo cubre ciertos vehículos, así que NO la
// traemos inline: la exponemos como enlace oficial (decisión: dato lento/inconsistente).
function SeccionAntecedentes() {
  const URL_EPMTSD_CONDICION = "https://servicios.epmtsd.gob.ec/vehiculo_seguro/";
  const items = [
    "Reporte de robo",
    "Prenda comercial / industrial",
    "Prohibición de enajenar",
    "Remarcado de motor / chasis",
    "Reserva de dominio",
    "N° de traspasos",
    "Revisión técnica vigente",
  ];
  return (
    <Seccion
      titulo="Condición y antecedentes"
      descripcion="Verificación de gravámenes y estado legal del vehículo (EPMTSD · oficial)"
    >
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-blue-900">
          Para una compra segura, revisá la <span className="font-semibold">condición del
          vehículo</span> en el servicio oficial de EPMTSD. Verifica:
        </p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {items.map((t) => (
            <li
              key={t}
              className="rounded-lg border border-blue-200 bg-white px-2.5 py-1 text-xs font-medium text-blue-800"
            >
              {t}
            </li>
          ))}
        </ul>
        <a
          href={URL_EPMTSD_CONDICION}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          Consultar condición en EPMTSD ↗
        </a>
        <p className="mt-2 text-[11px] text-slate-500">
          Servicio oficial; la consulta puede tardar y no cubre todos los vehículos.
        </p>
      </div>
    </Seccion>
  );
}

// ── Componente principal ────────────────────────────────────────────────────

export function PerfilVehiculo({ inicial }: Props) {
  const [perfil, setPerfil] = useState<VehiculoConsolidado>(inicial);
  const [reintentando, setReintentando] = useState<{ AMT?: boolean; FGE?: boolean }>({});

  const cargando = hayFuentesEnProceso(perfil);

  // Polling silencioso cada 4s mientras alguna fuente del worker siga en proceso.
  // Al navegar a otra placa el componente se remonta vía key={placa} (page.tsx).
  useEffect(() => {
    if (!cargando) return;
    const t = setTimeout(async () => {
      try {
        setPerfil(await consultarPerfil(perfil.placa));
      } catch {
        // Silencioso: conservar los datos previos y reintentar en el próximo ciclo.
      }
    }, INTERVALO_POLLING_MS);
    return () => clearTimeout(t);
  }, [perfil, cargando]);

  async function reintentar(fuente: "AMT" | "FGE") {
    setReintentando((r) => ({ ...r, [fuente]: true }));
    // Optimista: volver la fuente a en_proceso reanuda el polling de inmediato.
    setPerfil((prev) => marcarFuenteEnProceso(prev, fuente));
    try {
      await reintentarFuente(perfil.placa, fuente);
    } catch {
      // El polling reintenta igual; el reencolado puede haberse hecho.
    }
    setReintentando((r) => ({ ...r, [fuente]: false }));
  }

  const noOficiales = clavesNoOficiales(perfil);

  return (
    <div className="space-y-6">
      <TarjetaVehiculo perfil={perfil} cargando={cargando} />
      <SeccionMultas
        perfil={perfil}
        cargandoAmt={estadoDeFuente(perfil, "AMT") === "en_proceso"}
        amtErrorFuente={estadoDeFuente(perfil, "AMT") === "error_fuente"}
        onReintentar={() => reintentar("AMT")}
        reintentando={!!reintentando.AMT}
      />
      <SeccionAntecedentes />
      <SeccionIdentificacion perfil={perfil} noOficiales={noOficiales} />
      <SeccionValores perfil={perfil} />
      <SeccionLegal
        perfil={perfil}
        cargandoFge={estadoDeFuente(perfil, "FGE") === "en_proceso"}
        fgeErrorFuente={estadoDeFuente(perfil, "FGE") === "error_fuente"}
        onReintentar={() => reintentar("FGE")}
        reintentando={!!reintentando.FGE}
      />
    </div>
  );
}
