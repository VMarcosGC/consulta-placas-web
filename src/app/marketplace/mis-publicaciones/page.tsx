// Mis publicaciones del marketplace. El dueño ve sus autos publicados, su estado de
// verificación, y puede SOLICITAR la verificación "Verificado por la plataforma"
// (cobra tokens) o eliminar la publicación. Requiere sesión.

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  eliminarPublicacion,
  listarMisPublicaciones,
  publicarBorrador,
  solicitarVerificacion,
} from "@/lib/api";
import { tieneSesion } from "@/lib/auth";
import { AvisoContactoVendedor } from "@/components/AvisoContactoVendedor";
import { FichaEditor } from "@/components/FichaEditor";
import { GaleriaFotosEditor } from "@/components/GaleriaFotosEditor";
import {
  UMBRAL_FICHA_PUBLICACION,
  fichaPendiente,
  puedePublicar,
} from "@/lib/ficha";
import { ApiError, EstadoVerificacion, PublicacionInterna } from "@/types/api";

// Costo referencial (lo cobra el backend; aquí solo para el rótulo del botón).
const TOKENS_VERIFICACION = 80;

const VERIFICACION_BADGE: Record<EstadoVerificacion, { texto: string; clase: string }> = {
  no_verificado: { texto: "Sin verificar", clase: "bg-slate-100 text-slate-600" },
  pendiente: { texto: "En revisión", clase: "bg-sky-100 text-sky-800" },
  verificado: { texto: "✓ Verificado", clase: "bg-emerald-100 text-emerald-800" },
  rechazado: { texto: "Verificación rechazada", clase: "bg-rose-100 text-rose-800" },
};

