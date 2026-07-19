// Editor de la ficha técnica de una publicación (vista del vendedor). 3 pestañas
// (Motor y suspensión / Carrocería / Interiores) + gestión de extras. NINGÚN campo es
// obligatorio. Guardado PARCIAL por bloque: cada "Guardar" envía SOLO el bloque editado
// (los demás se omiten para no tocarlos). Es gratis (transparencia, no cobra tokens).
//
// Uso: <FichaEditor publicacionId={id} /> — se monta en "Mis publicaciones". Carga la
// ficha actual con el endpoint público de detalle para prellenar los campos.

"use client";

import { useEffect, useState } from "react";
import { actualizarFichaPublicacion, obtenerPublicacionDetalle } from "@/lib/api";
import {
  OPCIONES_COMBUSTIBLE,
  OPCIONES_ESTADO_COMPONENTE,
  OPCIONES_ESTADO_PINTURA,
  OPCIONES_MATERIAL_ASIENTOS,
  OPCIONES_TIPO_CARROCERIA,
  OPCIONES_TRACCION,
  OPCIONES_TRANSMISION,
  colorCompletitud,
} from "@/lib/ficha";
import {
  ApiError,
  BloqueCarroceria,
  BloqueInteriores,
  BloqueMotorSuspension,
  Combustible,
  EstadoComponente,
  EstadoPintura,
  ExtraVehiculo,
  MaterialAsientos,
  TipoCarroceria,
  Traccion,
  Transmision,
} from "@/types/api";

// ── Estado del formulario (todo como string para atarlo a inputs) ────────────
// "" = campo sin especificar. Al guardar se convierte a undefined (se omite del
// bloque → el backend lo guarda como null).

type FormMotor = Record<keyof BloqueMotorSuspension, string>;
type FormCarroceria = Record<keyof BloqueCarroceria, string>;
type FormInteriores = Record<keyof BloqueInteriores, string>;

const MOTOR_VACIO: FormMotor = {
  combustible: "",
  cilindraje_cc: "",
  transmision: "",
  traccion: "",
  estado_motor: "",
  estado_suspension: "",
  fugas_visibles: "",
  cambios_recientes: "",
  observaciones: "",
};
const CARROCERIA_VACIA: FormCarroceria = {
  tipo: "",
  numero_puertas: "",
  color: "",
  estado_pintura: "",
  choques_reparados: "",
  oxido_visible: "",
  estado_general: "",
  observaciones: "",
};
const INTERIORES_VACIO: FormInteriores = {
  material_asientos: "",
  estado_asientos: "",
  aire_acondicionado: "",
  sistema_audio: "",
  estado_tablero: "",
  observaciones: "",
};

type Bloque = "motor_suspension" | "carroceria" | "interiores" | "extras";

// ── Conversores string ↔ valor de API ───────────────────────────────────────

// undefined si "" (se omite del bloque); si no, el string tal cual (catálogos/texto).
function txt<T extends string>(v: string): T | undefined {
  return v === "" ? undefined : (v as T);
}
function num(v: string): number | undefined {
  if (v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}
function bool(v: string): boolean | undefined {
  if (v === "si") return true;
  if (v === "no") return false;
  return undefined;
}
// Valor de API (posible null) → string del form.
function s(v: string | number | null | undefined): string {
  return v == null ? "" : String(v);
}
function b(v: boolean | null | undefined): string {
  if (v === true) return "si";
  if (v === false) return "no";
  return "";
}

// ── Sub-controles ────────────────────────────────────────────────────────────

const campoCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-glow";

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function SelectCatalogo({
  label,
  value,
  onChange,
  opciones,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  opciones: { valor: string; etiqueta: string }[];
}) {
  return (
    <Campo label={label}>
      <select className={campoCls} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Sin especificar</option>
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.etiqueta}
          </option>
        ))}
      </select>
    </Campo>
  );
}

