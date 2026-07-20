// Perfil Consolidado de Vehículo — vista COMPACTA (M2.7).
//
// Feedback de la prueba: la consulta era demasiado extensa y abrumaba. Ahora:
//   1. Arriba, una sola tarjeta-resumen "de un vistazo" (ResumenPlaca): máximo 6 datos.
//   2. Todo el detalle (desglose por fuente, citación por citación, matriculación,
//      identificadores, tablero de fuentes) vive en ACORDEONES CERRADOS por default.
//   3. La sección de desbloqueos con tokens queda visible: es una acción, no un párrafo.
//
// Las fuentes en stand-by (SRI/FGE por captcha) se ocultan por completo según
// `NEXT_PUBLIC_FUENTES_INACTIVAS` (ver src/lib/fuentes.ts).
// El frontend solo lee y pinta lo que el backend consolidó (GET /consultar/{placa}/perfil).

"use client";

import { useEffect, useState } from "react";
import { consultarPerfil, reintentarFuente } from "@/lib/api";
import { tieneSesion } from "@/lib/auth";
import { Insignia, type TonoInsignia } from "@/components/BentoCard";
import { Acordeon } from "@/components/Acordeon";
import { ResumenPlaca, derivarResumen } from "@/components/ResumenPlaca";
import { ProductoConsultaCard } from "@/components/ProductoConsultaCard";
import { ReporteCompraSeguraCard } from "@/components/ReporteCompraSeguraCard";
import {
  estadoDeFuente,
  hayFuentesEnProceso,
  marcarFuenteEnProceso,
} from "@/lib/perfil";
import { fuenteInactiva } from "@/lib/fuentes";
import {
  type CategoriaMulta,
  type EstadoFuenteItem,
  type MultaDetalle,
  type VehiculoConsolidado,
} from "@/types/api";

// Callback que reemplaza el perfil tras un desbloqueo (lo provee el componente raíz).
type AlDesbloquear = (perfil: VehiculoConsolidado) => void;

// Productos que se ofrecen en "Completa tu revisión del vehículo" (orden de aparición).
const PRODUCTOS_REVISION = ["identificadores_tecnicos", "titular_validado", "multas_con_montos"];
const CODIGO_BUNDLE = "reporte_compra_segura";

const INTERVALO_POLLING_MS = 4000;

