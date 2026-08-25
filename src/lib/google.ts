// Carga de Google Identity Services (GIS) — TASK-015.
//
// GIS se trae por `<script>` desde el CDN de Google; NO es un paquete npm y no se agrega
// ninguna dependencia (AGENTS §4: sin dependencias nuevas sin justificación). Tampoco se
// instalan los tipos `@types/google.accounts`: acá abajo se declara a mano la porción
// mínima de la API que este proyecto usa, que es más chica que el paquete de tipos y no
// obliga a mantener otra versión pineada.
//
// DOS DECISIONES QUE NO SE REVIERTEN SIN LEER ESTO:
//
//  1. **Sin `nonce`.** El backend (`GoogleLoginEntrada`) recibe SOLO `id_token` y no
//     verifica ningún nonce. Un nonce generado en el cliente no protegería de nada —un
//     JWT va firmado, no cifrado, así que el nonce viajaría en el payload del mismo
//     token que se quiere proteger— y acoplaría el frontend a un campo que el contrato
//     no tiene. El antirreplay real espera a que haya Redis, del lado del servidor.
//
//  2. **Sin One Tap.** Nunca se llama a `prompt()`: el único punto de entrada es el
//     botón que el usuario pulsa a propósito. One Tap aparece solo, se lleva el foco y
//     es exactamente el tipo de sorpresa que no queremos en un producto cuya propuesta
//     es la transparencia.

const URL_GIS = "https://accounts.google.com/gsi/client";

// Se lee en el módulo (las `NEXT_PUBLIC_*` se inlinean en el build). Si no está definida,
// `googleConfigurado()` da false y el botón NO se renderiza: mejor ausente que roto.
export const GOOGLE_CLIENT_ID = (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "").trim();

export function googleConfigurado(): boolean {
  return GOOGLE_CLIENT_ID !== "";
}

// ── Tipos mínimos de la API de GIS que se usa acá ────────────────────────────────────

export interface RespuestaCredencialGoogle {
  /** El ID token firmado por Google. Es lo único que viaja al backend. */
  credential?: string;
  select_by?: string;
}

export interface OpcionesBotonGoogle {
  type?: "standard" | "icon";
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "small" | "medium" | "large";
  /** El texto lo pone Google, en el `locale` que se le pase. No se puede reemplazar. */
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  shape?: "rectangular" | "pill" | "circle" | "square";
  logo_alignment?: "left" | "center";
  /** Ancho en px. GIS lo acepta entre 200 y 400; fuera de ese rango lo ignora. */
  width?: number;
  locale?: string;
}

export interface IdentidadGoogle {
  initialize(config: {
    client_id: string;
    callback: (respuesta: RespuestaCredencialGoogle) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    ux_mode?: "popup" | "redirect";
  }): void;
  renderButton(contenedor: HTMLElement, opciones: OpcionesBotonGoogle): void;
  disableAutoSelect(): void;
}

declare global {
  interface Window {
    google?: { accounts?: { id?: IdentidadGoogle } };
  }
}

// ── Carga del script, una sola vez por pestaña ────────────────────────────────────────
// La promesa se cachea a nivel de módulo para que dos botones (o dos montajes del mismo,
// como hace StrictMode en dev) compartan una única carga. Un FALLO no se cachea: se
// limpia la promesa para que un reintento posterior —otra página, mejor conexión— vuelva
// a intentarlo en vez de quedar roto para siempre.

let promesaCarga: Promise<IdentidadGoogle> | null = null;

export function cargarIdentidadGoogle(): Promise<IdentidadGoogle> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Identity Services solo carga en el navegador."));
  }

  const yaDisponible = window.google?.accounts?.id;
  if (yaDisponible) return Promise.resolve(yaDisponible);
  if (promesaCarga) return promesaCarga;

  promesaCarga = new Promise<IdentidadGoogle>((resolver, rechazar) => {
    // Puede existir ya la etiqueta (otra carga en vuelo tras un fallo previo): en ese
    // caso solo nos colgamos de sus eventos, sin insertar un segundo script.
    const existente = document.querySelector<HTMLScriptElement>(
      `script[data-gis="1"]`
    );
    const script = existente ?? document.createElement("script");

    script.addEventListener("load", () => {
      const identidad = window.google?.accounts?.id;
      if (identidad) {
        resolver(identidad);
      } else {
        promesaCarga = null;
        rechazar(new Error("El script de Google cargó sin la API esperada."));
      }
    });
    script.addEventListener("error", () => {
      promesaCarga = null;
      rechazar(new Error("No se pudo cargar el script de Google."));
    });

    if (!existente) {
      script.src = URL_GIS;
      script.async = true;
      script.defer = true;
      script.dataset.gis = "1";
      document.head.appendChild(script);
    }
  });

  return promesaCarga;
}
