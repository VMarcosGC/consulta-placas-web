// Tarjeta de un microdesbloqueo concreto dentro de "Completa tu revisión del vehículo".
// Elige el ícono y el preview SEGURO (ofuscado / veredicto) según el código del producto,
// y delega el flujo de desbloqueo en UnlockCard. Solo se usa para productos bloqueados y
// disponibles (el dato revelado se muestra en su tarjeta dedicada del perfil).

"use client";

import type { ReactNode } from "react";
import { UnlockCard } from "@/components/UnlockCard";
import type { ProductoEstado, VehiculoConsolidado } from "@/types/api";

type AlDesbloquear = (perfil: VehiculoConsolidado) => void;

const ICONOS: Record<string, string> = {
  identificadores_tecnicos: "🔧",
  titular_validado: "👤",
  multas_con_montos: "🚦",
  valores_matricula_sri: "🧾",
  alertas_legales: "⚖️",
};

// Preview seguro (sin exponer el dato real) según el producto. Refuerza el valor sin
// lenguaje agresivo: nada de "espía al dueño" ni "datos ocultos".
function previewDe(codigo: string, perfil: VehiculoConsolidado): ReactNode {
  if (codigo === "identificadores_tecnicos") {
    const id = perfil.identificacion;
    const muestra = id.vin_ofuscado ?? id.numero_motor_ofuscado;
    return muestra
      ? `Identificadores ofuscados: ${muestra}${id.pais_origen ? ` · origen ${id.pais_origen}` : ""}`
      : "VIN, número de motor y chasis del vehículo.";
  }
  if (codigo === "titular_validado") {
    return perfil.titular.mensaje ?? "Confirma que el titular registrado coincide, sin exponer datos personales.";
  }
  if (codigo === "multas_con_montos") {
    return perfil.tiene_pendientes
      ? "Hay multas o infracciones registradas. Mira el detalle con montos por fuente."
      : "Sin pendientes detectados. Confirma el detalle por fuente.";
  }
  return null;
}

export function ProductoConsultaCard({
  placa,
  producto,
  perfil,
  onUnlocked,
}: {
  placa: string;
  producto: ProductoEstado;
  perfil: VehiculoConsolidado;
  onUnlocked: AlDesbloquear;
}) {
  return (
    <UnlockCard
      placa={placa}
      producto={producto}
      onUnlocked={onUnlocked}
      icono={ICONOS[producto.codigo] ?? "🔒"}
      preview={previewDe(producto.codigo, perfil)}
    />
  );
}
