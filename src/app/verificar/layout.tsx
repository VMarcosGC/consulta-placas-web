// Superficie AISLADA de la consulta de datos del vehículo. No lleva el chrome del
// marketplace (eso lo apaga `ChromeSlot` en el layout raíz según `lib/rutas.ts`).
// Solo una barra mínima propia: wordmark + volver + tema.

import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

export const metadata = {
  title: "Verificar un vehículo | CarStore Ec",
  description:
    "Consulta los datos de un vehículo del Ecuador por su placa: identificación, estado de matrícula y multas. Lo básico es gratis; con cuenta ves el detalle.",
};

export default function VerificarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-lienzo">
      <header className="border-b border-borde bg-superficie">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-3">
          <Link href="/verificar" className="leading-none" aria-label="Verificar un vehículo">
            <span className="text-lg font-black tracking-tight text-tinta">
              CarStore
              <span className="ml-1 align-top text-[10px] font-bold text-secundario">Ec</span>
            </span>
            <span className="ml-2 text-xs font-semibold text-secundario">· Verificar</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs font-semibold text-secundario transition hover:text-tinta"
            >
              ← Inicio
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-borde px-5 py-6 text-center text-xs text-secundario">
        <p>
          Datos de fuentes públicas del Ecuador (ANT, agencias municipales). Un dato
          ausente se muestra como no disponible; nunca se inventa.
        </p>
        <p className="mt-1">
          <Link href="/marketplace" className="font-semibold text-marca hover:underline">
            Comprar y vender autos
          </Link>
        </p>
      </footer>
    </div>
  );
}
