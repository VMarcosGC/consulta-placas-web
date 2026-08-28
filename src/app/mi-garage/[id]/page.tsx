// Control de un vehículo del garage: PLAN DE CUIDADO (qué mantenimientos tocan, por
// reglas — el plan con IA llega después), ÚLTIMOS MANTENIMIENTOS (registro inmutable) y
// CONTROL DE GASTOS (combustible, mantenimiento, seguro… con total y promedio mensual).
//
// Todo cuelga de /vehiculos/{id}/... y requiere ser el dueño. Español de Ecuador (tuteo).

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  crearGasto,
  crearMantenimiento,
  eliminarGasto,
  eliminarMantenimiento,
  listarGastos,
  listarMantenimientos,
  listarVehiculos,
  obtenerPlanCuidado,
} from "@/lib/api";
import { tieneSesion } from "@/lib/auth";
import {
  ApiError,
  EstadoItemPlan,
  GastosVehiculo,
  MantenimientoSalida,
  PlanCuidado,
  TipoGastoApi,
  Vehiculo,
} from "@/types/api";
import { CampoTexto } from "@/components/CampoTexto";

const HOY = () => new Date().toISOString().slice(0, 10);

const TIPOS_GASTO: { valor: TipoGastoApi; etiqueta: string; icono: string }[] = [
  { valor: "combustible", etiqueta: "Combustible", icono: "⛽" },
  { valor: "mantenimiento", etiqueta: "Mantenimiento", icono: "🔧" },
  { valor: "seguro", etiqueta: "Seguro", icono: "🛡️" },
  { valor: "matricula", etiqueta: "Matrícula", icono: "📋" },
  { valor: "peajes", etiqueta: "Peajes", icono: "🛣️" },
  { valor: "multas", etiqueta: "Multas", icono: "🚨" },
  { valor: "repuestos", etiqueta: "Repuestos", icono: "⚙️" },
  { valor: "lavado", etiqueta: "Lavado", icono: "🫧" },
  { valor: "otro", etiqueta: "Otro", icono: "•" },
];
const ETIQUETA_GASTO: Record<TipoGastoApi, string> = Object.fromEntries(
  TIPOS_GASTO.map((t) => [t.valor, `${t.icono} ${t.etiqueta}`])
) as Record<TipoGastoApi, string>;

const PLAN_TONO: Record<EstadoItemPlan, { punto: string; texto: string; rotulo: string }> = {
  vencido: { punto: "bg-error", texto: "text-error", rotulo: "Vencido" },
  proximo: { punto: "bg-atencion", texto: "text-atencion-texto", rotulo: "Pronto" },
  al_dia: { punto: "bg-confirmado", texto: "text-confirmado-texto", rotulo: "Al día" },
  sin_datos: { punto: "bg-borde-fuerte", texto: "text-secundario", rotulo: "Sin datos" },
};

