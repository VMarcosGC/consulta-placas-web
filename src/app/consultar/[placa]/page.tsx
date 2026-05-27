// Server component que dispara la consulta y renderiza el resultado.
// Aprovecha que Next/React server components pueden hacer fetch directo y
// devolver HTML ya con datos — bueno para SEO y velocidad percibida.

import { notFound } from "next/navigation";
import { ConsultaForm } from "@/components/ConsultaForm";
import { ResultadoConsulta } from "@/components/ResultadoConsulta";
import type { ConsultaPlacaRespuesta } from "@/types/api";

interface Props {
  params: Promise<{ placa: string }>;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function consultarPlaca(placa: string): Promise<ConsultaPlacaRespuesta | null> {
  try {
    const r = await fetch(`${BASE_URL}/consultar/${placa}`, {
      // El backend ya cachea internamente (TTL configurable). Aca decimos a
      // Next que no cachee HTTP — siempre va al backend y respeta su TTL.
      cache: "no-store",
    });
    if (!r.ok) return null;
    return (await r.json()) as ConsultaPlacaRespuesta;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props) {
  const { placa } = await params;
  return {
    title: `Placa ${placa.toUpperCase()} | ConsultaPlacas EC`,
    description: `Resultado oficial de la consulta para la placa ${placa.toUpperCase()} en ANT, AMT, SRI y Fiscalía del Ecuador.`,
  };
}

export default async function ConsultarPlacaPage({ params }: Props) {
  const { placa } = await params;
  const placaNormal = placa.toUpperCase();
  if (!/^[A-Z]{3}[0-9]{3,4}$/.test(placaNormal)) notFound();

  const data = await consultarPlaca(placaNormal);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-8 max-w-md">
        <ConsultaForm tamanio="compacto" placaInicial={placaNormal} />
      </div>
      {!data ? (
        <div className="rounded-3xl border border-red-500/30 bg-red-500/5 p-8 text-center">
          <h2 className="text-xl font-bold text-red-300">No pudimos completar la consulta</h2>
          <p className="mt-2 text-sm text-zinc-400">
            La API tardó más de lo esperado o respondió con un error. Probá de nuevo en unos segundos.
            Si el problema persiste, puede que el backend esté arrancando (cold start ~30s).
          </p>
        </div>
      ) : (
        <ResultadoConsulta data={data} />
      )}
    </div>
  );
}