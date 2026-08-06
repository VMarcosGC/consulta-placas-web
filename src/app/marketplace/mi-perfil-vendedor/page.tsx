// Perfil de vendedor: el nombre y el número con los que un comprador te contacta (M5).
//
// Vive junto a "Mis publicaciones" porque es identidad COMERCIAL, no de cuenta ni de
// garage: el garage es privado (tu historial) y el perfil de vendedor es exactamente lo
// que un comprador llega a ver cuando pulsa "Ver teléfono" en tu anuncio.
//
// DOS REGLAS QUE MANDAN SOBRE ESTA PANTALLA:
//  1. El **404 del GET es onboarding, no un fallo**: la cuenta todavía no tiene perfil
//     (se crea con el PATCH). Se abre el formulario vacío, nunca un error. Un fallo real
//     de red no llega como ApiError, así que los dos casos no se confunden.
//  2. **Nombre público y teléfono salen juntos**: no se puede publicar el número sin
//     elegir a mano con qué nombre te ven (opt-in de PII). Se valida acá antes de enviar
//     y se maneja igual el 422 por si llega.
//
// Página privada: sin SSR, sesión desde localStorage (patrón del repo).

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CampoTexto } from "@/components/CampoTexto";
import { actualizarMiPerfilVendedor } from "@/lib/api";
import { tieneSesion } from "@/lib/auth";
import {
  AYUDA_NOMBRE_PUBLICO,
  AYUDA_TELEFONO,
  cargarPerfilVendedor,
  notificarPerfilVendedorCambiado,
  telefonoLegible,
  telefonoPareceValido,
  type PerfilVendedorCargado,
} from "@/lib/vendedor";
import { ApiError, VendedorPerfilSalida } from "@/types/api";

const RUTA = "/marketplace/mi-perfil-vendedor";

