// Pantalla de verificación de publicaciones premium (solo admin).
// Lista las publicaciones premium pendientes y permite marcarlas como verificadas
// o rechazadas. El acceso lo protege el backend (403 si no está en ADMIN_EMAILS);
// acá solo mostramos un aviso en ese caso.

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  listarPublicacionesPendientesVerificacion,
  verificarPublicacion,
} from "@/lib/api";
import { tieneSesion } from "@/lib/auth";
import { ApiError, PublicacionInterna } from "@/types/api";

export default function VerificacionesPage() {
  const router = useRouter();
  const [pendientes, setPendientes] = useState<PublicacionInterna[]>([]);
  const [cargando, setCargando] = useState(true);
  const [sinPermiso, setSinPermiso] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // id en proceso → para deshabilitar sus botones mientras se decide.
  const [procesando, setProcesando] = useState<number | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const lista = await listarPublicacionesPendientesVerificacion();
      setPendientes(lista);
      setSinPermiso(false);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          router.push("/login?next=/admin/verificaciones");
          return;
        }
        if (err.status === 403) {
          setSinPermiso(true);
        } else {
          setError(err.message || "No pudimos cargar la cola de verificación.");
        }
      } else {
        setError("No pudimos cargar la cola de verificación.");
      }
    } finally {
      setCargando(false);
    }
  }, [router]);

  useEffect(() => {
    if (!tieneSesion()) {
      router.push("/login?next=/admin/verificaciones");
      return;
    }
    cargar();
  }, [router, cargar]);

  async function decidir(id: number, decision: "verificado" | "rechazado") {
    setProcesando(id);
    setError(null);
    try {
      await verificarPublicacion(id, decision);
      // Sale de la cola de pendientes.
      setPendientes((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "No se pudo verificar.";
      setError(msg);
    } finally {
      setProcesando(null);
    }
  }

  if (sinPermiso) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-10">
          <p className="text-xl font-bold text-amber-800">Acceso restringido</p>
          <p className="mt-2 text-slate-600">Esta sección es solo para administradores.</p>
          <Link
            href="/marketplace"
            className="mt-6 inline-flex rounded-full bg-brand-gradient px-5 py-2.5 text-sm font-semibold text-white"
          >
            Ir al marketplace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Verificar premium</h1>
          <p className="mt-1 text-slate-500">
            Publicaciones premium esperando el sello “Verificado por la plataforma”.
          </p>
        </div>
        <button
          onClick={cargar}
          className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          ↻ Actualizar
        </button>
      </header>

      {cargando && <p className="text-slate-500">Cargando…</p>}
      {error && (
        <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </p>
      )}

      {!cargando && pendientes.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center sombra-tarjeta">
          <p className="text-lg font-semibold text-slate-700">No hay nada por verificar 🎉</p>
          <p className="mt-1 text-slate-500">Las nuevas publicaciones premium aparecerán acá.</p>
        </div>
      )}

      <div className="space-y-4">
        {pendientes.map((p) => {
          const titulo =
            p.titulo || [p.marca, p.modelo, p.anio].filter(Boolean).join(" ") || "Sin datos";
          const ocupado = procesando === p.id;
          const m = p.mantenimientos;
          return (
            <div
              key={p.id}
              className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sombra-tarjeta sm:flex-row sm:items-center"
            >
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-brand-gradient px-2 py-0.5 text-xs font-black text-white">
                    ★ Premium
                  </span>
                  <span className="font-mono text-xs tracking-widest text-slate-500">
                    {p.placa}
                  </span>
                </div>
                <p className="mt-1 text-lg font-bold text-slate-900">{titulo}</p>
                <p className="text-sm text-slate-600">
                  {`$${p.precio_usd.toLocaleString("es-EC")}`}
                </p>
                {/* Argumento de venta premium: historial documentado del garage. */}
                {m && m.total > 0 ? (
                  <p className="mt-1 text-xs text-slate-500">
                    📋 {m.total} mantenimiento{m.total === 1 ? "" : "s"}
                    {m.ultimo_kilometraje != null
                      ? ` · último ${m.ultimo_kilometraje.toLocaleString("es-EC")} km`
                      : ""}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-amber-600">
                    Sin historial de mantenimientos vinculado.
                  </p>
                )}
              </div>
              <div className="flex flex-row gap-2 sm:flex-col">
                <button
                  onClick={() => decidir(p.id, "verificado")}
                  disabled={ocupado}
                  className="flex-1 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {ocupado ? "…" : "Verificar"}
                </button>
                <button
                  onClick={() => decidir(p.id, "rechazado")}
                  disabled={ocupado}
                  className="flex-1 rounded-full border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                >
                  Rechazar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
