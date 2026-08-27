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

// La etiqueta va en sans (es la interfaz); el valor de dato duro va en `font-mono`
// cuando `mono` está activo, porque esto es un REGISTRO OFICIAL y no lo declara el
// vendedor (DISENO.md §1/§3: la tipografía carga esa distinción). El encabezado de
// la tarjeta y las etiquetas quedan sans.
function Linea({
  etiqueta,
  children,
  mono,
}: {
  etiqueta: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-borde-suave py-2 last:border-b-0">
      <span className="text-sm text-secundario">{etiqueta}</span>
      <span
        className={`text-right text-sm font-semibold text-tinta ${mono ? "font-mono" : ""}`}
      >
        {children}
      </span>
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
    <section className="rounded-2xl border border-borde-fuerte bg-superficie p-5 sombra-tarjeta sm:p-6">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-tinta">Datos oficiales</h2>
        <Insignia tono="info">Fuentes públicas</Insignia>
      </div>
      <p className="mb-3 text-xs text-secundario">
        Esto no lo declara el vendedor: viene de la ANT y las agencias municipales de tránsito.
      </p>

      {sinDatosOficiales ? (
        // El copy se enuncia desde el sistema, no como una falta del vendedor
        // (DISENO.md §7): el diagnóstico primero, la acción aparte.
        <div className="space-y-3">
          <p className="text-sm text-secundario">
            Todavía no consultamos las fuentes oficiales de esta placa.
          </p>
          <Link
            href={`/consultar/${encodeURIComponent(placa)}`}
            className="inline-flex text-sm font-semibold text-marca hover:underline"
          >
            Consultar ahora →
          </Link>
        </div>
      ) : enProceso ? (
        <p className="text-sm text-secundario">
          Estamos consultando las fuentes oficiales de esta placa. Vuelve en un momento.
        </p>
      ) : (
        <div>
          <Linea etiqueta="Matrícula">
            <Insignia tono={r!.matriculaTono}>{r!.matriculaEtiqueta}</Insignia>
          </Linea>
          <Linea etiqueta="Multas e infracciones" mono>
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
              `derivarResumen` ya lo anula). Es un número de un registro: mono y
              con separador de miles es-EC. */}
          {!r!.detalleBloqueado && r!.montoMultas != null && (
            <Linea etiqueta="Total a pagar" mono>
              <span className="text-atencion">
                ${r!.montoMultas.toLocaleString("es-EC", { maximumFractionDigits: 0 })}
              </span>
            </Linea>
          )}
        </div>
      )}

      {!sinDatosOficiales && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <Link
            href={`/consultar/${encodeURIComponent(placa)}`}
            className="text-sm font-semibold text-marca hover:underline"
          >
            Ver detalle completo →
          </Link>
          {fecha && (
            <span className="font-mono text-[11px] text-secundario">Consultado el {fecha}</span>
          )}
        </div>
      )}
    </section>
  );
}
