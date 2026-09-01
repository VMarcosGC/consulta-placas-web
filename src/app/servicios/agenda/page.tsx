// Agenda de servicios — dos lados en una página:
//  · "Mis citas": lo que YO pedí a un negocio (cliente).
//  · "Solicitudes a mi negocio": lo que me pidieron a los servicios que aporté.
//
// El backend decide qué muestra `citas/recibidas` (vacío si no aporté ningún servicio).

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  actualizarCita,
  citasRecibidas,
  misCitas,
  responderCita,
} from "@/lib/api";
import { tieneSesion } from "@/lib/auth";
import {
  ApiError,
  MOTIVO_CITA_LEGIBLE,
  type CitaSalida,
  type EstadoCita,
  type FranjaAgenda,
} from "@/types/api";

const FRANJA: Record<FranjaAgenda, string> = {
  manana: "Mañana",
  tarde: "Tarde",
  noche: "Noche",
  todo_el_dia: "Todo el día",
};
const fechaLarga = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

const TONO_ESTADO: Record<EstadoCita, string> = {
  solicitada: "bg-superficie-tenue text-secundario",
  confirmada: "bg-confirmado-tinte text-confirmado-texto",
  reprogramada: "bg-atencion-tinte text-atencion-texto",
  rechazada: "bg-error-tinte text-error",
  cancelada: "bg-superficie-tenue text-secundario",
  cumplida: "bg-marca-tinte text-marca-texto",
};
const ROTULO_ESTADO: Record<EstadoCita, string> = {
  solicitada: "Pendiente de respuesta",
  confirmada: "Confirmada",
  reprogramada: "El negocio propuso otra fecha",
  rechazada: "Rechazada",
  cancelada: "Cancelada",
  cumplida: "Cumplida",
};

