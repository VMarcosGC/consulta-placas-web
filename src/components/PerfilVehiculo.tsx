// Perfil Consolidado de Vehículo — vista COMPACTA (M2.7).
//
// Feedback de la prueba: la consulta era demasiado extensa y abrumaba. Ahora:
//   1. Arriba, una sola tarjeta-resumen "de un vistazo" (ResumenPlaca): máximo 6 datos.
//   2. Todo el detalle (desglose por fuente, citación por citación, matriculación,
//      identificadores, tablero de fuentes) vive en ACORDEONES CERRADOS por default.
//
// La consulta por placa es una herramienta gratuita: muestra lo que el backend entrega
// sin ninguna capa de pago (características públicas, estado de matrícula, multas de
// ANT/AMT desde caché, enlaces oficiales).
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
    <span className="rounded bg-superficie-tenue px-1.5 py-0.5 text-[10px] uppercase tracking-wide font-semibold text-secundario">
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
      className="mt-2 inline-flex items-center gap-2 rounded-full border border-error px-3 py-1.5 text-xs font-medium text-error transition hover:bg-error-tinte disabled:cursor-not-allowed disabled:opacity-50"
    >
      {reintentando && (
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-error border-t-transparent" />
      )}
      {reintentando ? "Reintentando…" : "Reintentar conexión"}
    </button>
  );
}

