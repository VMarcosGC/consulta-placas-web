// Wizard de publicación en 3 pasos (M2.5, vía 1 "manual"):
//   1. Datos básicos  → crea la publicación (POST) y lleva DIRECTO al paso 2
//   2. Ficha técnica   → los 3 bloques completos + barra de completitud (gratis)
//   3. Fotos           → uploader a Cloudinary
//
// Antes, al publicar el usuario quedaba suelto en el feed y la ficha nacía vacía. El salto
// automático al paso 2 es el corazón de esta etapa: la transparencia se pide cuando el
// vendedor todavía está en contexto.
//
// Puede posponer con "Completar después" (nunca lo bloqueamos), pero queda con el CTA
// persistente "Completa tu ficha (N %)" en Mis publicaciones. Requiere sesión.
// El plan Premium consume tokens (el backend cobra y responde 402 si el saldo no alcanza).

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { crearPublicacion, listarVehiculos } from "@/lib/api";
import { tieneSesion } from "@/lib/auth";
import { FichaEditor } from "@/components/FichaEditor";
import { GaleriaFotosEditor } from "@/components/GaleriaFotosEditor";
import { colorCompletitud } from "@/lib/ficha";
import { ApiError, PlanPublicacion, Vehiculo } from "@/types/api";

type Paso = 1 | 2 | 3;

const PASOS: { numero: Paso; titulo: string; ayuda: string }[] = [
  { numero: 1, titulo: "Datos básicos", ayuda: "Placa, precio y plan" },
  { numero: 2, titulo: "Ficha técnica", ayuda: "Lo que el comprador quiere saber" },
  { numero: 3, titulo: "Fotos", ayuda: "Hasta 12 imágenes" },
];

// ── Barra de pasos ──────────────────────────────────────────────────────────

function Stepper({ paso }: { paso: Paso }) {
  return (
    <ol className="mt-6 grid grid-cols-3 gap-2">
      {PASOS.map((p) => {
        const hecho = paso > p.numero;
        const activo = paso === p.numero;
        return (
          <li
            key={p.numero}
            className={`rounded-2xl border p-3 transition ${
              activo
                ? "border-blue-400 bg-blue-50 ring-1 ring-blue-300"
                : hecho
                  ? "border-emerald-200 bg-emerald-50/60"
                  : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-black ${
                  hecho
                    ? "bg-emerald-500 text-white"
                    : activo
                      ? "bg-brand-gradient text-white"
                      : "bg-slate-200 text-slate-500"
                }`}
              >
                {hecho ? "✓" : p.numero}
              </span>
              <span
                className={`truncate text-sm font-semibold ${
                  activo ? "text-blue-800" : hecho ? "text-emerald-800" : "text-slate-500"
                }`}
              >
                {p.titulo}
              </span>
            </div>
            <p className="mt-1 hidden text-xs text-slate-500 sm:block">{p.ayuda}</p>
          </li>
        );
      })}
    </ol>
  );
}

// ── Paso 1: datos básicos ───────────────────────────────────────────────────

