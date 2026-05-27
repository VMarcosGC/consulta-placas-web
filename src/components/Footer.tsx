import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-zinc-800/60 bg-zinc-950">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 sm:grid-cols-3">
        <div>
          <div className="flex items-center gap-2 text-lg font-semibold">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-gradient text-zinc-950 text-sm font-black">
              CP
            </span>
            ConsultaPlacas
          </div>
          <p className="mt-3 text-sm text-zinc-400">
            Información oficial de vehículos del Ecuador en una sola consulta.
          </p>
        </div>

        <div className="text-sm">
          <h4 className="mb-3 font-medium text-zinc-200">Producto</h4>
          <ul className="space-y-2 text-zinc-400">
            <li><Link href="/consultar" className="hover:text-zinc-100">Consultar placa</Link></li>
            <li><Link href="/precios" className="hover:text-zinc-100">Precios</Link></li>
            <li><Link href="/mi-garage" className="hover:text-zinc-100">Mi garage</Link></li>
          </ul>
        </div>

        <div className="text-sm">
          <h4 className="mb-3 font-medium text-zinc-200">Fuentes oficiales</h4>
          <ul className="space-y-2 text-zinc-400">
            <li>Agencia Nacional de Tránsito (ANT)</li>
            <li>Agencia Metropolitana de Tránsito (AMT)</li>
            <li>Servicio de Rentas Internas (SRI)</li>
            <li>Fiscalía General del Estado (FGE)</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-zinc-800/60 px-6 py-5">
        <p className="mx-auto max-w-6xl text-center text-xs text-zinc-500">
          © {new Date().getFullYear()} ConsultaPlacas EC · Los datos provienen de fuentes públicas oficiales. Sin afiliación con las instituciones.
        </p>
      </div>
    </footer>
  );
}
