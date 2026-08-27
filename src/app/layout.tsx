import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BarraNavegacionMovil } from "@/components/BarraNavegacionMovil";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CarStore Ec — Compra y vende autos con transparencia",
  description:
    "Marketplace de autos del Ecuador. Cada anuncio muestra la ficha técnica declarada por el vendedor junto a los datos oficiales de la placa: matriculación e infracciones. Publicar es gratis.",
  keywords: [
    "comprar auto Ecuador",
    "vender auto Ecuador",
    "autos usados Ecuador",
    "marketplace vehículos Ecuador",
    "CarStore Ec",
    "consultar placa Ecuador",
    "multas AMT",
    "ANT matriculación",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* `espacio-barra-movil` reserva abajo el alto de la barra de navegación de
          celular (fixed). Va en el body y no en el <main> porque el Footer queda
          debajo del main y también se taparía. Desde `md` no reserva nada. */}
      {/* Sin `text-*` acá: el color de texto base lo fija `--tinta` en el body de
          globals.css. Una utilidad de Tailwind en este elemento gana por
          especificidad y dejaría el token del sistema sin efecto. */}
      <body className="min-h-full flex flex-col espacio-barra-movil">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <BarraNavegacionMovil />
      </body>
    </html>
  );
}
