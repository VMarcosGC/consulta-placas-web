// Hilo de chat interno comprador↔vendedor (migración 0035).
//
// Reutilizable: vive embebido en el detalle del anuncio (`ContactoVendedor`) y en la
// bandeja `/mensajes`. Recibe un `conversacionId` YA creado; crear el hilo es cosa del
// que lo monta. El padre DEBE pasar `key={conversacionId}` para que cambiar de hilo
// remonte el componente (así el estado de carga arranca limpio, sin setState en efecto).
//
// Polling simple cada 12 s mientras está montado — sin WebSocket (regla del proyecto:
// nada de dependencias nuevas sin justificar). Alcanza para coordinar una compra.

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  cambiarEstadoConversacion,
  compartirContactoChat,
  enviarMensajeChat,
  obtenerConversacion,
} from "@/lib/api";
import { ApiError, type Conversacion } from "@/types/api";

function hora(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("es-EC", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function PanelChat({
  conversacionId,
  onActualizar,
  alto = "20rem",
}: {
  conversacionId: number;
  /** Se llama con el hilo fresco tras cada carga (para que el padre lea `contacto_habilitado`). */
  onActualizar?: (c: Conversacion) => void;
  alto?: string;
}) {
  const [conv, setConv] = useState<Conversacion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const finRef = useRef<HTMLDivElement | null>(null);

  // El callback del padre suele ser inline: se guarda en ref para no reconstruir `cargar`.
  const cbRef = useRef(onActualizar);
  useEffect(() => {
    cbRef.current = onActualizar;
  });

  const cargar = useCallback(async () => {
    try {
      const c = await obtenerConversacion(conversacionId);
      setConv(c);
      setError(null);
      cbRef.current?.(c);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo abrir el chat.");
    } finally {
      setCargando(false);
    }
  }, [conversacionId]);

  useEffect(() => {
    let vivo = true;
    (async () => {
      if (vivo) await cargar();
    })();
    const t = window.setInterval(() => {
      void cargar();
    }, 12000);
    return () => {
      vivo = false;
      window.clearInterval(t);
    };
  }, [cargar]);

  useEffect(() => {
    finRef.current?.scrollIntoView({ block: "end" });
  }, [conv?.mensajes.length]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const cuerpo = texto.trim();
    if (!cuerpo || enviando) return;
    setEnviando(true);
    try {
      await enviarMensajeChat(conversacionId, cuerpo);
      setTexto("");
      await cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo enviar el mensaje.");
    } finally {
      setEnviando(false);
    }
  }

  async function compartir() {
    try {
      await compartirContactoChat(conversacionId);
      await cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo compartir el contacto.");
    }
  }

  async function cerrar() {
    try {
      await cambiarEstadoConversacion(conversacionId, "bloqueada");
      await cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo cerrar el chat.");
    }
  }

  if (cargando && !conv) {
    return (
      <div className="rounded-2xl border border-borde bg-superficie p-4 text-sm text-secundario sombra-tarjeta">
        Abriendo el chat…
      </div>
    );
  }

  if (!conv) {
    return (
      <div className="rounded-2xl border border-error bg-error-tinte p-4 text-sm text-error">
        {error ?? "No se pudo abrir el chat."}
      </div>
    );
  }

  const bloqueada = conv.estado === "bloqueada";
  const soyVendedor = conv.mi_rol === "vendedor";

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-borde bg-superficie sombra-tarjeta">
      {/* Cabecera */}
      <div className="flex items-start justify-between gap-3 border-b border-borde bg-superficie-tenue px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-tinta">
            {conv.contraparte_nombre}
          </p>
          <Link
            href={`/marketplace/${conv.publicacion_id}`}
            className="truncate text-xs text-secundario hover:text-marca-texto"
          >
            {conv.publicacion_titulo}
          </Link>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
            conv.contacto_habilitado
              ? "bg-confirmado-tinte text-confirmado-texto"
              : "bg-superficie text-secundario"
          }`}
        >
          {conv.contacto_habilitado ? "WhatsApp habilitado" : "Solo chat"}
        </span>
      </div>

      {/* Mensajes */}
      <div className="flex flex-col gap-2 overflow-y-auto px-4 py-3" style={{ height: alto }}>
        {conv.mensajes.length === 0 && (
          <p className="m-auto text-center text-xs text-secundario">
            Sin mensajes todavía. Escribe el primero.
          </p>
        )}
        {conv.mensajes.map((m) => (
          <div
            key={m.id}
            className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
              m.mio
                ? "self-end bg-accion text-superficie"
                : "self-start bg-superficie-tenue text-tinta"
            }`}
          >
            <p className="whitespace-pre-wrap break-words">{m.cuerpo}</p>
            <p
              className={`mt-0.5 text-[10px] ${
                m.mio ? "text-superficie/70" : "text-secundario"
              }`}
            >
              {hora(m.creado_en)}
            </p>
          </div>
        ))}
        <div ref={finRef} />
      </div>

      {/* Acciones del vendedor */}
      {soyVendedor && !bloqueada && (
        <div className="flex flex-wrap gap-2 border-t border-borde px-4 py-2">
          {!conv.contacto_habilitado && (
            <button
              type="button"
              onClick={compartir}
              className="rounded-full border border-borde-fuerte px-3 py-1 text-xs font-semibold text-secundario transition hover:bg-superficie-tenue"
            >
              Compartir mi WhatsApp
            </button>
          )}
          {conv.puede_bloquear && (
            <button
              type="button"
              onClick={cerrar}
              className="rounded-full border border-borde-fuerte px-3 py-1 text-xs font-semibold text-error transition hover:bg-error-tinte"
            >
              Cerrar chat
            </button>
          )}
        </div>
      )}

      {/* Redacción */}
      {bloqueada ? (
        <p className="border-t border-borde px-4 py-3 text-center text-sm text-secundario">
          Este chat está cerrado.
        </p>
      ) : (
        <form onSubmit={enviar} className="flex items-end gap-2 border-t border-borde p-3">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void enviar(e as unknown as React.FormEvent);
              }
            }}
            rows={1}
            maxLength={2000}
            placeholder="Escribe un mensaje…"
            className="max-h-28 min-h-[2.5rem] flex-1 resize-y rounded-xl border border-borde bg-superficie px-3 py-2 text-sm text-tinta outline-none focus:border-marca"
          />
          <button
            type="submit"
            disabled={enviando || !texto.trim()}
            className="shrink-0 rounded-full bg-accion px-4 py-2 text-sm font-semibold text-superficie transition hover:opacity-90 disabled:opacity-50"
          >
            {enviando ? "…" : "Enviar"}
          </button>
        </form>
      )}

      {error && (
        <p className="border-t border-error bg-error-tinte px-4 py-2 text-xs text-error">
          {error}
        </p>
      )}
    </div>
  );
}
