// Pantalla de moderación de referencias (solo admin).
// Lista las referencias externas pendientes y permite aprobar/rechazar cada una.
// El acceso lo protege el backend (403 si el usuario no está en ADMIN_EMAILS); acá
// solo manejamos ese caso mostrando un aviso.

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { listarReferenciasPendientes, moderarReferencia } from "@/lib/api";
import { tieneSesion } from "@/lib/auth";
import { ApiError, PublicacionReferenciada } from "@/types/api";

export default function ModeracionPage() {
  const router = useRouter();
  const [pendientes, setPendientes] = useState<PublicacionReferenciada[]>([]);
  const [cargando, setCargando] = useState(true);
  const [sinPermiso, setSinPermiso] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // id en proceso → para deshabilitar sus botones mientras se modera.
  const [procesando, setProcesando] = useState<number | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const lista = await listarReferenciasPendientes();
      setPendientes(lista);
      setSinPermiso(false);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          router.push("/login?next=/admin/moderacion");
          return;
        }
        if (err.status === 403) {
          setSinPermiso(true);
        } else {
          setError(err.message || "No pudimos cargar la cola de moderación.");
        }
      } else {
        setError("No pudimos cargar la cola de moderación.");
      }
    } finally {
      setCargando(false);
    }
  }, [router]);

  useEffect(() => {
    if (!tieneSesion()) {
      router.push("/login?next=/admin/moderacion");
      return;
    }
    cargar();
  }, [router, cargar]);

  async function decidir(id: number, decision: "aprobada" | "rechazada") {
    setProcesando(id);
    setError(null);
    try {
      await moderarReferencia(id, decision);
      // Sale de la cola de pendientes.
      setPendientes((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "No se pudo moderar.";
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
          <p className="mt-2 text-slate-600">
            Esta sección es solo para administradores.
          </p>
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
          <h1 className="text-3xl font-black text-slate-900">Moderar referencias</h1>
          <p className="mt-1 text-slate-500">
            Anuncios externos aportados por usuarios, esperando aprobación.
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
          <p className="text-lg font-semibold text-slate-700">No hay nada por moderar 🎉</p>
          <p className="mt-1 text-slate-500">Las nuevas referencias aparecerán acá.</p>
        </div>
      )}

      <div className="space-y-4">
        {pendientes.map((p) => {
          const titulo = [p.marca, p.modelo, p.anio].filter(Boolean).join(" ") || "Sin datos";
          const ocupado = procesando === p.id;
          return (
            <div
              key={p.id}
              className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sombra-tarjeta sm:flex-row"
            >
              {p.imagen_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.imagen_url}
                  alt={titulo}
                  className="h-28 w-full rounded-xl object-cover sm:w-40"
                />
              )}
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                    {p.fuente}
                  </span>
                  {p.placa && (
                    <span className="font-mono text-xs tracking-widest text-slate-500">
                      {p.placa}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-lg font-bold text-slate-900">{titulo}</p>
                <p className="text-sm text-slate-600">
                  {p.precio_usd != null
                    ? `$${p.precio_usd.toLocaleString("es-EC")}`
                    : "Precio no indicado"}
                </p>
                <a
                  href={p.url_externa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block max-w-full truncate text-sm text-blue-600 hover:underline"
                >
                  {p.url_externa}
                </a>
              </div>
              <div className="flex flex-row gap-2 sm:flex-col">
                <button
                  onClick={() => decidir(p.id, "aprobada")}
                  disabled={ocupado}
                  className="flex-1 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {ocupado ? "…" : "Aprobar"}
                </button>
                <button
                  onClick={() => decidir(p.id, "rechazada")}
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
