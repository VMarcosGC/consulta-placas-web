import Link from "next/link";
import { ConsultaForm } from "@/components/ConsultaForm";

export const metadata = {
  title: "Consulta de placa | Revisa tu Carro EC",
  description:
    "Consulta matriculación e infracciones de una placa ecuatoriana en las fuentes públicas disponibles. Herramienta de apoyo del marketplace de autos.",
};

export default function ConsultarPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20 text-center">
      <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
        Ingresa la <span className="text-marca">placa</span> a consultar
      </h1>
      <p className="mt-3 text-secundario">
        Formato: 3 letras + 3 o 4 números. Ej: ABC1234.
      </p>
      <div className="mt-8 mx-auto max-w-xl">
        <ConsultaForm tamanio="hero" />
      </div>
      {/* La consulta es una herramienta de apoyo: desde aquí se vuelve al market. */}
      <p className="mt-8 text-sm text-secundario">
        ¿Buscas comprar?{" "}
        <Link href="/marketplace" className="font-semibold text-marca hover:underline">
          Mira los autos en venta
        </Link>{" "}
        — cada anuncio ya trae estos datos oficiales junto a su ficha técnica.
      </p>
    </div>
  );
}
