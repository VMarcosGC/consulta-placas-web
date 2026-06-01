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
  solicitarVerificacion,
} from "@/lib/api";
import { tieneSesion } from "@/lib/auth";
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
          return (
            <div
              key={p.id}
              className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sombra-tarjeta sm:flex-row sm:items-center"
            >
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {esPremium ? (
                    <span className="rounded-full bg-brand-gradient px-2 py-0.5 text-xs font-black text-white">
                      ★ Premium
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                      Light
                    </span>
                  )}
                  <span className="font-mono text-xs tracking-widest text-slate-500">{p.placa}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge.clase}`}>
                    {badge.texto}
                  </span>
                </div>
                <p className="mt-1 text-lg font-bold text-slate-900">{titulo}</p>
                <p className="text-sm text-slate-600">${p.precio_usd.toLocaleString("es-EC")}</p>
              </div>
              <div className="flex flex-row gap-2 sm:flex-col">
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
          );
        })}
      </div>
    </div>
  );
}
