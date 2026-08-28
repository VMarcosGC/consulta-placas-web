// Detalle público de una publicación — rediseño mobile-first (M2.7 → M2.12).
//
// Jerarquía de lectura: FOTO → PRECIO/título/CTA → ficha técnica → extras → contacto.
//   - Galería (`GaleriaAnuncio`): foto principal + miniaturas, panel flotante con el
//     detalle de la ficha que corresponde a la foto activa (exterior→carrocería,
//     interior→interiores…), y visor a pantalla completa con zoom.
//   - Ficha técnica PLANA (sin tarjetas anidadas): un encabezado por bloque + lista de
//     datos a dos columnas. Menos "recuadro", mismo detalle (M2.12).
//   - "Datos oficiales" (matrícula/multas) está en stand-by hasta resolver la fuente.
//
// Regla del proyecto: el frontend NO transforma datos; solo lee y pinta. Los campos de
// estado/condición llevan "declarado" porque la plataforma no los verifica.

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Insignia } from "@/components/BentoCard";
import { ContactoVendedor } from "@/components/ContactoVendedor";
import { CalificacionesVendedor } from "@/components/CalificacionesVendedor";
import { GaleriaAnuncio } from "@/components/GaleriaAnuncio";
import {
  listarMisPublicaciones,
  listarVehiculos,
  obtenerPublicacionDetalle,
} from "@/lib/api";
import { tieneSesion } from "@/lib/auth";
import {
  BLOQUES_FICHA,
  ESTADO_COMPONENTE_LABEL,
  colorCompletitud,
  fichaIncompleta,
  fichaPendiente,
  tonoEstadoComponente,
  type FilaFicha,
} from "@/lib/ficha";
import { precioNum } from "@/lib/precio";
import { antiguedadDe } from "@/lib/antiguedad";
import {
  ApiError,
  FichaSalida,
  PublicacionDetalle,
  Vehiculo,
} from "@/types/api";

// `v` llega tipado `number` pero el backend lo manda como string decimal; se
// normaliza con `precioNum` antes de formatear (ver src/lib/precio.ts).
function precioFmt(v: number | string | null | undefined): string {
  const n = precioNum(v);
  if (n == null) return "Consultar";
  return `$${n.toLocaleString("es-EC", { maximumFractionDigits: 0 })}`;
}

function tituloVehiculo(p: PublicacionDetalle): string {
  if (p.titulo) return p.titulo;
  const partes = [p.marca, p.modelo, p.anio].filter(Boolean);
  return partes.length ? partes.join(" ") : "Vehículo en venta";
}

// ── Ficha técnica (plana: encabezado + lista a dos columnas, sin tarjetas) ───
// Menos "recuadro", mismo detalle. Las filas de cada bloque salen del helper único
// `BLOQUES_FICHA` (src/lib/ficha.ts), que también alimenta el panel por foto.

function FilaDato({ fila }: { fila: FilaFicha }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-borde-suave py-2">
      <dt className="text-sm text-secundario">
        {fila.etiqueta}
        {fila.sensible && (
          <span className="ml-1.5 align-middle text-[10px] uppercase tracking-wide text-declarado-texto">
            declarado
          </span>
        )}
      </dt>
      <dd className="text-right text-sm font-semibold text-tinta">
        {"estado" in fila ? (
          <Insignia tono={tonoEstadoComponente(fila.estado)}>
            {ESTADO_COMPONENTE_LABEL[fila.estado]}
          </Insignia>
        ) : (
          fila.valor
        )}
      </dd>
    </div>
  );
}

// Ficha técnica como PESTAÑAS: una fila horizontal de botones (uno por bloque con
// datos + "Extras"); al tocar un botón, el recuadro de abajo muestra ESE bloque y va
// cambiando según el botón. Tocar el botón activo cierra el recuadro.
// Nombre corto para los botones de pestaña (el `titulo` largo queda para el aria).
const FICHA_TAB_CORTO: Record<string, string> = {
  motor_suspension: "Motor",
  carroceria: "Exterior",
  interiores: "Interior",
  extras: "Extras",
};

