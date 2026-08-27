// Server component que dispara la consulta y renderiza el resultado.
// Aprovecha que Next/React server components pueden hacer fetch directo y
// devolver HTML ya con datos — bueno para SEO y velocidad percibida.

import Link from "next/link";
import { notFound } from "next/navigation";
import { ConsultaForm } from "@/components/ConsultaForm";
import { PerfilVehiculo } from "@/components/PerfilVehiculo";
import type { VehiculoConsolidado } from "@/types/api";

interface Props {
  params: Promise<{ placa: string }>;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function consultarPerfil(placa: string): Promise<VehiculoConsolidado | null> {
  try {
    const r = await fetch(`${BASE_URL}/consultar/${placa}/perfil`, {
      // El backend ya cachea internamente (TTL configurable). Aca decimos a
      // Next que no cachee HTTP — siempre va al backend y respeta su TTL.
      cache: "no-store",
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
    title: `Placa ${placa.toUpperCase()} | CarStore Ec`,
    description: `Resultado oficial de la consulta para la placa ${placa.toUpperCase()} en ANT y AMT del Ecuador.`,
  };
}

export default async function ConsultarPlacaPage({ params }: Props) {
  const { placa } = await params;
  const placaNormal = placa.toUpperCase();
  if (!/^[A-Z]{3}[0-9]{3,4}$/.test(placaNormal)) notFound();

  const data = await consultarPerfil(placaNormal);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      {/* Esta era la ÚNICA de las 18 rutas sin `<h1>` (TASK-017 fase 2). No es un
          detalle de marcado: es la página que Google indexa por placa —su propio
          `generateMetadata` lo asume— y era la única sin encabezado que dijera qué
          se está mirando. Para un lector de pantalla la página empezaba directo en
          un formulario, sin contexto.

          La placa va en `.texto-placa` (mono, `--marca`) porque es el dato del
          registro oficial, que es la distinción de §1/§3 del sistema de diseño. */}
      <h1 className="mb-2 flex flex-wrap items-baseline gap-2 text-2xl font-medium text-tinta">
        Placa <span className="texto-placa text-base">{placaNormal}</span>
      </h1>
      <div className="mb-8 max-w-md">
        <ConsultaForm tamanio="compacto" placaInicial={placaNormal} />
      </div>
      {!data ? (
        // El copy le hablaba al usuario de "la API", "el backend" y el "cold start
        // ~30s". Nuestro público navega en gama baja y no tiene por qué saber qué es
        // un cold start; y el detalle no le sirve para nada, porque haga lo que haga
        // la acción es la misma: esperar y reintentar. Además la responsabilidad se
        // enuncia desde el sistema (§7 de DISENO.md), no como si la placa tuviera
        // algo raro.
        //
        // La salida al market no es decorativa: §1.0.1 dice que si una consulta falla
        // el flujo del marketplace continúa. Sin este enlace, una consulta fallida es
        // un callejón sin salida.
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
            : el market funciona igual aunque una consulta falle.
          </p>
        </div>
      ) : (
        <PerfilVehiculo key={data.placa} inicial={data} />
      )}
    </div>
  );
}