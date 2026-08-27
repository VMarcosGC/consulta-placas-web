// Esqueleto de carga para una grilla de tarjetas del market. Misma forma que
// `ListingCard` (foto 4:3 + precio + título + placa) para que al llegar los datos no
// haya salto de layout. Sin spinner: `animate-pulse` de Tailwind sobre
// `--superficie-tenue`, igual que el esqueleto del detalle.

function TarjetaFantasma() {
  return (
    <div className="overflow-hidden rounded-2xl border border-borde bg-superficie">
      <div className="aspect-[4/3] w-full bg-superficie-tenue" />
      <div className="flex flex-col gap-2 p-3 sm:p-4">
        <div className="h-6 w-24 rounded bg-superficie-tenue" />
        <div className="h-4 w-4/5 rounded bg-superficie-tenue" />
        <div className="h-3 w-20 rounded bg-superficie-tenue" />
        <div className="mt-1 h-5 w-16 rounded-full bg-superficie-tenue" />
      </div>
    </div>
  );
}

export function EsqueletoTarjetas({ cantidad = 8 }: { cantidad?: number }) {
  return (
    <div
      className="grid animate-pulse grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
      aria-hidden
    >
      {Array.from({ length: cantidad }, (_, i) => (
        <TarjetaFantasma key={i} />
      ))}
    </div>
  );
}
