// Detalle público de una publicación — rediseño mobile-first (M2.7).
//
// Jerarquía de lectura: FOTO → PRECIO/título/CTA → ficha técnica → extras → contacto.
//   - Galería arriba, con swipe horizontal en móvil (scroll-snap, sin librerías).
//   - Bloque de precio + título + acciones visible sin scroll en un celular.
//   - Ficha técnica en tarjetas por bloque, cada una con su ícono.
//   - "Datos oficiales" (matrícula/multas de la placa) está en stand-by hasta resolver
//     de dónde salen esos datos de forma estable; por eso el detalle no la muestra.
//
// Regla del proyecto: el frontend NO transforma datos; solo lee y pinta lo que el backend
// consolida. Los estados/booleanos declarativos llevan "declarado por el vendedor" porque
// la plataforma no los verifica.

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { BentoCard, Insignia } from "@/components/BentoCard";
import { ContactoVendedor } from "@/components/ContactoVendedor";
import {
  listarMisPublicaciones,
  listarVehiculos,
  obtenerPublicacionDetalle,
} from "@/lib/api";
import { tieneSesion } from "@/lib/auth";
import {
  COMBUSTIBLE_LABEL,
  ESTADO_COMPONENTE_LABEL,
  ESTADO_PINTURA_LABEL,
  MATERIAL_ASIENTOS_LABEL,
  TIPO_CARROCERIA_LABEL,
  TRACCION_LABEL,
  TRANSMISION_LABEL,
  colorCompletitud,
  fichaIncompleta,
  fichaPendiente,
  tonoEstadoComponente,
} from "@/lib/ficha";
import { precioNum } from "@/lib/precio";
import { antiguedadDe } from "@/lib/antiguedad";
import {
  ApiError,
  EstadoComponente,
  FichaSalida,
  FotoSalida,
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

// ── Fila de dato de la ficha ────────────────────────────────────────────────
// Los campos declarativos sensibles llevan la etiqueta "declarado por el vendedor".

function Fila({
  etiqueta,
  children,
  sensible,
}: {
  etiqueta: string;
  children: React.ReactNode;
  sensible?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-borde-suave py-2 last:border-b-0">
      <dt className="text-sm text-secundario">
        {etiqueta}
        {sensible && (
          <span className="ml-1.5 align-middle text-[10px] font-medium uppercase tracking-wide text-declarado-texto">
            declarado por el vendedor
          </span>
        )}
      </dt>
      <dd className="text-right text-sm font-semibold text-tinta">{children}</dd>
    </div>
  );
}

function ValorEstado({ estado }: { estado: EstadoComponente }) {
  return <Insignia tono={tonoEstadoComponente(estado)}>{ESTADO_COMPONENTE_LABEL[estado]}</Insignia>;
}

function ValorBool({ valor }: { valor: boolean }) {
  return <span>{valor ? "Sí" : "No"}</span>;
}

// Un bloque de la ficha, con su ícono. Si no tiene ningún dato, no se renderiza.
function BloqueFicha({
  titulo,
  icono,
  vacio,
  children,
}: {
  titulo: string;
  icono: string;
  vacio: boolean;
  children: React.ReactNode;
}) {
  if (vacio) return null;
  return (
    <BentoCard
      titulo={titulo}
      badge={
        <span className="text-lg" aria-hidden>
          {icono}
        </span>
      }
    >
      <dl>{children}</dl>
    </BentoCard>
  );
}

// ── Galería (arriba del todo; swipe horizontal en móvil) ────────────────────

function Galeria({ fotos, titulo }: { fotos: FotoSalida[]; titulo: string }) {
  const [activa, setActiva] = useState(0);

  if (fotos.length === 0) {
    return (
      <div className="flex aspect-[16/10] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-borde bg-superficie-tenue text-secundario sm:aspect-[16/8]">
        <span className="text-5xl" aria-hidden>
          🚗
        </span>
        <span className="text-xs font-medium">El vendedor aún no subió fotos</span>
      </div>
    );
  }

  const principal = fotos[Math.min(activa, fotos.length - 1)];
  return (
    <div>
      {/* Móvil: carrusel con scroll-snap (swipe nativo, sin librerías).
          Desde sm: una foto principal grande y las miniaturas debajo. */}
      {/* tabIndex + role: el contenedor con scroll debe poder recorrerse con teclado. */}
      <div
        tabIndex={0}
        role="group"
        aria-label={`Fotos de ${titulo}: desliza para verlas`}
        className="-mx-6 flex snap-x snap-mandatory gap-2 overflow-x-auto px-6 pb-2 sm:hidden"
      >
        {fotos.map((f, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={f.id}
            src={f.url}
            alt={`Foto ${i + 1} de ${titulo}`}
            className="aspect-[4/3] w-[85%] shrink-0 snap-center rounded-2xl object-cover"
          />
        ))}
      </div>

      <div className="hidden sm:block">
        <div className="overflow-hidden rounded-2xl border border-borde bg-superficie-tenue sombra-tarjeta">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={principal.url}
            alt={`Foto de ${titulo}`}
            className="aspect-[16/9] w-full object-cover"
          />
        </div>
        {fotos.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {fotos.map((f, i) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiva(i)}
                className={`h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                  i === activa ? "border-marca" : "border-transparent hover:border-borde-fuerte"
                }`}
                aria-label={`Ver foto ${i + 1} de ${fotos.length}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.url} alt={`Miniatura ${i + 1}`} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {fotos.length > 1 && (
        <p className="mt-2 text-center text-[11px] text-secundario sm:hidden">
          Desliza para ver las {fotos.length} fotos
        </p>
      )}
    </div>
  );
}

// ── Ficha técnica ───────────────────────────────────────────────────────────

function FichaTecnica({ ficha }: { ficha: FichaSalida }) {
  const ms = ficha.motor_suspension;
  const ca = ficha.carroceria;
  const it = ficha.interiores;
  const tieneAlgo = ms != null || ca != null || it != null || ficha.extras.length > 0;

  return (
    <section className="mt-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-tinta">Ficha técnica</h2>
        {fichaIncompleta(ficha.completitud) ? (
          <Insignia tono="neutro">Ficha incompleta</Insignia>
        ) : (
          <BarraCompletitud pct={ficha.completitud} />
        )}
      </div>

      {!tieneAlgo ? (
        <div className="rounded-2xl border border-borde bg-superficie p-8 text-center sombra-tarjeta">
          <p className="font-medium text-tinta">Todavía sin ficha técnica</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-secundario">
            El vendedor aún no cargó los detalles del motor, la carrocería ni los
            interiores. Puedes pedírselos al contactarlo.
          </p>
        </div>
      ) : (
        <>
          <p className="mb-4 text-xs text-secundario">
            Los datos de estado y condición son declarados por el vendedor; la plataforma no
            los verifica.
          </p>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <BloqueFicha titulo="Motor y suspensión" icono="⚙️" vacio={ms == null}>
              {ms?.combustible && (
                <Fila etiqueta="Combustible">{COMBUSTIBLE_LABEL[ms.combustible]}</Fila>
              )}
              {ms?.cilindraje_cc != null && (
                <Fila etiqueta="Cilindraje">{ms.cilindraje_cc.toLocaleString("es-EC")} cc</Fila>
              )}
              {ms?.transmision && (
                <Fila etiqueta="Transmisión">{TRANSMISION_LABEL[ms.transmision]}</Fila>
              )}
              {ms?.traccion && <Fila etiqueta="Tracción">{TRACCION_LABEL[ms.traccion]}</Fila>}
              {ms?.estado_motor && (
                <Fila etiqueta="Estado del motor" sensible>
                  <ValorEstado estado={ms.estado_motor} />
                </Fila>
              )}
              {ms?.estado_suspension && (
                <Fila etiqueta="Estado de la suspensión" sensible>
                  <ValorEstado estado={ms.estado_suspension} />
                </Fila>
              )}
              {ms?.fugas_visibles != null && (
                <Fila etiqueta="Fugas visibles" sensible>
                  <ValorBool valor={ms.fugas_visibles} />
                </Fila>
              )}
              {ms?.cambios_recientes && (
                <Fila etiqueta="Cambios recientes">{ms.cambios_recientes}</Fila>
              )}
              {ms?.observaciones && <Fila etiqueta="Observaciones">{ms.observaciones}</Fila>}
            </BloqueFicha>

            <BloqueFicha titulo="Carrocería" icono="🚙" vacio={ca == null}>
              {ca?.tipo && <Fila etiqueta="Tipo">{TIPO_CARROCERIA_LABEL[ca.tipo]}</Fila>}
              {ca?.numero_puertas != null && <Fila etiqueta="Puertas">{ca.numero_puertas}</Fila>}
              {ca?.color && <Fila etiqueta="Color">{ca.color}</Fila>}
              {ca?.estado_pintura && (
                <Fila etiqueta="Estado de la pintura" sensible>
                  {ESTADO_PINTURA_LABEL[ca.estado_pintura]}
                </Fila>
              )}
              {ca?.choques_reparados != null && (
                <Fila etiqueta="Choques reparados" sensible>
                  <ValorBool valor={ca.choques_reparados} />
                </Fila>
              )}
              {ca?.oxido_visible != null && (
                <Fila etiqueta="Óxido visible" sensible>
                  <ValorBool valor={ca.oxido_visible} />
                </Fila>
              )}
              {ca?.estado_general && (
                <Fila etiqueta="Estado general" sensible>
                  <ValorEstado estado={ca.estado_general} />
                </Fila>
              )}
              {ca?.observaciones && <Fila etiqueta="Observaciones">{ca.observaciones}</Fila>}
            </BloqueFicha>

            <BloqueFicha titulo="Interiores" icono="🪑" vacio={it == null}>
              {it?.material_asientos && (
                <Fila etiqueta="Material de asientos">
                  {MATERIAL_ASIENTOS_LABEL[it.material_asientos]}
                </Fila>
              )}
              {it?.estado_asientos && (
                <Fila etiqueta="Estado de asientos" sensible>
                  <ValorEstado estado={it.estado_asientos} />
                </Fila>
              )}
              {it?.aire_acondicionado != null && (
                <Fila etiqueta="Aire acondicionado" sensible>
                  <ValorBool valor={it.aire_acondicionado} />
                </Fila>
              )}
              {it?.sistema_audio && <Fila etiqueta="Sistema de audio">{it.sistema_audio}</Fila>}
              {it?.estado_tablero && (
                <Fila etiqueta="Estado del tablero" sensible>
                  <ValorEstado estado={it.estado_tablero} />
                </Fila>
              )}
              {it?.observaciones && <Fila etiqueta="Observaciones">{it.observaciones}</Fila>}
            </BloqueFicha>

            {ficha.extras.length > 0 && (
              <BentoCard
                titulo="Extras"
                badge={
                  <span className="text-lg" aria-hidden>
                    ✨
                  </span>
                }
              >
                <ul className="space-y-2">
                  {ficha.extras.map((e, i) => (
                    <li key={i} className="rounded-xl bg-superficie-tenue px-3 py-2">
                      <p className="text-sm font-semibold text-tinta">{e.nombre}</p>
                      {e.detalle && <p className="text-xs text-secundario">{e.detalle}</p>}
                    </li>
                  ))}
                </ul>
              </BentoCard>
            )}
          </div>
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
            className="mt-4 inline-flex rounded-full bg-oscuro px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-oscuro-suave"
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
          {/* 1. FOTO: lo primero que se ve. */}
          <div className="mt-4">
            <Galeria fotos={pub.fotos} titulo={tituloVehiculo(pub)} />
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
              {pub.verificado && <Insignia tono="ok">✓ Verificado por la plataforma</Insignia>}
              {fichaIncompleta(pctFicha) && <Insignia tono="neutro">Ficha incompleta</Insignia>}
              {/* Solo el dueño ve este chip; nunca un comprador anónimo. */}
              {esMia && viveEnGarage && <Insignia tono="info">🚗 Vive en tu garage</Insignia>}
            </div>

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
                  className="rounded-full bg-oscuro px-6 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-oscuro-suave"
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
          </section>
        </>
      )}
    </div>
  );
}
