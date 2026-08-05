// Estado del contacto de vendedor, para "Mis publicaciones" (M5 / TASK-001).
//
// Es el puente entre gestionar anuncios y poder recibir mensajes: si el vendedor no cargó
// su número, sus anuncios se publican igual pero nadie puede escribirle, y eso hay que
// decírselo donde administra sus autos, no esconderlo en una configuración.
//
// El GET del perfil responde **404 mientras la cuenta no tenga perfil**: es el estado
// inicial normal (el perfil nace con el PATCH), no un fallo. Acá se trata igual que
// "perfil a medias": invitación a completar, nunca una alerta de error.
//
// NO muestra el número. Ni siquiera al dueño: el dato vive en su formulario y en la
// revelación del comprador, y no hace falta en un listado.

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cargarPerfilVendedor, type PerfilVendedorCargado } from "@/lib/vendedor";
import { VendedorPerfilSalida } from "@/types/api";

// `oculto`: la sesión venció (401). No se pinta nada — de eso se encarga la página, que
// redirige al login; un aviso de "completa tu contacto" ahí sería un mensaje falso.
type Estado = "cargando" | "listo" | "error" | "oculto";

function estadoDe(tipo: PerfilVendedorCargado["tipo"]): Estado {
  if (tipo === "fallo") return "error";
  if (tipo === "sesion_expirada") return "oculto";
  return "listo";
}

export function AvisoContactoVendedor() {
  const [estado, setEstado] = useState<Estado>("cargando");
  // null = todavía no hay perfil (404) → onboarding, no error.
  const [perfil, setPerfil] = useState<VendedorPerfilSalida | null>(null);

  // El fetch va en un IIFE async dentro del effect y todos los setState ocurren tras el
  // await (nunca sincrónicamente), que es lo que pide react-hooks/set-state-in-effect.
  // `activo` evita tocar estado tras desmontar.
  useEffect(() => {
    let activo = true;
    (async () => {
      const r = await cargarPerfilVendedor();
      if (!activo) return;
      // `sin_perfil` (el 404 de onboarding) y `perfil` terminan igual de "listos": el
      // aviso solo distingue si hay contacto utilizable o falta completarlo. Un fallo
      // real (incluida la red caída) es apenas un aviso discreto: no puede tapar las
      // publicaciones.
      if (r.tipo === "perfil") setPerfil(r.perfil);
      else if (r.tipo === "sin_perfil") setPerfil(null);
      setEstado(estadoDe(r.tipo));
    })();
    return () => {
      activo = false;
    };
  }, []);

  // Reintento manual (desde un handler, no desde el effect).
  async function reintentar() {
    setEstado("cargando");
    const r = await cargarPerfilVendedor();
    if (r.tipo === "perfil") setPerfil(r.perfil);
    else if (r.tipo === "sin_perfil") setPerfil(null);
    setEstado(estadoDe(r.tipo));
  }

  if (estado === "cargando" || estado === "oculto") return null;

  if (estado === "error") {
    return (
      <div className="mb-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 sombra-tarjeta">
        No pudimos verificar tu contacto de vendedor.{" "}
        <button
          type="button"
          onClick={reintentar}
          className="font-semibold text-blue-600 hover:text-blue-800"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const completo = Boolean(perfil?.telefono && perfil?.nombre_publico);

  if (completo) {
    return (
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 sombra-tarjeta">
        <p className="text-sm text-slate-600">
          Los compradores te ven como <b className="text-slate-900">{perfil?.nombre_publico}</b>{" "}
          y pueden escribirte por WhatsApp.
        </p>
        <Link
          href="/marketplace/mi-perfil-vendedor"
          className="text-sm font-semibold text-blue-600 hover:text-blue-800"
        >
          Editar mi contacto
        </Link>
      </div>
    );
  }

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <div>
        <p className="text-sm font-semibold text-amber-900">
          Todavía no pueden escribirte.
        </p>
        <p className="mt-0.5 text-sm text-amber-800">
          Completa tu contacto para que los compradores interesados en tus autos puedan
          comunicarse contigo.
        </p>
      </div>
      <Link
        href="/marketplace/mi-perfil-vendedor"
        className="shrink-0 rounded-full bg-brand-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90"
      >
        Completar mi contacto
      </Link>
    </div>
  );
}
