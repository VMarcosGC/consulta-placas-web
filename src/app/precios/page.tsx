import Link from "next/link";
import { fuenteInactiva } from "@/lib/fuentes";

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
// `fuente` marca el producto que depende de una fuente concreta: si esa fuente está en
// stand-by (M2.5), la fila no se anuncia — no ofrecemos lo que hoy no podemos entregar.
const DESBLOQUEOS = [
  { nombre: "Ver identificadores técnicos", tokens: 3, detalle: "VIN, motor y chasis ofuscados a origen", fuente: null },
  { nombre: "Validar titular registrado", tokens: 5, detalle: "Validación (coincide / ofuscado), nunca el dato crudo", fuente: null },
  { nombre: "Ver alertas legales", tokens: 8, detalle: "Novedades legales asociadas, si hay fuente segura", fuente: "FGE" },
  { nombre: "Ver multas con valores", tokens: 10, detalle: "Detalle con montos por fuente (ANT / AMT)", fuente: null },
  { nombre: "Ver valores de matrícula (SRI)", tokens: 12, detalle: "Cuando exista proveedor confiable", fuente: "SRI" },
  { nombre: "Generar reporte compra segura", tokens: 40, detalle: "Informe consolidado de todo lo anterior", fuente: null },
  { nombre: "Verificación de la plataforma", tokens: 100, detalle: "Sello para tu publicación premium del marketplace", fuente: null },
].filter((d) => d.fuente == null || !fuenteInactiva(d.fuente));

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
          Precios <span className="text-marca">claros</span>
        </h1>
        <p className="mt-3 mx-auto max-w-2xl text-secundario">
          Los datos públicos son <strong>gratis</strong>. Pagas con tokens solo por los datos que
          tienen costo o valor real. <strong>1 token ≈ USD&nbsp;0.04.</strong>
        </p>
      </div>

      {/* Aviso de que todavía NO se cobra (TASK-017 fase 2).
          La monetización está suspendida (AGENTS.md §1.0.3): los precios del catálogo
          están en 0 y no hay proveedor de pago activo. Hasta ahora eso solo constaba en
          un comentario del código, así que la página presentaba paquetes comprables que
          nadie puede comprar — en un producto cuya propuesta es la transparencia, eso se
          autodestruye.

          En `--marca-tinte` y no en ámbar a propósito: no es una advertencia sobre algo
          que salió mal, es información sobre cómo funciona hoy el producto. El ámbar
          diría "cuidado". */}
      <p className="mx-auto mt-6 max-w-2xl rounded-2xl bg-marca-tinte px-5 py-4 text-center text-sm text-marca-texto">
        <strong>Todavía no cobramos nada.</strong> Estamos en una etapa sin pagos: los
        valores de esta página son referenciales, para que sepas qué costará cada cosa
        cuando activemos la compra de tokens. Mientras tanto publicar, contactar a un
        vendedor y consultar los datos públicos de una placa son gratis.
      </p>

      {/* Gratis siempre */}
      <section className="mt-12 sombra-tarjeta rounded-3xl border border-confirmado bg-superficie p-8">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-confirmado px-3 py-1 text-xs font-semibold text-superficie">Gratis</span>
          <h2 className="text-xl font-bold text-tinta">Lo que ves sin pagar</h2>
        </div>
        <ul className="mt-5 grid gap-2 text-sm text-secundario sm:grid-cols-2">
          {GRATIS.map((g) => (
            <li key={g} className="flex items-start gap-2">
              <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-confirmado" />
              {g}
            </li>
          ))}
        </ul>
        <p className="mt-5 text-xs text-secundario">
          Solo mostramos las fuentes que hoy podemos consultar de forma confiable. Cuando una
          validación necesita confirmación externa, te dejamos el enlace al portal oficial en
          lugar de prometerte un dato automático.
        </p>
      </section>

      {/* Paquetes de tokens */}
      <section className="mt-12">
        <h2 className="text-center text-2xl font-bold text-tinta">Paquetes de tokens</h2>
        <p className="mt-2 text-center text-sm text-secundario">
          Cifras referenciales. Los pagos llegan al integrar el gateway local (PlaceToPay / MercadoPago).
        </p>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PAQUETES.map((p) => (
            <article
              key={p.precio}
              className={`relative rounded-3xl border p-6 text-center sombra-tarjeta ${
                p.nota ? "border-marca bg-superficie ring-2 ring-marca/30" : "border-borde bg-superficie"
              }`}
            >
              {p.nota && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accion px-3 py-1 text-xs font-semibold text-superficie shadow-sm">
                  {p.nota}
                </span>
              )}
              <div className="text-4xl font-black text-tinta">{p.tokens}</div>
              <div className="text-xs uppercase tracking-wide text-secundario">tokens</div>
              {/* "referencial" pegado al precio y no solo en el aviso de arriba: quien
                  llega scrolleando a esta tarjeta puede no haber leído la cabecera. */}
              <div className="mt-3 text-lg font-bold text-marca">{p.precio}</div>
              <div className="text-[11px] text-secundario">referencial</div>
            </article>
          ))}
        </div>
      </section>

      {/* Qué desbloqueas con tokens */}
      <section className="mt-14 sombra-tarjeta rounded-3xl border border-borde bg-superficie p-8">
        <h2 className="text-xl font-bold text-tinta">Qué desbloqueas con tokens</h2>
        <p className="mt-2 text-sm text-secundario">
          Solo se cobra por datos con costo de proveedor, dificultad real o valor comercial. Si la
          fuente no entrega un dato para esa placa, no se cobra.
        </p>
        <ul className="mt-6 divide-y divide-borde-suave">
          {DESBLOQUEOS.map((d) => (
            <li key={d.nombre} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-tinta">{d.nombre}</p>
                <p className="text-xs text-secundario">{d.detalle}</p>
              </div>
              <span className="shrink-0 rounded-full bg-superficie-tenue px-3 py-1 text-sm font-bold tabular-nums text-secundario">
                {d.tokens} {d.tokens === 1 ? "token" : "tokens"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12 text-center">
        <p className="text-sm text-secundario">
          Cada cuenta nueva nace con <strong>5 tokens de cortesía</strong>.
        </p>
        <Link
          href="/registro"
          className="mt-5 inline-block rounded-xl bg-accion px-6 py-3 text-sm font-semibold text-superficie shadow-sm transition hover:opacity-90"
        >
          Crear cuenta gratis
        </Link>
      </section>
    </div>
  );
}
