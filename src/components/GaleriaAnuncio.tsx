// Galería del anuncio: foto principal + miniaturas, panel flotante con el detalle de
// la ficha que corresponde a la foto activa (`foto.bloque`), y visor a pantalla
// completa con zoom (tap para acercar, arrastrar para desplazar, rueda en escritorio).
//
// Sin librerías (regla del proyecto). El zoom es tap-toggle 1x↔2.5x + rueda 1x–4x +
// arrastre para paneo; no se implementa pinch (varía por navegador y el tap-zoom ya
// cubre "poder hacer zoom" en celular).

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BLOQUES_FICHA,
  ESTADO_COMPONENTE_LABEL,
  resumenFicha,
  type FilaFicha,
} from "@/lib/ficha";
import type { FichaSalida, FotoSalida, SelloMecanica } from "@/types/api";

// ── Resumen de la ficha para la foto ───────────────────────────────────────
// `foto.bloque` es motor_suspension | carroceria | interiores | general. Si la foto
// tiene un bloque con datos, se resume ESE bloque; si no (o es `general`), se resume
// la ficha entera. La tira aparece en TODA foto que tenga algo que mostrar.

function resumenDeFoto(
  bloque: string | null,
  ficha: FichaSalida | null
): { titulo: string; icono: string; filas: FilaFicha[] } | null {
  if (!ficha) return null;
  const meta = bloque ? BLOQUES_FICHA.find((b) => b.clave === bloque) : undefined;
  if (meta) {
    const filas = meta.filas(ficha[meta.clave]);
    if (filas.length) return { titulo: meta.titulo, icono: meta.icono, filas };
  }
  const filas = resumenFicha(ficha);
  return filas.length ? { titulo: "Resumen del auto", icono: "📋", filas } : null;
}

function valorFila(fila: FilaFicha): string {
  return "estado" in fila ? ESTADO_COMPONENTE_LABEL[fila.estado] : fila.valor;
}

// Tira flotante SOBRE la foto, abajo, transparente, SIEMPRE visible en cada foto. Los
// chips se desplazan solos de derecha a izquierda (marquesina, CSS en globals.css);
// el contenido va DUPLICADO para un bucle sin costura. Pausa al pasar el mouse. Va
// sobre la IMAGEN → texto blanco, correcto en claro y en oscuro; no tapa la foto.
function TiraDetalleFoto({
  contenido,
}: {
  contenido: NonNullable<ReturnType<typeof resumenDeFoto>>;
}) {
  const chips = contenido.filas.map((f, i) => (
    <span
      key={i}
      className="mx-1 whitespace-nowrap rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] text-white backdrop-blur-sm"
    >
      <span className="text-white/60">{f.etiqueta}: </span>
      <span className="font-semibold">{valorFila(f)}</span>
    </span>
  ));
  return (
    <div className="marquesina pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden">
      <div className="bg-gradient-to-t from-black/75 via-black/35 to-transparent pb-2 pt-10">
        <p className="mb-1 flex items-center gap-1.5 px-3 text-[11px] font-bold text-white/90">
          <span aria-hidden>{contenido.icono}</span>
          {contenido.titulo}
        </p>
        <div className="marquesina-track">
          <span className="flex shrink-0 pr-2">{chips}</span>
          <span className="flex shrink-0 pr-2" aria-hidden>
            {chips}
          </span>
        </div>
      </div>
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
  const contenido = resumenDeFoto(foto?.bloque ?? null, ficha);

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

        {contenido && <TiraDetalleFoto contenido={contenido} />}
      </div>

      <p className="pb-3 pt-1 text-center text-[11px] text-white/50">
        Toca la foto para acercar · arrastra para moverte · Esc para cerrar
      </p>
    </div>
  );
}

// ── Galería ────────────────────────────────────────────────────────────────

// Sello "revisado por mecánica" (§10.6): antes vivía como chip en la cabecera del
// anuncio, junto a "Premium" / "Verificado". Marcos lo pidió flotando SOBRE la foto
// (2026-09-02): es un aval del vehículo, así que se lee mejor pegado a su imagen,
// como una calcomanía. Esquina superior izquierda para no chocar con "⤢ Ampliar".
function SelloFlotante({ sello }: { sello: SelloMecanica }) {
  return (
    <span className="pointer-events-none absolute left-3 top-3 z-10 inline-flex max-w-[78%] items-center gap-1 rounded-full border border-borde bg-superficie px-2.5 py-1 text-[11px] font-bold text-confirmado-texto sombra-tarjeta">
      <span aria-hidden>🔧</span>
      <span className="truncate">Revisado por {sello.nombre}</span>
    </span>
  );
}

export function GaleriaAnuncio({
  fotos,
  ficha,
  titulo,
  sello,
}: {
  fotos: FotoSalida[];
  ficha: FichaSalida | null;
  titulo: string;
  sello?: SelloMecanica | null;
}) {
  const [activa, setActiva] = useState(0);
  const [visor, setVisor] = useState(false);

  if (fotos.length === 0) {
    return (
      <div className="relative flex aspect-[16/10] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-borde bg-superficie-tenue text-secundario sm:aspect-[16/8]">
        {sello && <SelloFlotante sello={sello} />}
        <span className="text-5xl" aria-hidden>
          🚗
        </span>
        <span className="text-xs font-medium">El vendedor aún no subió fotos</span>
      </div>
    );
  }

  const i = Math.min(activa, fotos.length - 1);
  const foto = fotos[i];
  const contenido = resumenDeFoto(foto.bloque, ficha);

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl border border-borde bg-superficie-tenue sombra-tarjeta">
        {sello && <SelloFlotante sello={sello} />}
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

        {/* Detalle de la ficha que corresponde a ESTA foto (exterior → carrocería,
            interior → interiores, …). Tira flotante abajo, transparente, sin tapar la
            imagen. Va en todos los tamaños. */}
        {contenido && <TiraDetalleFoto contenido={contenido} />}
      </div>

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
