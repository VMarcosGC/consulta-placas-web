import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Revisa tu Carro EC — Compra y vende autos con transparencia",
  description:
    "Marketplace de autos del Ecuador. Cada anuncio muestra la ficha técnica declarada por el vendedor junto a los datos oficiales de la placa: matriculación e infracciones. Publicar es gratis.",
  keywords: [
    "comprar auto Ecuador",
    "vender auto Ecuador",
    "autos usados Ecuador",
    "marketplace vehículos Ecuador",
    "revisa tu carro",
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
      <body className="min-h-full flex flex-col text-slate-900">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
