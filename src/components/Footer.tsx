import Link from "next/link";
import { fuenteInactiva } from "@/lib/fuentes";

// Solo listamos las fuentes que hoy consultamos de verdad. Las que están en stand-by
// (M2.5: SRI y FGE, ver src/lib/fuentes.ts) se ocultan: anunciarlas prometería un dato
// que la web no entrega.
const FUENTES_PIE = [
  { clave: "ANT", nombre: "Agencia Nacional de Tránsito (ANT)" },
  { clave: "AMT", nombre: "Agencia Metropolitana de Tránsito (AMT)" },
  { clave: "SRI", nombre: "Servicio de Rentas Internas (SRI)" },
  { clave: "FGE", nombre: "Fiscalía General del Estado (FGE)" },
];

export function Footer() {
  const fuentes = FUENTES_PIE.filter((f) => !fuenteInactiva(f.clave));
  return (
    <footer className="mt-24 border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 sm:grid-cols-3">
        <div>
          <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-gradient text-white text-sm font-black shadow-sm">
              RC
            </span>
            Revisa tu Carro <span className="text-slate-400 text-sm font-bold">EC</span>
          </div>
          <p className="mt-3 text-sm text-slate-500">
            Información oficial de vehículos del Ecuador en una sola consulta.
          </p>
        </div>

        <div className="text-sm">
          <h4 className="mb-3 font-semibold text-slate-700">Producto</h4>
          <ul className="space-y-2 text-slate-500">
            <li><Link href="/consultar" className="hover:text-slate-900">Consultar placa</Link></li>
            <li><Link href="/precios" className="hover:text-slate-900">Precios</Link></li>
            <li><Link href="/mi-garage" className="hover:text-slate-900">Mi garage</Link></li>
          </ul>
        </div>

        <div className="text-sm">
          <h4 className="mb-3 font-semibold text-slate-700">Fuentes oficiales</h4>
          <ul className="space-y-2 text-slate-500">
            {fuentes.map((f) => (
              <li key={f.clave}>{f.nombre}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-200 px-6 py-5">
        <p className="mx-auto max-w-6xl text-center text-xs text-slate-400">
          © {new Date().getFullYear()} Revisa tu Carro EC · Los datos provienen de fuentes públicas oficiales. Sin afiliación con las instituciones.
        </p>
      </div>
    </footer>
  );
}