function SelectBool({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Campo label={label}>
      <select className={campoCls} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Sin especificar</option>
        <option value="si">Sí</option>
        <option value="no">No</option>
      </select>
    </Campo>
  );
}

function InputNumero({
  label,
  value,
  onChange,
  min,
  max,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  min?: number;
  max?: number;
  placeholder?: string;
}) {
  return (
    <Campo label={label}>
      <input
        type="number"
        className={campoCls}
        value={value}
        min={min}
        max={max}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </Campo>
  );
}

function InputTexto({
  label,
  value,
  onChange,
  maxLength,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
  placeholder?: string;
}) {
  return (
    <Campo label={label}>
      <input
        type="text"
        className={campoCls}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </Campo>
  );
}

function AreaTexto({
  label,
  value,
  onChange,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
}) {
  return (
    <Campo label={label}>
      <textarea
        className={`${campoCls} min-h-20`}
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
      />
    </Campo>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────

const PESTANAS: { clave: Exclude<Bloque, "extras">; label: string }[] = [
  { clave: "motor_suspension", label: "Motor y suspensión" },
  { clave: "carroceria", label: "Carrocería" },
  { clave: "interiores", label: "Interiores" },
];

export function FichaEditor({ publicacionId }: { publicacionId: number }) {
  const [tab, setTab] = useState<Bloque>("motor_suspension");
  const [motor, setMotor] = useState<FormMotor>(MOTOR_VACIO);
  const [carroceria, setCarroceria] = useState<FormCarroceria>(CARROCERIA_VACIA);
  const [interiores, setInteriores] = useState<FormInteriores>(INTERIORES_VACIO);
  const [extras, setExtras] = useState<ExtraVehiculo[]>([]);

  const [completitud, setCompletitud] = useState<number>(0);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState<Bloque | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<Bloque | null>(null);

  useEffect(() => {
    let activo = true;
    (async () => {
      let detalle;
      try {
        detalle = await obtenerPublicacionDetalle(publicacionId);
      } catch {
        if (activo) {
          setError("No pudimos cargar la ficha. Intenta recargar.");
          setCargando(false);
        }
        return;
      }
      if (!activo) return;
      const f = detalle.ficha;
      if (f?.motor_suspension) {
        const m = f.motor_suspension;
        setMotor({
          combustible: s(m.combustible),
          cilindraje_cc: s(m.cilindraje_cc),
          transmision: s(m.transmision),
          traccion: s(m.traccion),
          estado_motor: s(m.estado_motor),
          estado_suspension: s(m.estado_suspension),
          fugas_visibles: b(m.fugas_visibles),
          cambios_recientes: s(m.cambios_recientes),
          observaciones: s(m.observaciones),
        });
      }
      if (f?.carroceria) {
        const c = f.carroceria;
        setCarroceria({
          tipo: s(c.tipo),
          numero_puertas: s(c.numero_puertas),
          color: s(c.color),
          estado_pintura: s(c.estado_pintura),
          choques_reparados: b(c.choques_reparados),
          oxido_visible: b(c.oxido_visible),
          estado_general: s(c.estado_general),
          observaciones: s(c.observaciones),
        });
      }
      if (f?.interiores) {
        const i = f.interiores;
        setInteriores({
          material_asientos: s(i.material_asientos),
          estado_asientos: s(i.estado_asientos),
          aire_acondicionado: b(i.aire_acondicionado),
          sistema_audio: s(i.sistema_audio),
          estado_tablero: s(i.estado_tablero),
          observaciones: s(i.observaciones),
        });
      }
      setExtras(f?.extras ?? []);
      setCompletitud(f?.completitud ?? 0);
      setCargando(false);
    })();
    return () => {
      activo = false;
    };
  }, [publicacionId]);

  // Guardado parcial: arma el payload de UN bloque y hace PATCH solo con ese bloque.
  async function guardar(bloque: Bloque) {
    setGuardando(bloque);
    setError(null);
    setOk(null);
    try {
      let payload;
      if (bloque === "motor_suspension") {
        const m: BloqueMotorSuspension = {
          combustible: txt<Combustible>(motor.combustible),
          cilindraje_cc: num(motor.cilindraje_cc),
          transmision: txt<Transmision>(motor.transmision),
          traccion: txt<Traccion>(motor.traccion),
          estado_motor: txt<EstadoComponente>(motor.estado_motor),
          estado_suspension: txt<EstadoComponente>(motor.estado_suspension),
          fugas_visibles: bool(motor.fugas_visibles),
          cambios_recientes: txt(motor.cambios_recientes),
          observaciones: txt(motor.observaciones),
        };
        payload = { motor_suspension: m };
      } else if (bloque === "carroceria") {
        const c: BloqueCarroceria = {
          tipo: txt<TipoCarroceria>(carroceria.tipo),
          numero_puertas: num(carroceria.numero_puertas),
          color: txt(carroceria.color),
          estado_pintura: txt<EstadoPintura>(carroceria.estado_pintura),
          choques_reparados: bool(carroceria.choques_reparados),
          oxido_visible: bool(carroceria.oxido_visible),
          estado_general: txt<EstadoComponente>(carroceria.estado_general),
          observaciones: txt(carroceria.observaciones),
        };
        payload = { carroceria: c };
      } else if (bloque === "interiores") {
        const i: BloqueInteriores = {
          material_asientos: txt<MaterialAsientos>(interiores.material_asientos),
          estado_asientos: txt<EstadoComponente>(interiores.estado_asientos),
          aire_acondicionado: bool(interiores.aire_acondicionado),
          sistema_audio: txt(interiores.sistema_audio),
          estado_tablero: txt<EstadoComponente>(interiores.estado_tablero),
          observaciones: txt(interiores.observaciones),
        };
        payload = { interiores: i };
      } else {
        // extras: la lista enviada reemplaza a la anterior. Descarta filas sin nombre.
        const limpios = extras
          .map((e) => ({ nombre: e.nombre.trim(), detalle: e.detalle?.trim() || undefined }))
          .filter((e) => e.nombre.length >= 2);
        payload = { extras: limpios };
      }

      const ficha = await actualizarFichaPublicacion(publicacionId, payload);
      setCompletitud(ficha.completitud);
      setOk(bloque);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setError("Tu sesión expiró. Vuelve a iniciar sesión.");
        } else if (err.status === 404) {
          setError("No encontramos esta publicación o no es tuya.");
        } else {
          setError(err.message);
        }
      } else {
        setError("No se pudo guardar. Intenta de nuevo.");
      }
    } finally {
      setGuardando(null);
    }
  }

  if (cargando) {
    return <p className="p-4 text-sm text-slate-500">Cargando ficha…</p>;
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 sombra-tarjeta">
      {/* Barra de completitud */}
      <div className="mb-4">
        <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
          <span>Ficha completada</span>
          <span className="font-semibold text-slate-700">{completitud}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-full rounded-full transition-all ${colorCompletitud(completitud)}`}
            style={{ width: `${completitud}%` }}
          />
        </div>
      </div>

      {/* Pestañas */}
      <div className="mb-4 flex flex-wrap gap-2 border-b border-slate-200">
        {PESTANAS.map((p) => (
          <TabBtn key={p.clave} activo={tab === p.clave} onClick={() => setTab(p.clave)}>
            {p.label}
          </TabBtn>
        ))}
        <TabBtn activo={tab === "extras"} onClick={() => setTab("extras")}>
          Extras
        </TabBtn>
      </div>

      {error && (
        <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </p>
      )}
      {ok && (
        <p className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          Bloque guardado. Los demás bloques quedaron intactos.
        </p>
      )}

      {/* Bloque: Motor y suspensión */}
      {tab === "motor_suspension" && (
        <BloquePanel
          onGuardar={() => guardar("motor_suspension")}
          guardando={guardando === "motor_suspension"}
        >
          <SelectCatalogo
            label="Combustible"
            value={motor.combustible}
            onChange={(v) => setMotor({ ...motor, combustible: v })}
            opciones={OPCIONES_COMBUSTIBLE}
          />
          <InputNumero
            label="Cilindraje (cc)"
            value={motor.cilindraje_cc}
            onChange={(v) => setMotor({ ...motor, cilindraje_cc: v })}
            min={49}
            max={10000}
            placeholder="1600"
          />
          <SelectCatalogo
            label="Transmisión"
            value={motor.transmision}
            onChange={(v) => setMotor({ ...motor, transmision: v })}
            opciones={OPCIONES_TRANSMISION}
          />
          <SelectCatalogo
            label="Tracción"
            value={motor.traccion}
            onChange={(v) => setMotor({ ...motor, traccion: v })}
            opciones={OPCIONES_TRACCION}
          />
          <SelectCatalogo
            label="Estado del motor"
            value={motor.estado_motor}
            onChange={(v) => setMotor({ ...motor, estado_motor: v })}
            opciones={OPCIONES_ESTADO_COMPONENTE}
          />
          <SelectCatalogo
            label="Estado de la suspensión"
            value={motor.estado_suspension}
            onChange={(v) => setMotor({ ...motor, estado_suspension: v })}
            opciones={OPCIONES_ESTADO_COMPONENTE}
          />
          <SelectBool
            label="¿Fugas visibles?"
            value={motor.fugas_visibles}
            onChange={(v) => setMotor({ ...motor, fugas_visibles: v })}
          />
          <InputTexto
            label="Cambios recientes"
            value={motor.cambios_recientes}
            onChange={(v) => setMotor({ ...motor, cambios_recientes: v })}
            maxLength={500}
            placeholder="Amortiguadores nuevos (06/2026)"
          />
          <div className="sm:col-span-2">
            <AreaTexto
              label="Observaciones"
              value={motor.observaciones}
              onChange={(v) => setMotor({ ...motor, observaciones: v })}
              maxLength={1000}
            />
          </div>
        </BloquePanel>
      )}

      {/* Bloque: Carrocería */}
      {tab === "carroceria" && (
        <BloquePanel
          onGuardar={() => guardar("carroceria")}
          guardando={guardando === "carroceria"}
        >
          <SelectCatalogo
            label="Tipo de carrocería"
            value={carroceria.tipo}
            onChange={(v) => setCarroceria({ ...carroceria, tipo: v })}
            opciones={OPCIONES_TIPO_CARROCERIA}
          />
          <InputNumero
            label="Número de puertas"
            value={carroceria.numero_puertas}
            onChange={(v) => setCarroceria({ ...carroceria, numero_puertas: v })}
            min={0}
            max={6}
            placeholder="4"
          />
          <InputTexto
            label="Color"
            value={carroceria.color}
            onChange={(v) => setCarroceria({ ...carroceria, color: v })}
            maxLength={40}
            placeholder="Plateado"
          />
          <SelectCatalogo
            label="Estado de la pintura"
            value={carroceria.estado_pintura}
            onChange={(v) => setCarroceria({ ...carroceria, estado_pintura: v })}
            opciones={OPCIONES_ESTADO_PINTURA}
          />
          <SelectBool
            label="¿Choques reparados?"
            value={carroceria.choques_reparados}
            onChange={(v) => setCarroceria({ ...carroceria, choques_reparados: v })}
          />
          <SelectBool
            label="¿Óxido visible?"
            value={carroceria.oxido_visible}
            onChange={(v) => setCarroceria({ ...carroceria, oxido_visible: v })}
          />
          <SelectCatalogo
            label="Estado general"
            value={carroceria.estado_general}
            onChange={(v) => setCarroceria({ ...carroceria, estado_general: v })}
            opciones={OPCIONES_ESTADO_COMPONENTE}
          />
          <div className="sm:col-span-2">
            <AreaTexto
              label="Observaciones"
              value={carroceria.observaciones}
              onChange={(v) => setCarroceria({ ...carroceria, observaciones: v })}
              maxLength={1000}
            />
          </div>
        </BloquePanel>
      )}

      {/* Bloque: Interiores */}
      {tab === "interiores" && (
        <BloquePanel
          onGuardar={() => guardar("interiores")}
          guardando={guardando === "interiores"}
        >
          <SelectCatalogo
            label="Material de asientos"
            value={interiores.material_asientos}
            onChange={(v) => setInteriores({ ...interiores, material_asientos: v })}
            opciones={OPCIONES_MATERIAL_ASIENTOS}
          />
          <SelectCatalogo
            label="Estado de asientos"
            value={interiores.estado_asientos}
            onChange={(v) => setInteriores({ ...interiores, estado_asientos: v })}
            opciones={OPCIONES_ESTADO_COMPONENTE}
          />
          <SelectBool
            label="¿Aire acondicionado?"
            value={interiores.aire_acondicionado}
            onChange={(v) => setInteriores({ ...interiores, aire_acondicionado: v })}
          />
          <InputTexto
            label="Sistema de audio"
            value={interiores.sistema_audio}
            onChange={(v) => setInteriores({ ...interiores, sistema_audio: v })}
            maxLength={120}
            placeholder="Pantalla táctil con CarPlay"
          />
          <SelectCatalogo
            label="Estado del tablero"
            value={interiores.estado_tablero}
            onChange={(v) => setInteriores({ ...interiores, estado_tablero: v })}
            opciones={OPCIONES_ESTADO_COMPONENTE}
          />
          <div className="sm:col-span-2">
            <AreaTexto
              label="Observaciones"
              value={interiores.observaciones}
              onChange={(v) => setInteriores({ ...interiores, observaciones: v })}
              maxLength={1000}
            />
          </div>
        </BloquePanel>
      )}

      {/* Bloque: Extras */}
      {tab === "extras" && (
        <div>
          <p className="mb-3 text-sm text-slate-500">
            Agrega los extras del vehículo (láminas de seguridad, llantas nuevas, etc.).
            Guardar reemplaza la lista completa.
          </p>
          <div className="space-y-3">
            {extras.map((e, i) => (
              <div
                key={i}
                className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-[1fr_1.5fr_auto]"
              >
                <input
                  className={campoCls}
                  placeholder="Nombre (ej. Láminas de seguridad)"
                  value={e.nombre}
                  maxLength={80}
                  onChange={(ev) =>
                    setExtras(extras.map((x, j) => (j === i ? { ...x, nombre: ev.target.value } : x)))
                  }
                />
                <input
                  className={campoCls}
                  placeholder="Detalle (opcional)"
                  value={e.detalle ?? ""}
                  maxLength={300}
                  onChange={(ev) =>
                    setExtras(extras.map((x, j) => (j === i ? { ...x, detalle: ev.target.value } : x)))
                  }
                />
                <button
                  type="button"
                  onClick={() => setExtras(extras.filter((_, j) => j !== i))}
                  className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50"
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setExtras([...extras, { nombre: "", detalle: "" }])}
            className="mt-3 rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            + Agregar extra
          </button>
          <div className="mt-4">
            <BotonGuardar onClick={() => guardar("extras")} guardando={guardando === "extras"} />
          </div>
        </div>
      )}
    </div>
  );
}

function TabBtn({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${
        activo
          ? "border-blue-500 text-blue-700"
          : "border-transparent text-slate-500 hover:text-slate-800"
      }`}
    >
      {children}
    </button>
  );
}

function BloquePanel({
  onGuardar,
  guardando,
  children,
}: {
  onGuardar: () => void;
  guardando: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
      <div className="mt-4">
        <BotonGuardar onClick={onGuardar} guardando={guardando} />
      </div>
    </div>
  );
}

function BotonGuardar({ onClick, guardando }: { onClick: () => void; guardando: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={guardando}
      className="rounded-full bg-brand-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {guardando ? "Guardando…" : "Guardar este bloque"}
    </button>
  );
}
