// Directorio de servicios automotrices.
//
// FORMA (pedido de producto, 2026-08-27): NO es una lista plana. Primero se ven los
// BLOQUES por categoría (mecánica, lavadero, luces…); al tocar uno se abre la lista de
// esa categoría. Cada servicio muestra lo básico + dirección, teléfono y horario, y un
// apartado de AGENDAMIENTO que la plataforma va a ofrecer (hoy es un anuncio).
//
// DATOS: mezcla los negocios aprobados del backend (`GET /marketplace/servicios`) con la
// lista demo de `src/config/servicios.ts` (relleno mientras no hay volumen real). Si el
// backend falla, la sección sigue viva con la demo.
//
// El alta de un negocio: formulario propio (requiere sesión) → entra `pendiente` y lo
// revisa un admin. El wa.me queda como vía secundaria.

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CATEGORIAS_SERVICIO,
  CONTACTO_ALTA_NEGOCIO,
  SERVICIOS as SERVICIOS_DEMO,
  type CategoriaServicio,
  type Servicio,
} from "@/config/servicios";
import { PROVINCIAS } from "@/lib/geografia";
import {
  CIUDADES_ORIGEN,
  centroideDe,
  coordDeCiudad,
  etiquetaDistancia,
  haversineKm,
  type Coord,
} from "@/lib/geolocalizacion";
import { crearServicio, listarServicios, pedirCita } from "@/lib/api";
import { tieneSesion } from "@/lib/auth";
import {
  alternarServicioGuardado,
  useServiciosGuardados,
} from "@/lib/serviciosGuardados";
import { CampoTexto } from "@/components/CampoTexto";
import {
  ApiError,
  MOTIVO_CITA_LEGIBLE,
  type CategoriaServicioApi,
  type FranjaAgenda,
  type MotivoCita,
  type ServicioSalida,
} from "@/types/api";

const HOY = () => new Date().toISOString().slice(0, 10);
const FRANJAS_AGENDA: { valor: FranjaAgenda; etiqueta: string }[] = [
  { valor: "manana", etiqueta: "Mañana" },
  { valor: "tarde", etiqueta: "Tarde" },
  { valor: "noche", etiqueta: "Noche" },
  { valor: "todo_el_dia", etiqueta: "Todo el día" },
];
const MOTIVOS_AGENDA = Object.entries(MOTIVO_CITA_LEGIBLE) as [MotivoCita, string][];

// ServicioSalida (backend) → forma de tarjeta que ya usa esta página. `mecanica_certificada`
// dejó de ser una sección propia: se muestra bajo "Mecánica general".
function desdeApi(s: ServicioSalida): Servicio {
  const categoria = (
    s.categoria === "mecanica_certificada" ? "mecanica" : s.categoria
  ) as CategoriaServicio;
  return {
    id: `api-${s.id}`,
    nombre: s.nombre,
    categoria,
    ciudad: s.ciudad,
    provincia: s.provincia,
    descripcion: s.descripcion ?? undefined,
    telefono: s.telefono ?? undefined,
    whatsapp: s.whatsapp ?? undefined,
    direccion: s.direccion ?? undefined,
    horario: s.horario ?? undefined,
    acepta_agendamiento: s.acepta_agendamiento,
    demo: false,
  };
}

// "api-42" → 42 (para pegarle a /servicios/{id}/citas). Los demo (`demo-N`) no
// tienen id real, así que su `acepta_agendamiento` es siempre falso.
function idNumerico(id: string): number | null {
  const m = id.match(/^api-(\d+)$/);
  return m ? Number(m[1]) : null;
}

type EstadoGeo = "inicial" | "ok" | "negado";

