// Helpers del Perfil Consolidado. El backend ahora arma el objeto consolidado
// (GET /consultar/{placa}/perfil → VehiculoConsolidado, ver consolidador.py), así
// que aquí ya no se mapea nada: solo utilidades de lectura sobre `estado_fuentes`.

import type { VehiculoConsolidado } from "@/types/api";

// True si alguna fuente sigue procesándose (worker híbrido AMT/FGE) → polling.
export function hayFuentesEnProceso(perfil: VehiculoConsolidado): boolean {
  return perfil.estado_fuentes.some((f) => f.estado === "en_proceso");
}

// Estado consolidado de una fuente puntual (ANT/SRI/AMT/FGE) dentro del perfil.
export function estadoDeFuente(
  perfil: VehiculoConsolidado,
  clave: string
): string | undefined {
  return perfil.estado_fuentes.find((f) => f.clave === clave)?.estado;
}

// Devuelve una copia del perfil con una fuente marcada como en_proceso
// (update optimista al reintentar: reanuda el polling de inmediato).
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
