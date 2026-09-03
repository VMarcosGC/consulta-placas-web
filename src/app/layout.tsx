import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BarraNavegacionMovil } from "@/components/BarraNavegacionMovil";
import { ChatWidget } from "@/components/ChatWidget";
import { ChromeSlot } from "@/components/ChromeSlot";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CarStore Ec — Compra y vende autos en Ecuador",
  description:
    "Marketplace de autos del Ecuador. Cada anuncio trae la ficha técnica que declara el vendedor: motor, carrocería, interiores y fotos. Publicar es gratis.",
  keywords: [
    "comprar auto Ecuador",
    "vender auto Ecuador",
    "autos usados Ecuador",
    "marketplace vehículos Ecuador",
    "CarStore Ec",
  ],
};

// Se aplica el tema ANTES de pintar para no ver un flash del tema equivocado.
// Lee `localStorage.tema` ("light"/"dark"); si no hay elección, no toca nada y
// manda `prefers-color-scheme` (los tres estados del sistema de diseño). Envuelto
// en try/catch: en navegación privada o con storage bloqueado, `localStorage`
// puede lanzar. `data-theme` en <html> lo consumen los bloques `:root[data-theme=…]`
// de globals.css.
const SCRIPT_TEMA = `(function(){try{var t=localStorage.getItem('tema');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* No-flash del tema: corre antes de pintar el body. En App Router un <script>
          como hijo directo de <html> se iza al <head>; React avisa de hidratación por
          él (de ahí `suppressHydrationWarning` arriba) pero funciona y es lo estándar
          para un inline pre-pintado sin depender de `next/script`. */}
      <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      {/* `espacio-barra-movil` reserva abajo el alto de la barra de navegación de
          celular (fixed). Va en el body y no en el <main> porque el Footer queda
          debajo del main y también se taparía. Desde `md` no reserva nada. */}
      {/* Sin `text-*` acá: el color de texto base lo fija `--tinta` en el body de
          globals.css. Una utilidad de Tailwind en este elemento gana por
          especificidad y dejaría el token del sistema sin efecto. */}
      <body className="min-h-full flex flex-col espacio-barra-movil">
        {/* En rutas aisladas (`/verificar`) ChromeSlot no pinta nada: la consulta de
            datos es una superficie propia, sin Header/Footer/barra/chat. */}
        <ChromeSlot>
          <Header />
        </ChromeSlot>
        <main className="flex-1">{children}</main>
        <ChromeSlot>
          <Footer />
        </ChromeSlot>
        <ChromeSlot>
          <BarraNavegacionMovil />
          <ChatWidget />
        </ChromeSlot>
      </body>
    </html>
  );
}
