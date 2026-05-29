// Client component — recibe la respuesta inicial (renderizada en el server para
// SEO/primer pintado) y, mientras AMT/FGE estén `en_proceso` (worker híbrido),
// hace polling silencioso cada 4s a /consultar/{placa}. Si una fuente queda en
// `error_fuente` muestra un botón para reintentar la conexión. SRI usa passthrough
// (`consulta_externa`): se ofrece un enlace al portal oficial.

"use client";

import { useEffect, useState } from "react";
import { consultarPlaca, reintentarFuente } from "@/lib/api";
import { ConsultaPlacaRespuesta } from "@/types/api";

const INTERVALO_POLLING_MS = 4000;

interface Props {
  inicial: ConsultaPlacaRespuesta;
}

const ETIQUETA_ESTADO: Record<string, string> = {
  consulta_realizada: "consulta realizada",
  sin_resultados: "sin resultados",
  en_proceso: "consultando…",
  error_fuente: "fuente no disponible",
  consulta_externa: "ver en portal",
  bloqueado_captcha: "bloqueado",
  pendiente_integracion: "pendiente",
  error: "error",
};

function BadgeEstado({ estado, cache }: { estado: string; cache?: boolean }) {
  const colores: Record<string, string> = {
    consulta_realizada: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    error: "bg-red-500/10 text-red-400 border-red-500/30",
    error_fuente: "bg-rose-500/10 text-rose-300 border-rose-500/30",
    bloqueado_captcha: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    sin_resultados: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30",
    pendiente_integracion: "bg-violet-500/10 text-violet-400 border-violet-500/30",
    en_proceso: "bg-sky-500/10 text-sky-300 border-sky-500/30",
    consulta_externa: "bg-violet-500/10 text-violet-300 border-violet-500/30",
  };
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
        colores[estado] ?? colores.error
      }`}
    >
      {estado === "en_proceso" && (
        <span className="h-1.5 w-1.5 animate-ping rounded-full bg-sky-400" />
      )}
      {ETIQUETA_ESTADO[estado] ?? estado.replace(/_/g, " ")}
      {cache && (
        <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-400">
          cache
        </span>
      )}
    </span>
  );
}

function ResumenGeneral({ data }: { data: ConsultaPlacaRespuesta }) {
  const r = data.resumen;
  const tienePendientes = r.estado_general === "con_pendientes";
  return (
    <div
      className={`rounded-3xl border p-6 sm:p-8 ${
        tienePendientes
          ? "border-amber-500/30 bg-amber-500/5"
          : "border-emerald-500/30 bg-emerald-500/5"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-sm text-zinc-400">Resultado para</p>
          <h1 className="font-mono text-4xl sm:text-5xl font-black tracking-widest">
            {data.placa}
          </h1>
        </div>
        <div>
          <span
            className={`inline-block rounded-full px-4 py-2 text-sm font-semibold ${
              tienePendientes
                ? "bg-amber-500/20 text-amber-300"
                : "bg-emerald-500/20 text-emerald-300"
            }`}
          >
            {tienePendientes ? "Tiene pendientes" : "Sin pendientes"}
          </span>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Metrica label="Fuentes consultadas" valor={`${r.fuentes_consultadas}`} />
        <Metrica label="Citaciones ANT" valor={`${r.total_citaciones_ant}`} />
        <Metrica label="Infracciones AMT" valor={`${r.total_infracciones_amt}`} />
        <Metrica label="Denuncias FGE" valor={`${r.total_denuncias_fge}`} />
      </div>
    </div>
  );
}

function Metrica({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-2xl bg-zinc-900/50 p-4">
      <p className="text-xs text-zinc-500 uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-2xl font-bold text-zinc-100">{valor}</p>
    </div>
  );
}

