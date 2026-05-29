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
  title: "Revisa tu Carro EC — Conocé el estado real de cualquier vehículo",
  description:
    "Matriculación, citaciones, infracciones y denuncias en una sola consulta. Datos oficiales de ANT, AMT, SRI y Fiscalía del Ecuador.",
  keywords: [
    "consultar placa Ecuador",
    "revisa tu carro",
    "ANT matriculación",
    "multas AMT",
    "infracciones tránsito Ecuador",
    "fiscalía vehículo",
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