function SkeletonLista({ filas = 2 }: { filas?: number }) {
  return (
    <div className="animate-pulse space-y-2" aria-busy="true" aria-live="polite">
      {Array.from({ length: filas }).map((_, i) => (
        <div key={i} className="h-10 rounded-xl bg-superficie-tenue" />
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
      <dt className="text-[11px] uppercase tracking-wide text-secundario">{label}</dt>
      <dd className="mt-1 truncate text-[15px] font-semibold text-tinta">
        {valor ?? <span className="text-secundario">—</span>}
      </dd>
    </div>
  );
}

// ── Cuerpos del detalle (van DENTRO de los acordeones) ───────────────────────

function PildoraCategoria({ cat }: { cat: CategoriaMulta }) {
  const esPendiente = cat.etiqueta.toLowerCase().startsWith("pendiente");
  const tono = esPendiente ? "bg-atencion-tinte text-atencion-texto" : "bg-superficie-tenue text-secundario";
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
    <div className="rounded-xl border border-borde-suave bg-superficie-tenue/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MarcaFuente fuente={d.fuente} />
          <span className="text-sm font-semibold text-secundario">{d.ambito}</span>
        </div>
        {tienePend && d.total_a_pagar_usd != null && d.total_a_pagar_usd > 0 ? (
          <span className="rounded-lg bg-atencion-tinte px-2.5 py-1 text-sm font-bold text-atencion-texto">
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
        <p className="mt-2 text-sm font-medium text-confirmado">Sin registros</p>
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
  // El backend puede entregar solo el veredicto (sin el desglose con montos por fuente).
  // En ese caso mostramos el teaser sí/no, que es lo que hay disponible.
  if (perfil.multas_bloqueado) {
    return (
      <p className="text-sm text-secundario">
        {perfil.tiene_pendientes
          ? "Este vehículo tiene multas o infracciones registradas."
          : "Sin multas ni infracciones pendientes."}
      </p>
    );
  }

  const detalle = multasActivas(perfil);
  return (
    <>
      {amtErrorFuente && (
        <div className="mb-3 rounded-xl border border-error bg-error-tinte/70 p-3">
          <p className="text-xs text-error">
            No pudimos consultar las infracciones municipales (AMT).
          </p>
          <BotonReintentar onReintentar={onReintentar} reintentando={reintentando} />
        </div>
      )}
      {detalle.length === 0 ? (
        cargandoAmt ? (
          <SkeletonLista />
        ) : (
          <p className="text-sm font-medium text-confirmado">
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
  const h = perfil.historial_propietarios;
  const hayIdent = !!(id.vin_ofuscado || id.numero_motor_ofuscado || id.numero_chasis_ofuscado);
  const hayTitular = !t.bloqueado && t.disponible;
  const hayValores = !fuenteInactiva("SRI") && v != null && v.url_consulta == null;
  const hayDuenos = h.disponible;

  return (
    <div className="space-y-5">
      {hayDuenos && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <p className="text-[11px] uppercase tracking-wide text-secundario">Propietarios</p>
            {h.bloqueado ? (
              <Insignia tono="neutro">🔒 con cuenta</Insignia>
            ) : (
              <Insignia tono="ok">visible</Insignia>
            )}
          </div>
          <Dato
            label="Dueños registrados"
            valor={
              h.numero_propietarios != null
                ? String(h.numero_propietarios)
                : h.bloqueado
                  ? "—"
                  : (h.mensaje ?? "No informado")
            }
          />
        </div>
      )}

      {hayIdent && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <p className="text-[11px] uppercase tracking-wide text-secundario">Identificación</p>
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
            <p className="text-[11px] uppercase tracking-wide text-secundario">Titular</p>
            {t.validado ? (
              <Insignia tono="ok">validado</Insignia>
            ) : (
              <Insignia tono="neutro">sin validar</Insignia>
            )}
          </div>
          <Dato label="Titular registrado" valor={t.nombre_ofuscado ?? "—"} />
          <p className="mt-2 text-xs text-secundario">
            {t.mensaje ?? "Mostramos solo una validación; nunca el dato personal completo."}
          </p>
        </div>
      )}

      {hayValores && (
        <div>
          <p className="mb-2 text-[11px] uppercase tracking-wide text-secundario">Valores SRI</p>
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
  // El destacado es navegación a un portal oficial externo, no la conversión de la
  // pantalla: píldora oscura (`--oscuro`), no esmeralda. El único `--accion` de la
  // consulta queda para el botón "Consultar" del formulario.
  if (e.destacado) {
    return (
      <a
        href={e.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`${base} bg-oscuro text-superficie shadow-sm hover:bg-oscuro-suave`}
      >
        <span className="min-w-0">
          <span className="block text-sm font-bold">{e.etiqueta} ↗</span>
          <span className="block truncate text-[11px] text-superficie/80">{e.descripcion}</span>
        </span>
      </a>
    );
  }
  return (
    <a
      href={e.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`${base} border border-borde bg-superficie hover:border-borde-fuerte hover:bg-superficie-tenue`}
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-tinta">
          {e.etiqueta}
          <span className="ml-1 text-secundario transition group-hover:text-secundario">↗</span>
        </span>
        <span className="block truncate text-[11px] text-secundario">{e.descripcion}</span>
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
  completada: "bg-confirmado-tinte text-confirmado-texto",
  sin_resultados: "bg-superficie-tenue text-secundario",
  en_proceso: "bg-marca-tinte text-marca-texto",
  error_fuente: "bg-error-tinte text-error",
  error: "bg-error-tinte text-error",
  consulta_externa: "bg-marca-tinte text-marca-texto",
  no_integrada: "bg-superficie-tenue text-secundario",
};

function ChipFuente({ fuente }: { fuente: EstadoFuenteItem }) {
  const color = COLOR_ESTADO[fuente.estado] ?? COLOR_ESTADO.error;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${color}`}
      title={fuente.detalle ?? fuente.nombre}
    >
      {fuente.estado === "en_proceso" && (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-marca" />
      )}
      <span className="font-semibold">{fuente.clave}</span>
      <span className="opacity-70">{ETIQUETA_ESTADO[fuente.estado] ?? fuente.estado}</span>
      {fuente.origen === "no_oficial" && (
        <span title="Fuente no oficial" className="text-declarado-texto">
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

  // El SSR consulta el perfil de forma ANÓNIMA (teaser). Si al montar hay sesión,
  // se re-consulta CON el token para revelar los bloques ampliados (multas con
  // detalle, identificadores, n.º de dueños): gratis con cuenta mientras dure la
  // monetización suspendida (§1.0.3). Una sola vez por placa.
  useEffect(() => {
    let vivo = true;
    (async () => {
      if (!tieneSesion()) return;
      try {
        const conAuth = await consultarPerfil(inicial.placa);
        if (vivo) setPerfil(conAuth);
      } catch {
        /* conservar el teaser del SSR */
      }
    })();
    return () => {
      vivo = false;
    };
  }, [inicial.placa]);

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
  const hayDuenos = perfil.historial_propietarios.disponible;
  const hayAccesorias = hayIdent || hayTitular || hayValores || hayDuenos;

  const amtErrorFuente = estadoDeFuente(perfil, "AMT") === "error_fuente";

  // Pista en el encabezado del acordeón de multas, para no obligar a abrirlo.
  // Orden importante: primero los casos donde NO se puede afirmar el veredicto (fuente en
  // camino o caída). Decir "al día" con el municipio caído sería un falso negativo.
  const resumenMultas: { texto: string; tono: TonoInsignia } = r.municipalesEnProceso
    ? { texto: "consultando…", tono: "neutro" }
    : r.municipalesCaidas
      ? { texto: "sin dato municipal", tono: "neutro" }
      : r.detalleBloqueado
        ? { texto: r.tienePendientes ? "con pendientes" : "al día", tono: r.tienePendientes ? "alerta" : "ok" }
        : (r.multasPendientes ?? 0) > 0
          ? { texto: `${r.multasPendientes} pendientes`, tono: "alerta" }
          : { texto: "al día", tono: "ok" };

  return (
    <div className="space-y-4">
      {/* 1. De un vistazo: casi siempre, esto es todo lo que el usuario necesita leer. */}
      <ResumenPlaca placa={perfil.placa} perfil={perfil} cargando={cargando} />

      {/* 2. Detalle: TODO plegado y cerrado por default. */}
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
          <p className="mb-4 text-sm leading-relaxed text-secundario">
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