export default function MiPerfilVendedorPage() {
  const router = useRouter();

  // `perfil` es lo último confirmado por el backend (null mientras no exista: onboarding).
  const [perfil, setPerfil] = useState<VendedorPerfilSalida | null>(null);
  const [cargando, setCargando] = useState(true);
  // Fallo REAL al cargar (red caída, 500, etc.). Distinto del 404 de onboarding: con esto
  // no se muestra el formulario, porque no sabemos qué hay guardado y guardar pisaría.
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);

  // Vuelca el resultado de la carga en el estado de la pantalla. La clasificación (qué es
  // onboarding y qué es fallo) la hace `cargarPerfilVendedor`, en un solo lugar.
  // Devuelve false si hay que salir al login.
  function aplicarCarga(r: PerfilVendedorCargado): boolean {
    if (r.tipo === "sesion_expirada") return false;
    if (r.tipo === "perfil") {
      setPerfil(r.perfil);
      setNombre(r.perfil.nombre_publico ?? "");
      setTelefono(r.perfil.telefono ?? "");
      setErrorCarga(null);
    } else if (r.tipo === "sin_perfil") {
      // ── El 404 que NO es un error ────────────────────────────────────────────
      // La cuenta todavía no tiene perfil de vendedor: es el estado inicial normal,
      // no una pantalla rota. Formulario vacío y a completar.
      setPerfil(null);
      setNombre("");
      setTelefono("");
      setErrorCarga(null);
    } else {
      // Fallo real (red caída, 5xx…): se dice y se ofrece reintentar. Nunca se confunde
      // con el 404, porque un fallo de red ni siquiera llega como ApiError.
      setErrorCarga(
        "No pudimos cargar tu perfil de vendedor. Revisa tu conexión e intenta de nuevo."
      );
    }
    setCargando(false);
    return true;
  }

  // El fetch va en un IIFE async dentro del effect: los setState ocurren tras el await
  // (nunca sincrónicamente), como pide react-hooks/set-state-in-effect. `activo` evita
  // tocar estado tras desmontar.
  useEffect(() => {
    if (!tieneSesion()) {
      router.push(`/login?next=${RUTA}`);
      return;
    }
    let activo = true;
    (async () => {
      const r = await cargarPerfilVendedor();
      if (!activo) return;
      if (!aplicarCarga(r)) router.push(`/login?next=${RUTA}`);
    })();
    return () => {
      activo = false;
    };
  }, [router]);

  // Reintento manual tras un fallo de carga (desde un handler, no desde el effect).
  async function reintentar() {
    setCargando(true);
    setErrorCarga(null);
    const r = await cargarPerfilVendedor();
    if (!aplicarCarga(r)) router.push(`/login?next=${RUTA}`);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardado(false);

    const nombreLimpio = nombre.trim();
    const telefonoLimpio = telefono.trim();

    // Validación local (regla del opt-in): el número no sale sin un nombre elegido.
    if (telefonoLimpio && !nombreLimpio) {
      setError(AYUDA_NOMBRE_PUBLICO);
      return;
    }
    if (nombreLimpio && nombreLimpio.length < 2) {
      setError("Tu nombre público necesita al menos 2 caracteres.");
      return;
    }
    if (telefonoLimpio && !telefonoPareceValido(telefonoLimpio)) {
      setError(AYUDA_TELEFONO);
      return;
    }

    setGuardando(true);
    try {
      // Se envían siempre los dos campos: es el par que el backend evalúa junto.
      // Vacío → null, que en el contrato significa "borrar este dato".
      const actualizado = await actualizarMiPerfilVendedor({
        nombre_publico: nombreLimpio || null,
        telefono: telefonoLimpio || null,
      });
      setPerfil(actualizado);
      setNombre(actualizado.nombre_publico ?? "");
      setTelefono(actualizado.telefono ?? "");
      setGuardado(true);
      // El Header sigue montado al navegar: sin este aviso, el punto ámbar del menú de la
      // cuenta seguiría diciendo "falta tu número" hasta un refresh completo.
      notificarPerfilVendedorCambiado();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          router.push(`/login?next=${RUTA}`);
          return;
        }
        // 422: teléfono inválido o teléfono sin nombre público. El backend ya manda el
        // copy es-EC que explica cómo corregirlo, así que se muestra tal cual.
        setError(err.message);
      } else {
        setError("No pudimos guardar tus datos. Revisa tu conexión e intenta de nuevo.");
      }
    } finally {
      setGuardando(false);
    }
  }

  // Contacto utilizable = los dos datos presentes (así lo evalúa el backend también).
  const contacto =
    perfil?.telefono && perfil?.nombre_publico
      ? { nombre: perfil.nombre_publico, telefono: perfil.telefono }
      : null;
  // Sin perfil todavía (404) o con perfil a medias: en ambos casos el mensaje es el mismo,
  // "completa tu contacto", porque para el comprador el resultado es idéntico.
  const faltaCompletar = !cargando && !errorCarga && contacto === null;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Link
        href="/marketplace/mis-publicaciones"
        className="text-sm text-slate-500 hover:text-slate-900"
      >
        ← Volver a mis publicaciones
      </Link>

      <header className="mt-3 mb-6">
        <h1 className="text-3xl font-black text-slate-900">Mi contacto de vendedor</h1>
        <p className="mt-1 text-slate-500">
          Así te encuentran los compradores interesados en tus autos.
        </p>
      </header>

      {cargando && <p className="text-slate-500">Cargando tu perfil…</p>}

      {/* Fallo real de carga: NO se muestra el formulario, para no pisar lo guardado
          con un formulario que quizá arrancó vacío por un error de red. */}
      {errorCarga && !cargando && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 sombra-tarjeta">
          <p className="text-sm text-rose-700">{errorCarga}</p>
          <button
            type="button"
            onClick={reintentar}
            className="mt-3 rounded-full border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
          >
            Reintentar
          </button>
        </div>
      )}

      {!cargando && !errorCarga && (
        <>
          {/* Onboarding: invitación, no advertencia. */}
          {faltaCompletar && (
            <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-900">
                Completa tu contacto para que los compradores puedan escribirte.
              </p>
              <p className="mt-1 text-sm text-blue-800">
                Mientras no cargues tu número, tus anuncios se ven igual, pero quien se
                interese no tiene cómo comunicarse contigo.
              </p>
            </div>
          )}

          {contacto && (
            <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-900">
                Tu contacto está listo.
              </p>
              <p className="mt-1 text-sm text-emerald-800">
                Los compradores te verán como <b>{contacto.nombre}</b> y podrán escribirte
                al {telefonoLegible(contacto.telefono)}.
              </p>
            </div>
          )}

          <form
            onSubmit={guardar}
            className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 sombra-tarjeta"
          >
            <div>
              <CampoTexto
                label="Nombre con el que te ven los compradores"
                value={nombre}
                onChange={(v) => {
                  setNombre(v);
                  setGuardado(false);
                }}
                placeholder="Ej.: Marcos G."
                autoComplete="off"
              />
              <p className="mt-1 text-xs text-slate-500">
                No usamos el nombre de tu cuenta: tú eliges cómo aparecer. Puede ser tu
                nombre y la inicial de tu apellido.
              </p>
            </div>

            <div>
              <CampoTexto
                label="Celular con WhatsApp"
                type="tel"
                value={telefono}
                onChange={(v) => {
                  setTelefono(v);
                  setGuardado(false);
                }}
                placeholder="0987654321"
                autoComplete="tel"
              />
              <p className="mt-1 text-xs text-slate-500">{AYUDA_TELEFONO}</p>
            </div>

            {/* La regla del par, dicha antes de que el usuario choque con el 422. */}
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-600">
              Los dos datos van juntos: para publicar tu número necesitamos el nombre con el
              que quieres que te vean. Tu número <b>no aparece</b> en el listado ni en el
              anuncio: se muestra solo cuando un comprador pulsa <b>“Ver teléfono”</b>.
            </p>

            {error && (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
                {error}
              </p>
            )}
            {guardado && !error && (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
                Guardamos tus datos.
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={guardando}
                className="rounded-full bg-brand-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60"
              >
                {guardando ? "Guardando…" : "Guardar contacto"}
              </button>
              <Link
                href="/marketplace/mis-publicaciones"
                className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Volver
              </Link>
            </div>

            {perfil?.telefono && (
              <p className="text-xs text-slate-400">
                Si borras el número y guardas, tus anuncios dejan de mostrar contacto.
              </p>
            )}
          </form>
        </>
      )}
    </div>
  );
}
