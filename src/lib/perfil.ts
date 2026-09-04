// Helpers de lectura del Perfil Consolidado. El backend entrega el objeto ya
// consolidado (GET /consultar/{placa}/perfil → VehiculoConsolidado, ver
// consolidador.py): el frontend NO transforma, solo lee `estado_fuentes` para
// decidir polling, estado por fuente y el update optimista de reintento.

import type { VehiculoConsolidado } from "@/types/api";
import { fuenteInactiva } from "@/lib/fuentes";

// True si alguna fuente VISIBLE sigue procesándose (worker híbrido AMT/EPMTSD) → polling.
// Las fuentes en stand-by se ignoran: el backend las sigue encolando, pero si la UI no las
// muestra, quedarse repollando y con el encabezado en "Consultando…" por una fuente que el
// usuario nunca va a ver sería un spinner eterno sin explicación (M2.5).
export function hayFuentesEnProceso(perfil: VehiculoConsolidado): boolean {
  return perfil.estado_fuentes.some(
    (f) => f.estado === "en_proceso" && !fuenteInactiva(f.clave)
  );
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

// Copia del perfil con las fuentes VISIBLES que siguen `en_proceso` marcadas como
// `error_fuente`. Se usa cuando el polling agotó su ventana (el worker residencial no
// está respondiendo): así la pantalla llega a un estado FINAL —"sin dato municipal,
// reintentar"— en vez de girar para siempre. `reintentar` vuelve a ponerlas en camino.
export function marcarFuentesVaradas(
  perfil: VehiculoConsolidado
): VehiculoConsolidado {
  return {
    ...perfil,
    estado_fuentes: perfil.estado_fuentes.map((f) =>
      f.estado === "en_proceso" && !fuenteInactiva(f.clave)
        ? {
            ...f,
            estado: "error_fuente",
            detalle: "No respondió a tiempo. Puedes reintentar en un momento.",
          }
        : f
    ),
  };
}