function PasoDatos({ onCreada }: { onCreada: (id: number) => void }) {
  const router = useRouter();
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);

  const [placa, setPlaca] = useState("");
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precio, setPrecio] = useState("");
  const [plan, setPlan] = useState<PlanPublicacion>("light");
  const [vehiculoId, setVehiculoId] = useState<number | null>(null);

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const lista = await listarVehiculos();
        if (activo) setVehiculos(lista);
      } catch {
        // El garage es opcional para publicar; ignoramos el error de carga.
      }
    })();
    return () => {
      activo = false;
    };
  }, []);

  // Al elegir un vehículo del garage, prellenar la placa.
  function elegirVehiculo(id: number | null) {
    setVehiculoId(id);
    const v = vehiculos.find((x) => x.id === id);
    if (v) setPlaca(v.placa);
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const precioNum = Number(precio);
    if (!Number.isFinite(precioNum) || precioNum <= 0) {
      setError("Ingresa un precio válido mayor a 0.");
      return;
    }

    setEnviando(true);
    try {
      const pub = await crearPublicacion({
        placa: placa.trim().toUpperCase(),
        titulo: titulo.trim() || undefined,
        descripcion: descripcion.trim() || undefined,
        precio_usd: precioNum,
        plan,
        vehiculo_id: vehiculoId ?? undefined,
      });
      // Corazón del wizard: en vez de mandarlo al feed, lo llevamos a la ficha.
      onCreada(pub.id);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          router.push("/login?next=/marketplace/publicar");
          return;
        }
        if (err.status === 402) {
          // Saldo insuficiente para Premium: mensaje descriptivo del backend.
          setError(`${err.message}. Puedes publicar en plan Light (gratis) o recargar tokens.`);
        } else {
          setError(err.message || "No pudimos crear la publicación.");
        }
      } else {
        setError("No pudimos crear la publicación.");
      }
    } finally {
      setEnviando(false);
    }
  }

  const inputCls =
    "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus-glow";

  return (
    <form onSubmit={enviar} className="mt-8 space-y-5">
      {vehiculos.length > 0 && (
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">
            Vincular un vehículo de tu garage (opcional)
          </label>
          <select
            className={inputCls}
            value={vehiculoId ?? ""}
            onChange={(e) => elegirVehiculo(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">— Publicar solo por placa —</option>
            {vehiculos.map((v) => (
              <option key={v.id} value={v.id}>
                {v.placa} {[v.marca, v.modelo].filter(Boolean).join(" ")}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-400">
            Vincularlo habilita los argumentos Premium (historial de mantenimientos).
          </p>
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-semibold text-slate-700">Placa</label>
        <input
          className={`${inputCls} font-mono tracking-widest`}
          value={placa}
          onChange={(e) => setPlaca(e.target.value)}
          placeholder="ABC1234"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-slate-700">Título (opcional)</label>
        <input
          className={inputCls}
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Chevrolet Sail 2018 — único dueño"
          maxLength={160}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-slate-700">
          Descripción (opcional)
        </label>
        <textarea
          className={`${inputCls} min-h-24`}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          maxLength={2000}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-slate-700">Precio (USD)</label>
        <input
          className={inputCls}
          type="number"
          min={1}
          step="any"
          value={precio}
          onChange={(e) => setPrecio(e.target.value)}
          placeholder="12000"
          required
        />
      </div>

      {/* Selector de plan */}
      <div>
        <span className="mb-2 block text-sm font-semibold text-slate-700">Plan</span>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setPlan("light")}
            className={`rounded-2xl border p-4 text-left transition ${
              plan === "light"
                ? "border-blue-400 bg-blue-50 ring-1 ring-blue-300"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <p className="font-bold text-slate-900">Light · Gratis</p>
            <p className="mt-1 text-xs text-slate-500">
              Aparece en el feed estándar. Sin destacar.
            </p>
          </button>
          <button
            type="button"
            onClick={() => setPlan("premium")}
            className={`relative overflow-hidden rounded-2xl border p-4 text-left transition ${
              plan === "premium"
                ? "border-blue-500 ring-2 ring-blue-400"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <span className="absolute right-0 top-0 rounded-bl-lg bg-brand-gradient px-2 py-0.5 text-[10px] font-black text-white">
              ★ PREMIUM
            </span>
            <p className="font-bold text-slate-900">Premium · con tokens</p>
            <p className="mt-1 text-xs text-slate-500">
              Destacado arriba, etiqueta «Verificado» y argumentos de venta.
            </p>
          </button>
        </div>
        {plan === "premium" && (
          <p className="mt-2 text-xs text-blue-700">
            El plan Premium descuenta tokens de tu billetera al publicar.{" "}
            <Link href="/precios" className="font-semibold underline">
              Ver precios
            </Link>
          </p>
        )}
      </div>

      {error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="w-full rounded-full bg-brand-gradient px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {enviando ? "Publicando…" : "Continuar a la ficha técnica →"}
      </button>
      <p className="text-center text-xs text-slate-400">
        Creamos tu publicación y sigues con la ficha. Puedes completarla después.
      </p>
    </form>
  );
}

// ── Página ──────────────────────────────────────────────────────────────────

export default function PublicarPage() {
  const router = useRouter();
  const [paso, setPaso] = useState<Paso>(1);
  const [publicacionId, setPublicacionId] = useState<number | null>(null);
  const [completitud, setCompletitud] = useState(0);

  useEffect(() => {
    if (!tieneSesion()) router.push("/login?next=/marketplace/publicar");
  }, [router]);

  // "Completar después": la publicación YA existe, así que lo dejamos en Mis publicaciones,
  // donde el CTA "Completa tu ficha" le sigue recordando lo que le falta.
  function completarDespues() {
    router.push("/marketplace/mis-publicaciones");
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Link href="/marketplace" className="text-sm text-slate-500 hover:text-slate-900">
        ← Volver al marketplace
      </Link>
      <h1 className="mt-3 text-3xl font-black text-slate-900">Publicar mi auto</h1>
      <p className="mt-1 text-slate-500">
        Tres pasos. Mientras más completa la ficha, más confianza genera tu anuncio —
        y no cuesta tokens.
      </p>

      <Stepper paso={paso} />

      {paso === 1 && (
        <PasoDatos
          onCreada={(id) => {
            setPublicacionId(id);
            setPaso(2);
          }}
        />
      )}

      {paso === 2 && publicacionId != null && (
        <section className="mt-8">
          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-semibold text-emerald-800">
              ✓ Tu anuncio ya está publicado.
            </p>
            <p className="mt-0.5 text-sm text-emerald-700">
              Ahora completa la ficha técnica: es gratis y es lo que más preguntan los
              compradores.
            </p>
          </div>

          <FichaEditor publicacionId={publicacionId} onCompletitud={setCompletitud} />

          <div className="mt-5 flex flex-col gap-3 sm:flex-row-reverse sm:items-center">
            <button
              type="button"
              onClick={() => setPaso(3)}
              className="rounded-full bg-brand-gradient px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              Continuar a las fotos →
            </button>
            <button
              type="button"
              onClick={completarDespues}
              className="rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Completar después
            </button>
            <p className="text-xs text-slate-400 sm:mr-auto">
              Ficha al {completitud} %. Guarda cada bloque antes de avanzar.
            </p>
          </div>
        </section>
      )}

      {paso === 3 && publicacionId != null && (
        <section className="mt-8">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-900">Fotos del vehículo</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              La primera foto es la portada del anuncio en el feed. Puedes subirlas ahora o
              más tarde desde Mis publicaciones.
            </p>
          </div>

          <GaleriaFotosEditor publicacionId={publicacionId} />

          {/* Recordatorio honesto: si la ficha quedó floja, el comprador lo va a ver. */}
          {completitud < 100 && (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-800">
                Tu ficha va al {completitud} %.
              </p>
              <p className="mt-0.5 text-sm text-amber-700">
                Puedes volver al paso anterior y sumar detalle cuando quieras.
              </p>
              <button
                type="button"
                onClick={() => setPaso(2)}
                className="mt-2 text-sm font-semibold text-amber-900 underline"
              >
                ← Volver a la ficha técnica
              </button>
            </div>
          )}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row-reverse">
            <button
              type="button"
              onClick={() => router.push(`/marketplace/${publicacionId}`)}
              className="rounded-full bg-brand-gradient px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              Ver mi anuncio publicado
            </button>
            <button
              type="button"
              onClick={completarDespues}
              className="rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Ir a mis publicaciones
            </button>
          </div>
        </section>
      )}

      {/* Barra de progreso de la ficha, visible desde el paso 2 en adelante. */}
      {paso > 1 && (
        <div className="mt-8">
          <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
            <span>Completitud de la ficha</span>
            <span className="font-semibold text-slate-700">{completitud} %</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full rounded-full transition-all ${colorCompletitud(completitud)}`}
              style={{ width: `${completitud}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
