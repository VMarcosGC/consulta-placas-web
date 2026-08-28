// Directorio de servicios automotrices. VERSIÓN 1 (sin backend): lista curada en
// `src/config/servicios.ts` + filtro por categoría + CTA para que un negocio se sume.
// Cuando haya negocios reales se agrega el mapa por provincia y las calificaciones.

"use client";

import { useMemo, useState } from "react";
import {
  CATEGORIAS_SERVICIO,
  CONTACTO_ALTA_NEGOCIO,
  SERVICIOS,
  type CategoriaServicio,
} from "@/config/servicios";

export default function ServiciosPage() {
  const [cat, setCat] = useState<CategoriaServicio | "">("");

  const lista = useMemo(
    () => (cat ? SERVICIOS.filter((s) => s.categoria === cat) : SERVICIOS),
    [cat]
  );

  return (
    <div className="espacio-barra-movil mx-auto max-w-5xl px-6 py-8 sm:py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-black text-tinta sm:text-3xl">Servicios para tu auto</h1>
        <p className="mt-1 text-sm text-secundario sm:text-base">
          Mecánicas y mecánicas certificadas, centros de servicio, lavaderos, luces y
          accesorios. Un solo lugar para encontrarlos y contactarlos.
        </p>
      </header>

      {/* Filtro por categoría — chips. */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCat("")}
          aria-pressed={cat === ""}
          className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
            cat === ""
              ? "bg-oscuro text-superficie"
              : "border border-borde-fuerte bg-superficie text-secundario hover:bg-superficie-tenue"
          }`}
        >
          Todos
        </button>
        {CATEGORIAS_SERVICIO.map((c) => (
          <button
            key={c.clave}
            type="button"
            onClick={() => setCat(c.clave)}
            aria-pressed={cat === c.clave}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
              cat === c.clave
                ? "bg-oscuro text-superficie"
                : "border border-borde-fuerte bg-superficie text-secundario hover:bg-superficie-tenue"
            }`}
          >
            <span aria-hidden>{c.icono}</span>
            {c.nombre}
          </button>
        ))}
      </div>

      {/* Lista o estado vacío. */}
      {lista.length === 0 ? (
        <div className="rounded-2xl border border-borde bg-superficie p-8 text-center sombra-tarjeta">
          <p className="font-medium text-tinta">Todavía no hay servicios listados aquí.</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-secundario">
            Estamos sumando talleres y negocios de a poco. Si tienes uno, escríbenos y lo
            agregamos.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lista.map((s) => {
            const meta = CATEGORIAS_SERVICIO.find((c) => c.clave === s.categoria);
            return (
              <div
                key={s.id}
                className="flex flex-col rounded-2xl border border-borde bg-superficie p-4 sombra-tarjeta"
              >
                <div className="flex items-center gap-2">
                  <span aria-hidden className="text-lg">
                    {meta?.icono}
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-secundario">
                    {meta?.nombre}
                  </span>
                  {s.certificado && (
                    <span className="rounded-full bg-confirmado-tinte px-2 py-0.5 text-[10px] font-bold text-confirmado-texto">
                      ✓ Certificado
                    </span>
                  )}
                </div>
                <h3 className="mt-2 text-base font-bold text-tinta">{s.nombre}</h3>
                <p className="text-sm text-secundario">
                  {s.ciudad} · {s.provincia}
                </p>
                {s.descripcion && (
                  <p className="mt-1 text-sm text-secundario">{s.descripcion}</p>
                )}
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
            );
          })}
        </div>
      )}

      {/* CTA: agrega tu negocio. */}
      <section className="mt-10 rounded-3xl border border-borde bg-superficie-tenue p-6 text-center sm:p-8">
        <h2 className="text-lg font-bold text-tinta sm:text-xl">
          ¿Tienes un taller, lavadero o tienda de accesorios?
        </h2>
        <p className="mx-auto mt-1.5 max-w-lg text-sm text-secundario">
          Súmalo a CarStore Ec y que te encuentren los compradores y vendedores de autos
          de tu ciudad. Escríbenos y lo agregamos.
        </p>
        <a
          href={CONTACTO_ALTA_NEGOCIO}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex rounded-full bg-accion px-6 py-2.5 text-sm font-semibold text-superficie shadow-sm transition hover:opacity-90"
        >
          Contáctanos para sumar tu negocio
        </a>
      </section>
    </div>
  );
}
