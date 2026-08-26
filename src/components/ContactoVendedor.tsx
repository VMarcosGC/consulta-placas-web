// Contacto comprador-vendedor en el detalle del anuncio (M5 / TASK-001).
//
// PRIVACIDAD (§9): el teléfono **no viaja** en el feed, en /buscar ni en el detalle de la
// publicación. Este componente lo pide recién cuando el comprador pulsa "Ver teléfono", y
// por eso no hay nada que prefetchear, ni atributo oculto, ni número en el HTML inicial.
// Un número servido en un listado público lo cosechan bots en días; la acción explícita
// del comprador es la barrera. No se cobra: contactar es libre y gratuito (§1.0.3).
//
// El enlace de WhatsApp (`whatsapp_url`) llega ARMADO del backend, con el mensaje
// prellenado en es-EC. No se reconstruye acá ni se le agrega texto: la app móvil que
// venga después tendría que reimplementar esa lógica (AGENTS §1.0.2).

"use client";

import { useState } from "react";
import Link from "next/link";
import { revelarContactoVendedor } from "@/lib/api";
import { telefonoLegible } from "@/lib/vendedor";
import { ApiError, ContactoVendedorSalida } from "@/types/api";

// Estados del bloque. `sin_contacto` (409) no es un error: es "dato no disponible".
type Estado = "inicial" | "cargando" | "revelado" | "sin_contacto" | "no_disponible" | "error";

export function ContactoVendedor({
  publicacionId,
  esMia = false,
}: {
  publicacionId: number;
  /** El visitante es el dueño del anuncio: ve una vista previa, no el botón del comprador. */
  esMia?: boolean;
}) {
  const [estado, setEstado] = useState<Estado>("inicial");
  const [contacto, setContacto] = useState<ContactoVendedorSalida | null>(null);

  // El DUEÑO no ve el botón "Ver teléfono": ve qué encontrará un comprador. Pedirse el
  // contacto a sí mismo no le aporta nada —ya conoce su número— y ensuciaría la métrica
  // de demanda. El backend además ya no registra la revelación cuando quien consulta es
  // el vendedor; esto es la otra mitad: ni siquiera se dispara la llamada.
  if (esMia) {
    return (
      <div className="mt-4 rounded-2xl border border-borde bg-superficie p-4 sombra-tarjeta">
        <p className="text-xs font-semibold uppercase tracking-wide text-secundario">
          Así lo verán los compradores
        </p>
        <p className="mt-2 text-sm text-secundario">
          En tu anuncio aparece un botón <b className="text-tinta">Ver teléfono</b>. Al
          pulsarlo, el comprador ve tu número y un botón para escribirte por WhatsApp con
          un mensaje ya redactado.
        </p>
        <p className="mt-2 text-sm text-secundario">
          Tu número no aparece en el listado ni en esta página: se muestra solo cuando
          alguien lo pide, para protegerlo de robots.
        </p>
        <Link
          href="/marketplace/mi-perfil-vendedor"
          className="mt-3 inline-flex text-sm font-semibold text-marca hover:text-marca-texto"
        >
          Editar mi contacto →
        </Link>
      </div>
    );
  }

  async function verTelefono() {
    setEstado("cargando");
    try {
      setContacto(await revelarContactoVendedor(publicacionId));
      setEstado("revelado");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // El vendedor todavía no cargó su número. No es culpa de nadie y se dice así.
        setEstado("sin_contacto");
      } else if (err instanceof ApiError && err.status === 404) {
        setEstado("no_disponible");
      } else {
        // Incluye el fallo de red (que no llega como ApiError) y cualquier otro código.
        setEstado("error");
      }
    }
  }

  if (estado === "revelado" && contacto) {
    return (
      <div className="mt-4 rounded-2xl border border-confirmado bg-confirmado-tinte p-4">
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
          Escribir por WhatsApp
          <span aria-hidden>↗</span>
        </a>
        <p className="mt-2 text-xs text-secundario">
          Coordina la revisión del vehículo antes de cualquier pago. Nunca envíes dinero
          por adelantado.
        </p>
      </div>
    );
  }

  if (estado === "sin_contacto") {
    return (
      <div className="mt-4 rounded-2xl border border-borde bg-superficie-tenue p-4">
        <p className="text-sm font-semibold text-tinta">
          El vendedor todavía no publicó un teléfono de contacto.
        </p>
        <p className="mt-1 text-sm text-secundario">
          Puedes guardar este anuncio en favoritos y volver a intentarlo más tarde.
        </p>
      </div>
    );
  }

  if (estado === "no_disponible") {
    return (
      <div className="mt-4 rounded-2xl border border-borde bg-superficie p-4 sombra-tarjeta">
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
    );
  }

  return (
    <div className="mt-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={verTelefono}
          disabled={estado === "cargando"}
          className="rounded-full bg-accion px-6 py-3 text-center text-sm font-semibold text-superficie shadow-sm transition hover:opacity-90 disabled:opacity-60"
        >
          {estado === "cargando" ? "Buscando el contacto…" : "Ver teléfono"}
        </button>
      </div>

      {estado === "error" && (
        <p className="mt-2 rounded-xl border border-error bg-error-tinte px-4 py-2.5 text-sm text-error">
          No pudimos obtener el contacto. Revisa tu conexión e intenta de nuevo.
        </p>
      )}

      {estado !== "error" && (
        <p className="mt-2 text-xs text-secundario">
          Mostramos el número solo cuando lo pides, para protegerlo de robots.
        </p>
      )}
    </div>
  );
}