interface Props {
  inicial: VehiculoConsolidado;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

// Detalle de multas de fuentes ACTIVAS (excluye las que están en stand-by).
function multasActivas(perfil: VehiculoConsolidado): MultaDetalle[] {
  return perfil.multas_detalle.filter((d) => !fuenteInactiva(d.fuente));
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

// ── Desbloqueos con tokens (visible: es acción, no detalle) ──────────────────

function CompletaTuRevision({
  perfil,
  onUnlocked,
}: {
  perfil: VehiculoConsolidado;
  onUnlocked: AlDesbloquear;
}) {
  const porCodigo = (codigo: string) => perfil.productos?.find((p) => p.codigo === codigo);
  const pendientes = PRODUCTOS_REVISION.map(porCodigo).filter(
    (p): p is NonNullable<typeof p> => !!p && p.disponible && !p.desbloqueado
  );
  const bundle = porCodigo(CODIGO_BUNDLE);
  const mostrarBundle = !!bundle && bundle.disponible && !bundle.desbloqueado;

  if (pendientes.length === 0 && !mostrarBundle) return null;

  return (
    <section className="rounded-3xl border border-slate-200/70 bg-white p-6 sm:p-8 sombra-tarjeta">
      <h2 className="text-lg font-bold text-slate-900">Completa tu revisión del vehículo</h2>
      <p className="mb-5 mt-1 text-sm text-slate-500">
        Desbloquea solo lo que necesitas. Pagas con tokens — los datos de arriba son gratis.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {pendientes.map((p) => (
          <ProductoConsultaCard
            key={p.codigo}
            placa={perfil.placa}
            producto={p}
            perfil={perfil}
            onUnlocked={onUnlocked}
          />
        ))}
      </div>
      {mostrarBundle && (
        <div className="mt-4">
          <ReporteCompraSeguraCard placa={perfil.placa} producto={bundle} onUnlocked={onUnlocked} />
        </div>
      )}
    </section>
  );
}

// ── Cuerpos del detalle (van DENTRO de los acordeones) ───────────────────────

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

function CuerpoMultas({
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
  // Bloqueado: el teaser solo dice si hay pendientes (gratis); el detalle con montos se
  // desbloquea en "Completa tu revisión del vehículo" (producto `multas_con_montos`).
  if (perfil.multas_bloqueado) {
    return (
      <p className="text-sm text-slate-600">
        {perfil.tiene_pendientes
          ? "Este vehículo tiene multas o infracciones registradas. Desbloquea el detalle con montos por fuente más arriba."
          : "Sin multas ni infracciones pendientes. Desbloquea el detalle completo si quieres confirmarlo."}
      </p>
    );
  }

  const detalle = multasActivas(perfil);
  return (
    <>
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
    </>
  );
}

function CuerpoMatriculacion({ perfil }: { perfil: VehiculoConsolidado }) {
  const b = perfil.datos_basicos;
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
      <Dato label="Matriculado" valor={b.fecha_matricula} />
      <Dato label="Vence" valor={b.fecha_caducidad} />
      <Dato label="Clase" valor={b.clase} />
      <Dato label="Servicio" valor={b.servicio} />
      <Dato label="Año" valor={b.anio} />
      <Dato label="Color" valor={b.color} />
      {b.pais_origen && <Dato label="Origen" valor={b.pais_origen} />}
    </dl>
  );
}

// Identificadores + titular + valores en línea. Solo se llama si hay algo que mostrar.
function CuerpoIdentificacion({ perfil }: { perfil: VehiculoConsolidado }) {
  const id = perfil.identificacion;
  const t = perfil.titular;
  const v = perfil.valores_tributarios;
  const hayIdent = !!(id.vin_ofuscado || id.numero_motor_ofuscado || id.numero_chasis_ofuscado);
  const hayTitular = !t.bloqueado && t.disponible;
  const hayValores = !fuenteInactiva("SRI") && v != null && v.url_consulta == null;

  return (
    <div className="space-y-5">
      {hayIdent && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Identificación</p>
            {id.bloqueado ? (
              <Insignia tono="neutro">🔒 ofuscado</Insignia>
            ) : (
              <Insignia tono="ok">visible</Insignia>
            )}
          </div>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Dato label="VIN" valor={id.vin ?? id.vin_ofuscado} />
            <Dato label="N° motor" valor={id.numero_motor ?? id.numero_motor_ofuscado} />
            <Dato label="N° chasis" valor={id.numero_chasis ?? id.numero_chasis_ofuscado} />
          </dl>
        </div>
      )}

      {hayTitular && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Titular</p>
            {t.validado ? (
              <Insignia tono="ok">validado</Insignia>
            ) : (
              <Insignia tono="neutro">sin validar</Insignia>
            )}
          </div>
          <Dato label="Titular registrado" valor={t.nombre_ofuscado ?? "—"} />
          <p className="mt-2 text-xs text-slate-400">
            {t.mensaje ?? "Mostramos solo una validación; nunca el dato personal completo."}
          </p>
        </div>
      )}

      {hayValores && (
        <div>
          <p className="mb-2 text-[11px] uppercase tracking-wide text-slate-400">Valores SRI</p>
          <dl className="grid grid-cols-2 gap-4">
            <Dato
              label="Matrícula"
              valor={v!.matricula_usd != null ? `$${v!.matricula_usd.toFixed(2)}` : null}
            />
            <Dato
              label="Total a pagar"
              valor={v!.total_a_pagar_usd != null ? `$${v!.total_a_pagar_usd.toFixed(2)}` : null}
            />
          </dl>
        </div>
      )}
    </div>
  );
}

