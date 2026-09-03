// Landing del servicio de consulta de datos (superficie aislada, ver
// `docs/producto/consulta_datos_fases.md`). Solo un campo: la placa. Al enviar,
// `ConsultaForm` navega a `/verificar/{placa}` con el resultado en bloques.

import Link from "next/link";
import { ConsultaForm } from "@/components/ConsultaForm";

export default function VerificarLanding() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-12 sm:py-16">
      <p className="text-center text-xs font-semibold uppercase tracking-wide text-secundario">
        Consulta de datos del vehículo
      </p>
      <h1 className="mt-2 text-center text-3xl font-black leading-tight tracking-tight text-tinta sm:text-4xl">
        ¿Qué sabemos de esa <span className="text-marca">placa</span>?
      </h1>
      <p className="mx-auto mt-3 max-w-md text-center text-sm text-secundario">
        Identificación, estado de matrícula y multas de fuentes públicas del Ecuador.
        Escribe la placa y te lo devolvemos en bloques.
      </p>

      <div className="mt-8">
        <ConsultaForm tamanio="hero" />
      </div>
      <p className="mt-3 text-center text-xs text-secundario">
        Formato: 3 letras + 3 o 4 números (ej: ABC1234).
      </p>

      {/* Qué incluye: gratis vs. con cuenta */}
      <div className="mt-10 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-borde bg-superficie p-4 sombra-tarjeta">
          <p className="text-xs font-bold uppercase tracking-wide text-confirmado-texto">
            Gratis · sin cuenta
          </p>
          <ul className="mt-2 space-y-1 text-sm text-secundario">
            <li>· Marca, modelo, año, color y clase</li>
            <li>· Estado de matrícula y ciudad de registro</li>
            <li>· Veredicto rápido: ¿tiene multas o valores por pagar? (sí / no)</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-borde bg-superficie p-4 sombra-tarjeta">
          <p className="text-xs font-bold uppercase tracking-wide text-marca-texto">
            Con cuenta · también gratis
          </p>
          <ul className="mt-2 space-y-1 text-sm text-secundario">
            <li>· Multas con detalle: fecha, artículo y monto</li>
            <li>· Valores de matrícula</li>
            <li>· Identificadores técnicos (chasis, motor)</li>
            <li>· N.º de propietarios registrados</li>
          </ul>
          <Link
            href="/login?next=/verificar"
            className="mt-3 inline-flex text-sm font-semibold text-marca hover:underline"
          >
            Iniciar sesión →
          </Link>
        </div>
      </div>

      <p className="mt-8 text-center text-xs text-secundario">
        Herramienta de apoyo.{" "}
        <Link href="/marketplace" className="font-semibold text-marca hover:underline">
          En el marketplace
        </Link>{" "}
        cada anuncio ya trae estos datos junto a la ficha del vendedor.
      </p>
    </div>
  );
}
