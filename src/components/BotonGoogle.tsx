// Botón oficial de Google Identity Services (TASK-015).
//
// El botón lo DIBUJA Google (`renderButton`), no nosotros: sus lineamientos de marca no
// permiten reconstruirlo con nuestros estilos. Por eso este componente no lleva paleta
// propia — solo lo mide, lo encaja en el ancho disponible y avisa hacia arriba con el
// `credential`. Quién canjea ese credential y qué hace con el resultado es decisión de
// quien lo usa (`AccesoGoogle` para entrar, `VincularGoogle` para vincular).
//
// TRES COSAS QUE NO SE PUEDEN PERDER AL TOCAR ESTE ARCHIVO:
//
//  1. **Sin `NEXT_PUBLIC_GOOGLE_CLIENT_ID` no se renderiza nada.** Un botón que falla en
//     silencio es peor que un botón ausente: el usuario lo pulsa, no pasa nada y no sabe
//     por qué. Quien lo use debe tener siempre visible el camino con contraseña.
//
//  2. **Se ve a 360px.** El público navega en gama baja. GIS acepta un `width` en px
//     entre 200 y 400 (fuera de rango lo ignora y vuelve a su ancho por defecto), así
//     que el ancho REAL del contenedor se mide y se recorta a ese rango. Nunca se le
//     pasa un ancho fijo: a 360px de viewport el contenido útil son ~312px y un 400
//     desbordaría.
//
//  3. **La medición va por `ResizeObserver`, no por una llamada suelta en el effect.**
//     Además de cubrir el giro de pantalla, es lo que mantiene el `setState` dentro de
//     un callback de un sistema externo y no en el cuerpo del effect
//     (react-hooks/set-state-in-effect, la regla que ya tiene 4 deudas en este repo).

"use client";

import { useEffect, useRef, useState } from "react";
import {
  GOOGLE_CLIENT_ID,
  cargarIdentidadGoogle,
  googleConfigurado,
  type OpcionesBotonGoogle,
} from "@/lib/google";

// Rango que acepta GIS. Ver punto 2 de arriba.
const ANCHO_MINIMO = 200;
const ANCHO_MAXIMO = 400;

type Estado = "cargando" | "listo" | "fallo";

export function BotonGoogle({
  texto = "continue_with",
  alCredencial,
  ocupado = false,
}: {
  /** Etiqueta que pone Google. "signin_with" en login, "signup_with" en registro. */
  texto?: OpcionesBotonGoogle["text"];
  /** Recibe el ID token crudo de Google. NO se decodifica acá ni en ningún lado. */
  alCredencial: (idToken: string) => void;
  /** Mientras se canjea el credential: tapa el botón para evitar el doble envío. */
  ocupado?: boolean;
}) {
  const refMedida = useRef<HTMLDivElement>(null);
  const refBoton = useRef<HTMLDivElement>(null);

  // El callback vive en un ref: `initialize` es estado GLOBAL de GIS (uno por página) y
  // volver a inicializarlo en cada render del padre sería tirar y rehacer el botón.
  const refCallback = useRef(alCredencial);
  useEffect(() => {
    refCallback.current = alCredencial;
  }, [alCredencial]);

  const [ancho, setAncho] = useState<number | null>(null);
  const [estado, setEstado] = useState<Estado>("cargando");

  // Medición del ancho disponible. El observer dispara su callback justo después de
  // `observe()`, así que el primer valor llega solo, sin medir a mano en el effect.
  useEffect(() => {
    const contenedor = refMedida.current;
    if (!contenedor) return;
    const observador = new ResizeObserver((entradas) => {
      const medido = Math.round(entradas[0]?.contentRect.width ?? 0);
      if (!medido) return;
      setAncho(Math.min(ANCHO_MAXIMO, Math.max(ANCHO_MINIMO, medido)));
    });
    observador.observe(contenedor);
    return () => observador.disconnect();
  }, []);

  // Carga del script + pintado del botón. Todos los setState ocurren tras un `await`
  // (nunca sincrónicamente en el cuerpo del effect).
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || ancho === null) return;
    const destino = refBoton.current;
    if (!destino) return;

    let activo = true;
    (async () => {
      try {
        const identidad = await cargarIdentidadGoogle();
        if (!activo) return;
        identidad.initialize({
          client_id: GOOGLE_CLIENT_ID,
          // Sin `nonce` a propósito: ver el encabezado de src/lib/google.ts.
          callback: (respuesta) => {
            if (respuesta.credential) refCallback.current(respuesta.credential);
          },
          // Nada de sesión automática: entrar es siempre un acto deliberado.
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        // StrictMode monta dos veces en dev y el efecto vuelve a correr al cambiar el
        // ancho: sin esto quedarían dos botones apilados.
        destino.replaceChildren();
        identidad.renderButton(destino, {
          type: "standard",
          theme: "outline",
          size: "large",
          shape: "rectangular",
          logo_alignment: "center",
          text: texto,
          locale: "es",
          width: ancho,
        });
        setEstado("listo");
      } catch {
        if (!activo) return;
        setEstado("fallo");
      }
    })();

    return () => {
      activo = false;
    };
  }, [ancho, texto]);

  // Ausente antes que roto: sin client_id en el build no hay botón que valga.
  if (!googleConfigurado()) return null;

  return (
    <div ref={refMedida} className="w-full">
      {estado === "fallo" ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          No pudimos cargar el ingreso con Google. Puedes entrar con tu contraseña.
        </p>
      ) : (
        <div
          /* `min-h-[40px]` = el alto del botón `size: "large"` de Google: reserva el
             hueco mientras carga para que el formulario de abajo no salte. */
          className={`flex min-h-[40px] justify-center ${
            ocupado ? "pointer-events-none opacity-60" : ""
          }`}
        >
          <div ref={refBoton} />
        </div>
      )}
    </div>
  );
}
