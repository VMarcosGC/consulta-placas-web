// Tarjetas del Marketplace — rediseño mobile-first (M2.7), jerarquía §4 (fase 1A).
//
// El orden sigue la SECUENCIA DE LA DECISIÓN: cada bloque responde la pregunta que el
// anterior deja abierta.
//
//   FOTO 4:3     ¿me gusta?
//   PRECIO       ¿me alcanza?
//   título       qué es
//   ciudad · km  ¿me sirve?
//   placa        identidad
//   chips        metadato
//
//   - Foto de portada con ratio FIJO (4:3) para que la grilla no baile; placeholder si no hay.
//   - Título en UNA línea (marca/modelo/año), truncado.
//   - Toda la tarjeta es clickeable.
//
// Tres cosas que YA estaban bien y que §6 descartó explícitamente cambiar — no
// "mejorarlas" en una pasada futura:
//   - El PRECIO va DEBAJO de la foto, no sobrepuesto. Con fotos heterogéneas y uso a
//     pleno sol en Android económico, un precio sobre imagen pierde contraste y
//     consistencia.
//   - NO hay botón dentro de la tarjeta: la tarjeta entera ya es un <Link>, así que meter
//     un control adentro produce anidación inválida o destino duplicado. La acción vive
//     en el detalle.
//   - Los CHIPS van AL FINAL: ficha, Premium y verificado son metadato, no criterio de
//     decisión.
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

// Línea de datos secundarios (ciudad · kilometraje), COMPARTIDA por las dos tarjetas:
// desde las migraciones 0023 y 0024 la publicación interna también trae `ciudad` y
// `kilometraje`, con los mismos nombres que la referenciada, así que la línea se escribe
// una sola vez y las dos entidades se ven igual en el feed.
//
// Los campos siguen siendo opcionales a propósito: ambos son nullable en las dos salidas.
// Sin datos no se renderiza nada — un hueco vacío informa menos que la ausencia.
function LineaExtras({
  ciudad,
  kilometraje,
}: {
  ciudad?: string | null;
  kilometraje?: number | null;
}) {
  const extras = [
    ciudad,
    kilometraje != null ? `${kilometraje.toLocaleString("es-EC")} km` : null,
  ].filter(Boolean);

  if (extras.length === 0) return null;
  // `line-clamp-2` y NO `truncate`, a diferencia del título. Con una ciudad larga, el
  // recorte a una línea partía la cifra a media ("Santo Domingo · 1.25…" donde dice
  // 1.250.000 km) y un kilometraje mal leído es peor que ocupar un renglón más en un
  // producto cuya propuesta es la transparencia. La regla de M2.7 —una línea, truncada—
  // sigue valiendo para el TÍTULO, que se puede cortar sin cambiar de significado.
  // Cuerpo a 12px/400 (§3). `text-secundario` da 5.87:1 sobre la tarjeta blanca.
  return (
    <p className="mt-0.5 line-clamp-2 text-xs text-secundario">{extras.join(" · ")}</p>
  );
}

