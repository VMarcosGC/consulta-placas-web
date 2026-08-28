// Galería del anuncio: foto principal + miniaturas, panel flotante con el detalle de
// la ficha que corresponde a la foto activa (`foto.bloque`), y visor a pantalla
// completa con zoom (tap para acercar, arrastrar para desplazar, rueda en escritorio).
//
// Sin librerías (regla del proyecto). El zoom es tap-toggle 1x↔2.5x + rueda 1x–4x +
// arrastre para paneo; no se implementa pinch (varía por navegador y el tap-zoom ya
// cubre "poder hacer zoom" en celular).

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Insignia } from "@/components/BentoCard";
import {
  BLOQUES_FICHA,
  ESTADO_COMPONENTE_LABEL,
  tonoEstadoComponente,
  type FilaFicha,
} from "@/lib/ficha";
import type { FichaSalida, FotoSalida } from "@/types/api";

// ── Panel con el detalle de la ficha que matchea la foto ────────────────────
// `foto.bloque` es motor_suspension | carroceria | interiores | general. Si hay un
// bloque con datos, se muestra su resumen junto a la foto.

function filasDe(bloque: string | null, ficha: FichaSalida | null): {
  titulo: string;
  icono: string;
  filas: FilaFicha[];
} | null {
  if (!ficha || !bloque) return null;
  const meta = BLOQUES_FICHA.find((b) => b.clave === bloque);
  if (!meta) return null;
  const filas = meta.filas(ficha[meta.clave]);
  return filas.length ? { titulo: meta.titulo, icono: meta.icono, filas } : null;
}

function FilaValor({ fila }: { fila: FilaFicha }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <dt className="text-secundario">
        {fila.etiqueta}
        {fila.sensible && (
          <span className="ml-1 align-middle text-[9px] uppercase tracking-wide text-declarado-texto">
            declarado
          </span>
        )}
      </dt>
      <dd className="text-right font-semibold text-tinta">
        {"estado" in fila ? (
          <Insignia tono={tonoEstadoComponente(fila.estado)}>
            {ESTADO_COMPONENTE_LABEL[fila.estado]}
          </Insignia>
        ) : (
          fila.valor
        )}
      </dd>
    </div>
  );
}

function PanelBloque({
  contenido,
  mostrarTitulo = true,
}: {
  contenido: NonNullable<ReturnType<typeof filasDe>>;
  mostrarTitulo?: boolean;
}) {
  return (
    <div>
      {mostrarTitulo && (
        <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-tinta">
          <span aria-hidden>{contenido.icono}</span>
          Detalle · {contenido.titulo}
        </p>
      )}
      <dl className="divide-y divide-borde-suave text-xs">
        {contenido.filas.map((f, i) => (
          <FilaValor key={i} fila={f} />
        ))}
      </dl>
    </div>
  );
}

// ── Visor a pantalla completa con zoom ─────────────────────────────────────

const ZOOM_MIN = 1;
const ZOOM_MAX = 4;
const ZOOM_TAP = 2.5;