export default function MisPublicacionesPage() {
  const router = useRouter();
  const [pubs, setPubs] = useState<PublicacionInterna[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [procesando, setProcesando] = useState<number | null>(null);
  // Id de la publicación cuya ficha técnica está abierta para editar (null = ninguna).
  const [fichaAbierta, setFichaAbierta] = useState<number | null>(null);
  const [fotosAbierta, setFotosAbierta] = useState<number | null>(null);
  // % de ficha recién guardado por el editor, por publicación. Pisa al valor que trajo el
  // listado para que el CTA "Completa tu ficha" baje en vivo sin recargar la página.
  const [completitudes, setCompletitudes] = useState<Record<number, number>>({});

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setPubs(await listarMisPublicaciones());
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.push("/login?next=/marketplace/mis-publicaciones");
        return;
      }
      setError("No pudimos cargar tus publicaciones. Intenta recargar.");
    } finally {
      setCargando(false);
    }
  }, [router]);

  useEffect(() => {
    if (!tieneSesion()) {
      router.push("/login?next=/marketplace/mis-publicaciones");
      return;
    }
    cargar();
  }, [router, cargar]);

  async function verificar(id: number) {
    setProcesando(id);
    setError(null);
    try {
      const actualizada = await solicitarVerificacion(id);
      setPubs((prev) => prev.map((p) => (p.id === id ? actualizada : p)));
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 402) {
          setError("No te alcanzan los tokens para la verificación. Recarga para continuar.");
        } else {
          setError(err.message);
        }
      } else {
        setError("No se pudo solicitar la verificación.");
      }
    } finally {
      setProcesando(null);
    }
  }

  // Publica un borrador. El backend revalida el umbral (422 con copy accionable) y, si
  // el plan es premium, cobra los tokens aquí — no al crear el borrador.
  async function publicar(id: number) {
    setProcesando(id);
    setError(null);
    try {
      const actualizada = await publicarBorrador(id);
      setPubs((prev) => prev.map((p) => (p.id === id ? actualizada : p)));
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 402) {
          setError(
            `${err.message}. Puedes pasar el anuncio a plan Light o recargar tokens.`
          );
        } else {
          setError(err.message || "No pudimos publicar el anuncio.");
        }
      } else {
        setError("No pudimos publicar el anuncio.");
      }
    } finally {
      setProcesando(null);
    }
  }

  async function borrar(id: number) {
    if (!confirm("¿Eliminar esta publicación?")) return;
    setProcesando(id);
    try {
      await eliminarPublicacion(id);
      setPubs((prev) => prev.filter((p) => p.id !== id));
    } catch {
      setError("No se pudo eliminar.");
    } finally {
      setProcesando(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <Link href="/marketplace" className="text-sm text-slate-500 hover:text-slate-900">
        ← Volver al marketplace
      </Link>
      <header className="mt-3 mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Mis publicaciones</h1>
          <p className="mt-1 text-slate-500">Tus autos publicados y su estado de verificación.</p>
        </div>
        <Link
          href="/marketplace/publicar"
          className="rounded-full bg-brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
        >
          + Publicar
        </Link>
      </header>

      {/* Contacto de vendedor (M5): publicar sin número deja al comprador sin cómo
          escribir, así que el estado se ve donde el vendedor administra sus anuncios. */}
      <AvisoContactoVendedor />

      {cargando && <p className="text-slate-500">Cargando…</p>}
      {error && (
        <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </p>
      )}

      {!cargando && pubs.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center sombra-tarjeta">
          <p className="text-lg font-semibold text-slate-700">Todavía no publicas ningún auto.</p>
          <Link
            href="/marketplace/publicar"
            className="mt-4 inline-flex rounded-full bg-brand-gradient px-5 py-2.5 text-sm font-semibold text-white"
          >
            Publicar mi auto
          </Link>
        </div>
      )}

      <div className="space-y-4">
        {pubs.map((p) => {
          const titulo =
            p.titulo || [p.marca, p.modelo, p.anio].filter(Boolean).join(" ") || "Sin datos";
          const ocupado = procesando === p.id;
          const esPremium = p.plan === "premium";
          const badge = VERIFICACION_BADGE[p.estado_verificacion];
          const puedeSolicitar =
            esPremium &&
            (p.estado_verificacion === "no_verificado" || p.estado_verificacion === "rechazado");
          const fichaVisible = fichaAbierta === p.id;
          const fotosVisible = fotosAbierta === p.id;
          const pct = completitudes[p.id] ?? p.completitud_ficha ?? 0;
          const faltaFicha = fichaPendiente(pct);
          const esBorrador = p.estado === "borrador";
          const listoParaPublicar = puedePublicar(pct);
          return (
            <div key={p.id} className="space-y-3">
              <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sombra-tarjeta sm:flex-row sm:items-center">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {esPremium ? (
                      <span className="rounded-full bg-marca px-2 py-0.5 text-xs font-black text-white">
                        ★ Premium
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                        Light
                      </span>
                    )}
                    <span className="font-mono text-xs tracking-widest text-slate-500">{p.placa}</span>
                    {/* Borrador: el vendedor debe saber de un vistazo que NADIE lo ve. */}
                    {esBorrador && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                        Borrador · no publicado
                      </span>
                    )}
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge.clase}`}>
                      {badge.texto}
                    </span>
                    {!faltaFicha && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                        ✓ Ficha completa
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-lg font-bold text-slate-900">{titulo}</p>
                  <p className="text-sm text-slate-600">${p.precio_usd.toLocaleString("es-EC")}</p>

                  {/* CTA persistente (M2.5): mientras la ficha no esté al 100 %, el dueño
                      ve cuánto le falta y entra a completarla de un clic. No bloquea nada. */}
                  {faltaFicha && !fichaVisible && (
                    <button
                      type="button"
                      onClick={() => setFichaAbierta(p.id)}
                      className="mt-2 inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100"
                    >
                      Completa tu ficha ({pct} %)
                      <span aria-hidden>→</span>
                    </button>
                  )}

                  {/* Acciones VISIBLES (M2.7): antes eran enlaces de texto y el vendedor no
                      encontraba cómo subir fotos sin rehacer el wizard. Ahora son botones
                      con el mismo peso que las demás acciones de la tarjeta. */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setFotosAbierta(fotosVisible ? null : p.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                        fotosVisible
                          ? "border-blue-400 bg-blue-50 text-blue-800"
                          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      📷 {fotosVisible ? "Cerrar fotos" : "Fotos"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFichaAbierta(fichaVisible ? null : p.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                        fichaVisible
                          ? "border-blue-400 bg-blue-50 text-blue-800"
                          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      📋 {fichaVisible ? "Cerrar ficha" : "Ficha técnica"}
                    </button>
                    <Link
                      href={`/marketplace/${p.id}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Ver anuncio →
                    </Link>
                  </div>
                </div>
                <div className="flex flex-row gap-2 sm:flex-col">
                  {/* Publicar el borrador: deshabilitado bajo el umbral, diciendo cuánto
                      falta (M2.8). El backend revalida igual. */}
                  {esBorrador && (
                    <button
                      onClick={() => publicar(p.id)}
                      disabled={ocupado || !listoParaPublicar}
                      title={
                        listoParaPublicar
                          ? "Publicar este anuncio en el feed"
                          : `Te falta ${UMBRAL_FICHA_PUBLICACION - pct} % de ficha para publicar`
                      }
                      className="flex-1 rounded-full bg-brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {ocupado
                        ? "…"
                        : listoParaPublicar
                          ? "Publicar anuncio"
                          : `Falta ${UMBRAL_FICHA_PUBLICACION - pct} % de ficha`}
                    </button>
                  )}
                  {puedeSolicitar && (
                    <button
                      onClick={() => verificar(p.id)}
                      disabled={ocupado}
                      className="flex-1 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {ocupado ? "…" : `Solicitar verificación · ${TOKENS_VERIFICACION} tokens`}
                    </button>
                  )}
                  {esPremium && p.estado_verificacion === "pendiente" && (
                    <span className="flex-1 rounded-full bg-sky-50 px-4 py-2 text-center text-sm font-medium text-sky-700">
                      En revisión…
                    </span>
                  )}
                  {!esPremium && (
                    <span className="flex-1 rounded-full bg-slate-50 px-4 py-2 text-center text-xs text-slate-400">
                      Hazla premium para verificar
                    </span>
                  )}
                  <button
                    onClick={() => borrar(p.id)}
                    disabled={ocupado}
                    className="rounded-full border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
              {fichaVisible && (
                <FichaEditor
                  publicacionId={p.id}
                  onCompletitud={(v) =>
                    setCompletitudes((prev) => ({ ...prev, [p.id]: v }))
                  }
                />
              )}
              {fotosVisible && <GaleriaFotosEditor publicacionId={p.id} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