function FichaTecnica({ ficha }: { ficha: FichaSalida }) {
  const tabs: {
    clave: string;
    titulo: string;
    corto: string;
    icono: string;
    filas: FilaFicha[];
    extras: { nombre: string; detalle?: string | null }[];
  }[] = [];
  for (const b of BLOQUES_FICHA) {
    const filas = b.filas(ficha[b.clave]);
    if (filas.length)
      tabs.push({
        clave: b.clave,
        titulo: b.titulo,
        corto: FICHA_TAB_CORTO[b.clave] ?? b.titulo,
        icono: b.icono,
        filas,
        extras: [],
      });
  }
  if (ficha.extras.length > 0) {
    tabs.push({
      clave: "extras",
      titulo: "Extras",
      corto: "Extras",
      icono: "✨",
      filas: [],
      extras: ficha.extras,
    });
  }

  // Primer botón abierto por defecto. `null` = recuadro cerrado.
  const [activo, setActivo] = useState<string | null>(tabs[0]?.clave ?? null);
  const abierto = tabs.find((t) => t.clave === activo) ?? null;

  return (
    <section className="mt-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-tinta">Ficha técnica</h2>
        {fichaIncompleta(ficha.completitud) ? (
          <Insignia tono="neutro">Ficha incompleta</Insignia>
        ) : (
          <BarraCompletitud pct={ficha.completitud} />
        )}
      </div>

      {tabs.length === 0 ? (
        <p className="rounded-2xl border border-borde bg-superficie p-6 text-sm text-secundario">
          El vendedor aún no cargó los detalles de motor, carrocería ni interiores.
          Puedes pedírselos al contactarlo.
        </p>
      ) : (
        <>
          {/* Botones horizontales (scroll en celular). El activo va en la píldora
              `--oscuro` (sólido inversor); el resto, contorno. */}
          <div role="tablist" className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tabs.map((t) => {
              const on = t.clave === activo;
              return (
                <button
                  key={t.clave}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  aria-expanded={on}
                  onClick={() => setActivo(on ? null : t.clave)}
                  aria-label={t.titulo}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
                    on
                      ? "bg-oscuro text-superficie shadow-sm"
                      : "border border-borde-fuerte bg-superficie text-secundario hover:bg-superficie-tenue"
                  }`}
                >
                  <span aria-hidden>{t.icono}</span>
                  {t.corto}
                </button>
              );
            })}
          </div>

          {/* Recuadro: cambia con el botón. `key` fuerza el re-montaje → la animación
              se repite al cambiar de pestaña. */}
          {abierto && (
            <div
              key={abierto.clave}
              role="tabpanel"
              className="animate-fade-in-up mt-3 rounded-2xl border border-borde bg-superficie p-4 sombra-tarjeta"
            >
              {abierto.clave === "extras" ? (
                <ul className="flex flex-wrap gap-2">
                  {abierto.extras.map((e, i) => (
                    <li
                      key={i}
                      className="rounded-full border border-borde bg-superficie-tenue px-3 py-1 text-xs"
                    >
                      <span className="font-semibold text-tinta">{e.nombre}</span>
                      {e.detalle && <span className="text-secundario"> — {e.detalle}</span>}
                    </li>
                  ))}
                </ul>
              ) : (
                <dl className="sm:grid sm:grid-cols-2 sm:gap-x-10">
                  {abierto.filas.map((f, i) => (
                    <FilaDato key={i} fila={f} />
                  ))}
                </dl>
              )}
              <p className="mt-3 text-[11px] text-secundario">
                El estado y la condición los declara el vendedor; la plataforma no los verifica.
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function BarraCompletitud({ pct }: { pct: number }) {
  const seguro = Math.max(0, Math.min(100, Math.round(pct)));
  return (
    <div className="w-full max-w-xs">
      <div className="mb-1 flex items-center justify-between text-xs text-secundario">
        <span>Ficha completada</span>
        <span className="font-semibold text-secundario">{seguro}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-borde">
        <div
          className={`h-full rounded-full transition-all ${colorCompletitud(seguro)}`}
          style={{ width: `${seguro}%` }}
        />
      </div>
    </div>
  );
}

// ── Página ──────────────────────────────────────────────────────────────────

export default function PublicacionDetallePage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);

  const [pub, setPub] = useState<PublicacionDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [noEncontrada, setNoEncontrada] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // ¿El visitante es el dueño? Solo entonces se muestra el CTA de la ficha.
  // La página es pública: se resuelve en el cliente y solo si hay sesión.
  const [esMia, setEsMia] = useState(false);
  // ¿Este anuncio corresponde a un vehículo del garage del dueño? (M2.10)
  // OJO PRIVACIDAD: el backend NUNCA envía `vehiculo_id` en la vista pública. El vínculo
  // se infiere en el cliente cruzando la placa contra MI garage, y solo si soy el dueño;
  // a un comprador anónimo jamás se le muestra este chip.
  const [viveEnGarage, setViveEnGarage] = useState(false);

  useEffect(() => {
    let activo = true;
    (async () => {
      if (!Number.isInteger(id) || id <= 0) {
        if (activo) {
          setNoEncontrada(true);
          setCargando(false);
        }
        return;
      }
      try {
        const detalle = await obtenerPublicacionDetalle(id);
        if (activo) setPub(detalle);
      } catch (err) {
        if (!activo) return;
        if (err instanceof ApiError && err.status === 404) {
          setNoEncontrada(true);
        } else {
          setError("No pudimos cargar la publicación. Intenta recargar.");
        }
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, [id]);

  useEffect(() => {
    if (!tieneSesion() || !Number.isInteger(id) || id <= 0) return;
    let activo = true;
    (async () => {
      try {
        // El garage solo hace falta para el chip "Vive en tu garage": si falla, el resto
        // (esMia y sus CTAs) igual funciona, por eso su catch propio.
        const [mias, vehiculos] = await Promise.all([
          listarMisPublicaciones(),
          listarVehiculos().catch(() => [] as Vehiculo[]),
        ]);
        if (!activo) return;
        const mia = mias.find((p) => p.id === id);
        setEsMia(mia != null);
        // Solo el dueño; cruce por placa (mismo patrón que mi-garage, sin exponer ids).
        if (mia) setViveEnGarage(vehiculos.some((v) => v.placa === mia.placa));
      } catch {
        // Silencioso: el CTA del dueño es un extra, no puede romper el detalle público.
      }
    })();
    return () => {
      activo = false;
    };
  }, [id]);

  const pctFicha = pub?.ficha?.completitud ?? pub?.completitud_ficha ?? 0;
  const antiguedadDetalle = pub ? antiguedadDe(pub) : null;

  return (
    <div className="mx-auto max-w-5xl px-6 py-6 sm:py-10">
      <Link href="/marketplace" className="text-sm text-secundario hover:text-tinta">
        ← Volver al marketplace
      </Link>

      {cargando && (
        // Esqueleto con la forma real del detalle: galería, precio, título/placa y
        // dos secciones. Sin spinner. `animate-pulse` es de Tailwind.
        <div className="mt-6 animate-pulse space-y-6" aria-hidden>
          <div className="aspect-[16/9] w-full rounded-2xl bg-superficie-tenue" />
          <div className="space-y-3">
            <div className="h-10 w-40 rounded-lg bg-superficie-tenue" />
            <div className="h-6 w-2/3 rounded bg-superficie-tenue" />
            <div className="h-4 w-32 rounded bg-superficie-tenue" />
          </div>
          <div className="h-40 rounded-2xl bg-superficie-tenue" />
          <div className="h-32 rounded-2xl bg-superficie-tenue" />
        </div>
      )}

      {noEncontrada && !cargando && (
        <div className="mt-6 rounded-2xl border border-borde bg-superficie p-10 text-center sombra-tarjeta">
          <p className="text-lg font-semibold text-secundario">No encontramos esta publicación.</p>
          <p className="mt-1 text-secundario">Puede que ya no esté disponible o se haya pausado.</p>
          <Link
            href="/marketplace"
            className="mt-4 inline-flex rounded-full bg-oscuro px-5 py-2.5 text-sm font-semibold text-superficie transition hover:bg-oscuro-suave"
          >
            Ver otras publicaciones
          </Link>
        </div>
      )}

      {error && !cargando && (
        <p className="mt-6 rounded-xl border border-error bg-error-tinte p-4 text-error">
          {error}
        </p>
      )}

      {pub && !cargando && (
        <>
          {/* 1. FOTO: lo primero que se ve. La galería trae el panel por foto y el
              visor con zoom. */}
          <div className="mt-4">
            <GaleriaAnuncio
              fotos={pub.fotos}
              ficha={pub.ficha}
              titulo={tituloVehiculo(pub)}
            />
          </div>

          {/* 2. PRECIO + título + acciones: entra sin scroll en un celular. Ritmo
              vertical parejo: cada sub-bloque a la misma distancia del anterior. */}
          <header className="mt-5">
            <div className="flex flex-wrap items-center gap-1.5">
              {pub.plan === "premium" && (
                <span className="inline-flex items-center rounded-full bg-marca px-2.5 py-0.5 text-xs font-black text-superficie">
                  ★ Premium
                </span>
              )}
              {pub.sello_mecanica && (
                <Insignia tono="ok">
                  🔧 Revisado por {pub.sello_mecanica.nombre}
                </Insignia>
              )}
              {pub.verificado && <Insignia tono="ok">✓ Verificado por la plataforma</Insignia>}
              {fichaIncompleta(pctFicha) && <Insignia tono="neutro">Ficha incompleta</Insignia>}
              {/* Popularidad: solo aparece si cruzó el umbral. Sin votos NO se muestra
                  nada (no es "nota baja", es la línea base). */}
              {(pub.total_favoritos ?? 0) >= 5 && (
                <span className="inline-flex items-center rounded-full bg-marca px-2.5 py-0.5 text-xs font-black text-superficie">
                  🔥 Popular
                </span>
              )}
              {/* Solo el dueño ve este chip; nunca un comprador anónimo. */}
              {esMia && viveEnGarage && <Insignia tono="info">🚗 Vive en tu garage</Insignia>}
            </div>
            {(pub.total_favoritos ?? 0) > 0 && (
              <p className="mt-2 text-sm text-secundario">
                ♥ A {pub.total_favoritos}{" "}
                {pub.total_favoritos === 1 ? "persona le" : "personas les"} gustó este auto
              </p>
            )}

            <p className="mt-4 text-4xl font-black leading-none text-tinta sm:text-5xl">
              {precioFmt(pub.precio_usd)}
            </p>
            <h1 className="mt-2 text-xl font-bold text-tinta sm:text-2xl">
              {tituloVehiculo(pub)}
            </h1>
            {/* Identidad del auto solo si el título es personalizado: el título
                derivado ("KIA K5 2022") ya dice marca/modelo/año, así que repetirlo
                en la meta sería ruido. Con título custom sí la mostramos acá. */}
            {pub.titulo && (pub.marca || pub.modelo || pub.anio != null) && (
              <p className="mt-1 text-sm text-secundario">
                {[pub.marca, pub.modelo, pub.anio != null ? String(pub.anio) : null]
                  .filter(Boolean)
                  .join(" ")}
              </p>
            )}
            <p className="mt-1 font-mono text-sm tracking-widest text-secundario">{pub.placa}</p>

            {/* Meta escaneable: km · ciudad, sin etiquetas ("Ciudad:"/"Kilometraje:")
                que solo repetían la palabra. El año no va acá: ya está en el título
                (o en la línea de identidad de arriba si el título es custom). */}
            {(pub.kilometraje != null || pub.ciudad) && (
              <p className="mt-3 text-sm text-secundario">
                {[
                  pub.kilometraje != null
                    ? `${pub.kilometraje.toLocaleString("es-EC")} km`
                    : null,
                  pub.ciudad || null,
                ]
                  .filter(Boolean)
                  .join("   ·   ")}
              </p>
            )}

            {/* Antigüedad del anuncio (migración 0026): "Publicado hace N semanas".
                Es solo recencia, en el tono neutro de la meta. */}
            {antiguedadDetalle && (
              <p className="mt-1 text-xs text-secundario">
                {antiguedadDetalle.texto}
                {antiguedadDetalle.vencido && esMia && (
                  <span className="font-semibold text-tinta"> · renuévalo para volver al frente</span>
                )}
              </p>
            )}

            {/* Fila de acciones, visible sin scroll en celular (M2.7). Para el comprador,
                "Contactar al vendedor" ancla a la sección de contacto del final: la
                revelación del teléfono vive después de la evidencia (la ficha). El único
                `--accion` de la pantalla es "Ver teléfono". El dueño ve "Editar mi
                anuncio". (La consulta de placa / datos oficiales quedó en stand-by.) */}
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              {!esMia && (
                <a
                  href="#contacto-vendedor"
                  className="rounded-full bg-oscuro px-6 py-3 text-center text-sm font-semibold text-superficie shadow-sm transition hover:bg-oscuro-suave"
                >
                  Contactar al vendedor
                </a>
              )}
              {esMia && (
                <Link
                  href="/marketplace/mis-publicaciones"
                  className="rounded-full border border-borde-fuerte bg-superficie px-6 py-3 text-center text-sm font-semibold text-secundario transition hover:bg-superficie-tenue"
                >
                  Editar mi anuncio
                </Link>
              )}
            </div>

            {pub.descripcion && (
              <p className="mt-4 whitespace-pre-line text-secundario">{pub.descripcion}</p>
            )}
          </header>

          {/* CTA persistente del dueño (M2.5): solo lo ve él, y solo si falta ficha. */}
          {esMia && fichaPendiente(pctFicha) && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-borde bg-superficie-tenue p-4">
              <div>
                <p className="text-sm font-semibold text-tinta">
                  Completa tu ficha ({pctFicha} %)
                </p>
                <p className="mt-0.5 text-sm text-secundario">
                  Es gratis y los anuncios con ficha completa generan más confianza.
                </p>
              </div>
              <Link
                href="/marketplace/mis-publicaciones"
                className="shrink-0 rounded-full bg-accion px-5 py-2.5 text-sm font-semibold text-superficie shadow-sm hover:opacity-90"
              >
                Completar ahora
              </Link>
            </div>
          )}

          {/* 3. FICHA TÉCNICA: lo que declara el vendedor. */}
          {pub.ficha ? (
            <FichaTecnica ficha={pub.ficha} />
          ) : (
            <section className="mt-8">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-tinta">Ficha técnica</h2>
                <Insignia tono="neutro">Ficha incompleta</Insignia>
              </div>
              <div className="rounded-2xl border border-borde bg-superficie p-8 text-center sombra-tarjeta">
                <p className="font-medium text-tinta">Todavía sin ficha técnica</p>
                <p className="mx-auto mt-1 max-w-md text-sm text-secundario">
                  El vendedor aún no cargó los detalles del motor, la carrocería ni los
                  interiores. Puedes pedírselos al contactarlo.
                </p>
              </div>
            </section>
          )}

          {/* La sección "Datos oficiales" (matrícula / multas desde ANT-AMT) quedó en
              stand-by: pendiente de resolver de dónde salen los datos de forma estable.
              Cuando vuelva, va acá, después de la ficha. */}

          {/* EXTRAS: historial documentado (argumento premium). */}
          {pub.mantenimientos && pub.mantenimientos.total > 0 && (
            <div className="mt-6 rounded-2xl border border-marca bg-marca-tinte/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-marca">
                Historial documentado
              </p>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-secundario">
                <span>
                  <b className="text-tinta">{pub.mantenimientos.total}</b> mantenimiento
                  {pub.mantenimientos.total === 1 ? "" : "s"} registrado
                  {pub.mantenimientos.total === 1 ? "" : "s"}
                </span>
                {pub.mantenimientos.ultimo_kilometraje != null && (
                  <span>
                    Último:{" "}
                    <b className="text-tinta">
                      {pub.mantenimientos.ultimo_kilometraje.toLocaleString("es-EC")} km
                    </b>
                  </span>
                )}
                {pub.mantenimientos.ultima_fecha && <span>· {pub.mantenimientos.ultima_fecha}</span>}
              </div>
            </div>
          )}

          {/* 6. CONTACTO: el último paso de la decisión, después de la evidencia (la
              ficha). El botón compacto del encabezado ancla aquí. El teléfono NO
              viaja en el detalle: se revela bajo acción explícita (ver ContactoVendedor).
              scroll-mt-24 deja aire para el header sticky al anclar. */}
          <section id="contacto-vendedor" className="mt-8 scroll-mt-24">
            <h2 className="text-xl font-bold text-tinta">Contactar al vendedor</h2>
            <ContactoVendedor publicacionId={pub.id} esMia={esMia} />
            {pub.vendedor_id != null && (
              <CalificacionesVendedor
                vendedorId={pub.vendedor_id}
                publicacionId={pub.id}
                esMia={esMia}
              />
            )}
          </section>
        </>
      )}
    </div>
  );
}
