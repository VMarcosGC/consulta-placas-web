// Uploader de fotos de una referencia externa (M2.8 → extraído en M2.10 para reusarlo
// tanto al CREAR (/marketplace/referenciar) como al EDITAR (/marketplace/mis-referencias)).
// Mismo flujo que las fotos de publicación: firma del backend → subida DIRECTA a
// Cloudinary → la URL viaja en el alta/edición. Tope de MAX_FOTOS_REFERENCIA: la
// referencia es un puntero al anuncio original, no el anuncio en sí.

"use client";

import { useRef, useState } from "react";
import { firmarSubidaFotoReferencia, subirACloudinary } from "@/lib/api";
import { ApiError, CloudinaryError, MAX_FOTOS_REFERENCIA } from "@/types/api";

export function FotosReferencia({
  fotos,
  onCambio,
}: {
  fotos: string[];
  onCambio: (fotos: string[]) => void;
}) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lleno = fotos.length >= MAX_FOTOS_REFERENCIA;

  async function onArchivos(e: React.ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(e.target.files ?? []);
    if (inputRef.current) inputRef.current.value = "";
    if (archivos.length === 0) return;

    setError(null);
    setSubiendo(true);
    let actuales = [...fotos];
    try {
      for (const archivo of archivos) {
        if (actuales.length >= MAX_FOTOS_REFERENCIA) break;
        const firma = await firmarSubidaFotoReferencia(); // 503 si no hay Cloudinary
        const url = await subirACloudinary(firma, archivo);
        actuales = [...actuales, url];
        onCambio(actuales);
      }
    } catch (err) {
      if (err instanceof CloudinaryError) {
        setError(err.message);
      } else if (err instanceof ApiError && err.status === 503) {
        setError("La subida de fotos aún no está habilitada. Puedes pegar el enlace de una imagen.");
      } else {
        setError("No pudimos subir la foto.");
      }
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <label className="text-sm font-semibold text-secundario">
          Fotos del anuncio (opcional){" "}
          <span className="font-normal text-secundario">
            ({fotos.length}/{MAX_FOTOS_REFERENCIA})
          </span>
        </label>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={subiendo || lleno}
          className="rounded-full border border-borde-fuerte bg-superficie px-3.5 py-1.5 text-xs font-semibold text-secundario hover:bg-superficie-tenue disabled:opacity-40"
        >
          {subiendo ? "Subiendo…" : "+ Subir fotos"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={onArchivos}
        />
      </div>
      <p className="mb-2 text-xs text-secundario">
        Puedes guardar las fotos del anuncio original y subirlas aquí. Máximo{" "}
        {MAX_FOTOS_REFERENCIA}.
      </p>
      {error && <p className="mb-2 text-xs font-medium text-error">{error}</p>}
      {fotos.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {fotos.map((url, i) => (
            <li key={url} className="relative overflow-hidden rounded-xl border border-borde">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Foto ${i + 1}`} className="h-20 w-full object-cover" />
              <button
                type="button"
                onClick={() => onCambio(fotos.filter((f) => f !== url))}
                className="absolute right-1 top-1 rounded-full bg-superficie/90 px-1.5 text-xs font-bold text-error shadow-sm"
                aria-label={`Quitar foto ${i + 1}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
