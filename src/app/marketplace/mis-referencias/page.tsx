// "Mis referencias": el usuario ve los anuncios externos que aportó, con su estado de
// moderación (pendiente / aprobada / rechazada), y puede editarlos o borrarlos.
// Requiere sesión.
//
// M2.10: se agrega "Editar". El aportante suele crear la referencia rápido (solo el link
// y el precio) y completar DESPUÉS las fotos y el detalle. Editar el contenido la devuelve
// a moderación `pendiente` en el backend (anti bait-and-switch); se lo avisamos antes.

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { actualizarReferencia, eliminarReferencia, listarMisReferencias } from "@/lib/api";
import { tieneSesion } from "@/lib/auth";
import { FotosReferencia } from "@/components/FotosReferencia";
import {
  ApiError,
  EstadoModeracion,
  PublicacionReferenciada,
  ReferenciaActualizar,
} from "@/types/api";

const BADGE: Record<EstadoModeracion, { texto: string; clase: string }> = {
  pendiente: { texto: "⏳ En revisión", clase: "bg-superficie-tenue text-secundario" },
  aprobada: { texto: "✓ Publicada", clase: "bg-superficie-tenue text-secundario" },
  rechazada: { texto: "✕ Rechazada", clase: "bg-error-tinte text-error" },
};

const inputCls =
  "w-full rounded-xl border border-borde-fuerte px-3 py-2 text-sm text-tinta focus-glow";

// ── Formulario de edición inline ─────────────────────────────────────────────
// Prellenado con lo que la referencia ya tiene. Al guardar llama actualizarReferencia
// y devuelve al padre la versión nueva (para refrescar la lista en memoria).

