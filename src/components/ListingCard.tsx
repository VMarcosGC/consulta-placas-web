// Tarjetas del Marketplace — rediseño mobile-first (M2.7).
//
// Feedback de la prueba: las tarjetas se estiraban con texto secundario y la foto perdía
// protagonismo. Ahora la jerarquía es: FOTO → PRECIO → título → chips. Nada más.
//   - Foto de portada con ratio FIJO (4:3) para que la grilla no baile; placeholder si no hay.
//   - Precio grande, es el dato que decide el clic.
//   - Título en UNA línea (marca/modelo/año), truncado.
//   - UNA fila de chips (premium / verificado / ficha) y se acabó.
//   - Toda la tarjeta es clickeable.
//
// - ListingInternaCard: publicación de un usuario (link interno al detalle).
// - ListingReferenciadaCard: anuncio externo aportado. Desde M2.9 lleva al detalle LOCAL
//   (/marketplace/referencias/{id}); salir al portal de origen es un botón aparte, allí.

import type { ReactNode } from "react";
import Link from "next/link";
import { Insignia } from "@/components/BentoCard";
import { BotonFavorito } from "@/components/BotonFavorito";
import { fichaIncompleta } from "@/lib/ficha";
import type { ControlFavoritos } from "@/lib/favoritos";
import type { PublicacionInterna, PublicacionReferenciada } from "@/types/api";

// Extras opcionales del carril comprador (MC1). Son opcionales a propósito: donde la
// tarjeta ya se usaba sin favoritos (home, mis-publicaciones) se omiten y todo sigue
// igual. `distintivo` es el espacio del badge "↓ Bajó $X" de "Tus favoritos".
interface ExtrasComprador {
  favoritos?: ControlFavoritos;
  distintivo?: ReactNode;
}

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

// Portada con ratio fijo: con foto o con placeholder, la tarjeta mide siempre igual.
function Portada({ url, alt }: { url?: string | null; alt: string }) {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={alt}
          loading="lazy"
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-300">
          <span className="text-3xl" aria-hidden>
            🚗
          </span>
          <span className="text-[11px] font-medium">Sin fotos</span>
        </div>
      )}
    </div>
  );
}

// ── Publicación interna (Premium / Light) ───────────────────────────────────

export function ListingInternaCard({
  pub,
  favoritos,
  distintivo,
}: { pub: PublicacionInterna } & ExtrasComprador) {
  const premium = pub.plan === "premium";
  const titulo = tituloVehiculo(pub);

  return (
    <Link
      href={`/marketplace/${pub.id}`}
      className={`group flex flex-col overflow-hidden rounded-2xl bg-white sombra-tarjeta animate-fade-in-up transition hover:-translate-y-0.5 ${
        premium ? "ring-2 ring-blue-400/60 shadow-md" : "border border-slate-200"
      }`}
    >
      <div className="relative">
        <Portada url={pub.foto_portada} alt={titulo} />
        {favoritos && (
          <BotonFavorito
            placa={pub.placa}
            precioActual={pub.precio_usd}
            control={favoritos}
          />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        {/* Precio primero: es lo que decide el clic. */}
        <p className="text-2xl font-black leading-none text-slate-900">
          {precioFmt(pub.precio_usd)}
        </p>
        {distintivo}

        {/* Título en una sola línea + placa discreta. */}
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold text-slate-900">{titulo}</h3>
          <p className="font-mono text-xs tracking-widest text-slate-400">{pub.placa}</p>
        </div>

        {/* Una fila de chips y nada más. */}
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
          {premium && (
            <span className="inline-flex items-center rounded-full bg-brand-gradient px-2 py-0.5 text-[11px] font-black text-white">
              ★ Premium
            </span>
          )}
          {pub.verificado && <Insignia tono="ok">✓ Verificado</Insignia>}
          {fichaIncompleta(pub.completitud_ficha) ? (
            <Insignia tono="neutro">Ficha incompleta</Insignia>
          ) : (
            <Insignia tono="info">Ficha {pub.completitud_ficha ?? 0}%</Insignia>
          )}
        </div>
      </div>
    </Link>
  );
}

// ── Publicación referenciada (externa) ──────────────────────────────────────

export function ListingReferenciadaCard({
  pub,
  favoritos,
  distintivo,
}: { pub: PublicacionReferenciada } & ExtrasComprador) {
  const titulo = tituloVehiculo(pub);
  // Portada: la primera foto subida por el aportante (M2.8) o, si no, el enlace de imagen.
  const portada = pub.fotos?.[0] ?? pub.imagen_url;
  const extras = [
    pub.ciudad,
    pub.kilometraje != null ? `${pub.kilometraje.toLocaleString("es-EC")} km` : null,
  ].filter(Boolean);

  // M2.9: la tarjeta ya NO salta al portal externo. Lleva a una página LOCAL de detalle,
  // donde el visitante ve fotos y datos y decide salir con un botón explícito. Antes el
  // clic te expulsaba del sitio sin previo aviso y sin haber visto nada.
  return (
    <Link
      href={`/marketplace/referencias/${pub.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white sombra-tarjeta animate-fade-in-up transition hover:-translate-y-0.5 hover:border-blue-300"
    >
      <div className="relative">
        <Portada url={portada} alt={titulo} />
        {/* El favorito es por PLACA: una referencia externa sin placa no puede guardarse,
            así que el ♡ ni se dibuja (mejor ausente que roto). */}
        {favoritos && pub.placa && (
          <BotonFavorito
            placa={pub.placa}
            precioActual={pub.precio_usd}
            control={favoritos}
          />
        )}
        {/* Cuántas fotos trae, para que se note que hay más al abrir el anuncio. */}
        {(pub.fotos?.length ?? 0) > 1 && (
          <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white">
            📷 {pub.fotos!.length}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-2xl font-black leading-none text-slate-900">
          {precioFmt(pub.precio_usd)}
        </p>
        {distintivo}

        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold text-slate-900">{titulo}</h3>
          {pub.placa && (
            <p className="font-mono text-xs tracking-widest text-slate-400">{pub.placa}</p>
          )}
          {extras.length > 0 && (
            <p className="mt-0.5 truncate text-xs text-slate-500">{extras.join(" · ")}</p>
          )}
        </div>

        {/* Descripción copiada del anuncio original (M2.8): 2 líneas, para que la tarjeta
            informe sin estirarse. Sigue siendo dato no verificado. */}
        {pub.descripcion && (
          <p className="line-clamp-2 text-xs text-slate-500">{pub.descripcion}</p>
        )}

        {/* Etiqueta obligatoria (M2.5), copy exacto: la referencia la aporta un usuario y
            NO la raspamos ni la validamos. */}
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
          <Insignia tono="alerta">Referencia externa · datos no verificados</Insignia>
          {/* Sin "↗": este clic NO sale del sitio, abre el detalle local. */}
          <span className="text-[11px] font-semibold text-slate-500 group-hover:text-blue-700">
            Ver detalle · {pub.fuente}
          </span>
        </div>
      </div>
    </Link>
  );
}
