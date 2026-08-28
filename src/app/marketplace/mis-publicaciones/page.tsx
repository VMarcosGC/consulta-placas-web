// Mis publicaciones del marketplace. El dueño ve sus autos publicados y su estado de
// verificación, y puede: editar los datos básicos (título, descripción, ciudad,
// kilometraje, precio — M2.11), editar la ficha técnica y las fotos, SOLICITAR la
// verificación "Verificado por la plataforma" (gratis; la revisa un administrador),
// publicar un borrador, MARCAR COMO VENDIDO (lo saca del feed y lo lleva al resumen
// de vendidos, con su fecha) o eliminar la publicación. Requiere sesión.

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  actualizarPublicacion,
  certificarPublicacion,
  eliminarPublicacion,
  listarMisPublicaciones,
  publicarBorrador,
  renovarPublicacion,
  solicitarVerificacion,
} from "@/lib/api";
import { antiguedadDe } from "@/lib/antiguedad";
import { tieneSesion } from "@/lib/auth";
import { cargarPerfilVendedor } from "@/lib/vendedor";
import { AvisoContactoVendedor } from "@/components/AvisoContactoVendedor";
import { FichaEditor } from "@/components/FichaEditor";
import { GaleriaFotosEditor } from "@/components/GaleriaFotosEditor";
import {
  UMBRAL_FICHA_PUBLICACION,
  fichaPendiente,
  puedePublicar,
} from "@/lib/ficha";
import {
  ApiError,
  CIUDADES_PUBLICACION,
  CiudadPublicacion,
  EstadoVerificacion,
  PublicacionActualizar,
  PublicacionInterna,
} from "@/types/api";

// Estados de una decisión de la plataforma sobre lo que el vendedor envió.
//
// MISMO ESTADO, MISMO TOKEN que en `mis-referencias` (TASK-017 fase 3). Las dos
// páginas cuelgan del mismo menú de cuenta y dicen lo mismo —"un admin decidió
// sobre lo tuyo"—, así que antes se leían como dos productos distintos: acá
// "rechazado" era gris y allá rojo, acá "en revisión" azul y allá gris.
//
// El mapa es: ausencia → neutro · en curso → `--marca` · éxito → `--confirmado`
// · rechazo → `--error`. Y `verificado` es `--confirmado` porque es EXACTAMENTE
// el mismo sello que el comprador ve verde en el feed (`ListingCard` usa
// `<Insignia tono="ok">`). El vendedor no puede ver gris lo que el comprador ve
// verde: es el sello que la premium compra (AGENTS.md §10.6).
const VERIFICACION_BADGE: Record<EstadoVerificacion, { texto: string; clase: string }> = {
  no_verificado: { texto: "Sin verificar", clase: "bg-superficie-tenue text-secundario" },
  pendiente: { texto: "En revisión", clase: "bg-marca-tinte text-marca-texto" },
  verificado: { texto: "✓ Verificado", clase: "bg-confirmado-tinte text-confirmado-texto" },
  rechazado: { texto: "Verificación rechazada", clase: "bg-error-tinte text-error" },
};

// ── Editar datos básicos de la publicación (M2.11) ──────────────────────────
// Hueco que cierra: una vez creada la publicación, `mis-publicaciones` solo dejaba
// editar ficha, fotos y estado. Si el vendedor se equivocó en el título, la
// descripción, la ciudad, el kilometraje o el precio, no tenía cómo corregirlo.
// El backend ya lo soporta con `PATCH /marketplace/publicaciones/{id}`.

// Espejo del `le=2_000_000` de `PublicacionInternaActualizar` (mismo valor que usa el
// wizard en `publicar/page.tsx`): pasarse devuelve 422 del backend.
const KILOMETRAJE_MAXIMO = 2_000_000;

const inputCls =
  "w-full rounded-xl border border-borde-fuerte px-3 py-2 text-sm text-tinta focus-glow";

