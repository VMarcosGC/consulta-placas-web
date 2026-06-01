import Link from "next/link";

export const metadata = {
  title: "Precios | Revisa tu Carro EC",
  description:
    "Los datos públicos son gratis. Pagas con tokens solo por los datos que tienen costo o valor real. 1 token ≈ USD 0.04.",
};

// Valor referencial del token (1 token ≈ USD 0.04). Los pagos reales llegan al integrar el
// gateway local (PlaceToPay/MercadoPago); por ahora las cifras son referenciales.
const PAQUETES = [
  { precio: "$1.00", tokens: 25, nota: null as string | null },
  { precio: "$2.50", tokens: 65, nota: "Más popular" },
  { precio: "$5.00", tokens: 135, nota: null },
  { precio: "$10.00", tokens: 280, nota: "Mejor valor" },
];

// Lo que se desbloquea con tokens (datos con costo de proveedor, dificultad o valor comercial).
const DESBLOQUEOS = [
  { nombre: "Ver identificadores técnicos", tokens: 3, detalle: "VIN, motor y chasis ofuscados a origen" },
  { nombre: "Validar titular registrado", tokens: 5, detalle: "Validación (coincide / ofuscado), nunca el dato crudo" },
  { nombre: "Ver alertas legales", tokens: 8, detalle: "Novedades legales asociadas, si hay fuente segura" },
  { nombre: "Ver multas con valores", tokens: 10, detalle: "Detalle con montos por fuente (ANT / AMT)" },
  { nombre: "Ver valores de matrícula (SRI)", tokens: 12, detalle: "Cuando exista proveedor confiable" },
  { nombre: "Generar reporte compra segura", tokens: 40, detalle: "Informe consolidado de todo lo anterior" },
  { nombre: "Verificación de la plataforma", tokens: 100, detalle: "Sello para tu publicación premium del marketplace" },
];

// Lo que siempre es gratis: datos públicos disponibles + enlaces oficiales.
const GRATIS = [
  "Características públicas: marca, modelo, año, color, clase y servicio",
  "Estado de matrícula: vigente o vencida",
  "Veredicto del vehículo: ¿tiene pendientes? sí / no",
  "Enlaces oficiales cuando una validación requiere confirmación externa",
  "Estado de las fuentes consultadas",
];

export default function PreciosPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="text-center">
        <h1 className="text-4xl sm:text-5xl font-bold">
          Precios <span className="text-brand-gradient">claros</span>
        </h1>
        <p className="mt-3 mx-auto max-w-2xl text-slate-600">
          Los datos públicos son <strong>gratis</strong>. Pagas con tokens solo por los datos que
          tienen costo o valor real. <strong>1 token ≈ USD&nbsp;0.04.</strong>
        </p>
      </div>

      {/* Gratis siempre */}
      <section className="mt-12 sombra-tarjeta rounded-3xl border border-emerald-200 bg-white p-8">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white">Gratis</span>
          <h2 className="text-xl font-bold text-slate-900">Lo que ves sin pagar</h2>
        </div>
        <ul className="mt-5 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
          {GRATIS.map((g) => (
            <li key={g} className="flex items-start gap-2">
              <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              {g}
            </li>
          ))}
        </ul>
        <p className="mt-5 text-xs text-slate-500">
          No prometemos datos del SRI ni de Fiscalía de forma automática: consultamos las fuentes
          disponibles y te mostramos los enlaces oficiales cuando una validación requiere
          confirmación externa.
        </p>
      </section>

      {/* Paquetes de tokens */}
      <section className="mt-12">
        <h2 className="text-center text-2xl font-bold text-slate-900">Paquetes de tokens</h2>
        <p className="mt-2 text-center text-sm text-slate-500">
          Cifras referenciales. Los pagos llegan al integrar el gateway local (PlaceToPay / MercadoPago).
        </p>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PAQUETES.map((p) => (
            <article
              key={p.precio}
              className={`relative rounded-3xl border p-6 text-center sombra-tarjeta ${
                p.nota ? "border-blue-300 bg-white ring-2 ring-blue-500/30" : "border-slate-200 bg-white"
              }`}
            >
              {p.nota && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-gradient px-3 py-1 text-xs font-semibold text-white shadow-sm">
                  {p.nota}
                </span>
              )}
              <div className="text-4xl font-black text-slate-900">{p.tokens}</div>
              <div className="text-xs uppercase tracking-wide text-slate-400">tokens</div>
              <div className="mt-3 text-lg font-bold text-brand-gradient">{p.precio}</div>
            </article>
          ))}
        </div>
      </section>

      {/* Qué desbloqueas con tokens */}
      <section className="mt-14 sombra-tarjeta rounded-3xl border border-slate-200 bg-white p-8">
        <h2 className="text-xl font-bold text-slate-900">Qué desbloqueas con tokens</h2>
        <p className="mt-2 text-sm text-slate-500">
          Solo se cobra por datos con costo de proveedor, dificultad real o valor comercial. Si la
          fuente no entrega un dato para esa placa, no se cobra.
        </p>
        <ul className="mt-6 divide-y divide-slate-100">
          {DESBLOQUEOS.map((d) => (
            <li key={d.nombre} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">{d.nombre}</p>
                <p className="text-xs text-slate-500">{d.detalle}</p>
              </div>
              <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-sm font-bold tabular-nums text-slate-700">
                {d.tokens} {d.tokens === 1 ? "token" : "tokens"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12 text-center">
        <p className="text-sm text-slate-600">
          Cada cuenta nueva nace con <strong>5 tokens de cortesía</strong>.
        </p>
        <Link
          href="/registro"
          className="mt-5 inline-block rounded-xl bg-brand-gradient px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
        >
          Crear cuenta gratis
        </Link>
      </section>
    </div>
  );
}