export default function ServiciosPage() {
  const [cat, setCat] = useState<CategoriaServicio | null>(null);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [servicios, setServicios] = useState<Servicio[]>(SERVICIOS_DEMO);
  const guardados = new Set(useServiciosGuardados());

  // Ubicación del usuario para ordenar por cercanía. Primero se intenta el GPS del
  // navegador; si lo niega o no está, elige una ciudad a mano.
  const [origen, setOrigen] = useState<Coord | null>(null);
  const [estadoGeo, setEstadoGeo] = useState<EstadoGeo>("inicial");

  // Trae los aprobados del backend y los antepone a la demo. Si falla, se queda la demo.
  useEffect(() => {
    let vivo = true;
    listarServicios()
      .then((r) => {
        if (!vivo || !Array.isArray(r) || r.length === 0) return;
        setServicios([...r.map(desdeApi), ...SERVICIOS_DEMO]);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => {
    const geo = typeof navigator !== "undefined" ? navigator.geolocation : undefined;
    if (!geo) return; // sin GPS → queda "inicial" y se elige ciudad a mano
    geo.getCurrentPosition(
      (pos) => {
        setOrigen({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setEstadoGeo("ok");
      },
      () => setEstadoGeo("negado"),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600_000 }
    );
  }, []);

  const conteos = useMemo(() => {
    const m = new Map<CategoriaServicio, number>();
    for (const s of servicios) m.set(s.categoria, (m.get(s.categoria) ?? 0) + 1);
    return m;
  }, [servicios]);

  // Lista de la categoría, con distancia aproximada y ordenada por cercanía cuando hay
  // un origen. Sin origen: orden original de la fuente.
  const lista = useMemo<{ s: Servicio; km: number | null }[]>(() => {
    const base = cat ? servicios.filter((x) => x.categoria === cat) : [];
    const conKm = base.map((s) => {
      if (!origen) return { s, km: null };
      const c = centroideDe(s.ciudad, s.provincia);
      return { s, km: c ? haversineKm(origen, c) : null };
    });
    if (!origen) return conKm;
    return conKm.sort((a, b) => {
      if (a.km == null) return 1;
      if (b.km == null) return -1;
      return a.km - b.km;
    });
  }, [cat, servicios, origen]);

  const metaCat = CATEGORIAS_SERVICIO.find((c) => c.clave === cat);

  return (
    <div className="espacio-barra-movil mx-auto max-w-5xl px-6 py-8 sm:py-10">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-tinta sm:text-3xl">Servicios para tu auto</h1>
          <p className="mt-1 max-w-2xl text-sm text-secundario sm:text-base">
            Mecánicas, centros de servicio, lavaderos, luces y accesorios. Un solo lugar
            para encontrarlos, ver su horario y agendar una cita.
          </p>
        </div>
        <Link
          href="/servicios/agenda"
          className="shrink-0 rounded-full border border-borde-fuerte bg-superficie px-4 py-2 text-sm font-semibold text-secundario transition hover:bg-superficie-tenue"
        >
          📅 Mis citas
        </Link>
      </header>

      {/* NIVEL 1 — bloques por categoría. */}
      {!cat && (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {CATEGORIAS_SERVICIO.map((c) => {
            const n = conteos.get(c.clave) ?? 0;
            return (
              <button
                key={c.clave}
                type="button"
                onClick={() => {
                  setCat(c.clave);
                  setAbierto(null);
                }}
                className="group sombra-tarjeta flex flex-col items-start gap-2 rounded-xl border border-borde bg-superficie p-3.5 text-left transition hover:-translate-y-0.5 hover:border-borde-fuerte sm:p-4"
              >
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-marca-tinte text-marca-texto transition group-hover:scale-105">
                  <c.icono className="h-5 w-5" />
                </span>
                <span className="text-sm font-bold leading-tight text-tinta">{c.nombre}</span>
                <span className="text-[11px] text-secundario">
                  {n} {n === 1 ? "negocio" : "negocios"}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* NIVEL 2 — lista de la categoría elegida. */}
      {cat && (
        <>
          <div className="mb-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setCat(null);
                setAbierto(null);
              }}
              className="inline-flex items-center gap-1 rounded-full border border-borde-fuerte bg-superficie px-3 py-1.5 text-sm font-semibold text-secundario hover:bg-superficie-tenue"
            >
              ← Todas
            </button>
            <h2 className="flex items-center gap-2 text-lg font-bold text-tinta">
              {metaCat && <metaCat.icono className="h-5 w-5 text-marca" />}
              {metaCat?.nombre}
              <span className="text-sm font-normal text-secundario">({lista.length})</span>
            </h2>
          </div>

          {/* Origen para ordenar por cercanía: GPS o, si no, una ciudad a mano. */}
          <BarraUbicacion
            estado={estadoGeo}
            tieneOrigen={origen != null}
            onCiudad={(ciudad) => {
              const c = coordDeCiudad(ciudad);
              if (c) {
                setOrigen(c);
                setEstadoGeo("ok");
              }
            }}
          />

          {lista.length === 0 ? (
            <div className="rounded-2xl border border-borde bg-superficie p-8 text-center sombra-tarjeta">
              <p className="font-medium text-tinta">Todavía no hay negocios en esta categoría.</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-secundario">
                ¿Tienes uno? Súmalo más abajo y aparece apenas lo revisemos.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {lista.map(({ s, km }) => (
                <li key={s.id}>
                  <TarjetaServicio
                    servicio={s}
                    km={km}
                    abierta={abierto === s.id}
                    onToggle={() => setAbierto((a) => (a === s.id ? null : s.id))}
                    guardado={guardados.has(s.id)}
                    onGuardar={() => alternarServicioGuardado(s.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {/* Alta de negocio. */}
      <AltaNegocio />
    </div>
  );
}

// ── Barra de ubicación (GPS o ciudad manual) ──────────────────────────────────
function BarraUbicacion({
  estado,
  tieneOrigen,
  onCiudad,
}: {
  estado: EstadoGeo;
  tieneOrigen: boolean;
  onCiudad: (ciudad: string) => void;
}) {
  if (estado === "ok" && tieneOrigen) {
    return (
      <p className="mb-3 flex items-center gap-1.5 text-xs text-secundario">
        <span aria-hidden>📍</span> Ordenados por cercanía a tu ubicación.
        <span className="text-borde-fuerte">Distancias y tiempos aproximados.</span>
      </p>
    );
  }
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-borde bg-superficie-tenue px-3 py-2 text-xs text-secundario">
      <span aria-hidden>📍</span>
      <span>
        {estado === "negado"
          ? "No pudimos usar tu ubicación."
          : "¿Desde qué ciudad buscas?"}{" "}
        Elígela y los ordenamos por cercanía:
      </span>
      <select
        defaultValue=""
        onChange={(e) => e.target.value && onCiudad(e.target.value)}
        className="rounded-lg border border-borde bg-superficie px-2 py-1 text-xs text-tinta"
      >
        <option value="">Ciudad…</option>
        {CIUDADES_ORIGEN.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </div>
  );
}

// ── Tarjeta de un servicio (acordeón) ──────────────────────────────────────────
function TarjetaServicio({
  servicio: s,
  km,
  abierta,
  onToggle,
  guardado,
  onGuardar,
}: {
  servicio: Servicio;
  km: number | null;
  abierta: boolean;
  onToggle: () => void;
  guardado: boolean;
  onGuardar: () => void;
}) {
  return (
    <div className="rounded-2xl border border-borde bg-superficie sombra-tarjeta">
      <div className="flex items-start gap-3 p-4">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={abierta}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-bold text-tinta">{s.nombre}</h3>
            {km != null && (
              <span className="shrink-0 rounded-full bg-marca-tinte px-2 py-0.5 text-[10px] font-bold text-marca-texto">
                📍 {etiquetaDistancia(km)}
              </span>
            )}
          </div>
          <p className="text-sm text-secundario">
            {s.ciudad} · {s.provincia}
          </p>
          {s.descripcion && (
            <p className="mt-1 line-clamp-2 text-sm text-secundario">{s.descripcion}</p>
          )}
          <span className="mt-1 inline-block text-xs font-semibold text-tinta">
            {abierta ? "Ocultar detalle ▲" : "Ver dirección, horario y agenda ▼"}
          </span>
        </button>
        <button
          type="button"
          onClick={onGuardar}
          aria-pressed={guardado}
          aria-label={guardado ? "Quitar de tus intereses" : "Guardar en tus intereses"}
          className={`shrink-0 text-xl leading-none ${
            guardado ? "text-marca" : "text-borde-fuerte hover:text-marca"
          }`}
        >
          {guardado ? "♥" : "♡"}
        </button>
      </div>

      {abierta && (
        <div className="animate-fade-in-up border-t border-borde px-4 pb-4 pt-3">
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            {s.direccion && (
              <div className="flex gap-2">
                <dt aria-hidden>📍</dt>
                <dd className="text-secundario">{s.direccion}</dd>
              </div>
            )}
            {s.horario && (
              <div className="flex gap-2">
                <dt aria-hidden>🕒</dt>
                <dd className="text-secundario">{s.horario}</dd>
              </div>
            )}
            {(s.telefono || s.whatsapp) && (
              <div className="flex gap-2">
                <dt aria-hidden>📞</dt>
                <dd className="text-secundario">{s.telefono ?? s.whatsapp}</dd>
              </div>
            )}
          </dl>

          {/* Agendamiento en línea (migración 0034). */}
          <AgendarCita servicio={s} />

          <div className="mt-3 flex flex-wrap gap-2">
            {s.whatsapp && (
              <a
                href={`https://wa.me/${s.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-oscuro px-4 py-1.5 text-sm font-semibold text-superficie transition hover:bg-oscuro-suave"
              >
                WhatsApp
              </a>
            )}
            {s.telefono && (
              <a
                href={`tel:${s.telefono}`}
                className="rounded-full border border-borde-fuerte bg-superficie px-4 py-1.5 text-sm font-semibold text-secundario hover:bg-superficie-tenue"
              >
                Llamar
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Agendamiento en línea de una cita ─────────────────────────────────────────
function AgendarCita({ servicio: s }: { servicio: Servicio }) {
  const idApi = idNumerico(s.id);
  const disponible = Boolean(s.acepta_agendamiento && idApi != null);

  const [haySesion, setHaySesion] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({
    nombre_contacto: "",
    telefono_contacto: "",
    vehiculo: "",
    motivo: "mantenimiento" as MotivoCita,
    fecha: HOY(),
    franja: "tarde" as FranjaAgenda,
    nota: "",
  });
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  // Async a propósito (react-hooks/set-state-in-effect): mismo patrón que AltaNegocio.
  useEffect(() => {
    let vivo = true;
    const leer = async () => {
      if (vivo) setHaySesion(tieneSesion());
    };
    leer();
    window.addEventListener("sesion-cambiada", leer);
    return () => {
      vivo = false;
      window.removeEventListener("sesion-cambiada", leer);
    };
  }, [abierto]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (idApi == null) return;
    setError(null);
    if (f.nombre_contacto.trim().length < 2) {
      setError("Escribe tu nombre para la cita.");
      return;
    }
    setEnviando(true);
    try {
      await pedirCita(idApi, {
        nombre_contacto: f.nombre_contacto.trim(),
        telefono_contacto: f.telefono_contacto.trim() || undefined,
        vehiculo: f.vehiculo.trim() || undefined,
        motivo: f.motivo,
        fecha: f.fecha,
        franja: f.franja,
        nota: f.nota.trim() || undefined,
      });
      setOk(true);
      setAbierto(false);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message || "No pudimos registrar tu cita."
          : "No pudimos registrar tu cita."
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-dashed border-borde-fuerte bg-superficie-tenue p-3">
      <p className="text-sm font-semibold text-tinta">📅 Agenda tu cita</p>

      {!disponible ? (
        <p className="mt-0.5 text-xs text-secundario">
          Este negocio todavía no activó el agendamiento en línea. Contáctalo por WhatsApp
          o teléfono para coordinar.
        </p>
      ) : ok ? (
        <p className="mt-1 rounded-lg border border-confirmado bg-confirmado-tinte px-3 py-2 text-xs font-medium text-confirmado-texto">
          ✓ Solicitud enviada. El negocio la confirma o te propone otra fecha; la sigues
          en{" "}
          <Link href="/servicios/agenda" className="underline">
            Mis citas
          </Link>
          .
        </p>
      ) : !haySesion ? (
        <p className="mt-0.5 text-xs text-secundario">
          <Link href="/login" className="font-semibold text-tinta underline">
            Inicia sesión
          </Link>{" "}
          para reservar tu turno sin salir de CarStore Ec.
        </p>
      ) : !abierto ? (
        <>
          <p className="mt-0.5 text-xs text-secundario">
            Reserva tu turno sin llamadas. El negocio confirma o te propone otra fecha.
          </p>
          <button
            type="button"
            onClick={() => setAbierto(true)}
            className="mt-2 rounded-full bg-accion px-4 py-1.5 text-sm font-semibold text-superficie shadow-sm transition hover:opacity-90"
          >
            Agendar cita
          </button>
        </>
      ) : (
        <form onSubmit={enviar} className="mt-2 grid gap-2.5 sm:grid-cols-2">
          <CampoTexto
            label="Tu nombre"
            value={f.nombre_contacto}
            onChange={(v) => set("nombre_contacto", v)}
            requerido
          />
          <CampoTexto
            label="Teléfono (opcional)"
            value={f.telefono_contacto}
            onChange={(v) => set("telefono_contacto", v)}
          />
          <CampoTexto
            label="Vehículo (opcional)"
            value={f.vehiculo}
            onChange={(v) => set("vehiculo", v)}
          />
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-tinta">Motivo</span>
            <select
              value={f.motivo}
              onChange={(e) => set("motivo", e.target.value)}
              className="rounded-xl border border-borde-fuerte bg-superficie px-3 py-2.5 text-sm"
            >
              {MOTIVOS_AGENDA.map(([valor, etiqueta]) => (
                <option key={valor} value={valor}>
                  {etiqueta}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-tinta">Día</span>
            <input
              type="date"
              value={f.fecha}
              min={HOY()}
              onChange={(e) => set("fecha", e.target.value)}
              className="rounded-xl border border-borde-fuerte bg-superficie px-3 py-2.5 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-tinta">Franja</span>
            <select
              value={f.franja}
              onChange={(e) => set("franja", e.target.value)}
              className="rounded-xl border border-borde-fuerte bg-superficie px-3 py-2.5 text-sm"
            >
              {FRANJAS_AGENDA.map((x) => (
                <option key={x.valor} value={x.valor}>
                  {x.etiqueta}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="font-medium text-tinta">Nota (opcional)</span>
            <input
              maxLength={400}
              value={f.nota}
              onChange={(e) => set("nota", e.target.value)}
              placeholder="Describe la falla o lo que necesitas"
              className="rounded-xl border border-borde-fuerte bg-superficie px-3 py-2.5 text-sm"
            />
          </label>
          {error && (
            <p className="text-xs text-error sm:col-span-2">{error}</p>
          )}
          <div className="flex gap-2 sm:col-span-2">
            <button
              type="submit"
              disabled={enviando}
              className="rounded-full bg-accion px-5 py-2 text-sm font-semibold text-superficie shadow-sm disabled:opacity-60"
            >
              {enviando ? "Enviando…" : "Solicitar cita"}
            </button>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="rounded-full border border-borde-fuerte bg-superficie px-4 py-2 text-sm font-semibold text-secundario hover:bg-superficie-tenue"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// ── Alta de un negocio (formulario + wa.me de respaldo) ────────────────────────
const CATS_API: { valor: CategoriaServicioApi; etiqueta: string }[] = [
  { valor: "mecanica", etiqueta: "Mecánica general" },
  { valor: "centro_servicio", etiqueta: "Centro de servicio" },
  { valor: "lavadero", etiqueta: "Lavadero" },
  { valor: "luces", etiqueta: "Luces y eléctrico" },
  { valor: "accesorios", etiqueta: "Accesorios y lujos" },
  { valor: "otro", etiqueta: "Otro" },
];

function AltaNegocio() {
  const [abierto, setAbierto] = useState(false);
  const [haySesion, setHaySesion] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    nombre: "",
    categoria: "mecanica" as CategoriaServicioApi,
    provincia: "Pichincha",
    ciudad: "",
    whatsapp: "",
    horario: "",
    descripcion: "",
  });
  const [aceptaAgenda, setAceptaAgenda] = useState(true);

  // Async a propósito: setState directo dentro del cuerpo de un effect lo marca el
  // linter (react-hooks/set-state-in-effect). Mismo patrón que useFavoritos.
  useEffect(() => {
    let vivo = true;
    const leer = async () => {
      if (vivo) setHaySesion(tieneSesion());
    };
    leer();
    window.addEventListener("sesion-cambiada", leer);
    return () => {
      vivo = false;
      window.removeEventListener("sesion-cambiada", leer);
    };
  }, []);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await crearServicio({
        nombre: form.nombre.trim(),
        categoria: form.categoria,
        provincia: form.provincia,
        ciudad: form.ciudad.trim(),
        whatsapp: form.whatsapp.trim() || undefined,
        horario: form.horario.trim() || undefined,
        descripcion: form.descripcion.trim() || undefined,
        acepta_agendamiento: aceptaAgenda,
      });
      setOk(true);
    } catch {
      setError("No pudimos enviar tu negocio. Revisa los datos e inténtalo de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="mt-10 rounded-3xl border border-borde bg-superficie-tenue p-6 sm:p-8">
      <h2 className="text-lg font-bold text-tinta sm:text-xl">
        ¿Tienes un taller, lavadero o tienda de accesorios?
      </h2>
      <p className="mt-1.5 max-w-lg text-sm text-secundario">
        Súmalo a CarStore Ec y que te encuentren los compradores y vendedores de autos de
        tu ciudad. Lo revisamos y lo publicamos en el directorio. Activa el{" "}
        <strong>agendamiento en línea</strong> y tus clientes reservan cita desde aquí;
        tú las confirmas, reprogramas o rechazas.
      </p>

      {ok ? (
        <p className="mt-4 rounded-xl border border-confirmado bg-confirmado-tinte px-4 py-3 text-sm font-medium text-confirmado-texto">
          ✓ Recibimos tu negocio. Queda pendiente de revisión y aparece en el directorio
          apenas lo aprobemos.
        </p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => setAbierto((v) => !v)}
              className="inline-flex rounded-full bg-accion px-6 py-2.5 text-sm font-semibold text-superficie shadow-sm transition hover:opacity-90"
            >
              {abierto ? "Cerrar formulario" : "Sumar mi negocio"}
            </button>
            <a
              href={CONTACTO_ALTA_NEGOCIO}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex rounded-full border border-borde-fuerte bg-superficie px-6 py-2.5 text-sm font-semibold text-secundario hover:bg-superficie-tenue"
            >
              Prefiero escribir por WhatsApp
            </a>
          </div>

          {abierto && !haySesion && (
            <p className="mt-4 text-sm text-secundario">
              Para sumar tu negocio necesitas una cuenta.{" "}
              <Link href="/login" className="font-semibold text-tinta underline">
                Inicia sesión
              </Link>{" "}
              y vuelve a esta página.
            </p>
          )}

          {abierto && haySesion && (
            <form onSubmit={enviar} className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                <span className="font-semibold text-tinta">Nombre del negocio</span>
                <input
                  required
                  minLength={2}
                  maxLength={120}
                  value={form.nombre}
                  onChange={(e) => set("nombre", e.target.value)}
                  className="rounded-lg border border-borde bg-superficie px-3 py-2"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-semibold text-tinta">Categoría</span>
                <select
                  value={form.categoria}
                  onChange={(e) => set("categoria", e.target.value)}
                  className="rounded-lg border border-borde bg-superficie px-3 py-2"
                >
                  {CATS_API.map((c) => (
                    <option key={c.valor} value={c.valor}>
                      {c.etiqueta}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-semibold text-tinta">Provincia</span>
                <select
                  value={form.provincia}
                  onChange={(e) => set("provincia", e.target.value)}
                  className="rounded-lg border border-borde bg-superficie px-3 py-2"
                >
                  {PROVINCIAS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-semibold text-tinta">Ciudad</span>
                <input
                  required
                  minLength={2}
                  maxLength={80}
                  value={form.ciudad}
                  onChange={(e) => set("ciudad", e.target.value)}
                  className="rounded-lg border border-borde bg-superficie px-3 py-2"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-semibold text-tinta">WhatsApp (opcional)</span>
                <input
                  inputMode="tel"
                  maxLength={20}
                  placeholder="5939XXXXXXXX"
                  value={form.whatsapp}
                  onChange={(e) => set("whatsapp", e.target.value)}
                  className="rounded-lg border border-borde bg-superficie px-3 py-2"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                <span className="font-semibold text-tinta">Horario (opcional)</span>
                <input
                  maxLength={120}
                  placeholder="Lun a Vie 8:00–18:00 · Sáb 8:00–13:00"
                  value={form.horario}
                  onChange={(e) => set("horario", e.target.value)}
                  className="rounded-lg border border-borde bg-superficie px-3 py-2"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                <span className="font-semibold text-tinta">Qué ofreces (opcional)</span>
                <textarea
                  maxLength={1000}
                  rows={3}
                  value={form.descripcion}
                  onChange={(e) => set("descripcion", e.target.value)}
                  className="rounded-lg border border-borde bg-superficie px-3 py-2"
                />
              </label>

              <label className="flex items-start gap-2 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  checked={aceptaAgenda}
                  onChange={(e) => setAceptaAgenda(e.target.checked)}
                  className="mt-0.5 h-4 w-4"
                />
                <span className="text-secundario">
                  Quiero recibir <strong className="text-tinta">solicitudes de cita</strong>{" "}
                  desde CarStore Ec (agendamiento en línea). Puedes cambiarlo después.
                </span>
              </label>

              {error && (
                <p className="text-sm font-medium text-error sm:col-span-2">{error}</p>
              )}
              <button
                type="submit"
                disabled={enviando}
                className="inline-flex w-fit rounded-full bg-accion px-6 py-2.5 text-sm font-semibold text-superficie shadow-sm transition hover:opacity-90 disabled:opacity-60 sm:col-span-2"
              >
                {enviando ? "Enviando…" : "Enviar para revisión"}
              </button>
            </form>
          )}
        </>
      )}
    </section>
  );
}
