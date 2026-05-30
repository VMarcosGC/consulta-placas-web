// Helpers de lectura del Perfil Consolidado. El backend entrega el objeto ya
// consolidado (GET /consultar/{placa}/perfil → VehiculoConsolidado, ver
// consolidador.py): el frontend NO transforma, solo lee `estado_fuentes` para
// decidir polling, estado por fuente y el update optimista de reintento.

import type { VehiculoConsolidado } from "@/types/api";

// True si alguna fuente sigue procesándose (worker híbrido AMT/EPMTSD/FGE) → polling.
export function hayFuentesEnProceso(perfil: VehiculoConsolidado): boolean {
  return perfil.estado_fuentes.some((f) => f.estado === "en_proceso");
}

// Estado consolidado de una fuente puntual (por clave de catálogo) dentro del perfil.
export function estadoDeFuente(
  perfil: VehiculoConsolidado,
  clave: string
): string | undefined {
  return perfil.estado_fuentes.find((f) => f.clave === clave)?.estado;
}

// Copia del perfil con una fuente marcada como en_proceso (update optimista al
// reintentar: reanuda el polling de inmediato).
export function marcarFuenteEnProceso(
  perfil: VehiculoConsolidado,
  clave: string
): VehiculoConsolidado {
  return {
    ...perfil,
    estado_fuentes: perfil.estado_fuentes.map((f) =>
      f.clave === clave ? { ...f, estado: "en_proceso", detalle: null } : f
    ),
  };
}
