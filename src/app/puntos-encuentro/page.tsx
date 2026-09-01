// Puntos de encuentro seguros — lista.
//
// Lugares concurridos (empieza en Quito) para cerrar la compra en persona. Un vendedor
// anuncia que va a llevar su auto a un punto en una fecha/franja; el comprador ve, por
// punto, qué autos van a estar ahí. `tiene_seguridad` queda para sumar seguridad
// privada o policial más adelante — hoy no hay convenio y se dice claro.

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  actualizarPresencia,
  eliminarPresencia,
  listarPuntosEncuentro,
  misPresencias,
} from "@/lib/api";
import { tieneSesion } from "@/lib/auth";
import { IconoPin } from "@/components/Iconos";
import {
  FRANJA_LEGIBLE,
  type MiPresencia,
  type PuntoEncuentro,
} from "@/types/api";

const usd = (v: string) =>
  `$${Number(v).toLocaleString("es-EC", { maximumFractionDigits: 0 })}`;
const fechaLarga = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("es-EC", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

export default function PuntosEncuentroPage() {
  const [puntos, setPuntos] = useState<PuntoEncuentro[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mias, setMias] = useState<MiPresencia[]>([]);

  useEffect(() => {
    let vivo = true;
    listarPuntosEncuentro()
      .then((p) => {
        if (vivo) setPuntos(p);
      })
      .catch(() => {
        if (vivo) setError("No pudimos cargar los puntos de encuentro. Intenta recargar.");
      })
      .finally(() => {
        if (vivo) setCargando(false);
      });
    if (tieneSesion()) {
      misPresencias()
        .then((m) => {
          if (vivo) setMias(m);
        })
        .catch(() => {});
    }
    return () => {
      vivo = false;
    };
  }, []);

  async function cancelar(id: number) {
    try {
      await actualizarPresencia(id, { estado: "cancelada" });
      setMias((prev) =>
        prev.map((m) => (m.id === id ? { ...m, estado: "cancelada" } : m))
      );
    } catch {
      /* noop */
    }
  }

  async function borrar(id: number) {
    if (!confirm("¿Quitar este anuncio?")) return;
    try {
      await eliminarPresencia(id);
      setMias((prev) => prev.filter((m) => m.id !== id));
    } catch {
      /* noop */
    }
  }

  const misVigentes = mias.filter((m) => m.estado === "anunciada");

  return (
    <div className="espacio-barra-movil mx-auto max-w-4xl px-6 py-8 sm:py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-black text-tinta sm:text-3xl">
          Puntos de encuentro seguros
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-secundario sm:text-base">
          Lugares concurridos de Quito para cerrar la compra en persona. Si vas a vender,
          anuncia a qué punto llevas tu auto y cuándo; si vas a comprar, mira qué autos
          van a estar ahí antes de coordinar.
        </p>
      </header>

      {/* Nota de seguridad: honesta sobre lo que HOY es y lo que no. */}
      <div className="mb-6 rounded-xl border border-borde bg-superficie-tenue px-4 py-3 text-xs text-secundario">
        Todavía <strong>no hay convenio</strong> con seguridad privada ni con la Policía:
        son puntos sugeridos por su afluencia y cámaras. Revisa el vehículo y los
        documentos en persona antes de pagar, coordina en horario diurno y avisa a alguien
        de confianza a dónde vas.
      </div>

      {cargando && <p className="text-sm text-secundario">Cargando…</p>}
      {error && (
        <p className="rounded-xl border border-error bg-error-tinte p-3 text-sm text-error">
          {error}
        </p>
      )}

      {!cargando && !error && (
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {puntos.map((p) => (
            <Link
              key={p.id}
              href={`/puntos-encuentro/${p.id}`}
              className="group sombra-tarjeta flex flex-col rounded-xl border border-borde bg-superficie p-4 transition hover:-translate-y-0.5 hover:border-borde-fuerte"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-marca-tinte text-marca-texto">
                  <IconoPin className="h-5 w-5" />
                </span>
                {p.presencias_activas > 0 ? (
                  <span className="rounded-full bg-marca px-2 py-0.5 text-[11px] font-bold text-superficie">
                    {p.presencias_activas}{" "}
                    {p.presencias_activas === 1 ? "auto" : "autos"}
                  </span>
                ) : (
                  <span className="rounded-full border border-borde px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secundario">
                    {p.sector}
                  </span>
                )}
              </div>
              <h2 className="mt-3 text-sm font-bold leading-tight text-tinta">
                {p.nombre}
              </h2>
              <p className="mt-1 flex-1 text-xs text-secundario">{p.direccion}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-tinta">
                Ver quién estará
                <span className="transition group-hover:translate-x-0.5">→</span>
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* Mis anuncios (si hay sesión). */}
      {mias.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-secundario">
            Tus anuncios ({misVigentes.length} vigente
            {misVigentes.length === 1 ? "" : "s"})
          </h2>
          <ul className="flex flex-col gap-2">
            {mias.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-borde bg-superficie p-3 sombra-tarjeta"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-tinta">
                    {m.vehiculo.titulo ||
                      [m.vehiculo.marca, m.vehiculo.modelo, m.vehiculo.anio]
                        .filter(Boolean)
                        .join(" ") ||
                      m.vehiculo.placa}{" "}
                    · {usd(m.vehiculo.precio_usd)}
                  </p>
                  <p className="text-xs text-secundario">
                    {m.punto.nombre} · {fechaLarga(m.fecha)} ·{" "}
                    {FRANJA_LEGIBLE[m.franja]}
                    {m.estado !== "anunciada" && (
                      <span className="ml-1 font-semibold text-secundario">
                        · {m.estado === "cancelada" ? "cancelado" : "finalizado"}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/puntos-encuentro/${m.punto.id}`}
                    className="rounded-full border border-borde-fuerte bg-superficie px-3 py-1.5 text-xs font-semibold text-secundario hover:bg-superficie-tenue"
                  >
                    Ver punto
                  </Link>
                  {m.estado === "anunciada" ? (
                    <button
                      type="button"
                      onClick={() => cancelar(m.id)}
                      className="rounded-full border border-borde-fuerte bg-superficie px-3 py-1.5 text-xs font-semibold text-secundario hover:bg-superficie-tenue"
                    >
                      Cancelar
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => borrar(m.id)}
                      className="rounded-full border border-destructivo px-3 py-1.5 text-xs font-semibold text-destructivo hover:bg-destructivo-tinte"
                    >
                      Quitar
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
