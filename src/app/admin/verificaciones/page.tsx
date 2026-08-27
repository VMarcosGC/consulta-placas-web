// Pantalla de verificación de publicaciones premium (solo admin).
// Lista las publicaciones premium pendientes y permite marcarlas como verificadas
// o rechazadas. El acceso lo protege el backend (403 si no está en ADMIN_EMAILS);
// acá solo mostramos un aviso en ese caso.

"use client";

import { useEffect, useState } from "react";
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
  // Nonce para re-disparar la carga desde el botón "Actualizar" (mismo patrón que
  // MenuCuenta): el efecto es el único que hace setState y solo tras el await, como
  // pide react-hooks/set-state-in-effect.
  const [recarga, setRecarga] = useState(0);

  function actualizar() {
    setCargando(true);
    setRecarga((n) => n + 1);
  }

  useEffect(() => {
    if (!tieneSesion()) {
      router.push("/login?next=/admin/verificaciones");
      return;
    }
    let activo = true;
    (async () => {
      try {
        const lista = await listarPublicacionesPendientesVerificacion();
        if (!activo) return;
        setPendientes(lista);
        setSinPermiso(false);
        setError(null);
      } catch (err) {
        if (!activo) return;
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
        if (activo) setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, [router, recarga]);

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
        <div className="rounded-2xl border border-borde bg-superficie-tenue p-10">
          <p className="text-xl font-bold text-tinta">Acceso restringido</p>
          <p className="mt-2 text-secundario">Esta sección es solo para administradores.</p>
          <Link
            href="/marketplace"
            className="mt-6 inline-flex rounded-full bg-accion px-5 py-2.5 text-sm font-semibold text-superficie"
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
          <h1 className="text-3xl font-black text-tinta">Verificar premium</h1>
          <p className="mt-1 text-secundario">
            Publicaciones premium esperando el sello “Verificado por la plataforma”.
          </p>
        </div>
        <button
          onClick={actualizar}
          className="rounded-full border border-borde-fuerte px-4 py-2 text-sm font-semibold text-secundario hover:bg-superficie-tenue"
        >
          ↻ Actualizar
        </button>
      </header>

      {cargando && <p className="text-secundario">Cargando…</p>}
      {error && (
        <p className="mb-4 rounded-xl border border-error bg-error-tinte p-3 text-sm text-error">
          {error}
        </p>
      )}

      {!cargando && pendientes.length === 0 && (
        <div className="rounded-2xl border border-borde bg-superficie p-10 text-center sombra-tarjeta">
          <p className="text-lg font-semibold text-secundario">No hay nada por verificar 🎉</p>
          <p className="mt-1 text-secundario">Las nuevas publicaciones premium aparecerán acá.</p>
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
              className="flex flex-col gap-4 rounded-2xl border border-borde bg-superficie p-5 sombra-tarjeta sm:flex-row sm:items-center"
            >
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-marca px-2 py-0.5 text-xs font-black text-superficie">
                    ★ Premium
                  </span>
                  <span className="font-mono text-xs tracking-widest text-secundario">
                    {p.placa}
                  </span>
                </div>
                <p className="mt-1 text-lg font-bold text-tinta">{titulo}</p>
                <p className="text-sm text-secundario">
                  {`$${p.precio_usd.toLocaleString("es-EC")}`}
                </p>
                {/* Argumento de venta premium: historial documentado del garage. */}
                {m && m.total > 0 ? (
                  <p className="mt-1 text-xs text-secundario">
                    📋 {m.total} mantenimiento{m.total === 1 ? "" : "s"}
                    {m.ultimo_kilometraje != null
                      ? ` · último ${m.ultimo_kilometraje.toLocaleString("es-EC")} km`
                      : ""}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-secundario">
                    Sin historial de mantenimientos vinculado.
                  </p>
                )}
              </div>
              <div className="flex flex-row gap-2 sm:flex-col">
                <button
                  onClick={() => decidir(p.id, "verificado")}
                  disabled={ocupado}
                  // Ver el razonamiento en `admin/moderacion`: `--confirmado` es estado y §2
                  // dice "nunca una acción"; verificar es la acción primaria de la pantalla,
                  // y eso es `--marca`. El hover era del mismo color que el fondo.
                  className="flex-1 rounded-full bg-marca px-4 py-2 text-sm font-semibold text-superficie transition hover:opacity-90 disabled:opacity-50"
                >
                  {ocupado ? "…" : "Verificar"}
                </button>
                <button
                  onClick={() => decidir(p.id, "rechazado")}
                  disabled={ocupado}
                  // Rechazar una verificación es una decisión terminal (§10.6): acción
                  // destructiva, `--destructivo`, contorno.
                  className="flex-1 rounded-full border border-destructivo px-4 py-2 text-sm font-semibold text-destructivo transition hover:bg-destructivo-tinte disabled:opacity-50"
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
