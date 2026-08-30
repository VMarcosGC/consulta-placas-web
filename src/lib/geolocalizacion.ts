// Distancia APROXIMADA entre el usuario y un negocio del directorio de servicios.
//
// No tenemos coordenadas por negocio (todavía): se usa el centroide de la ciudad, y si
// la ciudad no está en la tabla, el de la capital de la provincia. Es una estimación —
// la UI lo dice con "~".

export type Coord = { lat: number; lng: number };

// Centroide aproximado de las ciudades del catálogo (y variantes de tipeo comunes).
const CENTROIDES_CIUDAD: Record<string, Coord> = {
  quito: { lat: -0.1807, lng: -78.4678 },
  guayaquil: { lat: -2.171, lng: -79.9224 },
  cuenca: { lat: -2.9006, lng: -79.0045 },
  ambato: { lat: -1.2417, lng: -78.6197 },
  manta: { lat: -0.9677, lng: -80.7089 },
  portoviejo: { lat: -1.0546, lng: -80.4545 },
  machala: { lat: -3.2586, lng: -79.9606 },
  "santo domingo": { lat: -0.2542, lng: -79.1719 },
  "santo domingo de los tsachilas": { lat: -0.2542, lng: -79.1719 },
  loja: { lat: -3.9931, lng: -79.2042 },
  ibarra: { lat: 0.3517, lng: -78.1223 },
  riobamba: { lat: -1.6636, lng: -78.6546 },
  esmeraldas: { lat: 0.9682, lng: -79.6517 },
};

// Provincia → ciudad que se usa como su centroide (capital o ciudad principal).
const CAPITAL_PROVINCIA: Record<string, string> = {
  azuay: "cuenca",
  chimborazo: "riobamba",
  "el oro": "machala",
  esmeraldas: "esmeraldas",
  guayas: "guayaquil",
  imbabura: "ibarra",
  loja: "loja",
  manabi: "portoviejo",
  pichincha: "quito",
  "santo domingo de los tsachilas": "santo domingo",
  tungurahua: "ambato",
};

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Centroide aproximado de un negocio a partir de su ciudad (o provincia). */
export function centroideDe(
  ciudad?: string | null,
  provincia?: string | null
): Coord | null {
  if (ciudad) {
    const c = CENTROIDES_CIUDAD[normalizar(ciudad)];
    if (c) return c;
  }
  if (provincia) {
    const capital = CAPITAL_PROVINCIA[normalizar(provincia)];
    if (capital && CENTROIDES_CIUDAD[capital]) return CENTROIDES_CIUDAD[capital];
  }
  return null;
}

/** Ciudades ofrecidas como origen manual cuando no hay GPS. */
export const CIUDADES_ORIGEN: string[] = [
  "Quito",
  "Guayaquil",
  "Cuenca",
  "Ambato",
  "Manta",
  "Portoviejo",
  "Machala",
  "Santo Domingo",
  "Loja",
  "Ibarra",
  "Riobamba",
  "Esmeraldas",
];

export function coordDeCiudad(ciudad: string): Coord | null {
  return CENTROIDES_CIUDAD[normalizar(ciudad)] ?? null;
}

/** Distancia en km sobre la esfera (haversine). */
export function haversineKm(a: Coord, b: Coord): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

/** Minutos aproximados de viaje en auto: ciudad ~30 km/h, ruta ~75 km/h. */
export function minutosAprox(km: number): number {
  if (km <= 20) return Math.max(3, Math.round(km * 2));
  return Math.round(40 + (km - 20) * 0.8);
}

/** "~8 km · ~15 min" — o "~1,2 km · ~4 min" para distancias cortas. */
export function etiquetaDistancia(km: number): string {
  const kmTxt =
    km < 10 ? km.toLocaleString("es-EC", { maximumFractionDigits: 1 }) : String(Math.round(km));
  const min = minutosAprox(km);
  const minTxt = min >= 60 ? `~${Math.floor(min / 60)} h ${min % 60} min` : `~${min} min`;
  return `~${kmTxt} km · ${minTxt}`;
}
