// Vincular Google a la cuenta ya iniciada (TASK-015) — la SEGUNDA MITAD de la salida
// del 409 de `POST /auth/google`.
//
// Sin esta pantalla, el 409 sería un callejón: al usuario con correo no autoritativo
// (@hotmail.com, corporativo sin claim `hd`) se le dice "entra con tu contraseña y
// vincula Google desde tu perfil" y no habría ningún "desde tu perfil" al que ir.
//
// `POST /auth/google/vincular` exige sesión a propósito: haberse autenticado es la
// prueba de posesión de la cuenta que el claim de correo de Google no da.
//
// LO QUE NO SE PUEDE SABER ACÁ, Y POR ESO NO SE AFIRMA: `UsuarioSalida` (el schema que
// devuelven /auth/me y este endpoint) NO trae `id_google` ni `proveedor_autenticacion`,
// así que el frontend no tiene forma de mostrar "ya vinculada" al entrar. Inventarlo
// sería transformar datos que el backend no consolidó (AGENTS §4). El control se ofrece
// siempre y es idempotente: revincular la MISMA cuenta de Google responde 200 y no
// cambia nada.

"use client";

import { useState } from "react";
import { BotonGoogle } from "@/components/BotonGoogle";
import { vincularGoogle } from "@/lib/api";
import { googleConfigurado } from "@/lib/google";
import { ApiError, type Usuario } from "@/types/api";

export function VincularGoogle({
  alVincular,
  alExpirarSesion,
}: {
  /** Se dispara con el usuario ya actualizado que devuelve el backend. */
  alVincular?: (usuario: Usuario) => void;
  /** 401: el JWT venció mientras el usuario estaba en la pantalla. */
  alExpirarSesion?: () => void;
}) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  async function vincular(idToken: string) {
    setError(null);
    setListo(false);
    setEnviando(true);
    try {
      const usuario = await vincularGoogle(idToken);
      setListo(true);
      alVincular?.(usuario);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          alExpirarSesion?.();
          return;
        }
        if (err.status === 503) {
          setError(
            "Vincular con Google no está disponible ahora mismo. Tu cuenta sigue funcionando con tu contraseña; intenta más tarde."
          );
        } else {
          // 409 (dos mensajes posibles) y 422 traen copy es-EC del backend, y el del 409
          // ya explica qué hacer. Se muestra tal cual.
          setError(err.message);
        }
      } else {
        setError("No pudimos conectarnos con el servidor. Revisa tu conexión e inténtalo de nuevo.");
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="sombra-tarjeta rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-slate-900">Entrar con Google</h2>
      <p className="mt-1.5 text-sm text-slate-600">
        Si vinculas tu cuenta de Google, la próxima vez entras con un toque y no tienes
        que recordar tu contraseña. Tu correo, tus autos y tu saldo siguen siendo los
        mismos.
      </p>

      {!googleConfigurado() ? (
        // Ausente antes que roto: sin `NEXT_PUBLIC_GOOGLE_CLIENT_ID` no hay botón, y se
        // dice por qué en vez de dejar una tarjeta vacía.
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          Vincular con Google no está disponible en esta versión. Puedes seguir entrando
          con tu contraseña.
        </p>
      ) : listo ? (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">
          Listo. Ya puedes entrar con Google usando este correo.
        </p>
      ) : (
        <div className="mt-4">
          <BotonGoogle texto="continue_with" alCredencial={vincular} ocupado={enviando} />
          {enviando && (
            <p className="mt-3 text-center text-sm text-slate-500">Vinculando…</p>
          )}
          {error && (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
