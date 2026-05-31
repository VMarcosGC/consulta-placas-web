// Tarjetas del Marketplace. Reusa la estética vibrante del Perfil (Insignia + sombras).
// - ListingInternaCard: publicación de un usuario. Premium destaca con anillo de marca,
//   etiqueta "Verificado por la plataforma" y argumentos extra (mantenimientos).
// - ListingReferenciadaCard: anuncio raspado de un portal externo (referencia).

import { Insignia } from "@/components/BentoCard";
import type { PublicacionInterna, PublicacionReferenciada } from "@/types/api";

function precioFmt(v: number | null): string {
  if (v == null) return "Consultar";
  return `$${v.toLocaleString("es-EC", { maximumFractionDigits: 0 })}`;
}

function tituloVehiculo(
  p: { titulo?: string | null; marca: string | null; modelo: string | null; anio: number | null }
): string {
  if (p.titulo) return p.titulo;
  const partes = [p.marca, p.modelo, p.anio].filter(Boolean);
  return partes.length ? partes.join(" ") : "Vehículo en venta";
}

// ── Publicación interna (Premium / Light) ───────────────────────────────────

export function ListingInternaCard({
  pub,
  onEliminar,
}: {
  pub: PublicacionInterna;
  onEliminar?: (id: number) => void;
}) {
  const premium = pub.plan === "premium";
  const m = pub.mantenimientos;

  return (
    <article
      className={`relative flex flex-col overflow-hidden rounded-2xl bg-white sombra-tarjeta animate-fade-in-up ${
        premium
          ? "ring-2 ring-blue-400/60 shadow-md"
          : "border border-slate-200"
      }`}
    >
      {premium && (
        <span className="block h-1.5 w-full bg-brand-gradient" aria-hidden />
      )}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {premium && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-gradient px-2.5 py-0.5 text-xs font-black text-white">
              ★ Premium
            </span>
          )}
          {pub.verificado && (
            <Insignia tono="ok">✓ Verificado por la plataforma</Insignia>
          )}
          {pub.estado_verificacion === "pendiente" && (
            <Insignia tono="info">Verificación pendiente</Insignia>
          )}
          {pub.estado !== "activa" && (
            <Insignia tono="neutro">{pub.estado}</Insignia>
          )}
        </div>

        <h3 className="text-lg font-bold text-slate-900">{tituloVehiculo(pub)}</h3>
        <p className="font-mono text-sm tracking-widest text-slate-400">{pub.placa}</p>

        {pub.descripcion && (
          <p className="mt-2 line-clamp-2 text-sm text-slate-500">{pub.descripcion}</p>
        )}

        {/* Argumentos premium: historial de mantenimientos del garage */}
        {premium && m && m.total > 0 && (
          <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
              Historial documentado
            </p>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
              <span>
                <span className="font-bold text-slate-900">{m.total}</span> mantenimiento
                {m.total === 1 ? "" : "s"}
              </span>
              {m.ultimo_kilometraje != null && (
                <span>
                  Último: <span className="font-bold text-slate-900">
                    {m.ultimo_kilometraje.toLocaleString("es-EC")} km
                  </span>
                </span>
              )}
              {m.ultima_fecha && <span>· {m.ultima_fecha}</span>}
            </div>
          </div>
        )}

        <div className="mt-auto flex items-end justify-between gap-2 pt-4">
          <p className="text-2xl font-black text-slate-900">{precioFmt(pub.precio_usd)}</p>
          {onEliminar && (
            <button
              type="button"
              onClick={() => onEliminar(pub.id)}
              className="rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-50"
            >
              Eliminar
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

// ── Publicación referenciada (externa) ──────────────────────────────────────

export function ListingReferenciadaCard({ pub }: { pub: PublicacionReferenciada }) {
  // Toda la tarjeta es un enlace vivo al anuncio original (Facebook/OLX/…): al
  // hacer clic abre la publicación de origen en una pestaña nueva.
  return (
    <a
      href={pub.url_externa}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white sombra-tarjeta animate-fade-in-up transition hover:-translate-y-0.5 hover:border-blue-300"
    >
      {/* Foto del anuncio si el aportante la pegó. */}
      {pub.imagen_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={pub.imagen_url}
          alt={tituloVehiculo(pub)}
          className="h-44 w-full object-cover"
          loading="lazy"
        />
      )}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <Insignia tono="neutro">Referencia · {pub.fuente}</Insignia>
        </div>
        <h3 className="text-base font-bold text-slate-900">{tituloVehiculo(pub)}</h3>
        {pub.placa && (
          <p className="font-mono text-sm tracking-widest text-slate-400">{pub.placa}</p>
        )}
        <div className="mt-auto flex items-end justify-between gap-2 pt-4">
          <p className="text-xl font-black text-slate-900">{precioFmt(pub.precio_usd)}</p>
          <span className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition group-hover:border-blue-400 group-hover:text-blue-700">
            Ver en {pub.fuente} ↗
          </span>
        </div>
      </div>
    </a>
  );
}
