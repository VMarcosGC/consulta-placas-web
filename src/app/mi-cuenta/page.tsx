// Mi cuenta — cómo entras (TASK-015).
//
// POR QUÉ EXISTE ESTA PÁGINA Y NO UNA SECCIÓN EN "MI GARAGE": el mensaje del 409 de
// `POST /auth/google` promete literalmente "vincula Google desde tu perfil". Las tres
// pantallas privadas que había son otra cosa —el garage es tu historial de autos, "Mis
// publicaciones" son tus anuncios y "Mi contacto" es tu identidad COMERCIAL ante un
// comprador—, así que la cuenta en sí no tenía dónde vivir. Sin un lugar al que llegar,
// el 409 seguiría siendo un callejón por más bien redactado que esté el mensaje.
//
// Se llega desde el menú de la cuenta (MenuCuenta) y, cuando el 409 salta en el login,
// desde `/login?next=/mi-cuenta`: quien entra con su contraseña después de que Google lo
// rebotara aterriza directo en el control que le prometimos.
//
// Página privada: sin SSR, sesión desde localStorage (patrón del repo).

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { obtenerPerfil } from "@/lib/api";
import { tieneSesion } from "@/lib/auth";
import { ApiError, type Usuario } from "@/types/api";
import { VincularGoogle } from "@/components/VincularGoogle";

const RUTA = "/mi-cuenta";

export default function MiCuentaPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // El fetch va en un IIFE async dentro del effect: los setState ocurren tras el await
  // (nunca sincrónicamente), como pide react-hooks/set-state-in-effect. `activo` evita
  // tocar estado tras desmontar. Mismo patrón que mi-garage y mi-perfil-vendedor.
  useEffect(() => {
    if (!tieneSesion()) {
      router.push(`/login?next=${RUTA}`);
      return;
    }
    let activo = true;
    (async () => {
      try {
        const perfil = await obtenerPerfil();
        if (!activo) return;
        setUsuario(perfil);
        setError(null);
      } catch (err) {
        if (!activo) return;
        if (err instanceof ApiError && err.status === 401) {
          router.push(`/login?next=${RUTA}`);
          return;
        }
        setError("No pudimos cargar tu cuenta. Revisa tu conexión e intenta de nuevo.");
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, [router]);

  if (cargando) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center text-slate-400">
        Cargando tu cuenta…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-bold">Mi cuenta</h1>
      <p className="mt-2 text-sm text-slate-500">Cómo entras a Revisa tu Carro EC.</p>

      {error && (
        <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {usuario && (
        <section className="sombra-tarjeta mt-8 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">Tus datos</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <dt className="text-slate-500">Correo</dt>
              {/* `break-all`: un correo largo no puede empujar la tarjeta a 360px. */}
              <dd className="break-all font-medium text-slate-900">{usuario.email}</dd>
            </div>
            {usuario.nombre && (
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <dt className="text-slate-500">Nombre</dt>
                <dd className="font-medium text-slate-900">{usuario.nombre}</dd>
              </div>
            )}
          </dl>
        </section>
      )}

      <div className="mt-6">
        <VincularGoogle
          alVincular={(u) => setUsuario(u)}
          alExpirarSesion={() => router.push(`/login?next=${RUTA}`)}
        />
      </div>

      {/* El contacto de vendedor es OTRA cosa (identidad comercial, no de cuenta) y vive
          en su propia pantalla; se enlaza para que nadie los confunda ni los busque acá. */}
      <p className="mt-6 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 sombra-tarjeta">
        ¿Buscas el nombre y el número con los que te escriben los compradores? Eso vive en{" "}
        <Link
          href="/marketplace/mi-perfil-vendedor"
          className="font-semibold text-blue-600 hover:text-blue-800"
        >
          Mi contacto
        </Link>
        .
      </p>
    </div>
  );
}
