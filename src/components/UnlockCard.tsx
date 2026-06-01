// Tarjeta de desbloqueo reutilizable: muestra un bloque de información bloqueado con su costo
// en tokens y la acción para desbloquearlo. Maneja todo el flujo UX:
//   - sin sesión → redirige a login (vuelve a la consulta)
//   - 402 saldo insuficiente → CTA para recargar tokens (/precios)
//   - 409 dato no disponible → aviso (no cobra)
//   - éxito → actualiza el perfil sin recargar la página (callback onUnlocked)
//   - ya desbloqueado → renderiza el contenido revelado (children)
// Español de Ecuador (tuteo). Copy NO agresivo (nada de "paga para ver el dueño").

"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { desbloquearProducto } from "@/lib/api";
import { tieneSesion } from "@/lib/auth";
import { ApiError, type ProductoEstado, type VehiculoConsolidado } from "@/types/api";
import { TokenBadge } from "@/components/TokenBadge";

type AlDesbloquear = (perfil: VehiculoConsolidado) => void;

export function UnlockCard({
  placa,
  producto,
  onUnlocked,
  icono = "🔒",
  descripcion,
  preview,
  children,
}: {
  placa: string;
  producto: ProductoEstado;
  onUnlocked: AlDesbloquear;
  icono?: string;
  descripcion?: string;
  preview?: ReactNode;
  children?: ReactNode;
}) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saldoInsuficiente, setSaldoInsuficiente] = useState(false);

  // Ya desbloqueado: mostramos el dato revelado, sin volver a cobrar.
  if (producto.desbloqueado) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sombra-tarjeta">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-900">{producto.nombre}</h3>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            ✓ desbloqueado
          </span>
        </div>
        <div className="mt-3">{children}</div>
      </div>
    );
  }

  async function desbloquear() {
    if (!tieneSesion()) {
      window.location.href = `/login?next=/consultar/${placa}`;
      return;
    }
    setCargando(true);
    setError(null);
    setSaldoInsuficiente(false);
    try {
      onUnlocked(await desbloquearProducto(placa, producto.codigo));
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          window.location.href = `/login?next=/consultar/${placa}`;
          return;
        }
        if (err.status === 402) {
          setSaldoInsuficiente(true);
          setError("No te alcanzan los tokens para esta sección.");
        } else if (err.status === 409) {
          setError("Este dato no está disponible para esta placa por ahora.");
        } else {
          setError(err.message || "No se pudo completar el desbloqueo.");
        }
      } else {
        setError("No se pudo completar el desbloqueo.");
      }
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 sombra-tarjeta">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <span aria-hidden className="text-lg leading-none">{icono}</span>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">{producto.nombre}</h3>
            {(descripcion ?? producto.descripcion) && (
              <p className="mt-0.5 text-xs text-slate-500">{descripcion ?? producto.descripcion}</p>
            )}
          </div>
        </div>
        <TokenBadge tokens={producto.tokens} conPrecio />
      </div>

      {preview && <div className="mt-3 rounded-xl bg-slate-50/70 p-3 text-sm text-slate-600">{preview}</div>}

      <button
        type="button"
        onClick={desbloquear}
        disabled={cargando}
        className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-brand-gradient px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
      >
        {cargando ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        ) : (
          <span aria-hidden>🔓</span>
        )}
        {producto.nombre}
      </button>

      {error && (
        <div className="mt-2 text-xs text-rose-600">
          {error}
          {saldoInsuficiente && (
            <Link href="/precios" className="ml-1 font-semibold text-blue-600 underline">
              Recargar tokens
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