function CardFuente({
  titulo,
  subtitulo,
  estado,
  cache,
  children,
}: {
  titulo: string;
  subtitulo: string;
  estado: string;
  cache?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-zinc-800/60 bg-zinc-900/40 p-6 sm:p-8 animate-fade-in-up">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-100">{titulo}</h2>
          <p className="text-sm text-zinc-500">{subtitulo}</p>
        </div>
        <BadgeEstado estado={estado} cache={cache} />
      </header>
      {children}
    </section>
  );
}

// Placeholder animado mientras el worker procesa la fuente (estado en_proceso).
function CuerpoSkeleton() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-live="polite">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 w-16 rounded bg-zinc-800" />
            <div className="h-4 w-24 rounded bg-zinc-700/50" />
          </div>
        ))}
      </div>
      <div className="mt-6 h-16 rounded-2xl bg-zinc-800/40" />
      <p className="mt-4 text-xs text-sky-300/80">
        Consultando la fuente oficial… esto puede tardar unos segundos.
      </p>
    </div>
  );
}

// Fuente caída tras agotar reintentos (error_fuente): mensaje + botón reintentar.
function CuerpoErrorFuente({
  mensaje,
  onReintentar,
  reintentando,
}: {
  mensaje?: string;
  onReintentar: () => void;
  reintentando: boolean;
}) {
  return (
    <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4">
      <p className="text-sm text-rose-200">
        {mensaje || "La fuente oficial no respondió tras varios intentos."}
      </p>
      <button
        type="button"
        onClick={onReintentar}
        disabled={reintentando}
        className="mt-3 inline-flex items-center gap-2 rounded-full bg-rose-500/15 px-4 py-2 text-sm font-medium text-rose-200 transition hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {reintentando ? "Reintentando…" : "Reintentar conexión con la fuente"}
      </button>
    </div>
  );
}

function Campo({
  label,
  valor,
}: {
  label: string;
  valor: string | number | null | undefined;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-zinc-100">
        {valor ?? <span className="text-zinc-600">—</span>}
      </dd>
    </div>
  );
}

function CardANT({ ant }: { ant: ConsultaPlacaRespuesta["ant"] }) {
  return (
    <CardFuente
      titulo="ANT"
      subtitulo="Matriculación y citaciones"
      estado={ant.estado}
      cache={ant._cache}
    >
      {ant.estado !== "consulta_realizada" || !ant.datos ? (
        <p className="text-sm text-zinc-400">{ant.error ?? "Sin datos disponibles."}</p>
      ) : (
        <>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Campo label="Marca" valor={ant.datos.vehiculo.marca} />
            <Campo label="Modelo" valor={ant.datos.vehiculo.modelo} />
            <Campo label="Año" valor={ant.datos.vehiculo.anio_vehiculo} />
            <Campo label="Color" valor={ant.datos.vehiculo.color} />
            <Campo label="Clase" valor={ant.datos.vehiculo.clase} />
            <Campo label="Servicio" valor={ant.datos.vehiculo.servicio} />
            <Campo label="Matrícula" valor={ant.datos.vehiculo.fecha_matricula} />
            <Campo label="Vence" valor={ant.datos.vehiculo.fecha_caducidad} />
          </dl>
          <div className="mt-6 grid grid-cols-3 sm:grid-cols-5 gap-3 text-center">
            <Pildora
              label="Pendientes"
              valor={ant.datos.citaciones.pendientes}
              tono={ant.datos.citaciones.pendientes > 0 ? "alerta" : "ok"}
            />
            <Pildora label="Pagadas" valor={ant.datos.citaciones.pagadas} tono="neutro" />
            <Pildora label="Anuladas" valor={ant.datos.citaciones.anuladas} tono="neutro" />
            <Pildora label="Impugnación" valor={ant.datos.citaciones.en_impugnacion} tono="neutro" />
            <Pildora label="Convenio" valor={ant.datos.citaciones.en_convenio} tono="neutro" />
          </div>
        </>
      )}
    </CardFuente>
  );
}

