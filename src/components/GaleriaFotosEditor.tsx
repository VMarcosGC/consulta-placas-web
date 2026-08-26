// Editor de fotos del dueño (M2). Sube directo a Cloudinary con firma del backend,
// registra la URL, y permite borrar y reordenar. Límite 12 fotos por publicación.
// Español de Ecuador, tuteo, copy no agresivo. Degrada con gracia si Cloudinary no
// está configurado en el backend (503).

"use client";

import { useEffect, useRef, useState } from "react";
import {
  eliminarFoto,
  firmarSubidaFoto,
  obtenerMiPublicacionDetalle,
  registrarFoto,
  reordenarFotos,
  subirACloudinary,
} from "@/lib/api";
import { ApiError, CloudinaryError, type BloqueFoto, type FotoSalida } from "@/types/api";

const LIMITE_FOTOS = 12;

// Bloque al que se asocia una foto (opcional; por defecto "general").
const BLOQUES: { valor: BloqueFoto; etiqueta: string }[] = [
  { valor: "general", etiqueta: "General" },
  { valor: "motor_suspension", etiqueta: "Motor y suspensión" },
  { valor: "carroceria", etiqueta: "Carrocería" },
  { valor: "interiores", etiqueta: "Interiores" },
];

export function GaleriaFotosEditor({ publicacionId }: { publicacionId: number }) {
  const [fotos, setFotos] = useState<FotoSalida[]>([]);
  const [cargando, setCargando] = useState(true);
  const [bloque, setBloque] = useState<BloqueFoto>("general");
  const [subiendo, setSubiendo] = useState(false);
  const [progreso, setProgreso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Carga inicial vía IIFE async dentro del efecto (mismo patrón que FichaEditor): la
  // setState ocurre tras el await, no de forma síncrona en el cuerpo del efecto.
  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        // Endpoint de DUEÑO: permite gestionar fotos de un borrador o de una publicación
        // pausada, no solo de las activas (M2.8).
        const detalle = await obtenerMiPublicacionDetalle(publicacionId);
        if (activo) setFotos(detalle.fotos);
      } catch (err) {
        if (!activo) return;
        if (err instanceof ApiError && err.status === 404) {
          setAviso("No encontramos esta publicación o no es tuya.");
        } else {
          setError("No pudimos cargar las fotos. Intenta recargar.");
        }
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, [publicacionId]);

  async function onArchivos(e: React.ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(e.target.files ?? []);
    if (inputRef.current) inputRef.current.value = ""; // permite re-seleccionar el mismo archivo
    if (archivos.length === 0) return;

    setError(null);
    setAviso(null);
    setSubiendo(true);
    let actuales = [...fotos];
    try {
      for (let i = 0; i < archivos.length; i++) {
        if (actuales.length >= LIMITE_FOTOS) {
          setAviso(`Alcanzaste el máximo de ${LIMITE_FOTOS} fotos.`);
          break;
        }
        setProgreso(`Subiendo ${i + 1} de ${archivos.length}…`);
        const firma = await firmarSubidaFoto(publicacionId); // 503 si no está configurado
        const url = await subirACloudinary(firma, archivos[i]);
        const foto = await registrarFoto(publicacionId, { url, bloque });
        actuales = [...actuales, foto];
        setFotos(actuales);
      }
    } catch (err) {
      // Errores de Cloudinary (subida directa): su status no es el del backend.
      if (err instanceof CloudinaryError) {
        setError(err.message);
      } else if (err instanceof ApiError) {
        // Códigos del backend propio (firma / registro de la foto).
        if (err.status === 503) {
          setAviso("La subida de fotos aún no está habilitada. Vuelve a intentarlo más tarde.");
        } else if (err.status === 409) {
          setAviso(`Alcanzaste el máximo de ${LIMITE_FOTOS} fotos.`);
        } else if (err.status === 401) {
          setError("Tu sesión expiró. Inicia sesión de nuevo.");
        } else {
          setError(err.message || "No pudimos subir la foto.");
        }
      } else {
        setError("No pudimos subir la foto.");
      }
    } finally {
      setSubiendo(false);
      setProgreso(null);
    }
  }

  async function borrar(fotoId: number) {
    setError(null);
    try {
      await eliminarFoto(publicacionId, fotoId);
      setFotos((prev) => prev.filter((f) => f.id !== fotoId));
    } catch {
      setError("No pudimos eliminar la foto.");
    }
  }

  async function mover(indice: number, direccion: -1 | 1) {
    const destino = indice + direccion;
    if (destino < 0 || destino >= fotos.length) return;
    const ids = fotos.map((f) => f.id);
    [ids[indice], ids[destino]] = [ids[destino], ids[indice]];
    const previo = fotos;
    // Optimista: reordena en pantalla y confirma con el backend.
    setFotos((prev) => {
      const copia = [...prev];
      [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
      return copia;
    });
    try {
      setFotos(await reordenarFotos(publicacionId, ids));
    } catch {
      setFotos(previo); // revierte si el backend rechaza
      setError("No pudimos reordenar las fotos.");
    }
  }

  const lleno = fotos.length >= LIMITE_FOTOS;

  return (
    <div className="rounded-2xl border border-borde bg-superficie-tenue/60 p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-tinta">
          Fotos del vehículo{" "}
          <span className="font-normal text-secundario">
            ({fotos.length}/{LIMITE_FOTOS})
          </span>
        </h3>
        <div className="flex items-center gap-2">
          <label className="text-xs text-secundario">
            Sección:
            <select
              value={bloque}
              onChange={(e) => setBloque(e.target.value as BloqueFoto)}
              className="ml-1 rounded-lg border border-borde-fuerte bg-superficie px-2 py-1 text-xs"
            >
              {BLOQUES.map((b) => (
                <option key={b.valor} value={b.valor}>
                  {b.etiqueta}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={subiendo || lleno}
            className="rounded-full bg-accion px-4 py-1.5 text-xs font-semibold text-superficie shadow-sm transition hover:opacity-90 disabled:opacity-50"
          >
            {subiendo ? progreso ?? "Subiendo…" : "+ Agregar fotos"}
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
      </div>

      <p className="mb-3 text-xs text-secundario">
        La primera foto es la portada del anuncio. Puedes reordenarlas y elegir a qué sección
        pertenece cada una. Máximo {LIMITE_FOTOS}.
      </p>

      {lleno && (
        <p className="mb-3 text-xs font-medium text-error">
          Llegaste al máximo de {LIMITE_FOTOS} fotos. Elimina alguna para subir otra.
        </p>
      )}
      {aviso && <p className="mb-3 text-xs font-medium text-error">{aviso}</p>}
      {error && <p className="mb-3 text-xs font-medium text-error">{error}</p>}

      {cargando ? (
        <p className="text-sm text-secundario">Cargando fotos…</p>
      ) : fotos.length === 0 ? (
        <p className="text-sm text-secundario">Aún no subes fotos de este vehículo.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {fotos.map((f, i) => (
            <li
              key={f.id}
              className="overflow-hidden rounded-xl border border-borde bg-superficie sombra-tarjeta"
            >
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.url} alt={`Foto ${i + 1}`} className="h-28 w-full object-cover" />
                {i === 0 && (
                  <span className="absolute left-1 top-1 rounded-full bg-accion px-2 py-0.5 text-[10px] font-bold text-superficie">
                    Portada
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => mover(i, -1)}
                    disabled={i === 0}
                    className="rounded px-1.5 text-secundario hover:bg-superficie-tenue disabled:opacity-30"
                    aria-label="Mover a la izquierda"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => mover(i, 1)}
                    disabled={i === fotos.length - 1}
                    className="rounded px-1.5 text-secundario hover:bg-superficie-tenue disabled:opacity-30"
                    aria-label="Mover a la derecha"
                  >
                    →
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => borrar(f.id)}
                  className="rounded px-1.5 text-xs font-medium text-error hover:bg-error-tinte"
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