const usd = (v: string | number) =>
  `$${Number(v).toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fechaCorta = (iso: string) =>
  new Date(iso + (iso.length === 10 ? "T00:00:00" : "")).toLocaleDateString("es-EC", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export default function ControlVehiculoPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const vehiculoId = Number(params.id);

  const [vehiculo, setVehiculo] = useState<Vehiculo | null>(null);
  const [plan, setPlan] = useState<PlanCuidado | null>(null);
  const [mantenimientos, setMantenimientos] = useState<MantenimientoSalida[]>([]);
  const [gastos, setGastos] = useState<GastosVehiculo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recargarPlan = useCallback(() => {
    obtenerPlanCuidado(vehiculoId).then(setPlan).catch(() => {});
  }, [vehiculoId]);

  useEffect(() => {
    if (!tieneSesion()) {
      router.push(`/login?next=/mi-garage/${vehiculoId}`);
      return;
    }
    let activo = true;
    (async () => {
      // setState dentro de la función async (no en el cuerpo del effect) para no
      // disparar el linter react-hooks/set-state-in-effect.
      if (!Number.isFinite(vehiculoId)) {
        setError("Vehículo no válido.");
        setCargando(false);
        return;
      }
      try {
        const [lista, planR, mantR, gastosR] = await Promise.all([
          listarVehiculos(),
          obtenerPlanCuidado(vehiculoId).catch(() => null),
          listarMantenimientos(vehiculoId).catch(() => [] as MantenimientoSalida[]),
          listarGastos(vehiculoId).catch(() => null),
        ]);
        if (!activo) return;
        const v = lista.find((x) => x.id === vehiculoId) ?? null;
        setVehiculo(v);
        setPlan(planR);
        setMantenimientos(mantR);
        setGastos(gastosR);
        if (!v) setError("No encontramos este vehículo en tu garage.");
      } catch (err) {
        if (!activo) return;
        if (err instanceof ApiError && err.status === 401) {
          router.push(`/login?next=/mi-garage/${vehiculoId}`);
          return;
        }
        setError("No pudimos cargar el control del vehículo. Intenta recargar.");
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, [router, vehiculoId]);

  if (cargando) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center text-secundario">
        Cargando el control del vehículo…
      </div>
    );
  }

  return (
    <div className="espacio-barra-movil mx-auto max-w-3xl px-6 py-10">
      <Link href="/mi-garage" className="text-sm text-secundario hover:text-tinta">
        ← Mi garage
      </Link>

      {vehiculo && (
        <header className="mt-3 mb-6 flex flex-wrap items-center gap-3">
          <span className="grid h-11 w-20 place-items-center rounded-xl border border-marca bg-marca-tinte font-mono text-sm font-bold tracking-wider text-marca-texto">
            {vehiculo.placa}
          </span>
          <div>
            <h1 className="text-2xl font-black text-tinta">
              {[vehiculo.marca, vehiculo.modelo].filter(Boolean).join(" ") || "Tu vehículo"}
            </h1>
            <p className="text-sm text-secundario">
              {[vehiculo.anio, vehiculo.color].filter(Boolean).join(" · ") ||
                "Agrega los datos en Mi garage"}
            </p>
          </div>
        </header>
      )}

      {error && (
        <p className="mb-6 rounded-xl border border-error bg-error-tinte px-4 py-2 text-sm text-error">
          {error}
        </p>
      )}

      {vehiculo && (
        <div className="space-y-6">
          <PlanCuidadoCard plan={plan} />
          <MantenimientosCard
            vehiculoId={vehiculoId}
            items={mantenimientos}
            onCambio={(nuevos) => {
              setMantenimientos(nuevos);
              recargarPlan();
            }}
          />
          <GastosCard
            vehiculoId={vehiculoId}
            data={gastos}
            onCambio={setGastos}
          />
        </div>
      )}
    </div>
  );
}

// ── Plan de cuidado ───────────────────────────────────────────────────────────
function PlanCuidadoCard({ plan }: { plan: PlanCuidado | null }) {
  const [verTodo, setVerTodo] = useState(false);
  if (!plan) {
    return (
      <Seccion titulo="Plan de cuidado">
        <p className="text-sm text-secundario">
          No pudimos calcular el plan ahora. Registra un mantenimiento o un kilometraje y
          vuelve a entrar.
        </p>
      </Seccion>
    );
  }
  const visibles = verTodo ? plan.items : plan.items.slice(0, 6);
  return (
    <Seccion
      titulo="Plan de cuidado"
      derecha={
        plan.km_referencia != null ? (
          <span className="text-xs text-secundario">
            Ref.: {plan.km_referencia.toLocaleString("es-EC")} km
          </span>
        ) : (
          <span className="text-xs text-secundario">Sin kilometraje aún</span>
        )
      }
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-error-tinte px-2.5 py-0.5 text-xs font-semibold text-error">
          {plan.vencidos} vencido{plan.vencidos === 1 ? "" : "s"}
        </span>
        <span className="rounded-full bg-atencion-tinte px-2.5 py-0.5 text-xs font-semibold text-atencion-texto">
          {plan.proximos} por hacer pronto
        </span>
      </div>
      <ul className="divide-y divide-borde">
        {visibles.map((it) => {
          const tono = PLAN_TONO[it.estado];
          return (
            <li key={it.clave} className="flex gap-3 py-2.5">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${tono.punto}`} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-tinta">
                  {it.titulo}{" "}
                  <span className={`text-xs font-medium ${tono.texto}`}>· {tono.rotulo}</span>
                </p>
                <p className="text-xs text-secundario">{it.detalle}</p>
              </div>
            </li>
          );
        })}
      </ul>
      {plan.items.length > 6 && (
        <button
          type="button"
          onClick={() => setVerTodo((v) => !v)}
          className="mt-3 text-xs font-semibold text-tinta underline"
        >
          {verTodo ? "Ver menos" : `Ver los ${plan.items.length} ítems`}
        </button>
      )}
      <p className="mt-3 rounded-lg bg-superficie-tenue px-3 py-2 text-xs text-secundario">
        {plan.nota_ia}
      </p>
    </Seccion>
  );
}

