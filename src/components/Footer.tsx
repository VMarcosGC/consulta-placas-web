import Link from "next/link";

// La columna "Fuentes oficiales" (ANT/AMT/SRI/FGE) salió del pie: la consulta de placa
// y los datos oficiales quedaron en stand-by hasta resolver de dónde salen esos datos.
// Cuando vuelva la consulta, vuelve acá el listado de fuentes y su disclaimer.

export function Footer() {
  return (
    <footer className="mt-24 border-t border-borde bg-superficie">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 sm:grid-cols-2">
        <div>
          <div className="text-lg font-bold tracking-tight text-tinta">
            CarStore
            <span className="ml-1 align-top text-xs font-bold text-secundario">Ec</span>
          </div>
          <p className="mt-0.5 text-sm font-medium text-secundario">
            Tu garage local para comprar y vender
          </p>
          <p className="mt-3 max-w-sm text-sm text-secundario">
            Compra y vende autos en Ecuador. Cada anuncio trae la ficha técnica que
            declara el vendedor.
          </p>
        </div>

        <div className="text-sm sm:justify-self-end">
          <h4 className="mb-3 font-semibold text-secundario">Producto</h4>
          <ul className="space-y-2 text-secundario">
            <li><Link href="/marketplace" className="hover:text-tinta">Autos en venta</Link></li>
            <li><Link href="/marketplace/publicar" className="hover:text-tinta">Publicar mi auto</Link></li>
            <li><Link href="/mi-garage" className="hover:text-tinta">Mi garage</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-borde px-6 py-5">
        <p className="mx-auto max-w-6xl text-center text-xs text-secundario">
          © {new Date().getFullYear()} CarStore Ec · Marketplace de autos usados en Ecuador.
        </p>
      </div>
    </footer>
  );
}