// Sello "revisado por mecánica" (item 5). Si ya tiene sello, lo muestra. Si no, un
// campo para canjear el código de un solo uso que la mecánica le dio al vendedor.
function SelloMecanicaFila({
  pub,
  onSellada,
}: {
  pub: PublicacionInterna;
  onSellada: (nueva: PublicacionInterna) => void;
}) {
  const [codigo, setCodigo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (pub.sello_mecanica) {
    return (
      <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-confirmado-tinte px-2.5 py-0.5 text-xs font-semibold text-confirmado-texto">
        🔧 Revisado por {pub.sello_mecanica.nombre} · {pub.sello_mecanica.ciudad}
      </p>
    );
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const c = codigo.trim();
    if (c.length < 4) {
      setError("Escribe el código completo (formato MEC-XXXX-XXXX).");
      return;
    }
    setError(null);
    setEnviando(true);
    try {
      onSellada(await certificarPublicacion(pub.id, c));
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message || "No pudimos validar el código."
          : "No pudimos validar el código."
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="mt-2 flex flex-wrap items-center gap-2">
      <input
        value={codigo}
        onChange={(e) => setCodigo(e.target.value.toUpperCase())}
        placeholder="Código de mecánica: MEC-XXXX-XXXX"
        className="w-52 rounded-full border border-borde-fuerte px-3 py-1.5 text-xs font-mono text-tinta focus-glow"
        maxLength={24}
      />
      <button
        type="submit"
        disabled={enviando}
        className="rounded-full border border-borde-fuerte bg-superficie px-3.5 py-1.5 text-xs font-semibold text-secundario transition hover:bg-superficie-tenue disabled:opacity-50"
      >
        {enviando ? "…" : "🔧 Certificar"}
      </button>
      {error && <span className="w-full text-xs text-error">{error}</span>}
    </form>
  );
}

// ¿Este texto libre es una de las 12 ciudades del catálogo? Si no, el <select> arranca
// en "Sin especificar" y — clave — ese valor NO se considera "cambiado", así que un
// valor viejo fuera de catálogo nunca se borra solo al guardar sin tocar la ciudad.
function ciudadInicialDe(valor: string | null | undefined): CiudadPublicacion | "" {
  if (valor && (CIUDADES_PUBLICACION as readonly string[]).includes(valor)) {
    return valor as CiudadPublicacion;
  }
  return "";
}

// Formulario inline expandible, prellenado con lo que la publicación ya tiene. Se monta
// solo cuando está abierto (montaje condicional en el listado), así el snapshot inicial
// siempre sale de props frescas. Al guardar devuelve al padre la versión del backend.
function FormularioDatos({
  publicacion,
  onGuardada,
  onCancelar,
}: {
  publicacion: PublicacionInterna;
  onGuardada: (nueva: PublicacionInterna) => void;
  onCancelar: () => void;
}) {
  const router = useRouter();

  // Snapshot inicial = exactamente lo que el vendedor ve al abrir. Comparar contra este
  // snapshot es lo que decide qué campos viajan ("campos sucios"): lo que no cambió no
  // se incluye y el backend no lo toca.
  const tituloInicial = publicacion.titulo ?? "";
  const descripcionInicial = publicacion.descripcion ?? "";
  const ciudadInicial = ciudadInicialDe(publicacion.ciudad);
  const kilometrajeInicial =
    publicacion.kilometraje != null ? String(publicacion.kilometraje) : "";
  const precioInicial = String(publicacion.precio_usd);

  const [titulo, setTitulo] = useState(tituloInicial);
  const [descripcion, setDescripcion] = useState(descripcionInicial);
  const [ciudad, setCiudad] = useState<CiudadPublicacion | "">(ciudadInicial);
  const [kilometraje, setKilometraje] = useState(kilometrajeInicial);
  const [precio, setPrecio] = useState(precioInicial);

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const campoId = (nombre: string) => `${nombre}-pub-${publicacion.id}`;

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Precio: obligatorio y > 0 (el backend lo exige con `gt=0`). Se valida en cliente
    // para explicarlo en es-EC en vez de mostrar el 422 crudo de Pydantic.
    const precioNum = Number(precio.trim());
    if (!Number.isFinite(precioNum) || precioNum <= 0) {
      setError("Ingresa un precio válido mayor a 0.");
      return;
    }

    // Kilometraje: opcional. Si el vendedor escribió algo, se valida con los mismos
    // límites del backend (entero 0 … 2 000 000). Vacío = lo quiere dejar en blanco.
    const kmTexto = kilometraje.trim();
    let kmNum: number | null = null;
    if (kmTexto !== "") {
      const n = Number(kmTexto);
      if (!Number.isInteger(n) || n < 0 || n > KILOMETRAJE_MAXIMO) {
        setError(
          `Ingresa el kilometraje como un número entero entre 0 y ${KILOMETRAJE_MAXIMO.toLocaleString(
            "es-EC"
          )} km, o déjalo vacío.`
        );
        return;
      }
      kmNum = n;
    }

    // Campos sucios: solo viaja lo que cambió respecto del snapshot. Para los cuatro
    // opcionales, "cambió y quedó vacío" viaja como `null` (borrar); "cambió y tiene
    // valor" viaja con el valor. `undefined` = no se incluye → el backend no lo toca.
    const datos: PublicacionActualizar = {};
    const tituloLimpio = titulo.trim();
    if (tituloLimpio !== tituloInicial) datos.titulo = tituloLimpio || null;
    const descLimpia = descripcion.trim();
    if (descLimpia !== descripcionInicial) datos.descripcion = descLimpia || null;
    if (ciudad !== ciudadInicial) datos.ciudad = ciudad || null;
    if (kmTexto !== kilometrajeInicial) datos.kilometraje = kmNum;
    if (precio.trim() !== precioInicial) datos.precio_usd = precioNum;

    if (Object.keys(datos).length === 0) {
      onCancelar(); // nada que guardar: cerrar sin pegarle al backend
      return;
    }

    setEnviando(true);
    try {
      const nueva = await actualizarPublicacion(publicacion.id, datos);
      onGuardada(nueva);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          router.push("/login?next=/marketplace/mis-publicaciones");
          return;
        }
        if (err.status === 404) {
          setError(
            "No encontramos esta publicación o ya no está disponible. Recarga la página."
          );
        } else {
          // 422: el backend manda el `detail` accionable (ciudad fuera de catálogo,
          // kilometraje fuera de rango). Se muestra tal cual.
          setError(err.message || "No pudimos guardar los cambios.");
        }
      } else {
        setError("No pudimos guardar los cambios. Revisa tu conexión e intenta de nuevo.");
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form
      onSubmit={guardar}
      className="space-y-4 rounded-2xl border border-borde bg-superficie p-4 sm:p-5 sombra-tarjeta"
    >
      <p className="text-sm font-bold text-tinta">Editar datos del anuncio</p>

      <div>
        <label htmlFor={campoId("titulo")} className="mb-1 block text-sm font-semibold text-secundario">
          Título (opcional)
        </label>
        <input
          id={campoId("titulo")}
          className={inputCls}
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Chevrolet Sail 2018 — único dueño"
          maxLength={160}
        />
        <p className="mt-1 text-xs text-secundario">
          Si lo dejas vacío, se quita el título y el anuncio usa marca, modelo y año.
        </p>
      </div>

      <div>
        <label
          htmlFor={campoId("descripcion")}
          className="mb-1 block text-sm font-semibold text-secundario"
        >
          Descripción (opcional)
        </label>
        <textarea
          id={campoId("descripcion")}
          className={`${inputCls} min-h-24`}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          maxLength={2000}
          placeholder="Estado del auto, extras, motivo de venta…"
        />
        <p className="mt-1 text-xs text-secundario">Si la dejas vacía, se quita la descripción.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor={campoId("ciudad")}
            className="mb-1 block text-sm font-semibold text-secundario"
          >
            Ciudad donde está el auto (opcional)
          </label>
          <select
            id={campoId("ciudad")}
            className={inputCls}
            value={ciudad}
            onChange={(e) => setCiudad(e.target.value as CiudadPublicacion | "")}
          >
            <option value="">— Sin especificar —</option>
            {CIUDADES_PUBLICACION.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor={campoId("kilometraje")}
            className="mb-1 block text-sm font-semibold text-secundario"
          >
            Kilometraje (opcional)
          </label>
          <input
            id={campoId("kilometraje")}
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
          <p className="mt-1 text-xs text-secundario">Déjalo vacío si prefieres no indicarlo.</p>
        </div>
      </div>

      <div>
        <label htmlFor={campoId("precio")} className="mb-1 block text-sm font-semibold text-secundario">
          Precio (USD)
        </label>
        <input
          id={campoId("precio")}
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

      {error && (
        <p className="rounded-xl border border-error bg-error-tinte p-3 text-sm text-error">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-full bg-accion px-6 py-2.5 text-sm font-semibold text-superficie shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {enviando ? "Guardando…" : "Guardar cambios"}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          disabled={enviando}
          className="rounded-full border border-borde-fuerte px-6 py-2.5 text-sm font-semibold text-secundario transition hover:bg-superficie-tenue disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

export default function MisPublicacionesPage() {
  const router = useRouter();
  const [pubs, setPubs] = useState<PublicacionInterna[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [procesando, setProcesando] = useState<number | null>(null);
  // Id de la publicación cuya ficha técnica está abierta para editar (null = ninguna).
  const [fichaAbierta, setFichaAbierta] = useState<number | null>(null);
  const [fotosAbierta, setFotosAbierta] = useState<number | null>(null);
  // Id de la publicación con el formulario de datos básicos abierto (M2.11).
  const [datosAbierta, setDatosAbierta] = useState<number | null>(null);
  // % de ficha recién guardado por el editor, por publicación. Pisa al valor que trajo el
  // listado para que el CTA "Completa tu ficha" baje en vivo sin recargar la página.
  const [completitudes, setCompletitudes] = useState<Record<number, number>>({});
  // ¿El perfil de vendedor ya tiene un teléfono con el que un comprador pueda escribir?
  //   null  → todavía no lo sabemos (cargando) o la lectura del perfil falló / sesión
  //           vencida: en esos casos NO avisamos, no molestamos sobre algo no verificado.
  //   false → el perfil no existe aún (404 de onboarding) o existe sin `telefono`.
  //   true  → hay número; el aviso no aplica.
  const [perfilConTelefono, setPerfilConTelefono] = useState<boolean | null>(null);

  // Patrón lint-safe (react-hooks/set-state-in-effect): el setState cae SIEMPRE después
  // del await, nunca de forma síncrona dentro del efecto. Ver src/app/marketplace/page.tsx.
  useEffect(() => {
    if (!tieneSesion()) {
      router.push("/login?next=/marketplace/mis-publicaciones");
      return;
    }
    let activo = true;
    (async () => {
      try {
        // El perfil de vendedor se resuelve junto al listado: el aviso "todavía no pueden
        // contactarte" solo tiene sentido sabiendo las dos cosas (hay anuncio activo + no
        // hay número). `cargarPerfilVendedor` NO lanza —traduce el 404 de onboarding a
        // `sin_perfil`— así que no puede romper este `try` ni el listado.
        const [lista, perfilCargado] = await Promise.all([
          listarMisPublicaciones(),
          cargarPerfilVendedor(),
        ]);
        if (activo) {
          setPubs(lista);
          setError(null);
          // `sin_perfil` (404 de onboarding) o perfil sin `telefono` → falta el número.
          // `fallo` / `sesion_expirada` se dejan en null: no avisamos sobre algo que no
          // pudimos verificar (y del 401 se encarga el `catch` del listado).
          if (perfilCargado.tipo === "perfil") {
            setPerfilConTelefono(Boolean(perfilCargado.perfil.telefono));
          } else if (perfilCargado.tipo === "sin_perfil") {
            setPerfilConTelefono(false);
          }
        }
      } catch (err) {
        if (!activo) return;
        if (err instanceof ApiError && err.status === 401) {
          router.push("/login?next=/marketplace/mis-publicaciones");
          return;
        }
        setError("No pudimos cargar tus publicaciones. Intenta recargar.");
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, [router]);

  async function verificar(id: number) {
    setProcesando(id);
    setError(null);
    try {
      const actualizada = await solicitarVerificacion(id);
      setPubs((prev) => prev.map((p) => (p.id === id ? actualizada : p)));
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("No se pudo solicitar la verificación.");
      }
    } finally {
      setProcesando(null);
    }
  }

  // Publica un borrador. El backend revalida el umbral de ficha (422 con copy
  // accionable). Publicar es gratis en cualquier plan.
  async function publicar(id: number) {
    setProcesando(id);
    setError(null);
    try {
      const actualizada = await publicarBorrador(id);
      setPubs((prev) => prev.map((p) => (p.id === id ? actualizada : p)));
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "No pudimos publicar el anuncio.");
      } else {
        setError("No pudimos publicar el anuncio.");
      }
    } finally {
      setProcesando(null);
    }
  }

  // Renueva un anuncio que perdió vigencia (3 semanas sin cambios): lo vuelve a subir
  // al frente del feed. Gratis. El backend valida que esté activo y ya vencido (422).
  async function renovar(id: number) {
    setProcesando(id);
    setError(null);
    try {
      const actualizada = await renovarPublicacion(id);
      setPubs((prev) => prev.map((p) => (p.id === id ? actualizada : p)));
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "No pudimos renovar el anuncio.");
      } else {
        setError("No pudimos renovar el anuncio.");
      }
    } finally {
      setProcesando(null);
    }
  }

  async function borrar(id: number) {
    if (!confirm("¿Eliminar esta publicación?")) return;
    setProcesando(id);
    try {
      await eliminarPublicacion(id);
      setPubs((prev) => prev.filter((p) => p.id !== id));
    } catch {
      setError("No se pudo eliminar.");
    } finally {
      setProcesando(null);
    }
  }

  // Cambia el estado del anuncio (activa/pausada/vendida). El backend sella o limpia
  // `vendido_en` en la transición. "Vender" es la acción que lo saca del feed y lo
  // manda al resumen de vendidos; "volver a publicar" lo reactiva.
  async function cambiarEstado(id: number, estado: "activa" | "pausada" | "vendida") {
    setProcesando(id);
    setError(null);
    try {
      const actualizada = await actualizarPublicacion(id, { estado });
      setPubs((prev) => prev.map((p) => (p.id === id ? actualizada : p)));
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message || "No pudimos cambiar el estado del anuncio."
          : "No pudimos cambiar el estado del anuncio."
      );
    } finally {
      setProcesando(null);
    }
  }

  // Resumen por estado (chips del encabezado) + lista de vendidos aparte. El vendedor
  // pidió "dónde va lo de vendido": va como un resumen propio, no mezclado con lo activo.
  const cuenta = {
    activa: pubs.filter((p) => p.estado === "activa").length,
    vendida: pubs.filter((p) => p.estado === "vendida").length,
    pausada: pubs.filter((p) => p.estado === "pausada").length,
    borrador: pubs.filter((p) => p.estado === "borrador").length,
  };
  const vendidas = pubs.filter((p) => p.estado === "vendida");
  const noVendidas = pubs.filter((p) => p.estado !== "vendida");
  const fmtFecha = (iso?: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString("es-EC", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "";

  // Aviso de contacto: hay al menos un anuncio en el feed pero el vendedor no tiene número,
  // así que quien pulse "Ver teléfono" recibe un 409. Se deriva de `pubs`, de modo que al
  // publicar un borrador (borrador → activa) el aviso aparece sin recargar. Mientras carga,
  // si el perfil ya tiene teléfono, o si no hay anuncios activos → no se muestra nada.
  const hayAnuncioActivo = pubs.some((p) => p.estado === "activa");
  const mostrarAvisoContacto =
    !cargando && perfilConTelefono === false && hayAnuncioActivo;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <Link href="/marketplace" className="text-sm text-secundario hover:text-tinta">
        ← Volver al marketplace
      </Link>
      <header className="mt-3 mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-tinta">Mis publicaciones</h1>
          <p className="mt-1 text-secundario">Tus autos publicados y su estado de verificación.</p>
        </div>
        <Link
          href="/marketplace/publicar"
          className="rounded-full bg-accion px-4 py-2 text-sm font-semibold text-superficie shadow-sm hover:opacity-90"
        >
          + Publicar
        </Link>
      </header>

      {/* Contacto de vendedor (M5 / cierre Ola 2): un anuncio activo sin número deja al
          comprador con un 409 al pulsar "Ver teléfono". El aviso aparece SOLO en ese caso;
          si no hay anuncios activos, si el perfil ya tiene número, o si aún carga → nada. */}
      {mostrarAvisoContacto && <AvisoContactoVendedor />}

      {cargando && <p className="text-secundario">Cargando…</p>}
      {error && (
        <p className="mb-4 rounded-xl border border-error bg-error-tinte p-3 text-sm text-error">
          {error}
        </p>
      )}

      {/* Resumen por estado: un vistazo de cuántos hay activos, vendidos, en pausa
          y en borrador. */}
      {!cargando && pubs.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <span className="rounded-full bg-confirmado-tinte px-3 py-1 text-xs font-semibold text-confirmado-texto">
            {cuenta.activa} {cuenta.activa === 1 ? "activo" : "activos"}
          </span>
          <span className="rounded-full bg-marca-tinte px-3 py-1 text-xs font-semibold text-marca-texto">
            {cuenta.vendida} {cuenta.vendida === 1 ? "vendido" : "vendidos"}
          </span>
          {cuenta.pausada > 0 && (
            <span className="rounded-full bg-superficie-tenue px-3 py-1 text-xs font-semibold text-secundario">
              {cuenta.pausada} en pausa
            </span>
          )}
          {cuenta.borrador > 0 && (
            <span className="rounded-full bg-superficie-tenue px-3 py-1 text-xs font-semibold text-secundario">
              {cuenta.borrador} en borrador
            </span>
          )}
        </div>
      )}

      {/* Resumen de autos vendidos — separado de lo activo a propósito (pedido de
          producto). Cada uno con su fecha de venta y la opción de volver a publicarlo. */}
      {!cargando && vendidas.length > 0 && (
        <section className="mb-8 rounded-2xl border border-borde bg-superficie-tenue p-4 sm:p-5 sombra-tarjeta">
          <h2 className="text-sm font-bold text-tinta">
            🎉 Vendidos ({vendidas.length})
          </h2>
          <ul className="mt-3 divide-y divide-borde">
            {vendidas.map((p) => {
              const t =
                p.titulo || [p.marca, p.modelo, p.anio].filter(Boolean).join(" ") || p.placa;
              return (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-tinta">{t}</p>
                    <p className="text-xs text-secundario">
                      ${p.precio_usd.toLocaleString("es-EC")}
                      {p.vendido_en && ` · vendido el ${fmtFecha(p.vendido_en)}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => cambiarEstado(p.id, "activa")}
                      disabled={procesando === p.id}
                      className="rounded-full border border-borde-fuerte bg-superficie px-3 py-1.5 text-xs font-semibold text-secundario transition hover:bg-superficie-tenue disabled:opacity-50"
                    >
                      {procesando === p.id ? "…" : "Volver a publicar"}
                    </button>
                    <Link
                      href={`/marketplace/${p.id}`}
                      className="rounded-full border border-borde-fuerte bg-superficie px-3 py-1.5 text-xs font-semibold text-secundario transition hover:bg-superficie-tenue"
                    >
                      Ver
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {!cargando && pubs.length === 0 && (
        <div className="rounded-2xl border border-borde bg-superficie p-10 text-center sombra-tarjeta">
          <p className="text-lg font-semibold text-secundario">Todavía no publicas ningún auto.</p>
          <Link
            href="/marketplace/publicar"
            className="mt-4 inline-flex rounded-full bg-accion px-5 py-2.5 text-sm font-semibold text-superficie"
          >
            Publicar mi auto
          </Link>
        </div>
      )}

      <div className="space-y-4">
        {noVendidas.map((p) => {
          const titulo =
            p.titulo || [p.marca, p.modelo, p.anio].filter(Boolean).join(" ") || "Sin datos";
          const ocupado = procesando === p.id;
          const esPremium = p.plan === "premium";
          const badge = VERIFICACION_BADGE[p.estado_verificacion];
          const puedeSolicitar =
            esPremium &&
            (p.estado_verificacion === "no_verificado" || p.estado_verificacion === "rechazado");
          const fichaVisible = fichaAbierta === p.id;
          const fotosVisible = fotosAbierta === p.id;
          const datosVisible = datosAbierta === p.id;
          const pct = completitudes[p.id] ?? p.completitud_ficha ?? 0;
          const faltaFicha = fichaPendiente(pct);
          const esBorrador = p.estado === "borrador";
          const listoParaPublicar = puedePublicar(pct);
          // Antigüedad (migración 0026). `puede_renovar` lo decide el backend
          // (activa + ya vencida); acá solo se pinta el botón donde corresponde.
          const ant = antiguedadDe(p);
          return (
            <div key={p.id} className="space-y-3">
              <div className="flex flex-col gap-4 rounded-2xl border border-borde bg-superficie p-5 sombra-tarjeta sm:flex-row sm:items-center">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {esPremium ? (
                      <span className="rounded-full bg-marca px-2 py-0.5 text-xs font-black text-superficie">
                        ★ Premium
                      </span>
                    ) : (
                      <span className="rounded-full bg-superficie-tenue px-2 py-0.5 text-xs font-semibold text-secundario">
                        Light
                      </span>
                    )}
                    <span className="font-mono text-xs tracking-widest text-secundario">{p.placa}</span>
                    {/* Borrador: el vendedor debe saber de un vistazo que NADIE lo ve. */}
                    {esBorrador && (
                      <span className="rounded-full bg-superficie-tenue px-2 py-0.5 text-xs font-bold text-secundario">
                        Borrador · no publicado
                      </span>
                    )}
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge.clase}`}>
                      {badge.texto}
                    </span>
                    {!faltaFicha && (
                      <span className="rounded-full bg-superficie-tenue px-2 py-0.5 text-xs font-semibold text-secundario">
                        ✓ Ficha completa
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-lg font-bold text-tinta">{titulo}</p>
                  <p className="text-sm text-secundario">${p.precio_usd.toLocaleString("es-EC")}</p>
                  {ant && (
                    <p className="mt-1 text-xs text-secundario">
                      {ant.texto}
                      {ant.vencido && (
                        <span className="font-semibold text-tinta">
                          {" "}
                          · sin renovar, bajó en el listado
                        </span>
                      )}
                    </p>
                  )}

                  <SelloMecanicaFila
                    pub={p}
                    onSellada={(nueva) =>
                      setPubs((prev) => prev.map((x) => (x.id === nueva.id ? nueva : x)))
                    }
                  />

                  {/* CTA persistente (M2.5): mientras la ficha no esté al 100 %, el dueño
                      ve cuánto le falta y entra a completarla de un clic. No bloquea nada. */}
                  {faltaFicha && !fichaVisible && (
                    <button
                      type="button"
                      onClick={() => setFichaAbierta(p.id)}
                      className="mt-2 inline-flex items-center gap-2 rounded-full border border-borde bg-superficie-tenue px-3 py-1.5 text-xs font-semibold text-secundario transition hover:opacity-90"
                    >
                      Completa tu ficha ({pct} %)
                      <span aria-hidden>→</span>
                    </button>
                  )}

                  {/* Acciones VISIBLES (M2.7): antes eran enlaces de texto y el vendedor no
                      encontraba cómo subir fotos sin rehacer el wizard. Ahora son botones
                      con el mismo peso que las demás acciones de la tarjeta. */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setFotosAbierta(fotosVisible ? null : p.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                        fotosVisible
                          ? "border-marca bg-marca-tinte text-marca-texto"
                          : "border-borde-fuerte bg-superficie text-secundario hover:bg-superficie-tenue"
                      }`}
                    >
                      📷 {fotosVisible ? "Cerrar fotos" : "Fotos"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFichaAbierta(fichaVisible ? null : p.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                        fichaVisible
                          ? "border-marca bg-marca-tinte text-marca-texto"
                          : "border-borde-fuerte bg-superficie text-secundario hover:bg-superficie-tenue"
                      }`}
                    >
                      📋 {fichaVisible ? "Cerrar ficha" : "Ficha técnica"}
                    </button>
                    {/* Editar datos básicos (M2.11): título, descripción, ciudad,
                        kilometraje y precio. Se puede en cualquier estado. */}
                    <button
                      type="button"
                      onClick={() => setDatosAbierta(datosVisible ? null : p.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                        datosVisible
                          ? "border-marca bg-marca-tinte text-marca-texto"
                          : "border-borde-fuerte bg-superficie text-secundario hover:bg-superficie-tenue"
                      }`}
                    >
                      ✎ {datosVisible ? "Cerrar edición" : "Editar datos"}
                    </button>
                    <Link
                      href={`/marketplace/${p.id}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-borde-fuerte bg-superficie px-3.5 py-1.5 text-xs font-semibold text-secundario transition hover:bg-superficie-tenue"
                    >
                      Ver anuncio →
                    </Link>
                  </div>
                </div>
                <div className="flex flex-row gap-2 sm:flex-col">
                  {/* Renovar: solo cuando el anuncio ya perdió vigencia y sigue activo
                      (lo decide el backend con `puede_renovar`). Es la acción que saca
                      al anuncio del fondo del listado; por eso va en `--accion`. */}
                  {p.puede_renovar && (
                    <button
                      onClick={() => renovar(p.id)}
                      disabled={ocupado}
                      title="Vuelve a poner este anuncio al frente del listado"
                      className="flex-1 rounded-full bg-accion px-4 py-2 text-sm font-semibold text-superficie shadow-sm transition hover:opacity-90 disabled:opacity-50"
                    >
                      {ocupado ? "…" : "Renovar anuncio"}
                    </button>
                  )}
                  {/* Publicar el borrador: deshabilitado bajo el umbral, diciendo cuánto
                      falta (M2.8). El backend revalida igual. */}
                  {esBorrador && (
                    <button
                      onClick={() => publicar(p.id)}
                      disabled={ocupado || !listoParaPublicar}
                      title={
                        listoParaPublicar
                          ? "Publicar este anuncio en el feed"
                          : `Te falta ${UMBRAL_FICHA_PUBLICACION - pct} % de ficha para publicar`
                      }
                      className="flex-1 rounded-full bg-accion px-4 py-2 text-sm font-semibold text-superficie shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {ocupado
                        ? "…"
                        : listoParaPublicar
                          ? "Publicar anuncio"
                          : `Falta ${UMBRAL_FICHA_PUBLICACION - pct} % de ficha`}
                    </button>
                  )}
                  {puedeSolicitar && (
                    <button
                      onClick={() => verificar(p.id)}
                      disabled={ocupado}
                      className="flex-1 rounded-full bg-marca px-4 py-2 text-sm font-semibold text-superficie transition hover:opacity-90 disabled:opacity-50"
                    >
                      {ocupado ? "…" : "Solicitar verificación"}
                    </button>
                  )}
                  {esPremium && p.estado_verificacion === "pendiente" && (
                    <span className="flex-1 rounded-full bg-marca-tinte px-4 py-2 text-center text-sm font-medium text-marca-texto">
                      En revisión…
                    </span>
                  )}
                  {!esPremium && (
                    <span className="flex-1 rounded-full bg-superficie-tenue px-4 py-2 text-center text-xs text-secundario">
                      Hazla premium para verificar
                    </span>
                  )}
                  {/* Marcar como vendido: disponible mientras el anuncio esté activo o
                      pausado. Lo saca del feed y lo manda al resumen de vendidos, con
                      su fecha. "Volver a publicar" vive en ese resumen. */}
                  {(p.estado === "activa" || p.estado === "pausada") && (
                    <button
                      onClick={() => cambiarEstado(p.id, "vendida")}
                      disabled={ocupado}
                      title="Marca este auto como vendido y sácalo del listado"
                      className="flex-1 rounded-full border border-borde-fuerte bg-superficie px-4 py-2 text-sm font-semibold text-secundario transition hover:bg-superficie-tenue disabled:opacity-50"
                    >
                      {ocupado ? "…" : "Marcar como vendido"}
                    </button>
                  )}
                  <button
                    onClick={() => borrar(p.id)}
                    disabled={ocupado}
                    className="rounded-full border border-destructivo px-4 py-2 text-sm font-semibold text-destructivo transition hover:bg-destructivo-tinte disabled:opacity-50"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
              {fichaVisible && (
                <FichaEditor
                  publicacionId={p.id}
                  onCompletitud={(v) =>
                    setCompletitudes((prev) => ({ ...prev, [p.id]: v }))
                  }
                />
              )}
              {fotosVisible && <GaleriaFotosEditor publicacionId={p.id} />}
              {datosVisible && (
                <FormularioDatos
                  publicacion={p}
                  onGuardada={(nueva) => {
                    setPubs((prev) => prev.map((x) => (x.id === nueva.id ? nueva : x)));
                    setDatosAbierta(null);
                  }}
                  onCancelar={() => setDatosAbierta(null)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
