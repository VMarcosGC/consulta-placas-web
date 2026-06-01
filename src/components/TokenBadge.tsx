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
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        Gratis
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
      <span aria-hidden>🪙</span>
      {tokens} {tokens === 1 ? "token" : "tokens"}
      {conPrecio && <span className="text-slate-400">· {precioUsdReferencial(tokens)}</span>}
    </span>
  );
}
