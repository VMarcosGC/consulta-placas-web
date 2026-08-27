// Pantalla de moderación de referencias (solo admin).
// Lista las referencias externas pendientes y permite aprobar/rechazar cada una.
// El acceso lo protege el backend (403 si el usuario no está en ADMIN_EMAILS); acá
// solo manejamos ese caso mostrando un aviso.

"use client";

import { useEffect, useState } from "react";
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
      router.push("/login?next=/admin/moderacion");
      return;
    }
    let activo = true;
    (async () => {
      try {
        const lista = await listarReferenciasPendientes();
        if (!activo) return;
        setPendientes(lista);
        setSinPermiso(false);
        setError(null);
      } catch (err) {
        if (!activo) return;
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
        if (activo) setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, [router, recarga]);

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
        <div className="rounded-2xl border border-borde bg-superficie-tenue p-10">
          <p className="text-xl font-bold text-tinta">Acceso restringido</p>
          <p className="mt-2 text-secundario">
            Esta sección es solo para administradores.
          </p>
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
          <h1 className="text-3xl font-black text-tinta">Moderar referencias</h1>
          <p className="mt-1 text-secundario">
            Anuncios externos aportados por usuarios, esperando aprobación.
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
          <p className="text-lg font-semibold text-secundario">No hay nada por moderar 🎉</p>
          <p className="mt-1 text-secundario">Las nuevas referencias aparecerán acá.</p>
        </div>
      )}

      <div className="space-y-4">
        {pendientes.map((p) => {
          const titulo = [p.marca, p.modelo, p.anio].filter(Boolean).join(" ") || "Sin datos";
          const ocupado = procesando === p.id;
          return (
            <div
              key={p.id}
              className="flex flex-col gap-4 rounded-2xl border border-borde bg-superficie p-5 sombra-tarjeta sm:flex-row"
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
                  <span className="rounded-full bg-superficie-tenue px-2 py-0.5 text-xs font-semibold text-secundario">
                    {p.fuente}
                  </span>
                  {p.placa && (
                    <span className="font-mono text-xs tracking-widest text-secundario">
                      {p.placa}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-lg font-bold text-tinta">{titulo}</p>
                <p className="text-sm text-secundario">
                  {p.precio_usd != null
                    ? `$${p.precio_usd.toLocaleString("es-EC")}`
                    : "Precio no indicado"}
                </p>
                <a
                  href={p.url_externa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block max-w-full truncate text-sm text-marca hover:underline"
                >
                  {p.url_externa}
                </a>
              </div>
              <div className="flex flex-row gap-2 sm:flex-col">
                <button
                  onClick={() => decidir(p.id, "aprobada")}
                  disabled={ocupado}
                  // `--marca` y no `--confirmado`: §2 define `--confirmado` como el estado
                  // "al día" y dice explícitamente "nunca una acción". Aprobar es la acción
                  // primaria de esta pantalla, y `--marca` es justamente "acciones primarias
                  // y registro oficial". `--accion` no aplica: está reservado a la acción de
                  // conversión, y moderar no lo es.
                  // `hover:opacity-90` porque `hover:bg-confirmado` era el MISMO color que el
                  // fondo: el botón no daba ninguna respuesta al pasar el mouse.
                  className="flex-1 rounded-full bg-marca px-4 py-2 text-sm font-semibold text-superficie transition hover:opacity-90 disabled:opacity-50"
                >
                  {ocupado ? "…" : "Aprobar"}
                </button>
                <button
                  onClick={() => decidir(p.id, "rechazada")}
                  disabled={ocupado}
                  // Rechazar DESTRUYE la referencia que alguien aportó: es acción, no
                  // mensaje. Va en `--destructivo`, el token nuevo de TASK-017 fase 3, para
                  // que `--error` vuelva a significar una sola cosa ("algo falló de nuestro
                  // lado"). Contorno y nunca relleno: es la forma la que lo separa.
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
