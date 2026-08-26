// Tarjeta destacada del bundle "Generar reporte compra segura": reúne todos los datos del
// vehículo en un solo informe. Usa UnlockCard para el flujo de desbloqueo. Copy en es-EC,
// orientado a la confianza del comprador, sin lenguaje agresivo.

"use client";

import { UnlockCard } from "@/components/UnlockCard";
import { precioUsdReferencial } from "@/components/TokenBadge";
import type { ProductoEstado, VehiculoConsolidado } from "@/types/api";

type AlDesbloquear = (perfil: VehiculoConsolidado) => void;

const INCLUYE = [
  "Identificadores técnicos (VIN, motor, chasis)",
  "Validación del titular registrado",
  "Multas e infracciones con montos",
  "Alertas y valores cuando haya fuente confiable",
];

export function ReporteCompraSeguraCard({
  placa,
  producto,
  onUnlocked,
}: {
  placa: string;
  producto: ProductoEstado;
  onUnlocked: AlDesbloquear;
}) {
  if (producto.desbloqueado) {
    return (
      <div className="rounded-2xl border border-marca bg-superficie p-5 ring-1 ring-marca/20 sombra-tarjeta">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-tinta">🛡️ {producto.nombre}</h3>
          <span className="inline-flex items-center gap-1 rounded-full bg-confirmado-tinte px-2.5 py-1 text-xs font-semibold text-confirmado-texto">
            ✓ generado
          </span>
        </div>
        <p className="mt-2 text-sm text-secundario">
          Tu reporte está listo. Revisa cada bloque desbloqueado en las secciones de arriba.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-marca bg-marca-tinte/60 p-5 ring-1 ring-marca/20 sombra-tarjeta">
      <UnlockCard
        placa={placa}
        producto={producto}
        onUnlocked={onUnlocked}
        icono="🛡️"
        descripcion={`Todo el vehículo en un informe. Desde ${precioUsdReferencial(producto.tokens)}.`}
        preview={
          <ul className="space-y-1">
            {INCLUYE.map((i) => (
              <li key={i} className="flex items-start gap-2 text-xs">
                <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-accion" />
                {i}
              </li>
            ))}
          </ul>
        }
      />
    </div>
  );
}
