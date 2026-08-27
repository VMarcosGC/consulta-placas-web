// Aviso "todavía no pueden contactarte" para "Mis publicaciones" (M5 / cierre Ola 2).
//
// Es el puente entre publicar un auto y poder recibir mensajes: si el vendedor tiene
// anuncios activos pero no cargó su número, el comprador pulsa "Ver teléfono" y recibe un
// 409 — el ciclo comprador-vendedor muere ahí. Por eso el recordatorio va donde el
// vendedor administra sus anuncios, no escondido en el menú de la cuenta.
//
// PRESENTACIONAL: la página (`mis-publicaciones`) resuelve el perfil de vendedor junto al
// listado y decide si se muestra (hay >= 1 anuncio `activa` y el perfil no tiene
// `telefono`). Este componente solo pinta. NO muestra el número: ese dato vive en el
// formulario del vendedor y en la revelación del comprador (privacidad, §9).
//
// Token `--marca` y no `--atencion`: DISENO.md §2 reserva `--atencion` para "el vehículo
// tiene una multa / matrícula vencida". Esto es una invitación a completar un paso
// pendiente del anuncio, el mismo tono que el onboarding de `mi-perfil-vendedor`.

"use client";

import Link from "next/link";

export function AvisoContactoVendedor() {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-marca bg-marca-tinte p-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-marca-texto">
          Tus anuncios están activos, pero los compradores todavía no pueden contactarte:
          falta tu número.
        </p>
        <p className="mt-0.5 text-sm text-marca-texto">
          Agrega el celular con WhatsApp donde quieres recibir los mensajes y tu anuncio
          queda listo para vender.
        </p>
      </div>
      <Link
        href="/marketplace/mi-perfil-vendedor"
        className="shrink-0 rounded-full bg-accion px-5 py-2.5 text-sm font-semibold text-superficie shadow-sm hover:opacity-90"
      >
        Agregar mi contacto →
      </Link>
    </div>
  );
}
