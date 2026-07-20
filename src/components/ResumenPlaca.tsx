// Resumen "de un vistazo" de una placa (M2.7). Es lo PRIMERO y a veces lo único que el
// usuario necesita leer: máximo 6 datos, tipografía grande, sin párrafos.
// El detalle (desglose por fuente, citación por citación) vive en acordeones cerrados.
//
// Lo usan la consulta `/consultar/{placa}` y —en versión mini— el anuncio del market.

import type { ReactNode } from "react";
import { Insignia, type TonoInsignia } from "@/components/BentoCard";
import { fuenteInactiva } from "@/lib/fuentes";
import type { VehiculoConsolidado } from "@/types/api";

// ── Derivaciones (solo lectura del perfil que ya consolidó el backend) ───────

export interface ResumenDerivado {
  titulo: string;
  detalleVehiculo: string | null;
  matriculaEtiqueta: string;
  matriculaTono: TonoInsignia;
  /** null cuando el municipio sigue consultando: no se puede afirmar el veredicto. */
  multasPendientes: number | null;
  montoMultas: number | null;
  /** El detalle con montos es microdesbloqueo de pago; sin él solo hay veredicto sí/no. */
  detalleBloqueado: boolean;
  tienePendientes: boolean;
  municipalesEnProceso: boolean;
  /** La fuente municipal agotó reintentos: el veredicto tampoco se puede afirmar. */
  municipalesCaidas: boolean;
  consultadoEn: string | null;
}

export function derivarResumen(perfil: VehiculoConsolidado): ResumenDerivado {
  const b = perfil.datos_basicos;
  const fuentes = perfil.estado_fuentes.filter((f) => !fuenteInactiva(f.clave));
  const multas = perfil.multas_detalle.filter((d) => !fuenteInactiva(d.fuente));

  // Las infracciones municipales llegan por el worker: mientras estén en camino no se
  // puede afirmar "sin multas" (sería un falso negativo a favor del vendedor).
  const municipalesEnProceso = ["AMT", "EPMTSD"].some(
    (clave) => fuentes.find((f) => f.clave === clave)?.estado === "en_proceso"
  );
  // Mismo razonamiento para la fuente caída: si el municipio no respondió tras los
  // reintentos, "Al día" seria una afirmación que no podemos sostener.
  const municipalesCaidas = ["AMT", "EPMTSD"].some((clave) => {
    const e = fuentes.find((f) => f.clave === clave)?.estado;
    return e === "error_fuente" || e === "error";
  });

  const pendientes = multas.reduce((acc, d) => acc + d.pendientes, 0);
  const monto = multas.reduce((acc, d) => acc + (d.total_a_pagar_usd ?? 0), 0);

  let matriculaEtiqueta = "Sin dato";
  let matriculaTono: TonoInsignia = "neutro";
  if (b.matricula_vigente === true) {
    matriculaEtiqueta = "Vigente";
    matriculaTono = "ok";
  } else if (b.matricula_vigente === false) {
    matriculaEtiqueta = "Vencida";
    matriculaTono = "peligro";
  }

  // Fecha más reciente entre las fuentes que sí entregaron datos.
  const fechas = fuentes
    .map((f) => f.consultado_en)
    .filter((v): v is string => !!v)
    .sort();
  const consultadoEn = fechas.length > 0 ? fechas[fechas.length - 1] : null;

  return {
    titulo: [b.marca, b.modelo].filter(Boolean).join(" ") || "Vehículo",
    detalleVehiculo: [b.anio, b.color].filter(Boolean).join(" · ") || null,
    matriculaEtiqueta,
    matriculaTono,
    multasPendientes: municipalesEnProceso ? null : pendientes,
    // Guarda explícita: con el detalle bloqueado (microdesbloqueo de pago) NUNCA se expone
    // un monto. Hoy el backend ya vacía `multas_detalle`, pero no dependemos de eso.
    montoMultas: perfil.multas_bloqueado || monto <= 0 ? null : monto,
    detalleBloqueado: perfil.multas_bloqueado,
    tienePendientes: perfil.tiene_pendientes,
    municipalesEnProceso,
    municipalesCaidas,
    consultadoEn,
  };
}

