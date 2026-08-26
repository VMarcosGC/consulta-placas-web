// Bloque "entrar con Google" de las pantallas de login y de registro (TASK-015).
//
// Canjea el `credential` de Google por el JWT propio (`POST /auth/google`) y le entrega
// el `access_token` al padre, que lo guarda y redirige EXACTAMENTE igual que tras un
// login con contraseña: el frontend no distingue de dónde salió la sesión.
//
// ── EL 409 ES EL PUNTO IMPORTANTE DE ESTE ARCHIVO ────────────────────────────────────
// Ocurre cuando el correo de Google ya existe como cuenta local y el dominio NO es
// autoritativo (@hotmail.com, corporativos sin claim `hd`; los @gmail.com se enlazan
// solos). El backend responde con copy accionable, pero un texto rojo a secas deja al
// usuario ATRAPADO: quiso evitar la contraseña y le dicen que use la contraseña, sin
// decirle dónde ni cómo dejar de necesitarla.
//
// Por eso el 409 NO se pinta como error (rojo = algo se rompió) sino como un camino en
// ámbar, con las DOS mitades de la salida a la vista:
//   1. acá y ahora → un botón que lleva al formulario de contraseña;
//   2. ya adentro  → /mi-cuenta, donde `POST /auth/google/vincular` cierra el círculo.
// La segunda mitad no es un texto de consuelo: la pantalla existe y el padre manda al
// usuario ahí después de que entre con su contraseña.
//
// El correo NO se prellena: el `id_token` no se decodifica en el frontend (ni acá ni en
// ningún lado), así que no lo tenemos. Antes que inventarlo, se lleva al formulario.

"use client";

import Link from "next/link";
import { useState } from "react";
import { BotonGoogle } from "@/components/BotonGoogle";
import { iniciarSesionConGoogle } from "@/lib/api";
import { googleConfigurado } from "@/lib/google";
import { ApiError } from "@/types/api";

// A dónde va el usuario tras entrar con contraseña cuando venía de un 409: la pantalla
// donde puede vincular Google. Es lo que le prometimos en el mensaje.
export const RUTA_VINCULAR = "/mi-cuenta";

export function AccesoGoogle({
  contexto,
  alObtenerToken,
  alPedirContrasena,
}: {
  /** Cambia la etiqueta del botón de Google y a dónde apunta la salida del 409. */
  contexto: "login" | "registro";
  /** Recibe el `access_token`. El padre guarda la sesión y redirige, como en el login. */
  alObtenerToken: (accessToken: string) => void;
  /**
   * Login: enfoca el formulario de contraseña, que ya está en esta misma pantalla, y
   * avisa al padre de que hubo un 409 (para redirigir a /mi-cuenta al entrar).
   * Registro: se omite — no hay formulario de contraseña útil acá y la salida es un
   * enlace a /login.
   */
  alPedirContrasena?: () => void;
}) {
  const [canjeando, setCanjeando] = useState(false);
  // El 409 se guarda aparte de `error`: no es un fallo, es una bifurcación del flujo.
  const [conflicto, setConflicto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function canjear(idToken: string) {
    setError(null);
    setConflicto(null);
    setCanjeando(true);
    try {
      const r = await iniciarSesionConGoogle(idToken);
      alObtenerToken(r.access_token);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          // El copy lo manda el backend (hay dos mensajes posibles) y se muestra tal
          // cual: reescribirlo acá haría que el usuario lea algo distinto de lo que
          // decidió el servidor.
          setConflicto(err.message);
          alPedirContrasena?.();
        } else if (err.status === 503) {
          // Falta GOOGLE_CLIENT_ID en el backend. Es un problema NUESTRO, y se dice sin
          // culpar a nadie ni dejar al usuario sin salida.
          setError(
            "El ingreso con Google no está disponible ahora mismo. Puedes entrar con tu contraseña."
          );
        } else {
          // 401 (credencial inválida) y 422 (claims insuficientes) traen copy es-EC del
          // backend. Se muestra ese y se agrega la alternativa que siempre existe.
          setError(`${err.message} También puedes entrar con tu contraseña.`);
        }
      } else {
        setError("No pudimos conectarnos con el servidor. Revisa tu conexión e inténtalo de nuevo.");
      }
    } finally {
      setCanjeando(false);
    }
  }

  // Sin client_id en el build no hay bloque: ni botón, ni separador, ni hueco. La
  // comprobación va DESPUÉS de los hooks (regla de hooks) y es constante por build.
  if (!googleConfigurado()) return null;

  const esRegistro = contexto === "registro";

  return (
    <div className="mt-8">
      <BotonGoogle
        texto={esRegistro ? "signup_with" : "signin_with"}
        alCredencial={canjear}
        ocupado={canjeando}
      />

      {canjeando && (
        <p className="mt-3 text-center text-sm text-secundario">Entrando con Google…</p>
      )}

      {/* ── Salida del 409, mitad 1: volver al formulario de contraseña ───────────── */}
      {conflicto && (
        <div className="mt-4 rounded-xl border border-borde bg-superficie-tenue px-4 py-3 text-sm text-secundario">
          <p className="font-semibold">{conflicto}</p>
          <p className="mt-1.5 text-xs text-secundario">
            Es tu misma cuenta: entra con tu contraseña y, ya adentro, vincula Google
            desde <span className="font-semibold">Mi cuenta</span>. La próxima vez entras
            con un toque.
          </p>
          {alPedirContrasena ? (
            <button
              type="button"
              onClick={alPedirContrasena}
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-borde-fuerte bg-superficie px-4 py-2.5 text-sm font-semibold text-tinta hover:bg-superficie-tenue"
            >
              Entrar con mi contraseña
            </button>
          ) : (
            <Link
              href={`/login?next=${RUTA_VINCULAR}`}
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-borde-fuerte bg-superficie px-4 py-2.5 text-sm font-semibold text-tinta hover:bg-superficie-tenue"
            >
              Entrar con mi contraseña
            </Link>
          )}
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-xl border border-error bg-error-tinte px-4 py-2 text-sm text-error">
          {error}
        </p>
      )}

      {/* Separador. El formulario de contraseña queda debajo: en registro el botón de
          Google es una ALTERNATIVA visible al formulario, no un enlace al pie. */}
      <div className="mt-6 flex items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-borde" />
        <span className="text-xs uppercase tracking-wide text-secundario">o</span>
        <span className="h-px flex-1 bg-borde" />
      </div>
    </div>
  );
}