function FormularioEditar({
  referencia,
  onGuardada,
  onCancelar,
}: {
  referencia: PublicacionReferenciada;
  onGuardada: (nueva: PublicacionReferenciada) => void;
  onCancelar: () => void;
}) {
  const router = useRouter();
  const [marca, setMarca] = useState(referencia.marca ?? "");
  const [modelo, setModelo] = useState(referencia.modelo ?? "");
  const [anio, setAnio] = useState(referencia.anio != null ? String(referencia.anio) : "");
  const [precio, setPrecio] = useState(
    referencia.precio_usd != null ? String(referencia.precio_usd) : ""
  );
  const [placa, setPlaca] = useState(referencia.placa ?? "");
  const [ciudad, setCiudad] = useState(referencia.ciudad ?? "");
  const [kilometraje, setKilometraje] = useState(
    referencia.kilometraje != null ? String(referencia.kilometraje) : ""
  );
  const [descripcion, setDescripcion] = useState(referencia.descripcion ?? "");
  const [fotos, setFotos] = useState<string[]>(referencia.fotos ?? []);

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const anioNum = anio ? Number(anio) : undefined;
    if (anioNum !== undefined && (!Number.isInteger(anioNum) || anioNum < 1900 || anioNum > 2100)) {
      setError("El año no es válido.");
      return;
    }
    const precioNum = precio ? Number(precio) : undefined;
    if (precioNum !== undefined && (!Number.isFinite(precioNum) || precioNum <= 0)) {
      setError("El precio debe ser mayor a 0.");
      return;
    }
    const kmNum = kilometraje ? Number(kilometraje) : undefined;

    // Solo se envían los campos que tienen valor (los vacíos van como `undefined`, que
    // JSON.stringify omite). Con `exclude_unset` en el backend, dejar un campo en blanco
    // NO borra el dato previo: lo conserva. Es intencional, para que no pierdas datos por
    // accidente al reabrir el formulario. Excepción: `fotos` siempre viaja como lista
    // completa, así que vaciarla sí quita las fotos.
    const datos: ReferenciaActualizar = {
      marca: marca.trim() || undefined,
      modelo: modelo.trim() || undefined,
      anio: anioNum,
      precio_usd: precioNum,
      placa: placa.trim().toUpperCase() || undefined,
      ciudad: ciudad.trim() || undefined,
      kilometraje: Number.isFinite(kmNum) ? kmNum : undefined,
      descripcion: descripcion.trim() || undefined,
      fotos,
    };

    setEnviando(true);
    try {
      const nueva = await actualizarReferencia(referencia.id, datos);
      onGuardada(nueva);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          router.push("/login?next=/marketplace/mis-referencias");
          return;
        }
        setError(err.message || "No pudimos guardar los cambios.");
      } else {
        setError("No pudimos guardar los cambios.");
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={guardar} className="mt-4 space-y-4 border-t border-borde-suave pt-4">
      <div className="rounded-xl border border-borde bg-superficie-tenue p-3 text-sm text-secundario">
        <b>Al editar, tu referencia vuelve a revisión.</b> Si cambias el contenido, un
        administrador la aprueba de nuevo antes de que se muestre en el marketplace.
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-semibold text-secundario">Marca</label>
          <input className={inputCls} value={marca} onChange={(e) => setMarca(e.target.value)} placeholder="Chevrolet" maxLength={80} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-secundario">Modelo</label>
          <input className={inputCls} value={modelo} onChange={(e) => setModelo(e.target.value)} placeholder="Sail" maxLength={120} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-secundario">Año</label>
          <input className={inputCls} type="number" min={1900} max={2100} value={anio} onChange={(e) => setAnio(e.target.value)} placeholder="2018" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-secundario">Precio (USD)</label>
          <input className={inputCls} type="number" min={1} step="any" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="12000" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-secundario">Ciudad</label>
          <input className={inputCls} value={ciudad} onChange={(e) => setCiudad(e.target.value)} placeholder="Quito" maxLength={80} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-secundario">Kilometraje</label>
          <input className={inputCls} type="number" min={0} max={2000000} value={kilometraje} onChange={(e) => setKilometraje(e.target.value)} placeholder="85000" />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-secundario">Placa (opcional)</label>
        <input className={`${inputCls} font-mono tracking-widest`} value={placa} onChange={(e) => setPlaca(e.target.value)} placeholder="ABC1234" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-secundario">Descripción</label>
        <textarea
          className={`${inputCls} min-h-24`}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          maxLength={2000}
          placeholder="Estado, extras, motivo de venta… Se muestra como dato no verificado."
        />
      </div>

      <FotosReferencia fotos={fotos} onCambio={setFotos} />

      {error && (
        <p className="rounded-xl border border-error bg-error-tinte p-3 text-sm text-error">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-full bg-accion px-6 py-2.5 text-sm font-semibold text-superficie shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {enviando ? "Guardando…" : "Guardar cambios"}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          disabled={enviando}
          className="rounded-full border border-borde-fuerte px-6 py-2.5 text-sm font-semibold text-secundario transition hover:bg-superficie-tenue disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

export default function MisReferenciasPage() {
  const router = useRouter();
  const [refs, setRefs] = useState<PublicacionReferenciada[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // id de la referencia que se está editando (o null si ninguna).
  const [editando, setEditando] = useState<number | null>(null);

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

  // Reemplaza la referencia editada por la versión que devuelve el backend (nuevo estado
  // de moderación incluido) y cierra el formulario.
  function trasGuardar(nueva: PublicacionReferenciada) {
    setRefs((prev) => prev.map((r) => (r.id === nueva.id ? nueva : r)));
    setEditando(null);
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/marketplace" className="text-sm text-secundario hover:text-tinta">
        ← Volver al marketplace
      </Link>
      <header className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-tinta">Mis referencias</h1>
          <p className="mt-1 text-secundario">
            Anuncios externos que aportaste y su estado de revisión.
          </p>
        </div>
        <Link
          href="/marketplace/referenciar"
          className="inline-flex rounded-full bg-accion px-5 py-2.5 text-sm font-semibold text-superficie shadow-sm hover:opacity-90"
        >
          + Referenciar otro
        </Link>
      </header>

      {error && (
        <p className="mt-6 rounded-xl border border-error bg-error-tinte p-3 text-sm text-error">
          {error}
        </p>
      )}

      {cargando && <p className="mt-6 text-secundario">Cargando…</p>}

      {!cargando && refs.length === 0 && (
        <div className="mt-6 rounded-2xl border border-borde bg-superficie p-10 text-center sombra-tarjeta">
          <p className="text-lg font-semibold text-secundario">Todavía no referenciaste anuncios.</p>
          <p className="mt-1 text-secundario">
            Pega el link de un auto en venta de Facebook u otro portal.
          </p>
          <Link
            href="/marketplace/referenciar"
            className="mt-4 inline-flex rounded-full bg-accion px-5 py-2.5 text-sm font-semibold text-superficie"
          >
            Referenciar un anuncio
          </Link>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {refs.map((r) => {
          const titulo = [r.marca, r.modelo, r.anio].filter(Boolean).join(" ") || "Sin datos";
          const badge = BADGE[r.estado_moderacion];
          const abierto = editando === r.id;
          return (
            <article
              key={r.id}
              className="rounded-2xl border border-borde bg-superficie p-5 sombra-tarjeta"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge.clase}`}>
                      {badge.texto}
                    </span>
                    {/* Mismo copy exacto que en el feed (M2.5): así el aportante ve tal cual
                        cómo se presenta su referencia al comprador. */}
                    <span className="rounded-full bg-declarado-tinte px-2 py-0.5 text-xs font-semibold text-declarado-texto">
                      Referencia externa · datos no verificados
                    </span>
                    <span className="rounded-full bg-superficie-tenue px-2 py-0.5 text-xs font-semibold text-secundario">
                      {r.fuente}
                    </span>
                    {r.placa && (
                      <span className="font-mono text-xs tracking-widest text-secundario">{r.placa}</span>
                    )}
                  </div>
                  <p className="mt-1 font-bold text-tinta">{titulo}</p>
                  <p className="text-sm text-secundario">
                    {r.precio_usd != null ? `$${r.precio_usd.toLocaleString("es-EC")}` : "Precio no indicado"}
                  </p>
                  <a
                    href={r.url_externa}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block max-w-full truncate text-sm text-marca hover:underline"
                  >
                    {r.url_externa}
                  </a>
                  {r.estado_moderacion === "rechazada" && (
                    <p className="mt-1 text-xs text-secundario">
                      No pasó la revisión. Puedes editarla y corregir lo que haga falta, o
                      eliminarla.
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    onClick={() => setEditando(abierto ? null : r.id)}
                    className="rounded-lg border border-borde-fuerte px-3 py-1.5 text-xs font-medium text-secundario hover:bg-superficie-tenue"
                  >
                    {abierto ? "Cerrar" : "Editar"}
                  </button>
                  <button
                    onClick={() => borrar(r.id)}
                    className="rounded-lg border border-error px-3 py-1.5 text-xs font-medium text-error hover:bg-error-tinte"
                  >
                    Eliminar
                  </button>
                </div>
              </div>

              {abierto && (
                <FormularioEditar
                  referencia={r}
                  onGuardada={trasGuardar}
                  onCancelar={() => setEditando(null)}
                />
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