function CardAMT({
  amt,
  onReintentar,
  reintentando,
}: {
  amt: ConsultaPlacaRespuesta["amt"];
  onReintentar: () => void;
  reintentando: boolean;
}) {
  return (
    <CardFuente
      titulo="AMT Quito"
      subtitulo="Infracciones municipales"
      estado={amt.estado}
      cache={amt._cache}
    >
      {amt.estado === "en_proceso" ? (
        <CuerpoSkeleton />
      ) : amt.estado === "error_fuente" ? (
        <CuerpoErrorFuente
          mensaje={amt.error}
          onReintentar={onReintentar}
          reintentando={reintentando}
        />
      ) : amt.estado !== "consulta_realizada" || !amt.datos ? (
        <p className="text-sm text-zinc-400">{amt.error ?? "Sin datos disponibles."}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
            <Campo label="Total registros" valor={amt.datos.infracciones.total_registros} />
            <Campo label="Pendientes" valor={amt.datos.infracciones.pendientes} />
            <Campo
              label="Valor pendiente"
              valor={`$${amt.datos.infracciones.total_a_pagar.toFixed(2)}`}
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
            {Object.entries(amt.datos.infracciones.categorias).map(([k, v]) => (
              <Pildora
                key={k}
                label={k.replace(/_/g, " ")}
                valor={`${v.cantidad} · $${v.monto.toFixed(2)}`}
                tono={k === "pendientes" && v.cantidad > 0 ? "alerta" : "neutro"}
              />
            ))}
          </div>
        </>
      )}
    </CardFuente>
  );
}

function CardSRI({
  sri,
  placa,
}: {
  sri: ConsultaPlacaRespuesta["sri"];
  placa: string;
}) {
  return (
    <CardFuente
      titulo="SRI"
      subtitulo="Valores tributarios"
      estado={sri.estado}
      cache={sri._cache}
    >
      {sri.estado === "consulta_externa" ? (
        <div className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-4">
          <p className="text-sm text-violet-100">
            El portal del SRI no permite la consulta automatizada (reCAPTCHA). Consultá
            los valores de matrícula directamente en el sitio oficial con la placa{" "}
            <span className="font-mono font-semibold text-violet-200">{placa}</span>.
          </p>
          {sri.url_consulta && (
            <a
              href={sri.url_consulta}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-violet-500/20 px-4 py-2 text-sm font-medium text-violet-200 transition hover:bg-violet-500/30"
            >
              Consultar en el portal del SRI ↗
            </a>
          )}
        </div>
      ) : sri.estado === "bloqueado_captcha" ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-200">
          El portal del SRI bloqueó la consulta automatizada con reCAPTCHA invisible. Esta
          limitación está documentada — estamos evaluando integración por API oficial.
        </div>
      ) : sri.estado !== "consulta_realizada" || !sri.datos ? (
        <p className="text-sm text-zinc-400">{sri.error ?? "Sin datos disponibles."}</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Campo label="Matrícula" valor={`$${sri.datos.valores.matricula.toFixed(2)}`} />
          <Campo
            label="Total a pagar"
            valor={`$${sri.datos.valores.total_a_pagar.toFixed(2)}`}
          />
          <Campo
            label="Estado"
            valor={sri.datos.tiene_valores_pendientes ? "Con valores" : "Al día"}
          />
        </div>
      )}
    </CardFuente>
  );
}

