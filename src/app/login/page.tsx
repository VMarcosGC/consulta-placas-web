"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { iniciarSesion } from "@/lib/api";
import { guardarToken } from "@/lib/auth";
import { ApiError } from "@/types/api";
import { CampoTexto } from "@/components/CampoTexto";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-3xl font-bold">Iniciar sesión</h1>
      <p className="mt-2 text-sm text-slate-500">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="text-brand-gradient font-medium">Crear una</Link>
      </p>

      <Suspense fallback={<div className="mt-8 h-48 animate-pulse rounded-xl bg-slate-100" />}>
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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const r = await iniciarSesion(email, password);
      guardarToken(r.access_token);
      router.push(redirigir);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("No pudimos iniciar sesión. Inténtalo de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
      <CampoTexto label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" requerido />
      <CampoTexto label="Contraseña" type="password" value={password} onChange={setPassword} autoComplete="current-password" requerido />
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={enviando}
        className="w-full rounded-xl bg-brand-gradient px-4 py-3 font-semibold text-white shadow-sm disabled:opacity-60"
      >
        {enviando ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}