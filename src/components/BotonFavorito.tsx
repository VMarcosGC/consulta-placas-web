// ♡ favorito con un toque, sobre la foto de portada de cualquier tarjeta (MC1).
//
// Dos detalles que lo hacen correcto:
//   1) La tarjeta entera es un <Link>. Sin preventDefault/stopPropagation, tocar el ♡
//      navegaría al detalle en vez de guardar. Es un <button> real (no un div) para que
//      funcione con teclado y lectores de pantalla.
//   2) El favorito es por PLACA. Una tarjeta sin placa (referencia externa que no la
//      trae) no puede tener favorito: allí este botón no se renderiza (ver ListingCard).

"use client";

import type { ControlFavoritos } from "@/lib/favoritos";

export function BotonFavorito({
  placa,
  precioActual,
  control,
}: {
  placa: string;
  precioActual: number | null;
  control: ControlFavoritos;
}) {
  const guardado = control.esFavorito(placa);
  const ocupado = control.ocupado(placa);

  return (
    <button
      type="button"
      aria-label={guardado ? `Quitar ${placa} de tus favoritos` : `Guardar ${placa} en tus favoritos`}
      aria-pressed={guardado}
      disabled={ocupado}
      onClick={(e) => {
        // La tarjeta es un Link: el toque en el ♡ no debe navegar.
        e.preventDefault();
        e.stopPropagation();
        control.alternar(placa, precioActual);
      }}
      // Círculo flotante sobre la foto. Antes se leía como un cuadrado blanco hasta
      // que el `backdrop-blur` componía: el borde `--borde` (1.1:1 sobre foto clara)
      // no dibujaba la silueta. Ahora el anillo es `--borde-fuerte` (3:1, WCAG
      // 1.4.11) y la sombra `md`, así que es un círculo nítido desde el primer
      // frame, con o sin blur. 40px = área táctil mínima. El corazón lleno va en
      // `--marca` (no `--error`: DISENO reserva el rojo para fallos de la interfaz;
      // marca es el token de "activo/seleccionado", igual que los chips de filtro).
      className={`absolute right-2 top-2 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full text-lg leading-none shadow-md ring-1 backdrop-blur transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marca disabled:opacity-60 ${
        guardado
          ? "bg-marca text-superficie ring-marca"
          : "bg-superficie/90 text-secundario ring-borde-fuerte hover:text-marca"
      }`}
    >
      <span aria-hidden>{guardado ? "♥" : "♡"}</span>
    </button>
  );
}

// Invitación para el visitante anónimo que tocó un ♡. No es un 401 crudo ni una
// redirección de golpe: se le explica para qué sirve y él decide.
export function InvitacionFavorito({ onCerrar }: { onCerrar: () => void }) {
  return (
    // En celular se levanta por encima de la barra de navegación inferior (fixed):
    // si no, el aviso la tapa justo cuando el visitante necesita seguir navegando.
    // Se apoya en `--alto-barra-movil-total`, que ya incluye la safe area. Antes usaba
    // `--alto-barra-movil` a secas y en un teléfono con muesca el aviso caía DENTRO de
    // la barra —y con z-50 sobre z-40, encima de ella—. La variable es una sola para
    // que las dos alturas no puedan volver a desincronizarse.
    <div className="fixed inset-x-3 bottom-[calc(var(--alto-barra-movil-total)+0.75rem)] z-50 mx-auto max-w-md rounded-2xl border border-borde bg-superficie p-4 sombra-tarjeta md:bottom-3">
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none" aria-hidden>
          ♡
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-tinta">
            Guarda este auto para verlo después
          </p>
          <p className="mt-0.5 text-sm text-secundario">
            Crea tu cuenta gratis y arma tu lista. Te avisamos aquí mismo si alguno baja
            de precio.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href="/registro"
              className="inline-flex rounded-full bg-accion px-4 py-2 text-sm font-semibold text-superficie"
            >
              Crear cuenta gratis
            </a>
            <a
              href="/login"
              className="inline-flex rounded-full border border-borde-fuerte px-4 py-2 text-sm font-semibold text-secundario"
            >
              Ya tengo cuenta
            </a>
          </div>
        </div>
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar aviso"
          className="rounded-full px-2 py-1 text-secundario hover:text-secundario"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
