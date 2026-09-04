// Resultado de la consulta, EN BLOQUES, dentro de la superficie aislada `/verificar`.
// Server component: consulta el perfil de forma anónima para pintar rápido y para SEO;
// `PerfilVehiculo` (cliente) lo re-consulta con el token si hay sesión, revelando los
// bloques ampliados (§1.0.3, todos gratis mientras dure la monetización suspendida).

import Link from "next/link";
import { notFound } from "next/navigation";
import { ConsultaForm } from "@/components/ConsultaForm";
import { PerfilVehiculo } from "@/components/PerfilVehiculo";
import { AvisoLoginConsulta } from "@/components/AvisoLoginConsulta";
import type { VehiculoConsolidado } from "@/types/api";

interface Props {
  params: Promise<{ placa: string }>;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function traerPerfil(placa: string): Promise<VehiculoConsolidado | null> {
  try {
    // Techo de espera en el SSR: si el backend está frío o ANT tarda, no dejamos la
    // pantalla en blanco 60 s — se corta a los 25 s y se pinta la tarjeta de reintento.
    // El backend además tiene su propio timeout de ANT (CONSULTA_TIMEOUT_ANT_SEGUNDOS).
    const r = await fetch(`${BASE_URL}/consultar/${placa}/perfil`, {
      cache: "no-store",
      signal: AbortSignal.timeout(25000),
    });
    if (!r.ok) return null;
    return (await r.json()) as VehiculoConsolidado;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props) {
  const { placa } = await params;
  return {
    title: `Placa ${placa.toUpperCase()} | Verificar un vehículo`,
    description: `Datos de la placa ${placa.toUpperCase()} en fuentes públicas del Ecuador (ANT y agencias municipales).`,
  };
}

export default async function VerificarPlacaPage({ params }: Props) {
  const { placa } = await params;
  const placaNormal = placa.toUpperCase();
  if (!/^[A-Z]{3}[0-9]{3,4}$/.test(placaNormal)) notFound();

  const data = await traerPerfil(placaNormal);

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <h1 className="mb-2 flex flex-wrap items-baseline gap-2 text-2xl font-medium text-tinta">
        Placa <span className="texto-placa text-base">{placaNormal}</span>
      </h1>
      <div className="mb-6 max-w-md">
        <ConsultaForm tamanio="compacto" placaInicial={placaNormal} />
      </div>

      {!data ? (
        <div className="sombra-tarjeta rounded-3xl border border-error bg-error-tinte p-8 text-center">
          <h2 className="text-xl font-bold text-error">No pudimos consultar esta placa</h2>
          <p className="mt-2 text-sm text-secundario">
            Es un problema nuestro, no de la placa. A veces la consulta demora unos
            segundos la primera vez: espera un momento y vuelve a intentarlo.
          </p>
          <p className="mt-4 text-sm text-secundario">
            Mientras tanto puedes{" "}
            <Link href="/marketplace" className="font-semibold text-marca hover:underline">
              ver los autos en venta
            </Link>
            .
          </p>
        </div>
      ) : (
        <>
          <AvisoLoginConsulta />
          <PerfilVehiculo key={data.placa} inicial={data} />
        </>
      )}
    </div>
  );
}