// ── Enlaces a portales oficiales ────────────────────────────────────────────

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
  // SRI en stand-by (M2.5): no se muestra ni su tarjeta passthrough ni su enlace oficial.
  const urlSri = perfil.valores_tributarios?.url_consulta;
  if (urlSri && !fuenteInactiva("SRI")) {
    enlaces.push({
      etiqueta: "Valores del SRI",
      descripcion: "Matrícula e impuestos en el portal oficial",
      url: urlSri,
      destacado: true,
    });
  }
  if (!fuenteInactiva("EPMTSD")) {
    enlaces.push({
      etiqueta: "Condición del vehículo",
      descripcion: "Robo, prendas, remarcado, traspasos y RTV (EPMTSD oficial)",
      url: URL_EPMTSD_CONDICION,
      destacado: true,
    });
  }
  const urlCe = urlConsultasEcuador(perfil);
  if (urlCe && !fuenteInactiva("ConsultasEcuador")) {
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
  const base =
    "group flex items-center justify-between gap-2 rounded-xl px-4 py-3 transition";
  if (e.destacado) {
    return (
      <a
        href={e.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`${base} bg-brand-gradient text-white shadow-sm hover:opacity-90`}
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
      className={`${base} border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50`}
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

// ── Tablero de fuentes ──────────────────────────────────────────────────────

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

  const r = derivarResumen(perfil);
  const enlaces = derivarEnlaces(perfil);
  const fuentes = perfil.estado_fuentes.filter((f) => !fuenteInactiva(f.clave));

  const id = perfil.identificacion;
  const hayIdent = !!(
    id.vin_ofuscado || id.numero_motor_ofuscado || id.numero_chasis_ofuscado
  );
  const hayTitular = !perfil.titular.bloqueado && perfil.titular.disponible;
  const hayValores =
    !fuenteInactiva("SRI") &&
    perfil.valores_tributarios != null &&
    perfil.valores_tributarios.url_consulta == null;
  const hayAccesorias = hayIdent || hayTitular || hayValores;

  const amtErrorFuente = estadoDeFuente(perfil, "AMT") === "error_fuente";

  // Pista en el encabezado del acordeón de multas, para no obligar a abrirlo.
  // Orden importante: primero los casos donde NO se puede afirmar el veredicto (fuente en
  // camino o caída). Decir "al día" con el municipio caído sería un falso negativo.
  const resumenMultas: { texto: string; tono: TonoInsignia } = r.municipalesEnProceso
    ? { texto: "consultando…", tono: "neutro" }
    : r.municipalesCaidas
      ? { texto: "sin dato municipal", tono: "alerta" }
      : r.detalleBloqueado
        ? { texto: r.tienePendientes ? "con pendientes" : "al día", tono: r.tienePendientes ? "alerta" : "ok" }
        : (r.multasPendientes ?? 0) > 0
          ? { texto: `${r.multasPendientes} pendientes`, tono: "alerta" }
          : { texto: "al día", tono: "ok" };

  return (
    <div className="space-y-4">
      {/* 1. De un vistazo: casi siempre, esto es todo lo que el usuario necesita leer. */}
      <ResumenPlaca placa={perfil.placa} perfil={perfil} cargando={cargando} />

      {/* 2. Acción (desbloqueos con tokens): visible, no es "detalle". */}
      <CompletaTuRevision perfil={perfil} onUnlocked={setPerfil} />

      {/* 3. Detalle: TODO plegado y cerrado por default. */}
      <Acordeon
        titulo="Ver detalle de multas"
        resumen={<Insignia tono={resumenMultas.tono}>{resumenMultas.texto}</Insignia>}
        // Con la fuente caída, el botón de reintentar vive dentro: se abre solo para que
        // no quede escondido tras un acordeón cerrado.
        abiertoPorDefecto={amtErrorFuente}
      >
        <CuerpoMultas
          perfil={perfil}
          cargandoAmt={estadoDeFuente(perfil, "AMT") === "en_proceso"}
          amtErrorFuente={amtErrorFuente}
          onReintentar={reintentarAmt}
          reintentando={reintentando}
        />
      </Acordeon>

      <Acordeon
        titulo="Ver datos de matriculación"
        resumen={<Insignia tono={r.matriculaTono}>{r.matriculaEtiqueta}</Insignia>}
      >
        <CuerpoMatriculacion perfil={perfil} />
      </Acordeon>

      {hayAccesorias && (
        <Acordeon titulo="Ver identificación y titular">
          <CuerpoIdentificacion perfil={perfil} />
        </Acordeon>
      )}

      {enlaces.length > 0 && (
        <Acordeon titulo="Consultar en portales oficiales">
          <p className="mb-4 text-sm leading-relaxed text-slate-500">
            Algunas validaciones se hacen directamente en el portal oficial, porque su
            captcha no permite automatizarlas. Abren en una pestaña nueva.
          </p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {enlaces.map((e) => (
              <BotonEnlace key={e.url} e={e} />
            ))}
          </div>
        </Acordeon>
      )}

      {fuentes.length > 0 && (
        <Acordeon titulo="Ver fuentes consultadas">
          <div className="flex flex-wrap gap-2">
            {fuentes.map((f) => (
              <ChipFuente key={f.clave} fuente={f} />
            ))}
          </div>
        </Acordeon>
      )}
    </div>
  );
}
