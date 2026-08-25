// Menú de la cuenta en el Header (TASK-011): Mi garage · Mis publicaciones · Mi contacto · Salir.
//
// POR QUÉ EXISTE: "Mi contacto de vendedor" y "Mis publicaciones" no tenían NINGUNA entrada
// en el Header — solo se llegaba desde dentro de otra pantalla. En la prueba manual nadie
// pudo llegar a cargar su teléfono. El chip del nombre pasa de ser un enlace suelto a
// `/mi-garage` a ser el disparador de este menú.
//
// DOS COSAS QUE NO SE PUEDEN PERDER AL TOCAR ESTE ARCHIVO:
//
//  1. **Se ve en celular.** El público navega en gama baja. La barra principal es
//     `hidden md:flex` y el chip era `sm:inline-flex`, así que bajo 640px no había NADA
//     donde tocar. Por eso el disparador (el círculo con la inicial) se muestra en TODOS
//     los anchos y lo único que se oculta en pantallas chicas es el nombre.
//
//  2. **El aviso de teléfono faltante se ve desde afuera**, sin entrar a la página de
//     contacto: punto ámbar en el chip + marca en la entrada "Mi contacto". `sin_perfil`
//     (el 404 de onboarding) cuenta como faltante — para el comprador da lo mismo, no
//     puede escribir. Ante `fallo` NO se pinta el punto: falla cerrado, mejor no avisar
//     que avisar en falso.

"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { cargarPerfilVendedor, suscribirPerfilVendedor } from "@/lib/vendedor";

const RUTA_CONTACTO = "/marketplace/mi-perfil-vendedor";

type OpcionMenu = {
  href: string;
  etiqueta: string;
  ayuda: string;
  /** Marca visual (azul) de las tareas de administración. */
  admin?: boolean;
};

const OPCIONES: OpcionMenu[] = [
  { href: "/mi-garage", etiqueta: "Mi garage", ayuda: "Tus autos y su historial" },
  {
    href: "/marketplace/mis-publicaciones",
    etiqueta: "Mis publicaciones",
    ayuda: "Tus anuncios y referencias",
  },
  {
    href: RUTA_CONTACTO,
    etiqueta: "Mi contacto",
    ayuda: "Con qué nombre y número te escriben",
  },
  // "Mi cuenta" ≠ "Mi contacto": acá va CÓMO ENTRAS (correo, vincular Google); allá, con
  // qué nombre y número te ve un comprador. Sin esta entrada, /mi-cuenta sería una
  // pantalla inalcanzable y el 409 del ingreso con Google seguiría sin salida (TASK-015).
  {
    href: "/mi-cuenta",
    etiqueta: "Mi cuenta",
    ayuda: "Cómo entras: tu correo y Google",
  },
];

// Tareas de administración. Vivían en la barra de arriba del Header, dentro del bloque
// `hidden md:flex`: un admin en celular no las alcanzaba. Se mudaron acá enteras (no
// duplicadas) para que exista una sola lista.
const OPCIONES_ADMIN: OpcionMenu[] = [
  {
    href: "/admin/moderacion",
    etiqueta: "Moderar referencias",
    ayuda: "Aprueba o rechaza los anuncios externos",
    admin: true,
  },
  {
    href: "/admin/verificaciones",
    etiqueta: "Verificar publicaciones",
    ayuda: "Cola de premium pendientes de sello",
    admin: true,
  },
];

// `sin_dato` cubre el fallo de red y la sesión vencida: no sabemos, así que no avisamos.
type EstadoContacto = "cargando" | "completo" | "falta" | "sin_dato";

