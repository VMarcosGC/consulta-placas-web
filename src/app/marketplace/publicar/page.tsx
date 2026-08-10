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

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  crearPublicacion,
  listarVehiculos,
  publicarBorrador,
} from "@/lib/api";
import { tieneSesion } from "@/lib/auth";
import { FichaEditor } from "@/components/FichaEditor";
import { GaleriaFotosEditor } from "@/components/GaleriaFotosEditor";
import {
  UMBRAL_FICHA_PUBLICACION,
  colorCompletitud,
  puedePublicar,
} from "@/lib/ficha";
import { ciudadDelCatalogo } from "@/lib/marketplace";
import {
  ApiError,
  CIUDADES_PUBLICACION,
  CiudadPublicacion,
  PlanPublicacion,
  Vehiculo,
} from "@/types/api";

type Paso = 1 | 2 | 3;

// Tope del recorrido declarado. Espejo del `le=2_000_000` de PublicacionInternaCrear
// (y de PublicacionReferenciadaCrear): pasarse devuelve 422 desde el backend.
const KILOMETRAJE_MAXIMO = 2_000_000;

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

function PasoDatos({
  onCreada,
}: {
  onCreada: (id: number, plan: PlanPublicacion) => void;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);

  // Prellenado desde "Publicar este auto" del garage (M2.10):
  //   ?placa=...&vehiculo=...&marca=...&modelo=...&anio=...
  // marca/modelo/año NO son campos de la publicación interna (viven en el vehículo del
  // garage / en la ficha): se usan SOLO para dar contexto de confirmación al vendedor y
  // proponer un título por defecto. No se envían en el POST.
  const placaInicial = (params.get("placa") ?? "").toUpperCase();
  const vehiculoInicial = Number(params.get("vehiculo")) || null;
  const marcaInicial = (params.get("marca") ?? "").trim();
  const modeloInicial = (params.get("modelo") ?? "").trim();
  const anioInicial = (params.get("anio") ?? "").trim();

  // "Vengo del garage" = el wizard trae un vehículo vinculado. En ese caso no volvemos a
  // pedir en frío los datos de identidad del auto: los confirmamos.
  const desdeGarage = vehiculoInicial != null;
  const contextoVehiculo = [marcaInicial, modeloInicial, anioInicial].filter(Boolean).join(" ");
  const tituloPropuesto = contextoVehiculo;

  const [placa, setPlaca] = useState(placaInicial);
  // Título por defecto solo cuando venimos del garage con datos; siempre editable.
  const [titulo, setTitulo] = useState(desdeGarage ? tituloPropuesto : "");
  const [descripcion, setDescripcion] = useState("");
  const [precio, setPrecio] = useState("");
  // Recorrido declarado por el vendedor. Opcional: publicar sin kilometraje sigue siendo
  // válido y no bloquea el alta. NO se prellena desde el garage: las lecturas de
  // kilometraje son privadas y hoy ni siquiera se registran desde la web.
  const [kilometraje, setKilometraje] = useState("");
  // Dónde está el auto en venta. Opcional: publicar sin ciudad sigue siendo válido.
  const [ciudad, setCiudad] = useState<CiudadPublicacion | "">("");
  // Ciudad PROPUESTA a partir del garage (`ciudad_registro` del vehículo). Se guarda
  // aparte del valor elegido para poder avisar de dónde salió; si el vendedor elige otra,
  // el aviso desaparece solo.
  const [ciudadSugerida, setCiudadSugerida] = useState<CiudadPublicacion | null>(null);
  // ¿El vendedor YA tocó el selector de ciudad? Hace falta un flag de INTERACCIÓN y no
  // basta con mirar el valor: `""` significa a la vez "todavía no eligió" y "eligió
  // *Sin especificar*". Con `ciudad || sugerida`, quien elegía "Sin especificar" antes de
  // que resolviera `listarVehiculos()` se encontraba la ciudad del garage impuesta —
  // justo lo contrario de "se propone, no se hereda".
  // Va en `ref` y no en estado: solo se consulta, no debe provocar render ni entrar en
  // las dependencias del efecto.
  const ciudadTocada = useRef(false);
  const [plan, setPlan] = useState<PlanPublicacion>("light");
  const [vehiculoId, setVehiculoId] = useState<number | null>(vehiculoInicial);
  // Permite "ajustar" (volver al modo manual con select + placa) si el vendedor prellenado
  // desde el garage quiere publicar otra placa.
  const [ajustando, setAjustando] = useState(false);

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const lista = await listarVehiculos();
        if (!activo) return;
        setVehiculos(lista);
        // El wizard llega desde el garage con `?vehiculo=<id>`, pero SIN ciudad. En vez de
        // sumar otro query param con texto libre (que igual habría que validar aquí), la
        // resolvemos del vehículo ya cargado: la página ya pide el garage y así el
        // prellenado también funciona cuando el vendedor elige el auto en el <select>.
        const sugerida = ciudadDelCatalogo(
          lista.find((v) => v.id === vehiculoInicial)?.ciudad_registro
        );
        if (sugerida) {
          setCiudadSugerida(sugerida);
          // Se PROPONE, no se hereda: si el vendedor ya tocó el campo mientras esta
          // llamada estaba en vuelo —incluido dejarlo en "Sin especificar"— no se pisa.
          if (!ciudadTocada.current) setCiudad(sugerida);
        }
      } catch {
        // El garage es opcional para publicar; ignoramos el error de carga.
      }
    })();
    return () => {
      activo = false;
    };
  }, [vehiculoInicial]);

  // Al elegir un vehículo del garage, prellenar la placa y proponer su ciudad.
  function elegirVehiculo(id: number | null) {
    setVehiculoId(id);
    const v = vehiculos.find((x) => x.id === id);
    if (v) setPlaca(v.placa);
    const sugerida = ciudadDelCatalogo(v?.ciudad_registro);
    setCiudadSugerida(sugerida);
    // Misma regla que en la carga: cambiar de vehículo propone su ciudad, pero no
    // sobrescribe una elección que el vendedor ya hizo a mano.
    if (sugerida && !ciudadTocada.current) setCiudad(sugerida);
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const precioNum = Number(precio);
    if (!Number.isFinite(precioNum) || precioNum <= 0) {
      setError("Ingresa un precio válido mayor a 0.");
      return;
    }

    const placaNormal = placa.trim().toUpperCase();
    if (!placaNormal) {
      setError("Ingresa la placa del vehículo.");
      return;
    }

    // Kilometraje: opcional. Si lo escribió, se valida aquí con los mismos límites del
    // backend (0 … 2 000 000) para explicarlo en es-EC en vez de devolver un 422 crudo.
    const kmTexto = kilometraje.trim();
    let kmNum: number | undefined;
    if (kmTexto) {
      const n = Number(kmTexto);
      if (!Number.isInteger(n) || n < 0 || n > KILOMETRAJE_MAXIMO) {
        setError(
          `Ingresa el kilometraje como un número entero entre 0 y ${KILOMETRAJE_MAXIMO.toLocaleString("es-EC")} km, o déjalo vacío.`
        );
        return;
      }
      kmNum = n;
    }

    setEnviando(true);
    try {
      const pub = await crearPublicacion({
        placa: placaNormal,
        titulo: titulo.trim() || undefined,
        descripcion: descripcion.trim() || undefined,
        // Sin ciudad se publica igual: no se manda la clave y el backend la deja en null.
        ciudad: ciudad || undefined,
        // Mismo criterio con el kilometraje: si no lo declaró, la clave no viaja.
        kilometraje: kmNum,
        precio_usd: precioNum,
        plan,
        vehiculo_id: vehiculoId ?? undefined,
      });

      // Corazón del wizard: en vez de mandarlo al feed, lo llevamos a la ficha.
      onCreada(pub.id, plan);
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
      {desdeGarage && !ajustando ? (
        // Prellenado desde el garage (M2.10): confirmamos el vehículo en vez de recapturar.
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Publicando desde tu garage
          </p>
          <p className="mt-1 text-lg font-bold text-slate-900">
            {contextoVehiculo || "Tu vehículo"}
          </p>
          <p className="mt-0.5 font-mono text-sm tracking-widest text-slate-500">{placa}</p>
          <p className="mt-2 text-xs text-slate-500">
            Queda vinculado a tu garage. Abajo defines precio y plan; los datos del auto ya
            los tomamos de tu garage.
          </p>
          <button
            type="button"
            onClick={() => setAjustando(true)}
            className="mt-2 text-xs font-semibold text-blue-700 underline"
          >
            Ajustar o publicar otra placa
          </button>
        </div>
      ) : (
        <>
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
        </>
      )}

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

      {/* Kilometraje: dato declarado por el vendedor y NUNCA obligatorio — nada de lo que
          se escriba aquí bloquea el alta. No se prellena desde el garage (ver nota del
          estado): las lecturas de kilometraje son privadas. */}
      <div>
        <label
          htmlFor="kilometraje-publicacion"
          className="mb-1 block text-sm font-semibold text-slate-700"
        >
          Kilometraje (opcional)
        </label>
        <input
          id="kilometraje-publicacion"
          className={inputCls}
          type="number"
          inputMode="numeric"
          min={0}
          max={KILOMETRAJE_MAXIMO}
          step={1}
          value={kilometraje}
          onChange={(e) => setKilometraje(e.target.value)}
          placeholder="85000"
        />
        <p className="mt-1 text-xs text-slate-400">
          El recorrido que marca el odómetro hoy. Es el primer dato que mira un comprador;
          si prefieres, puedes dejarlo vacío.
        </p>
      </div>

      {/* Ciudad: catálogo cerrado, y NUNCA obligatoria. Si viene propuesta desde el garage,
          se dice de dónde salió — `ciudad_registro` es dónde se matriculó el auto, no dónde
          se vende, y esa diferencia la tiene que resolver el vendedor, no nosotros. */}
      <div>
        <label
          htmlFor="ciudad-publicacion"
          className="mb-1 block text-sm font-semibold text-slate-700"
        >
          Ciudad donde está el auto (opcional)
        </label>
        <select
          id="ciudad-publicacion"
          className={inputCls}
          value={ciudad}
          onChange={(e) => {
            // Marca la interacción ANTES de aplicar el valor: desde acá, ninguna
            // sugerencia del garage vuelve a pisar lo que el vendedor eligió, ni
            // siquiera si eligió "Sin especificar".
            ciudadTocada.current = true;
            setCiudad(e.target.value as CiudadPublicacion | "");
          }}
        >
          <option value="">— Sin especificar —</option>
          {CIUDADES_PUBLICACION.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {ciudadSugerida && ciudad === ciudadSugerida ? (
          <p className="mt-1 text-xs text-blue-700">
            Tomamos <b>{ciudadSugerida}</b> de tu garage, que es donde está matriculado el
            auto. Si lo vendes en otra ciudad, cámbiala aquí.
          </p>
        ) : (
          <p className="mt-1 text-xs text-slate-400">
            Ayuda a que te encuentren compradores cerca. Puedes dejarla sin especificar.
          </p>
        )}
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
        {enviando ? "Guardando…" : "Continuar a la ficha técnica →"}
      </button>
      <p className="text-center text-xs text-slate-400">
        Guardamos tu anuncio como borrador. Nadie lo ve hasta que tú lo publiques.
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
  // Plan elegido en el paso 1, para avisar del cobro antes de pulsar "Publicar".
  const [plan, setPlan] = useState<PlanPublicacion>("light");
  const [publicando, setPublicando] = useState(false);
  const [errorPublicar, setErrorPublicar] = useState<string | null>(null);

  useEffect(() => {
    if (!tieneSesion()) router.push("/login?next=/marketplace/publicar");
  }, [router]);

  // Publica el borrador (borrador → activa). El backend revalida el umbral y, si el plan
  // es premium, cobra los tokens AQUÍ (no al crear el borrador).
  async function publicar() {
    if (publicacionId == null) return;
    setPublicando(true);
    setErrorPublicar(null);
    try {
      await publicarBorrador(publicacionId);
      router.push(`/marketplace/${publicacionId}`);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 402) {
          setErrorPublicar(
            `${err.message}. Puedes pasar el anuncio a plan Light o recargar tokens.`
          );
        } else {
          // El 422 del umbral ya trae copy es-EC accionable desde el backend.
          setErrorPublicar(err.message || "No pudimos publicar el anuncio.");
        }
      } else {
        setErrorPublicar("No pudimos publicar el anuncio.");
      }
    } finally {
      setPublicando(false);
    }
  }

  const listoParaPublicar = puedePublicar(completitud);
  const faltaParaPublicar = Math.max(0, UMBRAL_FICHA_PUBLICACION - completitud);

  // Bloque de publicación reutilizado en los pasos 2 y 3.
  const bloquePublicar = (
    <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 sombra-tarjeta">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800">
            {listoParaPublicar
              ? "Tu anuncio ya puede publicarse"
              : `Te falta ${faltaParaPublicar} % de ficha para publicar`}
          </p>
          <p className="mt-0.5 text-sm text-slate-500">
            {listoParaPublicar
              ? "Al publicarlo aparecerá en el feed y cualquiera podrá verlo."
              : `Necesitas al menos ${UMBRAL_FICHA_PUBLICACION} % para que el anuncio le sirva a un comprador.`}
          </p>
          {/* El premium se cobra AL PUBLICAR (no al crear el borrador): hay que decirlo
              antes de pulsar, no dejar que se entere con un 402. */}
          {plan === "premium" && (
            <p className="mt-1 text-xs font-medium text-blue-700">
              Al publicar se descuentan los tokens del plan Premium de tu billetera.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={publicar}
          disabled={!listoParaPublicar || publicando}
          className="shrink-0 rounded-full bg-brand-gradient px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {publicando ? "Publicando…" : "Publicar anuncio"}
        </button>
      </div>
      {errorPublicar && (
        <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {errorPublicar}
        </p>
      )}
    </div>
  );

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

      {/* PasoDatos lee query params (?placa=&vehiculo= del garage) con useSearchParams,
          que en Next 16 exige un límite de Suspense para no romper el prerender. */}
      {paso === 1 && (
        <Suspense
          fallback={<p className="mt-8 text-sm text-slate-500">Cargando formulario…</p>}
        >
          <PasoDatos
            onCreada={(id, planElegido) => {
              setPublicacionId(id);
              setPlan(planElegido);
              setPaso(2);
            }}
          />
        </Suspense>
      )}

      {paso === 2 && publicacionId != null && (
        <section className="mt-8">
          {/* M2.8: el anuncio NACE como borrador. Decir "ya está publicado" era falso y
              hacía que el vendedor abandonara creyendo que había terminado. */}
          <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-800">
              Guardado como borrador — aún no publicado
            </p>
            <p className="mt-0.5 text-sm text-slate-600">
              Nadie lo ve todavía. Completa la ficha técnica (es gratis) y cuando llegues al{" "}
              {UMBRAL_FICHA_PUBLICACION} % podrás publicarlo.
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

          {bloquePublicar}
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

          {bloquePublicar}

          <div className="mt-3 flex flex-col gap-3 sm:flex-row-reverse">
            <button
              type="button"
              onClick={completarDespues}
              className="rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Seguir después en mis publicaciones
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