function CardFGE({
  fge,
  onReintentar,
  reintentando,
}: {
  fge: ConsultaPlacaRespuesta["fge"];
  onReintentar: () => void;
  reintentando: boolean;
}) {
  return (
    <CardFuente
      titulo="Fiscalía General del Estado"
      subtitulo="Noticias del delito asociadas"
      estado={fge.estado}
      cache={fge._cache}
    >
      {fge.estado === "en_proceso" ? (
        <CuerpoSkeleton />
      ) : fge.estado === "error_fuente" ? (
        <CuerpoErrorFuente
          mensaje={fge.error}
          onReintentar={onReintentar}
          reintentando={reintentando}
        />
      ) : fge.estado !== "consulta_realizada" || !fge.datos ? (
        <p className="text-sm text-zinc-400">{fge.error ?? "Sin datos disponibles."}</p>
      ) : fge.datos.denuncias.total_encontradas === 0 ? (
        <p className="text-sm text-emerald-300">
          Sin denuncias registradas asociadas a esta placa.
        </p>
      ) : (
        <ul className="space-y-3">
          {fge.datos.denuncias.detalle.map((d) => (
            <li
              key={d.ndd}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span className="font-mono text-xs text-zinc-500">NDD {d.ndd}</span>
                <span className="text-xs text-zinc-400">
                  {d.fecha} · {d.hora}
                </span>
              </div>
              <p className="text-sm font-medium text-zinc-100">{d.delito}</p>
              <p className="mt-1 text-xs text-zinc-400">
                {d.lugar} · {d.unidad}
              </p>
            </li>
          ))}
        </ul>
      )}
    </CardFuente>
  );
}

function Pildora({
  label,
  valor,
  tono,
}: {
  label: string;
  valor: string | number;
  tono: "ok" | "alerta" | "neutro";
}) {
  const colores = {
    ok: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
    alerta: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    neutro: "bg-zinc-800/60 text-zinc-300 border-zinc-700/60",
  };
  return (
    <div className={`rounded-xl border px-2 py-2 text-xs ${colores[tono]}`}>
      <div className="text-[10px] uppercase tracking-wider opacity-70">{label}</div>
      <div className="font-semibold">{valor}</div>
    </div>
  );
}

export function ResultadoConsulta({ inicial }: Props) {
  const [data, setData] = useState<ConsultaPlacaRespuesta>(inicial);
  const [reintentando, setReintentando] = useState<{ AMT?: boolean; FGE?: boolean }>({});

  // Nota: al navegar a otra placa el componente se remonta vía `key={placa}` (page.tsx),
  // así que el estado se reinicia sin un effect de reset (anti-patrón).

  // Polling silencioso cada 4s mientras AMT/FGE estén en proceso. La dependencia en
  // `data` re-arma el timeout tras cada actualización y lo detiene al resolverse.
  useEffect(() => {
    const hayEnProceso =
      data.amt.estado === "en_proceso" || data.fge.estado === "en_proceso";
    if (!hayEnProceso) return;

    const t = setTimeout(async () => {
      try {
        setData(await consultarPlaca(data.placa));
      } catch {
        // Silencioso: mantener los datos previos y reintentar en el próximo ciclo.
      }
    }, INTERVALO_POLLING_MS);

    return () => clearTimeout(t);
  }, [data]);

  async function reintentar(fuente: "AMT" | "FGE") {
    setReintentando((r) => ({ ...r, [fuente]: true }));
    // Optimista: volver la fuente a "en_proceso" reanuda el polling de inmediato.
    setData((prev) =>
      fuente === "AMT"
        ? { ...prev, amt: { ...prev.amt, estado: "en_proceso", error: undefined } }
        : { ...prev, fge: { ...prev.fge, estado: "en_proceso", error: undefined } }
    );
    try {
      await reintentarFuente(data.placa, fuente);
    } catch {
      // El polling reintenta igual; el reencolado puede haberse hecho.
    }
    setReintentando((r) => ({ ...r, [fuente]: false }));
  }

  return (
    <div className="space-y-6">
      <ResumenGeneral data={data} />
      <CardANT ant={data.ant} />
      <CardAMT
        amt={data.amt}
        onReintentar={() => reintentar("AMT")}
        reintentando={!!reintentando.AMT}
      />
      <CardSRI sri={data.sri} placa={data.placa} />
      <CardFGE
        fge={data.fge}
        onReintentar={() => reintentar("FGE")}
        reintentando={!!reintentando.FGE}
      />
    </div>
  );
}