// ── Mantenimientos ────────────────────────────────────────────────────────────
function MantenimientosCard({
  vehiculoId,
  items,
  onCambio,
}: {
  vehiculoId: number;
  items: MantenimientoSalida[];
  onCambio: (nuevos: MantenimientoSalida[]) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [verTodo, setVerTodo] = useState(false);
  const [tipo, setTipo] = useState("");
  const [fecha, setFecha] = useState(HOY());
  const [km, setKm] = useState("");
  const [taller, setTaller] = useState("");
  const [costo, setCosto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visibles = verTodo ? items : items.slice(0, 5);

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const kmN = Number(km);
    if (!tipo.trim() || !Number.isInteger(kmN) || kmN < 0) {
      setError("Indica el tipo y un kilometraje válido.");
      return;
    }
    setEnviando(true);
    try {
      const nuevo = await crearMantenimiento(vehiculoId, {
        tipo: tipo.trim(),
        fecha,
        kilometraje_relacionado: kmN,
        taller: taller.trim() || null,
        costo: costo.trim() ? Number(costo) : null,
      });
      onCambio([nuevo, ...items]);
      setTipo(""); setKm(""); setTaller(""); setCosto(""); setFecha(HOY());
      setAbierto(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos guardar el mantenimiento.");
    } finally {
      setEnviando(false);
    }
  }

  async function borrar(id: number) {
    if (!confirm("¿Eliminar este mantenimiento?")) return;
    try {
      await eliminarMantenimiento(vehiculoId, id);
      onCambio(items.filter((m) => m.id !== id));
    } catch {
      setError("No se pudo eliminar.");
    }
  }

  return (
    <Seccion
      titulo="Últimos mantenimientos"
      derecha={
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          className="rounded-full border border-borde-fuerte bg-superficie px-3 py-1 text-xs font-semibold text-secundario hover:bg-superficie-tenue"
        >
          {abierto ? "Cerrar" : "+ Registrar"}
        </button>
      }
    >
      {abierto && (
        <form onSubmit={agregar} className="mb-4 grid gap-3 rounded-xl border border-borde bg-superficie-tenue p-3 sm:grid-cols-2">
          <CampoTexto label="Tipo (aceite, frenos, distribución…)" value={tipo} onChange={setTipo} requerido />
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-tinta">Fecha</span>
            <input type="date" value={fecha} max={HOY()} onChange={(e) => setFecha(e.target.value)}
              className="rounded-lg border border-borde bg-superficie px-3 py-2" />
          </label>
          <CampoTexto label="Kilometraje" type="number" value={km} onChange={setKm} requerido />
          <CampoTexto label="Taller (opcional)" value={taller} onChange={setTaller} />
          <CampoTexto label="Costo USD (opcional)" type="number" value={costo} onChange={setCosto} />
          {error && <p className="text-xs text-error sm:col-span-2">{error}</p>}
          <button type="submit" disabled={enviando}
            className="w-fit rounded-full bg-accion px-5 py-2 text-sm font-semibold text-superficie shadow-sm disabled:opacity-60 sm:col-span-2">
            {enviando ? "Guardando…" : "Guardar mantenimiento"}
          </button>
        </form>
      )}
      {items.length === 0 ? (
        <p className="text-sm text-secundario">
          Sin mantenimientos registrados. El primero que cargues alimenta el plan de cuidado.
        </p>
      ) : (
        <>
          <ul className="divide-y divide-borde">
            {visibles.map((m) => (
              <li key={m.id} className="flex items-start justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-tinta">{m.tipo}</p>
                  <p className="text-xs text-secundario">
                    {fechaCorta(m.fecha)} · {m.kilometraje_relacionado.toLocaleString("es-EC")} km
                    {m.taller && ` · ${m.taller}`}
                    {m.costo && ` · ${usd(m.costo)}`}
                  </p>
                </div>
                <button type="button" onClick={() => borrar(m.id)}
                  className="shrink-0 text-xs font-semibold text-destructivo hover:underline">
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
          {items.length > 5 && (
            <button type="button" onClick={() => setVerTodo((v) => !v)}
              className="mt-3 text-xs font-semibold text-tinta underline">
              {verTodo ? "Ver menos" : `Ver los ${items.length}`}
            </button>
          )}
        </>
      )}
    </Seccion>
  );
}

// ── Control de gastos ─────────────────────────────────────────────────────────
function GastosCard({
  vehiculoId,
  data,
  onCambio,
}: {
  vehiculoId: number;
  data: GastosVehiculo | null;
  onCambio: (nuevo: GastosVehiculo) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [tipo, setTipo] = useState<TipoGastoApi>("combustible");
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState(HOY());
  const [km, setKm] = useState("");
  const [nota, setNota] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const items = data?.items ?? [];
  const resumen = data?.resumen;
  const totalConMantenimiento = useMemo(() => {
    if (!resumen) return 0;
    return Number(resumen.total_usd) + Number(resumen.mantenimientos_costo_usd);
  }, [resumen]);
  const maxTipo = useMemo(
    () => Math.max(1, ...(resumen?.por_tipo ?? []).map((t) => Number(t.total_usd))),
    [resumen]
  );

  async function refrescar() {
    try {
      onCambio(await listarGastos(vehiculoId));
    } catch {
      /* noop */
    }
  }

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const montoN = Number(monto);
    if (!Number.isFinite(montoN) || montoN <= 0) {
      setError("Ingresa un monto mayor a 0.");
      return;
    }
    setEnviando(true);
    try {
      await crearGasto(vehiculoId, {
        tipo,
        monto_usd: montoN,
        fecha,
        kilometraje: km.trim() ? Number(km) : null,
        nota: nota.trim() || null,
      });
      await refrescar();
      setMonto(""); setKm(""); setNota(""); setFecha(HOY());
      setAbierto(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos guardar el gasto.");
    } finally {
      setEnviando(false);
    }
  }

  async function borrar(id: number) {
    if (!confirm("¿Eliminar este gasto?")) return;
    try {
      await eliminarGasto(vehiculoId, id);
      await refrescar();
    } catch {
      setError("No se pudo eliminar.");
    }
  }

  return (
    <Seccion
      titulo="Control de gastos"
      derecha={
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          className="rounded-full border border-borde-fuerte bg-superficie px-3 py-1 text-xs font-semibold text-secundario hover:bg-superficie-tenue"
        >
          {abierto ? "Cerrar" : "+ Registrar gasto"}
        </button>
      }
    >
      {resumen && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Dato titulo="Total en gastos" valor={usd(resumen.total_usd)} />
          <Dato titulo="Promedio mensual" valor={usd(resumen.promedio_mensual_usd)} />
          <Dato
            titulo="Total con mantenimientos"
            valor={usd(totalConMantenimiento)}
            nota={`incluye ${usd(resumen.mantenimientos_costo_usd)} de mantenimientos`}
          />
        </div>
      )}

      {resumen && resumen.por_tipo.length > 0 && (
        <ul className="mb-4 space-y-1.5">
          {resumen.por_tipo.map((t) => (
            <li key={t.tipo} className="text-xs">
              <div className="flex justify-between text-secundario">
                <span>{ETIQUETA_GASTO[t.tipo]}</span>
                <span className="font-semibold text-tinta">
                  {usd(t.total_usd)} · {t.cantidad}
                </span>
              </div>
              <div className="mt-0.5 h-1.5 rounded-full bg-superficie-tenue">
                <div
                  className="h-1.5 rounded-full bg-marca"
                  style={{ width: `${(Number(t.total_usd) / maxTipo) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {abierto && (
        <form onSubmit={agregar} className="mb-4 grid gap-3 rounded-xl border border-borde bg-superficie-tenue p-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-tinta">Tipo</span>
            <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoGastoApi)}
              className="rounded-lg border border-borde bg-superficie px-3 py-2">
              {TIPOS_GASTO.map((t) => (
                <option key={t.valor} value={t.valor}>{t.icono} {t.etiqueta}</option>
              ))}
            </select>
          </label>
          <CampoTexto label="Monto USD" type="number" value={monto} onChange={setMonto} requerido />
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-tinta">Fecha</span>
            <input type="date" value={fecha} max={HOY()} onChange={(e) => setFecha(e.target.value)}
              className="rounded-lg border border-borde bg-superficie px-3 py-2" />
          </label>
          <CampoTexto label="Kilometraje (opcional)" type="number" value={km} onChange={setKm} />
          <CampoTexto label="Nota (opcional)" value={nota} onChange={setNota} />
          {error && <p className="text-xs text-error sm:col-span-2">{error}</p>}
          <button type="submit" disabled={enviando}
            className="w-fit rounded-full bg-accion px-5 py-2 text-sm font-semibold text-superficie shadow-sm disabled:opacity-60 sm:col-span-2">
            {enviando ? "Guardando…" : "Guardar gasto"}
          </button>
        </form>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-secundario">
          Todavía no registras gastos. Anota combustible, mantenimiento, seguro… y arma el
          historial de cuánto te cuesta el auto.
        </p>
      ) : (
        <ul className="divide-y divide-borde">
          {items.map((g) => (
            <li key={g.id} className="flex items-start justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-tinta">
                  {ETIQUETA_GASTO[g.tipo]} · {usd(g.monto_usd)}
                </p>
                <p className="text-xs text-secundario">
                  {fechaCorta(g.fecha)}
                  {g.kilometraje != null && ` · ${g.kilometraje.toLocaleString("es-EC")} km`}
                  {g.nota && ` · ${g.nota}`}
                </p>
              </div>
              <button type="button" onClick={() => borrar(g.id)}
                className="shrink-0 text-xs font-semibold text-destructivo hover:underline">
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      )}
    </Seccion>
  );
}

// ── Primitivas de layout ─────────────────────────────────────────────────────
function Seccion({
  titulo,
  derecha,
  children,
}: {
  titulo: string;
  derecha?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-borde bg-superficie p-4 sm:p-5 sombra-tarjeta">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-tinta">{titulo}</h2>
        {derecha}
      </div>
      {children}
    </section>
  );
}

function Dato({ titulo, valor, nota }: { titulo: string; valor: string; nota?: string }) {
  return (
    <div className="rounded-xl border border-borde bg-superficie-tenue p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-secundario">{titulo}</p>
      <p className="mt-0.5 text-lg font-black text-tinta">{valor}</p>
      {nota && <p className="text-[11px] text-secundario">{nota}</p>}
    </div>
  );
}