function Visor({
  fotos,
  indice,
  titulo,
  ficha,
  onCerrar,
  onCambiar,
}: {
  fotos: FotoSalida[];
  indice: number;
  titulo: string;
  ficha: FichaSalida | null;
  onCerrar: () => void;
  onCambiar: (nuevo: number) => void;
}) {
  const [escala, setEscala] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [arrastrando, setArrastrando] = useState(false);
  const arrastre = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const toque = useRef<number | null>(null);

  const foto = fotos[indice];
  const contenido = filasDe(foto?.bloque ?? null, ficha);

  const reset = useCallback(() => {
    setEscala(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const ir = useCallback(
    (delta: number) => {
      const n = (indice + delta + fotos.length) % fotos.length;
      onCambiar(n);
      reset();
    },
    [indice, fotos.length, onCambiar, reset]
  );

  // Teclado + bloqueo del scroll del body mientras el visor está abierto.
  useEffect(() => {
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
      else if (e.key === "ArrowRight") ir(1);
      else if (e.key === "ArrowLeft") ir(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = antes;
    };
  }, [onCerrar, ir]);

  function alternarZoom() {
    if (escala > 1) reset();
    else setEscala(ZOOM_TAP);
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const sig = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, escala - e.deltaY * 0.002));
    setEscala(sig);
    if (sig === 1) setPan({ x: 0, y: 0 });
  }

  function onPointerDown(e: React.PointerEvent) {
    if (escala <= 1) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    arrastre.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
    setArrastrando(true);
  }
  function onPointerMove(e: React.PointerEvent) {
    const a = arrastre.current;
    if (!a) return;
    setPan({ x: a.px + (e.clientX - a.x), y: a.py + (e.clientY - a.y) });
  }
  function onPointerUp() {
    arrastre.current = null;
    setArrastrando(false);
  }

  // Swipe para cambiar de foto SOLO cuando no hay zoom (si hay zoom, el drag panea).
  function onTouchStart(e: React.TouchEvent) {
    if (escala === 1) toque.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (toque.current == null) return;
    const dx = e.changedTouches[0].clientX - toque.current;
    toque.current = null;
    if (Math.abs(dx) > 50) ir(dx < 0 ? 1 : -1);
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-black/90 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Foto de ${titulo} ampliada`}
    >
      <div className="flex items-center justify-between px-4 py-3 text-sm text-white/80">
        <span className="font-mono">
          {indice + 1} / {fotos.length}
        </span>
        <button
          type="button"
          onClick={onCerrar}
          className="rounded-full bg-white/10 px-3 py-1.5 text-white transition hover:bg-white/20"
        >
          Cerrar ✕
        </button>
      </div>

      <div
        className="relative flex flex-1 select-none items-center justify-center overflow-hidden"
        style={{ touchAction: "none" }}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={foto?.url}
          alt={`Foto ampliada de ${titulo}`}
          onClick={alternarZoom}
          draggable={false}
          className="max-h-full max-w-full object-contain"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${escala})`,
            transition: arrastrando ? "none" : "transform 0.18s ease-out",
            cursor: escala > 1 ? (arrastrando ? "grabbing" : "grab") : "zoom-in",
          }}
        />

        {fotos.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => ir(-1)}
              aria-label="Foto anterior"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-4 text-lg text-white transition hover:bg-white/20"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => ir(1)}
              aria-label="Foto siguiente"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-4 text-lg text-white transition hover:bg-white/20"
            >
              ›
            </button>
          </>
        )}

        {contenido && (
          <div className="absolute bottom-3 left-3 right-3 max-h-[45%] overflow-y-auto rounded-2xl bg-superficie/95 p-3 shadow-lg backdrop-blur sm:right-auto sm:w-72">
            <PanelBloque contenido={contenido} />
          </div>
        )}
      </div>

      <p className="pb-3 pt-1 text-center text-[11px] text-white/50">
        Toca la foto para acercar · arrastra para moverte · Esc para cerrar
      </p>
    </div>
  );
}

// ── Galería ────────────────────────────────────────────────────────────────

export function GaleriaAnuncio({
  fotos,
  ficha,
  titulo,
}: {
  fotos: FotoSalida[];
  ficha: FichaSalida | null;
  titulo: string;
}) {
  const [activa, setActiva] = useState(0);
  const [visor, setVisor] = useState(false);

  if (fotos.length === 0) {
    return (
      <div className="flex aspect-[16/10] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-borde bg-superficie-tenue text-secundario sm:aspect-[16/8]">
        <span className="text-5xl" aria-hidden>
          🚗
        </span>
        <span className="text-xs font-medium">El vendedor aún no subió fotos</span>
      </div>
    );
  }

  const i = Math.min(activa, fotos.length - 1);
  const foto = fotos[i];
  const contenido = filasDe(foto.bloque, ficha);

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl border border-borde bg-superficie-tenue sombra-tarjeta">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={foto.url}
          alt={`Foto ${i + 1} de ${titulo}`}
          onClick={() => setVisor(true)}
          className="aspect-[4/3] w-full cursor-zoom-in object-cover sm:aspect-[16/10]"
        />
        <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white">
          ⤢ Ampliar
        </span>

        {/* Panel flotante SOLO en escritorio: el detalle de la ficha que corresponde
            a esta foto (exterior → carrocería, interior → interiores, …). */}
        {contenido && (
          <div className="absolute bottom-3 right-3 top-3 hidden w-64 max-w-[45%] overflow-y-auto rounded-2xl border border-borde bg-superficie/95 p-3 shadow-lg backdrop-blur md:block">
            <PanelBloque contenido={contenido} />
          </div>
        )}
      </div>

      {/* En celular el panel va DEBAJO de la foto, plegable. */}
      {contenido && (
        <details className="group mt-2 rounded-2xl border border-borde bg-superficie p-3 md:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-bold text-tinta">
            <span className="flex items-center gap-1.5">
              <span aria-hidden>{contenido.icono}</span>
              Detalle de esta foto · {contenido.titulo}
            </span>
            <span className="text-secundario group-open:rotate-180">▾</span>
          </summary>
          <div className="mt-2">
            <PanelBloque contenido={contenido} mostrarTitulo={false} />
          </div>
        </details>
      )}

      {fotos.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {fotos.map((f, idx) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setActiva(idx)}
              aria-label={`Ver foto ${idx + 1} de ${fotos.length}`}
              className={`h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                idx === i ? "border-marca" : "border-transparent hover:border-borde-fuerte"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.url} alt={`Miniatura ${idx + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {visor && (
        <Visor
          fotos={fotos}
          indice={i}
          titulo={titulo}
          ficha={ficha}
          onCerrar={() => setVisor(false)}
          onCambiar={setActiva}
        />
      )}
    </div>
  );
}
