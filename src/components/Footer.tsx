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
    <footer className="mt-24 border-t border-borde bg-superficie">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 sm:grid-cols-3">
        <div>
          <div className="flex items-center gap-2 text-lg font-semibold text-tinta">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-gradient text-superficie text-sm font-black shadow-sm">
              RC
            </span>
            Revisa tu Carro <span className="text-secundario text-sm font-bold">EC</span>
          </div>
          <p className="mt-3 text-sm text-secundario">
            Compra y vende autos en Ecuador con la ficha del vendedor y los datos oficiales
            de la placa a la vista.
          </p>
        </div>

        <div className="text-sm">
          <h4 className="mb-3 font-semibold text-secundario">Producto</h4>
          <ul className="space-y-2 text-secundario">
            <li><Link href="/marketplace" className="hover:text-tinta">Autos en venta</Link></li>
            <li><Link href="/marketplace/publicar" className="hover:text-tinta">Publicar mi auto</Link></li>
            <li><Link href="/consultar" className="hover:text-tinta">Consulta de placa</Link></li>
            <li><Link href="/mi-garage" className="hover:text-tinta">Mi garage</Link></li>
          </ul>
        </div>

        <div className="text-sm">
          <h4 className="mb-3 font-semibold text-secundario">Fuentes oficiales</h4>
          <ul className="space-y-2 text-secundario">
            {fuentes.map((f) => (
              <li key={f.clave}>{f.nombre}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-borde px-6 py-5">
        <p className="mx-auto max-w-6xl text-center text-xs text-secundario">
          © {new Date().getFullYear()} Revisa tu Carro EC · Los datos provienen de fuentes públicas oficiales. Sin afiliación con las instituciones.
        </p>
      </div>
    </footer>
  );
}
