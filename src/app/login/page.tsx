"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { iniciarSesion } from "@/lib/api";
import { guardarToken } from "@/lib/auth";
import { ApiError } from "@/types/api";
import { CampoTexto } from "@/components/CampoTexto";
import { AccesoGoogle, RUTA_VINCULAR } from "@/components/AccesoGoogle";

// id del campo de correo: es a donde lleva el botón de salida del 409 de Google.
const ID_EMAIL = "login-email";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-3xl font-bold">Iniciar sesión</h1>
      <p className="mt-2 text-sm text-secundario">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="text-marca font-medium">Crear una</Link>
      </p>

      <Suspense fallback={<div className="mt-8 h-48 animate-pulse rounded-xl bg-superficie-tenue" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}

// Componente cliente que usa useSearchParams — Next exige que esté dentro
// de un boundary <Suspense> para soportar el static prerender.
function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirigir = params.get("next") ?? "/mi-garage";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // ¿Google rebotó con 409 en ESTA visita? Cambia a dónde va el usuario tras entrar con
  // su contraseña: al control de vinculación, que es lo que el mensaje le prometió.
  // Solo se activa si el 409 ocurrió de verdad; si no, manda el `next` de siempre.
  const [veniaDeConflictoGoogle, setVeniaDeConflictoGoogle] = useState(false);

  // Sesión iniciada, venga de donde venga: mismo guardado y misma redirección para el
  // JWT de contraseña y para el de Google. El frontend no distingue de dónde salió.
  function entrar(accessToken: string, destino: string) {
    guardarToken(accessToken);
    router.push(destino);
    router.refresh();
  }

  // Salida del 409, mitad 1: el formulario de contraseña ya está en esta pantalla, así
  // que se lo trae a la vista y se le pone el foco encima. El correo NO se prellena: el
  // id_token no se decodifica en el frontend, así que no lo tenemos y no se inventa.
  function irAContrasena() {
    setVeniaDeConflictoGoogle(true);
    const campo = document.getElementById(ID_EMAIL);
    campo?.scrollIntoView({ behavior: "smooth", block: "center" });
    campo?.focus({ preventScroll: true });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const r = await iniciarSesion(email, password);
      entrar(r.access_token, veniaDeConflictoGoogle ? RUTA_VINCULAR : redirigir);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("No pudimos iniciar sesión. Inténtalo de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      {/* Google primero: el punto de la función es que nadie tenga que teclear una
          contraseña. El separador "o" lo pinta AccesoGoogle. */}
      <AccesoGoogle
        contexto="login"
        alObtenerToken={(token) => entrar(token, redirigir)}
        alPedirContrasena={irAContrasena}
      />

      <form onSubmit={submit} className="mt-6 space-y-4">
        <CampoTexto id={ID_EMAIL} label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" requerido />
        <CampoTexto label="Contraseña" type="password" value={password} onChange={setPassword} autoComplete="current-password" requerido />
        {error && (
          <p className="rounded-xl border border-error bg-error-tinte px-4 py-2 text-sm text-error">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded-xl bg-accion px-4 py-3 font-semibold text-superficie shadow-sm disabled:opacity-60"
        >
          {enviando ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </>
  );
}
