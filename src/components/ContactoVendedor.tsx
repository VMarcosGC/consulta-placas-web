// Contacto comprador↔vendedor en el detalle del anuncio.
//
// BARRERA DE SEGURIDAD (migración 0035, Marcos 2026-09-02): el WhatsApp del vendedor
// ya NO se entrega con un clic. El comprador escribe primero por el CHAT INTERNO de
// CarStore; recién cuando el vendedor responde (o comparte su número a mano) se
// habilita el botón de WhatsApp. Así el número no lo cosecha un bot ni un curioso, y
// queda un registro de contacto dentro de la plataforma.
//
// PRIVACIDAD (§9): el teléfono no viaja en el feed ni en el detalle. `whatsapp_url`
// llega ARMADO del backend (mensaje en es-EC); no se reconstruye acá.

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { abrirConversacion, revelarContactoVendedor } from "@/lib/api";
import { tieneSesion } from "@/lib/auth";
import { telefonoLegible } from "@/lib/vendedor";
import { PanelChat } from "@/components/PanelChat";
import { ApiError, type ContactoVendedorSalida, type Conversacion } from "@/types/api";

type EstadoWa = "oculto" | "cargando" | "revelado" | "sin_contacto" | "no_disponible" | "error";

export function ContactoVendedor({
  publicacionId,
  esMia = false,
}: {
  publicacionId: number;
  /** El visitante es el dueño del anuncio: ve una vista previa, no el flujo del comprador. */
  esMia?: boolean;
}) {
  const pathname = usePathname();
  const [haySesion, setHaySesion] = useState(false);
  const [convId, setConvId] = useState<number | null>(null);
  const [abriendo, setAbriendo] = useState(false);
  const [primerMensaje, setPrimerMensaje] = useState("");
  const [contactoHabilitado, setContactoHabilitado] = useState(false);
  const [estadoWa, setEstadoWa] = useState<EstadoWa>("oculto");
  const [contacto, setContacto] = useState<ContactoVendedorSalida | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    const leer = async () => {
      if (vivo) setHaySesion(tieneSesion());
    };
    void leer();
    window.addEventListener("sesion-cambiada", leer);
    return () => {
      vivo = false;
      window.removeEventListener("sesion-cambiada", leer);
    };
  }, []);

  const loginHref = useMemo(
    () => `/login?next=${encodeURIComponent(pathname ?? "/marketplace")}`,
    [pathname]
  );

  // ── Vista del DUEÑO ────────────────────────────────────────────────────────
  if (esMia) {
    return (
      <div className="mt-4 rounded-2xl border border-borde bg-superficie p-4 sombra-tarjeta">
        <p className="text-xs font-semibold uppercase tracking-wide text-secundario">
          Así funciona el contacto
        </p>
        <p className="mt-2 text-sm text-secundario">
          Los interesados te escriben por el <b className="text-tinta">chat interno</b> de
          CarStore. Tu teléfono no aparece en ningún lado hasta que <b className="text-tinta">
          tú respondes</b> en ese chat (o tocas “Compartir mi WhatsApp”). Así proteges tu
          número de robots y curiosos.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link
            href="/mensajes"
            className="inline-flex text-sm font-semibold text-marca hover:text-marca-texto"
          >
            Ver mis conversaciones →
          </Link>
          <Link
            href="/marketplace/mi-perfil-vendedor"
            className="inline-flex text-sm font-semibold text-marca hover:text-marca-texto"
          >
            Editar mi contacto →
          </Link>
        </div>
      </div>
    );
  }

  // ── Sin sesión ────────────────────────────────────────────────────────────
  if (!haySesion) {
    return (
      <div className="mt-4 rounded-2xl border border-borde bg-superficie p-4 sombra-tarjeta">
        <p className="text-sm font-semibold text-tinta">
          Inicia sesión para escribirle al vendedor
        </p>
        <p className="mt-1 text-sm text-secundario">
          El contacto es por el chat interno de CarStore. Es gratis y no compartes tu
          número hasta que quieras.
        </p>
        <Link
          href={loginHref}
          className="mt-3 inline-flex rounded-full bg-accion px-6 py-3 text-sm font-semibold text-superficie shadow-sm transition hover:opacity-90"
        >
          Iniciar sesión
        </Link>
      </div>
    );
  }

  async function iniciarChat() {
    if (abriendo) return;
    setAbriendo(true);
    setError(null);
    try {
      const c: Conversacion = await abrirConversacion(
        publicacionId,
        primerMensaje.trim() || undefined
      );
      setConvId(c.id);
      setContactoHabilitado(c.contacto_habilitado);
      setPrimerMensaje("");
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError("Este anuncio ya no está disponible.");
      } else if (err instanceof ApiError && err.status === 409) {
        setError("Este anuncio todavía no tiene un vendedor con quien chatear.");
      } else if (err instanceof ApiError && err.status === 422) {
        setError("No puedes iniciar un chat sobre tu propio anuncio.");
      } else {
        setError("No pudimos abrir el chat. Revisa tu conexión e intenta de nuevo.");
      }
    } finally {
      setAbriendo(false);
    }
  }

  async function verWhatsapp() {
    setEstadoWa("cargando");
    try {
      setContacto(await revelarContactoVendedor(publicacionId));
      setEstadoWa("revelado");
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        // Barrera: falta que el vendedor responda. Aseguramos el hilo abierto.
        const cid = (err.body as { detail?: { conversacion_id?: number | null } })?.detail
          ?.conversacion_id;
        if (typeof cid === "number") setConvId(cid);
        else if (convId == null) void iniciarChat();
        setEstadoWa("oculto");
        setError(
          "Escríbele al vendedor por el chat. Cuando te responda se habilita su WhatsApp."
        );
      } else if (err instanceof ApiError && err.status === 409) {
        setEstadoWa("sin_contacto");
      } else if (err instanceof ApiError && err.status === 404) {
        setEstadoWa("no_disponible");
      } else {
        setEstadoWa("error");
      }
    }
  }

  return (
    <div className="mt-4 space-y-3">
      {/* Chat interno: canal primario */}
      {convId == null ? (
        <div className="rounded-2xl border border-borde bg-superficie p-4 sombra-tarjeta">
          <p className="text-sm font-bold text-tinta">Escríbele al vendedor</p>
          <p className="mt-1 text-sm text-secundario">
            Coordina la revisión del auto por el chat de CarStore. Sin dar tu número.
          </p>
          <textarea
            value={primerMensaje}
            onChange={(e) => setPrimerMensaje(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Hola, ¿sigue disponible? Me interesa y quisiera coordinar una revisión."
            className="mt-3 w-full resize-y rounded-xl border border-borde bg-superficie px-3 py-2 text-sm text-tinta outline-none focus:border-marca"
          />
          <button
            type="button"
            onClick={iniciarChat}
            disabled={abriendo}
            className="mt-2 inline-flex rounded-full bg-accion px-6 py-3 text-sm font-semibold text-superficie shadow-sm transition hover:opacity-90 disabled:opacity-60"
          >
            {abriendo ? "Abriendo el chat…" : "Enviar mensaje"}
          </button>
        </div>
      ) : (
        <PanelChat
          key={convId}
          conversacionId={convId}
          onActualizar={(c) => setContactoHabilitado(c.contacto_habilitado)}
        />
      )}

      {/* WhatsApp: se desbloquea cuando el vendedor respondió */}
      {estadoWa === "revelado" && contacto ? (
        <div className="rounded-2xl border border-confirmado bg-confirmado-tinte p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-confirmado-texto">
            Contacto del vendedor
          </p>
          <p className="mt-1 text-2xl font-black text-tinta">
            {telefonoLegible(contacto.telefono)}
          </p>
          {contacto.nombre_publico && (
            <p className="text-sm text-secundario">{contacto.nombre_publico}</p>
          )}
          <a
            href={contacto.whatsapp_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-accion px-6 py-3 text-sm font-semibold text-superficie shadow-sm transition hover:opacity-90"
          >
            Escribir por WhatsApp <span aria-hidden>↗</span>
          </a>
          <p className="mt-2 text-xs text-secundario">
            Coordina la revisión del vehículo antes de cualquier pago. Nunca envíes dinero
            por adelantado.
          </p>
        </div>
      ) : estadoWa === "sin_contacto" ? (
        <div className="rounded-2xl border border-borde bg-superficie-tenue p-4">
          <p className="text-sm font-semibold text-tinta">
            El vendedor todavía no publicó un teléfono.
          </p>
          <p className="mt-1 text-sm text-secundario">
            Puedes seguir por el chat interno mientras tanto.
          </p>
        </div>
      ) : estadoWa === "no_disponible" ? (
        <div className="rounded-2xl border border-borde bg-superficie p-4 sombra-tarjeta">
          <p className="text-sm font-semibold text-secundario">
            Este anuncio ya no está disponible.
          </p>
          <Link
            href="/marketplace"
            className="mt-2 inline-flex text-sm font-semibold text-marca hover:text-marca-texto"
          >
            Ver otros autos publicados →
          </Link>
        </div>
      ) : (
        <button
          type="button"
          onClick={verWhatsapp}
          disabled={estadoWa === "cargando" || !contactoHabilitado}
          className={`inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition ${
            contactoHabilitado
              ? "bg-accion text-superficie shadow-sm hover:opacity-90"
              : "cursor-not-allowed border border-borde-fuerte text-secundario"
          }`}
        >
          {contactoHabilitado ? (
            <>Ver WhatsApp del vendedor</>
          ) : (
            <>🔒 El WhatsApp se habilita cuando el vendedor responde</>
          )}
        </button>
      )}

      {estadoWa === "error" && (
        <p className="rounded-xl border border-error bg-error-tinte px-4 py-2.5 text-sm text-error">
          No pudimos obtener el contacto. Revisa tu conexión e intenta de nuevo.
        </p>
      )}
      {error && estadoWa !== "error" && (
        <p className="rounded-xl border border-borde bg-superficie-tenue px-4 py-2.5 text-sm text-secundario">
          {error}
        </p>
      )}
    </div>
  );
}
