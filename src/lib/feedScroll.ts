// Restauración de posición del feed del marketplace al volver del detalle de un auto.
//
// Problema: /marketplace es un componente cliente que refetchea en `useEffect` al montar
// y acumula páginas ("Cargar más") en estado. Al volver con "atrás" desde /marketplace/[id]
// el componente se remonta → se pierde el scroll y las páginas cargadas.
//
// Solución: una foto en `sessionStorage` (una sola ranura — solo importa la última vista
// del market) con el feed curado, el estado de búsqueda y el scrollY. Se restaura si la
// clave (querystring de filtros) coincide y no está vieja.

const RANURA = "mkt:snapshot";
const TTL_MS = 30 * 60 * 1000; // 30 min

export interface SnapshotFeed<TFeed = unknown, TBusqueda = unknown> {
  clave: string;
  ts: number;
  scrollY: number;
  feed: TFeed;
  busqueda: TBusqueda;
}

function leerRaw(): SnapshotFeed | null {
  try {
    const raw = sessionStorage.getItem(RANURA);
    if (!raw) return null;
    const snap = JSON.parse(raw) as SnapshotFeed;
    if (!snap || typeof snap.ts !== "number") return null;
    if (Date.now() - snap.ts > TTL_MS) {
      sessionStorage.removeItem(RANURA);
      return null;
    }
    return snap;
  } catch {
    return null;
  }
}

/** Devuelve la foto SOLO si es de la misma vista (misma clave de filtros) y está fresca. */
export function leerSnapshotFeed<TFeed, TBusqueda>(
  clave: string
): SnapshotFeed<TFeed, TBusqueda> | null {
  if (typeof window === "undefined") return null;
  const snap = leerRaw();
  if (!snap || snap.clave !== clave) return null;
  return snap as SnapshotFeed<TFeed, TBusqueda>;
}

/** Guarda / actualiza la foto completa (datos + scroll actual). */
export function guardarSnapshotFeed(
  clave: string,
  feed: unknown,
  busqueda: unknown
): void {
  if (typeof window === "undefined") return;
  try {
    const snap: SnapshotFeed = {
      clave,
      ts: Date.now(),
      scrollY: window.scrollY,
      feed,
      busqueda,
    };
    sessionStorage.setItem(RANURA, JSON.stringify(snap));
  } catch {
    /* cuota llena / modo privado: la restauración es un lujo, no se rompe nada */
  }
}

/** Actualiza solo el scrollY de la foto vigente (barato, se llama al desplazarse). */
export function guardarScrollFeed(clave: string): void {
  if (typeof window === "undefined") return;
  try {
    const snap = leerRaw();
    if (!snap || snap.clave !== clave) return;
    snap.scrollY = window.scrollY;
    snap.ts = Date.now();
    sessionStorage.setItem(RANURA, JSON.stringify(snap));
  } catch {
    /* noop */
  }
}