// Portada con ratio fijo: con foto o con placeholder, la tarjeta mide siempre igual.
function Portada({ url, alt }: { url?: string | null; alt: string }) {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden bg-superficie-tenue">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={alt}
          loading="lazy"
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
        />
      ) : (
        // "Sin fotos" pasa a `text-secundario` (5.02:1 sobre el relleno). Antes era un
        // `slate-300` decorativo a 1.4:1: en una pantalla barata a pleno sol —el caso de
        // uso que manda acá— simplemente no se leía.
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-secundario">
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
      className={`group flex flex-col overflow-hidden rounded-2xl bg-superficie sombra-tarjeta animate-fade-in-up transition hover:-translate-y-0.5 ${
        premium ? "ring-2 ring-marca/50 shadow-md" : "border border-borde"
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
        {/* PRECIO — "¿me alcanza?". 26px/500 (§3). El peso baja de `font-black` a
            `font-medium`: a 26px el tamaño ya establece la jerarquía, y la negrita
            extra solo sumaba ruido. */}
        <p className="text-[26px] font-medium leading-none text-tinta">
          {precioFmt(pub.precio_usd)}
        </p>
        {distintivo}

        <div className="min-w-0">
          {/* TÍTULO — "qué es". 15px/500 (§3), una línea, truncado. */}
          <h3 className="truncate text-[15px] font-medium text-tinta">{titulo}</h3>
          {/* CIUDAD · KM — "¿me sirve?". Va ANTES de la placa: responde si el auto te
              sirve, que es la pregunta que el título deja abierta. */}
          <LineaExtras ciudad={pub.ciudad} kilometraje={pub.kilometraje} />
          {/* PLACA — identidad. Después de ciudad·km, no antes: es un identificador
              para verificar, no un criterio para decidir. En mono y en `--marca`
              porque es el dato del registro oficial (§1/§3), vía `.texto-placa`. */}
          <p className="mt-1 texto-placa">{pub.placa}</p>
        </div>

        {/* CHIPS — metadato, al final. Una fila y nada más. */}
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
          {/* Premium en `--marca` PLANO (TASK-017). Antes llevaba el gradiente de
              marca, que era uno de sus dos lugares permitidos; ahora el gradiente
              vive SOLO en el logo. Motivo: el chip es METADATO de la publicación y
              mientras cargara la identidad del producto no se podía responder si ese
              gradiente decía "marca" o decía "estado". Plano además rinde mejor en
              Android de gama baja, que es el argumento de §6. */}
          {premium && (
            <span className="inline-flex items-center rounded-full bg-marca px-2 py-0.5 text-[11px] font-black text-white">
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

  // M2.9: la tarjeta ya NO salta al portal externo. Lleva a una página LOCAL de detalle,
  // donde el visitante ve fotos y datos y decide salir con un botón explícito. Antes el
  // clic te expulsaba del sitio sin previo aviso y sin haber visto nada.
  return (
    <Link
      href={`/marketplace/referencias/${pub.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-borde bg-superficie sombra-tarjeta animate-fade-in-up transition hover:-translate-y-0.5 hover:border-marca/40"
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
          // `bg-tinta/70` en vez de `bg-black/60`: el negro puro es el único gris que el
          // sistema no tiene: todos los neutros son cálidos.
          <span className="absolute bottom-2 right-2 rounded-full bg-tinta/70 px-2 py-0.5 text-[11px] font-semibold text-white">
            📷 {pub.fotos!.length}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        {/* Misma jerarquía §4 que la interna: PRECIO → título → ciudad·km → placa. */}
        <p className="text-[26px] font-medium leading-none text-tinta">
          {precioFmt(pub.precio_usd)}
        </p>
        {distintivo}

        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-medium text-tinta">{titulo}</h3>
          <LineaExtras ciudad={pub.ciudad} kilometraje={pub.kilometraje} />
          {pub.placa && <p className="mt-1 texto-placa">{pub.placa}</p>}
        </div>

        {/* Descripción copiada del anuncio original (M2.8): 2 líneas, para que la tarjeta
            informe sin estirarse. Sigue siendo dato no verificado. */}
        {pub.descripcion && (
          <p className="line-clamp-2 text-xs text-secundario">{pub.descripcion}</p>
        )}

        {/* Etiqueta obligatoria (M2.5), copy exacto: la referencia la aporta un usuario y
            NO la raspamos ni la validamos. */}
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
          {/* Pasa de `alerta` (ámbar) a `declarado` (cálido). El copy es el mismo, exacto
              y obligatorio (M2.5), pero el tono estaba diciendo otra cosa: esta etiqueta
              no advierte de un problema del auto, describe DE DÓNDE VIENE el dato — lo
              aporta un usuario y no lo raspamos ni lo validamos. Esa es justo la
              distinción declarado/oficial de §1, que hasta ahora era invisible porque
              ambos registros se pintaban igual. En ámbar se leía como "cuidado con este
              auto". */}
          <Insignia tono="declarado">Referencia externa · datos no verificados</Insignia>
          {/* Sin "↗": este clic NO sale del sitio, abre el detalle local. */}
          <span className="text-[11px] font-semibold text-secundario group-hover:text-marca">
            Ver detalle · {pub.fuente}
          </span>
        </div>
      </div>
    </Link>
  );
}
