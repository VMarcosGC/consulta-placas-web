"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { registrarUsuario, iniciarSesion } from "@/lib/api";
import { guardarToken } from "@/lib/auth";
import { ApiError } from "@/types/api";
import { CampoTexto } from "@/components/CampoTexto";

export default function RegistroPage() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setEnviando(true);
    try {
      await registrarUsuario({ email, password, nombre: nombre || undefined });
      // Auto-login: el UX espera quedar adentro tras crear cuenta.
      const r = await iniciarSesion(email, password);
      guardarToken(r.access_token);
      router.push("/mi-garage");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("No pudimos crear la cuenta. Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-3xl font-bold">Crear cuenta</h1>
      <p className="mt-2 text-sm text-zinc-400">
        ¿Ya tenés cuenta?{" "}
        <Link href="/login" className="text-brand-gradient font-medium">Iniciar sesión</Link>
      </p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <CampoTexto label="Nombre (opcional)" value={nombre} onChange={setNombre} autoComplete="name" />
        <CampoTexto label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" requerido />
        <CampoTexto label="Contraseña (8+ caracteres)" type="password" value={password} onChange={setPassword} autoComplete="new-password" requerido />
        {error && (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded-xl bg-brand-gradient px-4 py-3 font-semibold text-zinc-950 disabled:opacity-60"
        >
          {enviando ? "Creando..." : "Crear cuenta gratis"}
        </button>
      </form>
      <p className="mt-6 text-center text-xs text-zinc-500">
        Al registrarte aceptás guardar tu información de garage en nuestros servidores. No compartimos datos con terceros.
      </p>
    </div>
  );
}