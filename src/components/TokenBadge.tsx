// Insignia reutilizable que muestra el costo en tokens de un producto y su equivalente
// referencial en USD (1 token ≈ USD 0.04). Español de Ecuador, tono sobrio.

const USD_POR_TOKEN = 0.04;

export function precioUsdReferencial(tokens: number): string {
  return `$${(tokens * USD_POR_TOKEN).toFixed(2)}`;
}

export function TokenBadge({
  tokens,
  conPrecio = false,
}: {
  tokens: number;
  conPrecio?: boolean;
}) {
  if (tokens <= 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-confirmado-tinte px-2.5 py-1 text-xs font-semibold text-confirmado-texto">
        Gratis
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-superficie-tenue px-2.5 py-1 text-xs font-semibold text-secundario">
      <span aria-hidden>🪙</span>
      {tokens} {tokens === 1 ? "token" : "tokens"}
      {conPrecio && <span className="text-secundario">· {precioUsdReferencial(tokens)}</span>}
    </span>
  );
}