function EstadoPill({ estado }: { estado: EstadoCita }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${TONO_ESTADO[estado]}`}
    >
      {ROTULO_ESTADO[estado]}
    </span>
  );
}

export default function AgendaServiciosPage() {
  const router = useRouter();
  const [mias, setMias] = useState<CitaSalida[]>([]);
  const [recibidas, setRecibidas] = useState<CitaSalida[]>([]);
  const [cargando, setCargando] = useState(true);

  const recargar = useCallback(async () => {
    const [a, b] = await Promise.all([
      misCitas().catch(() => [] as CitaSalida[]),
      citasRecibidas().catch(() => [] as CitaSalida[]),
    ]);
    setMias(a);
    setRecibidas(b);
  }, []);

  useEffect(() => {
    if (!tieneSesion()) {
      router.push("/login?next=/servicios/agenda");
      return;
    }
    let vivo = true;
    (async () => {
      try {
        await recargar();
      } finally {
        if (vivo) setCargando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [router, recargar]);

  if (cargando) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center text-secundario">
        Cargando tu agenda…
      </div>
    );
  }

  return (
    <div className="espacio-barra-movil mx-auto max-w-3xl px-6 py-8 sm:py-10">
      <Link href="/servicios" className="text-sm text-secundario hover:text-tinta">
        ← Servicios
      </Link>
      <h1 className="mt-3 text-2xl font-black text-tinta sm:text-3xl">Agenda</h1>

      {/* Mis citas (cliente). */}
      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-secundario">
          Mis citas ({mias.length})
        </h2>
        {mias.length === 0 ? (
          <p className="rounded-xl border border-borde bg-superficie p-6 text-center text-sm text-secundario sombra-tarjeta">
            No pediste ninguna cita todavía. En{" "}
            <Link href="/servicios" className="font-semibold text-marca">
              Servicios
            </Link>{" "}
            los negocios que aceptan agendamiento tienen el botón “Agendar cita”.
          </p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {mias.map((c) => (
              <CitaClienteCard key={c.id} cita={c} onCambio={recargar} />
            ))}
          </ul>
        )}
      </section>

      {/* Solicitudes a mi negocio. */}
      {recibidas.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-secundario">
            Solicitudes a mi negocio ({recibidas.length})
          </h2>
          <ul className="flex flex-col gap-2.5">
            {recibidas.map((c) => (
              <CitaNegocioCard key={c.id} cita={c} onCambio={recargar} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Encabezado({ cita: c }: { cita: CitaSalida }) {
  return (
    <div className="min-w-0">
      <p className="text-sm font-semibold text-tinta">
        {c.servicio_nombre ?? "Servicio"}
        {c.servicio_ciudad && (
          <span className="font-normal text-secundario"> · {c.servicio_ciudad}</span>
        )}
      </p>
      <p className="text-xs text-secundario">
        {fechaLarga(c.fecha)} · {FRANJA[c.franja]} · {MOTIVO_CITA_LEGIBLE[c.motivo]}
      </p>
      {c.vehiculo && <p className="text-xs text-secundario">🚗 {c.vehiculo}</p>}
      {c.nota && <p className="mt-0.5 text-xs text-secundario">“{c.nota}”</p>}
    </div>
  );
}

// ── Vista del cliente ────────────────────────────────────────────────────────
function CitaClienteCard({
  cita: c,
  onCambio,
}: {
  cita: CitaSalida;
  onCambio: () => Promise<void>;
}) {
  const [ocupado, setOcupado] = useState(false);

  async function accion(fn: () => Promise<unknown>) {
    setOcupado(true);
    try {
      await fn();
      await onCambio();
    } catch {
      /* noop */
    } finally {
      setOcupado(false);
    }
  }

  const abierta = c.estado === "solicitada" || c.estado === "confirmada" || c.estado === "reprogramada";

  return (
    <li className="rounded-xl border border-borde bg-superficie p-3 sombra-tarjeta">
      <div className="flex items-start justify-between gap-2">
        <Encabezado cita={c} />
        <EstadoPill estado={c.estado} />
      </div>

      {c.respuesta_negocio && (
        <p className="mt-2 rounded-lg bg-superficie-tenue px-3 py-2 text-xs text-secundario">
          <span className="font-semibold text-tinta">El negocio dice:</span> {c.respuesta_negocio}
        </p>
      )}

      {c.estado === "reprogramada" && c.fecha_propuesta && (
        <div className="mt-2 rounded-lg border border-atencion-tinte bg-atencion-tinte/40 px-3 py-2 text-xs">
          <p className="text-atencion-texto">
            Propuesta: <strong>{fechaLarga(c.fecha_propuesta)}</strong>
            {c.franja_propuesta && ` · ${FRANJA[c.franja_propuesta]}`}
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={ocupado}
              onClick={() => accion(() => actualizarCita(c.id, { estado: "confirmada" }))}
              className="rounded-full bg-accion px-3 py-1 text-xs font-semibold text-superficie disabled:opacity-60"
            >
              Aceptar
            </button>
            <button
              type="button"
              disabled={ocupado}
              onClick={() => accion(() => actualizarCita(c.id, { estado: "cancelada" }))}
              className="rounded-full border border-borde-fuerte bg-superficie px-3 py-1 text-xs font-semibold text-secundario disabled:opacity-60"
            >
              No me sirve
            </button>
          </div>
        </div>
      )}

      {abierta && c.estado !== "reprogramada" && (
        <div className="mt-2">
          <button
            type="button"
            disabled={ocupado}
            onClick={() => accion(() => actualizarCita(c.id, { estado: "cancelada" }))}
            className="rounded-full border border-borde-fuerte bg-superficie px-3 py-1 text-xs font-semibold text-secundario hover:bg-superficie-tenue disabled:opacity-60"
          >
            Cancelar cita
          </button>
        </div>
      )}
    </li>
  );
}

// ── Vista del negocio ───────────────────────────────────────────────────────
function CitaNegocioCard({
  cita: c,
  onCambio,
}: {
  cita: CitaSalida;
  onCambio: () => Promise<void>;
}) {
  const [ocupado, setOcupado] = useState(false);
  const [reprog, setReprog] = useState(false);
  const [fecha, setFecha] = useState(c.fecha);
  const [franja, setFranja] = useState<FranjaAgenda>(c.franja);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function responder(
    decision: "confirmada" | "rechazada" | "reprogramada" | "cumplida"
  ) {
    setError(null);
    setOcupado(true);
    try {
      await responderCita(c.id, {
        decision,
        respuesta: mensaje.trim() || undefined,
        fecha_propuesta: decision === "reprogramada" ? fecha : undefined,
        franja_propuesta: decision === "reprogramada" ? franja : undefined,
      });
      await onCambio();
      setReprog(false);
      setMensaje("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos guardar la respuesta.");
    } finally {
      setOcupado(false);
    }
  }

  const puedeResponder = c.estado === "solicitada" || c.estado === "reprogramada";
  const puedeCerrar = c.estado === "confirmada";

  return (
    <li className="rounded-xl border border-borde bg-superficie p-3 sombra-tarjeta">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-tinta">{c.nombre_contacto}</p>
          <p className="text-xs text-secundario">
            {c.servicio_nombre} · {fechaLarga(c.fecha)} · {FRANJA[c.franja]} ·{" "}
            {MOTIVO_CITA_LEGIBLE[c.motivo]}
          </p>
          {c.vehiculo && <p className="text-xs text-secundario">🚗 {c.vehiculo}</p>}
          {c.telefono_contacto && (
            <p className="text-xs text-secundario">
              📞{" "}
              <a href={`tel:${c.telefono_contacto}`} className="underline">
                {c.telefono_contacto}
              </a>
            </p>
          )}
          {c.nota && <p className="mt-0.5 text-xs text-secundario">“{c.nota}”</p>}
        </div>
        <EstadoPill estado={c.estado} />
      </div>

      {(puedeResponder || puedeCerrar) && (
        <div className="mt-2.5 border-t border-borde pt-2.5">
          {!reprog ? (
            <>
              <input
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                maxLength={400}
                placeholder="Mensaje para el cliente (opcional)"
                className="w-full rounded-lg border border-borde-fuerte bg-superficie px-3 py-2 text-xs"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {puedeResponder && (
                  <>
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={() => responder("confirmada")}
                      className="rounded-full bg-accion px-3 py-1 text-xs font-semibold text-superficie disabled:opacity-60"
                    >
                      Confirmar
                    </button>
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={() => setReprog(true)}
                      className="rounded-full border border-borde-fuerte bg-superficie px-3 py-1 text-xs font-semibold text-secundario"
                    >
                      Reprogramar
                    </button>
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={() => responder("rechazada")}
                      className="rounded-full border border-destructivo px-3 py-1 text-xs font-semibold text-destructivo hover:bg-destructivo-tinte disabled:opacity-60"
                    >
                      Rechazar
                    </button>
                  </>
                )}
                {puedeCerrar && (
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() => responder("cumplida")}
                    className="rounded-full border border-borde-fuerte bg-superficie px-3 py-1 text-xs font-semibold text-secundario disabled:opacity-60"
                  >
                    Marcar cumplida
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium text-tinta">Nueva fecha</span>
                <input
                  type="date"
                  value={fecha}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setFecha(e.target.value)}
                  className="rounded-lg border border-borde-fuerte bg-superficie px-2 py-1.5 text-xs"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium text-tinta">Franja</span>
                <select
                  value={franja}
                  onChange={(e) => setFranja(e.target.value as FranjaAgenda)}
                  className="rounded-lg border border-borde-fuerte bg-superficie px-2 py-1.5 text-xs"
                >
                  {(["manana", "tarde", "noche", "todo_el_dia"] as FranjaAgenda[]).map((x) => (
                    <option key={x} value={x}>
                      {FRANJA[x]}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                disabled={ocupado}
                onClick={() => responder("reprogramada")}
                className="rounded-full bg-accion px-3 py-1.5 text-xs font-semibold text-superficie disabled:opacity-60"
              >
                Proponer
              </button>
              <button
                type="button"
                onClick={() => setReprog(false)}
                className="rounded-full border border-borde-fuerte bg-superficie px-3 py-1.5 text-xs font-semibold text-secundario"
              >
                Volver
              </button>
            </div>
          )}
          {error && <p className="mt-1 text-xs text-error">{error}</p>}
        </div>
      )}
    </li>
  );
}
