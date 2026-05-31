// Formulario para publicar un vehículo en el marketplace. Requiere sesión.
// El plan Premium consume tokens de la billetera (el backend cobra y responde 402 si
// el saldo no alcanza). Vincular un vehículo del garage habilita los argumentos premium
// (historial de mantenimientos).

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { crearPublicacion, listarVehiculos } from "@/lib/api";
import { tieneSesion } from "@/lib/auth";
import { ApiError, PlanPublicacion, Vehiculo } from "@/types/api";

export default function PublicarPage() {
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
    if (!tieneSesion()) {
      router.push("/login?next=/marketplace/publicar");
      return;
    }
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
  }, [router]);

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
      await crearPublicacion({
        placa: placa.trim().toUpperCase(),
        titulo: titulo.trim() || undefined,
        descripcion: descripcion.trim() || undefined,
        precio_usd: precioNum,
        plan,
        vehiculo_id: vehiculoId ?? undefined,
      });
      router.push("/marketplace");
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
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Link href="/marketplace" className="text-sm text-slate-500 hover:text-slate-900">
        ← Volver al marketplace
      </Link>
      <h1 className="mt-3 text-3xl font-black text-slate-900">Publicar mi auto</h1>
      <p className="mt-1 text-slate-500">
        Completá los datos. El plan <span className="font-semibold">Premium</span> destaca tu
        anuncio y consume tokens de tu billetera.
      </p>

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
          <label className="mb-1 block text-sm font-semibold text-slate-700">
            Título (opcional)
          </label>
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
          <label className="mb-1 block text-sm font-semibold text-slate-700">
            Precio (USD)
          </label>
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
          {enviando ? "Publicando…" : plan === "premium" ? "Publicar Premium" : "Publicar gratis"}
        </button>
      </form>
    </div>
  );
}
