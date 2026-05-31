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
        setError("No pudimos cargar tu garage. Intenta recargar.");
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
      <div className="mx-auto max-w-4xl px-6 py-16 text-center text-slate-400">
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
          <p className="text-sm text-slate-500">
            {vehiculos.length} {vehiculos.length === 1 ? "vehículo" : "vehículos"} registrado{vehiculos.length === 1 ? "" : "s"}
          </p>
        </div>
      </header>

      {error && (
        <p className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <FormularioNuevo onCreado={(v) => setVehiculos((vs) => [v, ...vs])} />

      <section className="mt-10 space-y-3">
        {vehiculos.length === 0 ? (
          <p className="sombra-tarjeta rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            Todavía no agregas ningún vehículo. Usa el formulario de arriba.
          </p>
        ) : (
          vehiculos.map((v) => (
            <article
              key={v.id}
              className="sombra-tarjeta flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-blue-300"
            >
              <div className="flex items-center gap-4">
                <span className="grid h-12 w-20 place-items-center rounded-xl border border-blue-200 bg-blue-50 font-mono text-sm font-bold tracking-wider text-blue-900">
                  {v.placa}
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {[v.marca, v.modelo].filter(Boolean).join(" ") || "Sin descripción"}
                  </p>
                  <p className="text-xs text-slate-400">
                    {[v.anio, v.color].filter(Boolean).join(" · ") || "Agrega detalles"}
                  </p>
                  {v.ciudad_registro && (
                    <p className="mt-0.5 text-xs font-medium text-slate-500">📍 {v.ciudad_registro}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/consultar/${v.placa}`}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  Consultar
                </Link>
                <button
                  onClick={() => borrar(v.id)}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
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
  const [ciudad, setCiudad] = useState("");
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
        ciudad_registro: ciudad || undefined,
      });
      onCreado(v);
      setPlaca(""); setMarca(""); setModelo(""); setAnio(""); setColor(""); setCiudad("");
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
        className="w-full rounded-2xl border border-dashed border-slate-300 px-6 py-6 text-center text-sm text-slate-500 hover:border-blue-400 hover:text-blue-600"
      >
        + Agregar vehículo a mi garage
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="sombra-tarjeta rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <CampoTexto label="Placa" value={placa} onChange={(v) => setPlaca(v.toUpperCase())} placeholder="ABC1234" requerido />
        <CampoTexto label="Marca" value={marca} onChange={setMarca} placeholder="Toyota" />
        <CampoTexto label="Modelo" value={modelo} onChange={setModelo} placeholder="Corolla" />
        <CampoTexto label="Año" type="number" value={anio} onChange={setAnio} placeholder="2009" />
        <CampoTexto label="Color" value={color} onChange={setColor} placeholder="Blanco" />
        <CampoTexto label="Ciudad donde está el vehículo" value={ciudad} onChange={setCiudad} placeholder="Quito, Cuenca, Guayaquil…" />
      </div>
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-xl bg-brand-gradient px-4 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
        >
          {enviando ? "Guardando..." : "Guardar"}
        </button>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}