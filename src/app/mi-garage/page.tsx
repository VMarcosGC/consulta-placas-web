"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  crearVehiculo,
  eliminarVehiculo,
  listarVehiculos,
  obtenerPerfil,
} from "@/lib/api";
import { tieneSesion } from "@/lib/auth";
import { ApiError, Usuario, Vehiculo } from "@/types/api";
import { CampoTexto } from "@/components/CampoTexto";

export default function MiGaragePage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carga inicial. El fetch va en un IIFE async dentro del effect: todos los
  // setState ocurren tras el await (no sincrónicamente), lo que satisface
  // react-hooks/set-state-in-effect. `activo` evita setState tras desmontar.
  useEffect(() => {
    if (!tieneSesion()) {
      router.push("/login?next=/mi-garage");
      return;
    }
    let activo = true;
    (async () => {
      try {
        const [perfil, lista] = await Promise.all([obtenerPerfil(), listarVehiculos()]);
        if (!activo) return;
        setUsuario(perfil);
        setVehiculos(lista);
        setError(null);
      } catch (err) {
        if (!activo) return;
        if (err instanceof ApiError && err.status === 401) {
          router.push("/login?next=/mi-garage");
          return;
        }
        setError("No pudimos cargar tu garage. Probá recargar.");
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, [router]);

  async function borrar(id: number) {
    if (!confirm("¿Eliminar este vehículo de tu garage?")) return;
    await eliminarVehiculo(id);
    setVehiculos((vs) => vs.filter((v) => v.id !== id));
  }

  if (cargando) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-16 text-center text-zinc-500">
        Cargando tu garage…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <header className="flex flex-wrap items-end justify-between gap-3 mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold">
            Hola{usuario?.nombre ? `, ${usuario.nombre}` : ""} 👋
          </h1>
          <p className="text-sm text-zinc-400">
            {vehiculos.length} {vehiculos.length === 1 ? "vehículo" : "vehículos"} registrado{vehiculos.length === 1 ? "" : "s"}
          </p>
        </div>
      </header>

      {error && (
        <p className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <FormularioNuevo onCreado={(v) => setVehiculos((vs) => [v, ...vs])} />

      <section className="mt-10 space-y-3">
        {vehiculos.length === 0 ? (
          <p className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 text-center text-sm text-zinc-400">
            Todavía no agregaste ningún vehículo. Usá el formulario de arriba.
          </p>
        ) : (
          vehiculos.map((v) => (
            <article
              key={v.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5"
            >
              <div className="flex items-center gap-4">
                <span className="grid h-12 w-20 place-items-center rounded-xl border border-zinc-700 bg-zinc-900 font-mono text-sm tracking-wider">
                  {v.placa}
                </span>
                <div>
                  <p className="text-sm font-semibold text-zinc-100">
                    {[v.marca, v.modelo].filter(Boolean).join(" ") || "Sin descripción"}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {[v.anio, v.color].filter(Boolean).join(" · ") || "Agregá detalles"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/consultar/${v.placa}`}
                  className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800"
                >
                  Consultar
                </Link>
                <button
                  onClick={() => borrar(v.id)}
                  className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10"
                >
                  Eliminar
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}

function FormularioNuevo({ onCreado }: { onCreado: (v: Vehiculo) => void }) {
  const [abierto, setAbierto] = useState(false);
  const [placa, setPlaca] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [anio, setAnio] = useState("");
  const [color, setColor] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const v = await crearVehiculo({
        placa: placa.toUpperCase().replace(/[-\s]/g, ""),
        marca: marca || undefined,
        modelo: modelo || undefined,
        anio: anio ? Number(anio) : undefined,
        color: color || undefined,
      });
      onCreado(v);
      setPlaca(""); setMarca(""); setModelo(""); setAnio(""); setColor("");
      setAbierto(false);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("No pudimos guardar el vehículo.");
    } finally {
      setEnviando(false);
    }
  }

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="w-full rounded-2xl border border-dashed border-zinc-700 px-6 py-6 text-center text-sm text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
      >
        + Agregar vehículo a mi garage
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <CampoTexto label="Placa" value={placa} onChange={(v) => setPlaca(v.toUpperCase())} placeholder="ABC1234" requerido />
        <CampoTexto label="Marca" value={marca} onChange={setMarca} placeholder="Toyota" />
        <CampoTexto label="Modelo" value={modelo} onChange={setModelo} placeholder="Corolla" />
        <CampoTexto label="Año" type="number" value={anio} onChange={setAnio} placeholder="2009" />
        <CampoTexto label="Color" value={color} onChange={setColor} placeholder="Blanco" />
      </div>
      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-xl bg-brand-gradient px-4 py-2.5 text-sm font-semibold text-zinc-950 disabled:opacity-60"
        >
          {enviando ? "Guardando..." : "Guardar"}
        </button>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}