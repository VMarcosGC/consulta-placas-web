// Calificaciones de un vendedor (comprador → vendedor). Va en la sección de contacto
// del detalle del anuncio. Si el vendedor no tiene ninguna, se dice "aún sin
// calificaciones" — NUNCA una nota baja (línea base). Con sesión y sin ser el dueño,
// un formulario de estrellas + comentario opcional (upsert: re-calificar reemplaza).

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { calificarVendedor, obtenerCalificacionesVendedor } from "@/lib/api";
import { tieneSesion } from "@/lib/auth";
import { ApiError, type CalificacionesVendedor as Datos } from "@/types/api";

function Estrellas({ valor }: { valor: number }) {
  return (
    <span aria-label={`${valor} de 5`} className="text-marca">
      {"★".repeat(Math.round(valor))}
      <span className="text-borde-fuerte">{"★".repeat(5 - Math.round(valor))}</span>
    </span>
  );
}

export function CalificacionesVendedor({
  vendedorId,
  publicacionId,
  esMia,
}: {
  vendedorId: number;
  publicacionId: number;
  esMia: boolean;
}) {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [estrellas, setEstrellas] = useState(0);
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const conSesion = tieneSesion();

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const d = await obtenerCalificacionesVendedor(vendedorId);
        if (!activo) return;
        setDatos(d);
        if (d.mia) {
          setEstrellas(d.mia.estrellas);
          setComentario(d.mia.comentario ?? "");
        }
      } catch {
        /* silencioso: es un extra, no puede romper el detalle */
      }
    })();
    return () => {
      activo = false;
    };
  }, [vendedorId]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (estrellas < 1) {
      setError("Elige de 1 a 5 estrellas.");
      return;
    }
    setError(null);
    setEnviando(true);
    try {
      const d = await calificarVendedor(vendedorId, {
        estrellas,
        comentario: comentario.trim() || null,
        publicacion_id: publicacionId,
      });
      setDatos(d);
      setOk(true);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message || "No pudimos guardar tu calificación."
          : "No pudimos guardar tu calificación."
      );
    } finally {
      setEnviando(false);
    }
  }

  const resumen = datos?.resumen;

  return (
    <div className="mt-4 rounded-2xl border border-borde bg-superficie p-4 sombra-tarjeta">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-tinta">Calificación del vendedor</h3>
        {resumen && resumen.promedio != null ? (
          <span className="text-sm font-semibold text-tinta">
            <Estrellas valor={resumen.promedio} /> {resumen.promedio.toFixed(1)}{" "}
            <span className="font-normal text-secundario">
              ({resumen.total} {resumen.total === 1 ? "calificación" : "calificaciones"})
            </span>
          </span>
        ) : (
          <span className="text-sm text-secundario">Aún sin calificaciones</span>
        )}
      </div>

      {/* Comentarios (máx. los últimos que trae el backend). */}
      {datos && datos.items.length > 0 && (
        <ul className="mt-3 space-y-2 border-t border-borde-suave pt-3">
          {datos.items
            .filter((c) => c.comentario)
            .slice(0, 4)
            .map((c, i) => (
              <li key={i} className="text-sm">
                <span className="text-marca">{"★".repeat(c.estrellas)}</span>{" "}
                <span className="text-secundario">— {c.autor}</span>
                <p className="text-tinta">{c.comentario}</p>
              </li>
            ))}
        </ul>
      )}

      {/* Formulario: solo con sesión y si no es tu propio anuncio. */}
      {esMia ? null : !conSesion ? (
        <p className="mt-3 border-t border-borde-suave pt-3 text-sm text-secundario">
          <Link href="/login" className="font-semibold text-marca">
            Inicia sesión
          </Link>{" "}
          para calificar a este vendedor.
        </p>
      ) : ok ? (
        <p className="mt-3 border-t border-borde-suave pt-3 text-sm font-semibold text-confirmado-texto">
          ¡Gracias! Tu calificación quedó registrada.
        </p>
      ) : (
        <form onSubmit={enviar} className="mt-3 border-t border-borde-suave pt-3">
          <p className="mb-1 text-sm font-semibold text-secundario">
            {datos?.mia ? "Actualiza tu calificación" : "Califica a este vendedor"}
          </p>
          <div className="flex gap-1 text-2xl">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`${n} estrella${n === 1 ? "" : "s"}`}
                onClick={() => setEstrellas(n)}
                className={n <= estrellas ? "text-marca" : "text-borde-fuerte"}
              >
                ★
              </button>
            ))}
          </div>
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            maxLength={1000}
            placeholder="Comentario (opcional): ¿cómo fue el trato, la puntualidad, el estado del auto?"
            className="mt-2 min-h-16 w-full rounded-xl border border-borde-fuerte px-3 py-2 text-sm text-tinta focus-glow"
          />
          {error && <p className="mt-1 text-sm text-error">{error}</p>}
          <button
            type="submit"
            disabled={enviando}
            className="mt-2 rounded-full bg-accion px-5 py-2 text-sm font-semibold text-superficie shadow-sm transition hover:opacity-90 disabled:opacity-50"
          >
            {enviando ? "Enviando…" : "Enviar calificación"}
          </button>
        </form>
      )}
    </div>
  );
}