export function MenuCuenta({
  nombre,
  esAdmin = false,
  alSalir,
}: {
  nombre: string;
  esAdmin?: boolean;
  alSalir: () => void;
}) {
  // Las de admin se suman al final: son tareas de trabajo, no de la cuenta propia.
  const opciones = esAdmin ? [...OPCIONES, ...OPCIONES_ADMIN] : OPCIONES;
  // Elementos enfocables del menú: las opciones + "Salir".
  const totalEnfocables = opciones.length + 1;

  const [abierto, setAbierto] = useState(false);
  // -1 = ninguna opción enfocada (se abrió con el mouse; el foco sigue en el disparador).
  const [indiceActivo, setIndiceActivo] = useState(-1);

  const refContenedor = useRef<HTMLDivElement>(null);
  const refDisparador = useRef<HTMLButtonElement>(null);
  const refsOpciones = useRef<Array<HTMLElement | null>>([]);

  // ── Estado del contacto de vendedor ────────────────────────────────────────────────
  // El componente solo se monta con sesión activa, así que esta consulta nunca sale para
  // un usuario anónimo. Tampoco bloquea nada: arranca en "cargando" y hasta que responda
  // el chip se pinta sin punto.
  const [contacto, setContacto] = useState<EstadoContacto>("cargando");
  const [relectura, setRelectura] = useState(0);

  // El fetch va en un IIFE async y los setState ocurren tras el await (nunca
  // sincrónicamente), como pide react-hooks/set-state-in-effect. Mismo patrón que
  // `AvisoContactoVendedor` y `mi-perfil-vendedor`.
  useEffect(() => {
    let activo = true;
    (async () => {
      const r = await cargarPerfilVendedor();
      if (!activo) return;
      if (r.tipo === "perfil") {
        setContacto(r.perfil.telefono && r.perfil.nombre_publico ? "completo" : "falta");
      } else if (r.tipo === "sin_perfil") {
        // El 404 de onboarding: todavía no hay perfil. Para quien quiere escribirle es
        // exactamente lo mismo que un perfil a medias, así que también lleva aviso.
        setContacto("falta");
      } else {
        setContacto("sin_dato");
      }
    })();
    return () => {
      activo = false;
    };
  }, [relectura]);

  // El Header no se vuelve a montar al navegar, así que el aviso se quedaría pegado tras
  // guardar el teléfono. El setState va en el callback de la suscripción, no en el cuerpo.
  useEffect(() => suscribirPerfilVendedor(() => setRelectura((n) => n + 1)), []);

  const faltaContacto = contacto === "falta";

  // ── Apertura, cierre y foco ────────────────────────────────────────────────────────
  const cerrar = useCallback((devolverFoco: boolean) => {
    setAbierto(false);
    setIndiceActivo(-1);
    if (devolverFoco) refDisparador.current?.focus();
  }, []);

  // Cierre por clic afuera. `pointerdown` y no `click` para que el menú se cierre apenas
  // el dedo toca fuera, sin esperar a que el navegador decida si hubo tap o scroll.
  useEffect(() => {
    if (!abierto) return;
    function alPunteroFuera(evento: PointerEvent) {
      if (!refContenedor.current?.contains(evento.target as Node)) cerrar(false);
    }
    document.addEventListener("pointerdown", alPunteroFuera);
    return () => document.removeEventListener("pointerdown", alPunteroFuera);
  }, [abierto, cerrar]);

  // Foco dirigido: el patrón `menu` de ARIA mueve el foco con las flechas, no con Tab
  // (por eso los items van con tabIndex={-1}). Tab sale del menú y el cierre por pérdida
  // de foco lo recoge.
  useEffect(() => {
    if (abierto && indiceActivo >= 0) refsOpciones.current[indiceActivo]?.focus();
  }, [abierto, indiceActivo]);

  function alTeclaContenedor(evento: React.KeyboardEvent<HTMLDivElement>) {
    if (evento.key === "Escape") {
      if (!abierto) return;
      evento.stopPropagation();
      cerrar(true); // Escape devuelve el foco al disparador.
      return;
    }
    if (!abierto) return;
    if (evento.key === "ArrowDown") {
      evento.preventDefault();
      setIndiceActivo((i) => (i + 1) % totalEnfocables);
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault();
      setIndiceActivo((i) => (i <= 0 ? totalEnfocables - 1 : i - 1));
    } else if (evento.key === "Home") {
      evento.preventDefault();
      setIndiceActivo(0);
    } else if (evento.key === "End") {
      evento.preventDefault();
      setIndiceActivo(totalEnfocables - 1);
    }
  }

  // Con el menú cerrado, las flechas lo abren y posan el foco en el primer/último item.
  // Enter y Espacio los maneja el navegador: es un <button>, dispara onClick.
  function alTeclaDisparador(evento: React.KeyboardEvent<HTMLButtonElement>) {
    if (evento.key !== "ArrowDown" && evento.key !== "ArrowUp") return;
    evento.preventDefault();
    if (abierto) return; // ya abierto: mueve el foco el handler del contenedor.
    setAbierto(true);
    setIndiceActivo(evento.key === "ArrowDown" ? 0 : totalEnfocables - 1);
  }

  // Cierre por pérdida de foco: si el nuevo elemento enfocado no está dentro del menú
  // (Tab hacia afuera, o un clic que no enfoca nada), se cierra. React propaga `focusout`
  // como onBlur, así que basta ponerlo en el contenedor.
  function alPerderFoco(evento: React.FocusEvent<HTMLDivElement>) {
    if (!evento.currentTarget.contains(evento.relatedTarget)) cerrar(false);
  }

  const inicial = nombre.charAt(0).toUpperCase();
  const etiquetaDisparador = faltaContacto
    ? `Menú de tu cuenta, ${nombre}. Falta tu número de contacto`
    : `Menú de tu cuenta, ${nombre}`;

  // Clases compartidas por los items: alto cómodo para el dedo en gama baja.
  const claseItem =
    "flex w-full items-start gap-3 px-4 py-2.5 text-left text-sm transition-colors " +
    "hover:bg-slate-50 focus:bg-slate-50 focus:outline-none";

  return (
    <div
      ref={refContenedor}
      className="relative"
      onKeyDown={alTeclaContenedor}
      onBlur={alPerderFoco}
    >
      <button
        ref={refDisparador}
        type="button"
        onClick={() => (abierto ? cerrar(false) : setAbierto(true))}
        onKeyDown={alTeclaDisparador}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-controls="menu-cuenta"
        aria-label={etiquetaDisparador}
        /* `min-h-11` = 44px, el mínimo táctil: el círculo interno mide 28px y el `py`
           dejaba el botón en 40px. Se corrige por altura, no agrandando el círculo ni la
           fuente, para no mover el resto de la fila del header a 320px. */
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-300 sm:px-3"
      >
        <span className="relative grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-gradient text-[11px] font-black text-white">
          {inicial}
          {/* Punto ámbar = "todavía no pueden escribirte". El texto va en el aria-label
              del botón; acá es decoración. */}
          {faltaContacto && (
            <span
              aria-hidden
              className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-amber-500"
            />
          )}
        </span>
        {/* Solo el nombre se oculta en pantallas chicas; el círculo queda siempre. */}
        <span className="hidden max-w-[10rem] truncate sm:inline">{nombre}</span>
        <span aria-hidden className="text-[10px] leading-none text-slate-400">
          ▾
        </span>
      </button>

      {abierto && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white sombra-tarjeta">
          <p className="truncate border-b border-slate-100 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {nombre}
          </p>

          <div id="menu-cuenta" role="menu" aria-label="Tu cuenta" className="py-1">
            {opciones.map((opcion, indice) => (
              <Fragment key={opcion.href}>
                {/* Línea divisoria antes del primer item de admin: separa "mi cuenta"
                    de "mi trabajo de moderación". */}
                {opcion.admin && !opciones[indice - 1]?.admin && (
                  <div role="separator" className="my-1 h-px bg-slate-100" />
                )}
                <Link
                  href={opcion.href}
                  role="menuitem"
                  tabIndex={-1}
                  ref={(el) => {
                    refsOpciones.current[indice] = el;
                  }}
                  onClick={() => cerrar(false)}
                  className={claseItem}
                >
                  <span className="min-w-0 flex-1">
                    <span
                      className={`flex items-center gap-2 font-semibold ${
                        opcion.admin ? "text-blue-600" : "text-slate-800"
                      }`}
                    >
                      {opcion.etiqueta}
                      {opcion.href === RUTA_CONTACTO && faltaContacto && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                          Falta tu número
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">{opcion.ayuda}</span>
                  </span>
                </Link>
              </Fragment>
            ))}

            <div role="separator" className="my-1 h-px bg-slate-100" />

            <button
              type="button"
              role="menuitem"
              tabIndex={-1}
              ref={(el) => {
                refsOpciones.current[opciones.length] = el;
              }}
              onClick={() => {
                cerrar(false);
                alSalir();
              }}
              className={`${claseItem} font-semibold text-slate-600`}
            >
              Salir
            </button>
          </div>

          {/* El copy explica qué significa el punto ámbar, sin apurar a nadie. */}
          {faltaContacto && (
            <p className="border-t border-amber-100 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
              Sin tu número, tus anuncios se ven igual pero nadie puede escribirte.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