export function fechaLegible(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("es-EC", { day: "2-digit", month: "long", year: "numeric" });
}

// ── Presentación ────────────────────────────────────────────────────────────

function DatoGrande({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
      <div className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">{children}</div>
    </div>
  );
}

export function ResumenPlaca({
  placa,
  perfil,
  cargando,
}: {
  placa: string;
  perfil: VehiculoConsolidado;
  cargando: boolean;
}) {
  const r = derivarResumen(perfil);
  const fecha = fechaLegible(r.consultadoEn);

  // "Al día" solo se afirma con la foto COMPLETA. Si el municipio sigue consultando o no
  // respondió, se dice eso — un falso negativo aquí perjudica a quien compra.
  const veredicto = cargando
    ? { clase: "bg-slate-100 text-slate-500", texto: "Consultando…" }
    : r.tienePendientes
      ? { clase: "bg-amber-500 text-white", texto: "Con pendientes" }
      : r.municipalesEnProceso
        ? { clase: "bg-slate-100 text-slate-500", texto: "Consultando…" }
        : r.municipalesCaidas
          ? { clase: "bg-slate-100 text-slate-500", texto: "Sin dato municipal" }
          : { clase: "bg-emerald-500 text-white", texto: "Al día" };

  // Qué mostrar en "Multas": el conteo si se conoce, el veredicto si está bloqueado por
  // tokens, o un neutro mientras el municipio responde.
  const valorMultas = r.municipalesEnProceso
    ? "—"
    : r.detalleBloqueado
      ? r.tienePendientes
        ? "Sí"
        : "No"
      : String(r.multasPendientes ?? 0);

  return (
    <section className="rounded-3xl border border-slate-200/70 bg-white p-6 sombra-tarjeta sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-sm tracking-[0.3em] text-slate-400">{placa}</p>
          <h1 className="mt-1 break-words text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-4xl">
            {r.titulo}
          </h1>
          {r.detalleVehiculo && (
            <p className="mt-1 text-sm text-slate-500">{r.detalleVehiculo}</p>
          )}
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-2 self-start rounded-full px-5 py-2.5 text-sm font-bold ${veredicto.clase}`}
        >
          {cargando && <span className="h-2 w-2 animate-pulse rounded-full bg-slate-400" />}
          {veredicto.texto}
        </span>
      </div>

      {/* Máximo 6 datos, grandes y sin párrafos. */}
      <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-slate-100 pt-6 sm:grid-cols-3">
        <DatoGrande label="Matrícula">
          <Insignia tono={r.matriculaTono}>{r.matriculaEtiqueta}</Insignia>
        </DatoGrande>
        <DatoGrande label={r.detalleBloqueado ? "¿Tiene multas?" : "Multas pendientes"}>
          <span className={r.tienePendientes ? "text-amber-600" : ""}>{valorMultas}</span>
        </DatoGrande>
        <DatoGrande label="Total a pagar">
          {r.montoMultas != null ? (
            <span className="text-amber-600">${r.montoMultas.toFixed(0)}</span>
          ) : (
            <span className="text-slate-300">—</span>
          )}
        </DatoGrande>
      </div>

      {fecha && (
        <p className="mt-5 text-[11px] text-slate-400">Consultado el {fecha}</p>
      )}
      {r.municipalesEnProceso && (
        <p className="mt-1 text-[11px] text-slate-400">
          Seguimos consultando las infracciones municipales.
        </p>
      )}
      {!r.municipalesEnProceso && r.municipalesCaidas && (
        <p className="mt-1 text-[11px] text-amber-600">
          No pudimos consultar las infracciones municipales. Puedes reintentarlo en el
          detalle de multas.
        </p>
      )}
    </section>
  );
}
