import { ConsultaForm } from "@/components/ConsultaForm";

export const metadata = {
  title: "Consultar placa | ConsultaPlacas EC",
};

export default function ConsultarPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20 text-center">
      <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
        Ingresá la <span className="text-brand-gradient">placa</span> a consultar
      </h1>
      <p className="mt-3 text-zinc-400">
        Formato: 3 letras + 3 o 4 números. Ej: ABC1234.
      </p>
      <div className="mt-8 mx-auto max-w-xl">
        <ConsultaForm tamanio="hero" />
      </div>
    </div>
  );
}
