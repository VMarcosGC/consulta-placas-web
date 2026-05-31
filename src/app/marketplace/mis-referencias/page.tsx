// "Mis referencias": el usuario ve los anuncios externos que aportó, con su estado de
// moderación (pendiente / aprobada / rechazada), y puede borrarlos. Requiere sesión.

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { eliminarReferencia, listarMisReferencias } from "@/lib/api";
import { tieneSesion } from "@/lib/auth";
import { ApiError, EstadoModeracion, PublicacionReferenciada } from "@/types/api";

const BADGE: Record<EstadoModeracion, { texto: string; clase: string }> = {
  pendiente: { texto: "⏳ En revisión", clase: "bg-amber-100 text-amber-800" },
  aprobada: { texto: "✓ Publicada", clase: "bg-emerald-100 text-emerald-800" },
  rechazada: { texto: "✕ Rechazada", clase: "bg-rose-100 text-rose-700" },
};

export default function MisReferenciasPage() {
  const router = useRouter();
  const [refs, setRefs] = useState<PublicacionReferenciada[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tieneSesion()) {
      router.push("/login?next=/marketplace/mis-referencias");
      return;
    }
    let activo = true;
    (async () => {
      try {
        const lista = await listarMisReferencias();
        if (!activo) return;
        setRefs(lista);
        setError(null);
      } catch (err) {
        if (!activo) return;
        if (err instanceof ApiError && err.status === 401) {
          router.push("/login?next=/marketplace/mis-referencias");
          return;
        }
        setError("No pudimos cargar tus referencias. Intenta recargar.");
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, [router]);

  async function borrar(id: number) {
    if (!confirm("¿Eliminar esta referencia?")) return;
    try {
      await eliminarReferencia(id);
      setRefs((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo eliminar.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/marketplace" className="text-sm text-slate-500 hover:text-slate-900">
        ← Volver al marketplace
      </Link>
      <header className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Mis referencias</h1>
          <p className="mt-1 text-slate-500">
            Anuncios externos que aportaste y su estado de revisión.
          </p>
        </div>
        <Link
          href="/marketplace/referenciar"
          className="inline-flex rounded-full bg-brand-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90"
        >
          + Referenciar otro
        </Link>
      </header>

      {error && (
        <p className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </p>
      )}

      {cargando && <p className="mt-6 text-slate-500">Cargando…</p>}

      {!cargando && refs.length === 0 && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-10 text-center sombra-tarjeta">
          <p className="text-lg font-semibold text-slate-700">Todavía no referenciaste anuncios.</p>
          <p className="mt-1 text-slate-500">
            Pega el link de un auto en venta de Facebook u otro portal.
          </p>
          <Link
            href="/marketplace/referenciar"
            className="mt-4 inline-flex rounded-full bg-brand-gradient px-5 py-2.5 text-sm font-semibold text-white"
          >
            Referenciar un anuncio
          </Link>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {refs.map((r) => {
          const titulo = [r.marca, r.modelo, r.anio].filter(Boolean).join(" ") || "Sin datos";
          const badge = BADGE[r.estado_moderacion];
          return (
            <article
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 sombra-tarjeta"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge.clase}`}>
                    {badge.texto}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                    {r.fuente}
                  </span>
                  {r.placa && (
                    <span className="font-mono text-xs tracking-widest text-slate-500">{r.placa}</span>
                  )}
                </div>
                <p className="mt-1 font-bold text-slate-900">{titulo}</p>
                <p className="text-sm text-slate-600">
                  {r.precio_usd != null ? `$${r.precio_usd.toLocaleString("es-EC")}` : "Precio no indicado"}
                </p>
                <a
                  href={r.url_externa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 block max-w-full truncate text-sm text-blue-600 hover:underline"
                >
                  {r.url_externa}
                </a>
                {r.estado_moderacion === "rechazada" && (
                  <p className="mt-1 text-xs text-slate-400">
                    No pasó la revisión. Podés eliminarla y volver a enviar el anuncio corregido.
                  </p>
                )}
              </div>
              <button
                onClick={() => borrar(r.id)}
                className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50"
              >
                Eliminar
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
