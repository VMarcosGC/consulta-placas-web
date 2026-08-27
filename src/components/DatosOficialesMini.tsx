// "Datos oficiales" del anuncio — versión MINI (M2.7).
//
// En el anuncio esto es un respaldo, no el protagonista: 3-4 líneas y un enlace
// "Ver detalle completo" que abre la consulta compacta de esa placa. El detalle largo
// (desglose por fuente, citación por citación) vive en /consultar/{placa}.
//
// Es la contracara de la ficha: esto NO lo declara el vendedor.
// Respeta el stand-by de fuentes. Si el backend no entrega el desglose con montos
// (`multas_bloqueado`), solo se muestra el veredicto sí/no.

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Insignia } from "@/components/BentoCard";
import { consultarPerfil } from "@/lib/api";
import { derivarResumen, fechaLegible } from "@/components/ResumenPlaca";
import type { VehiculoConsolidado } from "@/types/api";

function Linea({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-borde-suave py-2 last:border-b-0">
      <span className="text-sm text-secundario">{etiqueta}</span>
      <span className="text-right text-sm font-semibold text-tinta">{children}</span>
    </div>
  );
}

export function DatosOficialesMini({ placa }: { placa: string }) {
  const [perfil, setPerfil] = useState<VehiculoConsolidado | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const p = await consultarPerfil(placa, { soloCache: true });
        if (activo) setPerfil(p);
      } catch {
        // Silencioso: degrada a "en proceso". Nunca rompe el anuncio.
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, [placa]);

  const r = perfil ? derivarResumen(perfil) : null;
  const fecha = fechaLegible(r?.consultadoEn);
  const estadosOficiales = perfil?.estado_fuentes.filter((fuente) =>
    ["ANT", "AMT", "EPMTSD"].includes(fuente.clave)
  ) ?? [];
  const sinDatosOficiales =
    estadosOficiales.length > 0 &&
    estadosOficiales.every((fuente) => fuente.estado === "no_consultada");
  const municipalesSinConsultar = estadosOficiales.some(
    (fuente) =>
      ["AMT", "EPMTSD"].includes(fuente.clave) &&
      fuente.estado === "no_consultada"
  );
  // Sin nada útil todavía: ni matrícula resuelta ni veredicto.
  const enProceso =
    cargando ||
    !r ||
    (!sinDatosOficiales && r.matriculaEtiqueta === "Sin dato" && r.municipalesEnProceso);

  return (
    <section className="rounded-2xl border border-borde/70 bg-superficie p-5 sombra-tarjeta sm:p-6">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-tinta">Datos oficiales</h2>
        <Insignia tono="info">Fuentes públicas</Insignia>
      </div>
      <p className="mb-3 text-xs text-secundario">
        Esto no lo declara el vendedor: viene de la ANT y las agencias municipales de tránsito.
      </p>

      {sinDatosOficiales ? (
        <p className="text-sm text-secundario">
          Aún no hay datos oficiales disponibles para esta placa. Consulta la placa para actualizarlos.
        </p>
      ) : enProceso ? (
        <p className="text-sm text-secundario">
          Datos oficiales en proceso. Estamos consultando las fuentes públicas de esta placa.
        </p>
      ) : (
        <div>
          <Linea etiqueta="Matrícula">
            <Insignia tono={r!.matriculaTono}>{r!.matriculaEtiqueta}</Insignia>
          </Linea>
          <Linea etiqueta="Multas e infracciones">
            {r!.municipalesEnProceso ? (
              <span className="text-secundario">Consultando…</span>
            ) : municipalesSinConsultar ? (
              <span className="text-secundario">Aún no consultadas</span>
            ) : r!.tienePendientes ? (
              <span className="text-atencion">Con pendientes</span>
            ) : r!.municipalesCaidas ? (
              <span className="text-secundario">Sin dato municipal</span>
            ) : (
              <span className="text-confirmado">Al día</span>
            )}
          </Linea>
          {/* Con el detalle bloqueado no se muestra el monto (doble guarda —
              `derivarResumen` ya lo anula). */}
          {!r!.detalleBloqueado && r!.montoMultas != null && (
            <Linea etiqueta="Total a pagar">
              <span className="text-atencion">${r!.montoMultas.toFixed(0)}</span>
            </Linea>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <Link
          href={`/consultar/${encodeURIComponent(placa)}`}
          className="text-sm font-semibold text-marca hover:underline"
        >
          Ver detalle completo →
        </Link>
        {fecha && <span className="text-[11px] text-secundario">Consultado el {fecha}</span>}
      </div>
    </section>
  );
}
