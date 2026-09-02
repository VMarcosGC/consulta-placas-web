// Bandeja del chat interno (migración 0035). Un solo lugar para las conversaciones
// del usuario, sea como comprador o como vendedor. Maestro-detalle: lista a la
// izquierda, hilo abierto a la derecha (apiladas en celular).
//
// El hilo se pinta con <PanelChat>, el mismo componente que usa el detalle del anuncio.

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { listarConversaciones } from "@/lib/api";
import { tieneSesion } from "@/lib/auth";
import { PanelChat } from "@/components/PanelChat";
import type { Conversacion, ConversacionResumen } from "@/types/api";

function cuando(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const hoy = new Date();
  const mismoDia = d.toDateString() === hoy.toDateString();
  return mismoDia
    ? d.toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("es-EC", { day: "numeric", month: "short" });
}

export default function MensajesPage() {
  const router = useRouter();
  const [convos, setConvos] = useState<ConversacionResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [sel, setSel] = useState<number | null>(null);

  const recargar = useCallback(async () => {
    try {
      const lista = await listarConversaciones();
      setConvos(lista);
      setSel((actual) => actual ?? (lista.length ? lista[0].id : null));
    } catch {
      /* silencioso: la bandeja vacía es un estado válido */
    }
  }, []);

  useEffect(() => {
    if (!tieneSesion()) {
      router.push("/login?next=/mensajes");
      return;
    }
    let vivo = true;
    (async () => {
      await recargar();
      if (vivo) setCargando(false);
    })();
    const t = window.setInterval(() => void recargar(), 15000);
    return () => {
      vivo = false;
      window.clearInterval(t);
    };
  }, [router, recargar]);

  if (cargando) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-16 text-center text-secundario">
        Cargando tus mensajes…
      </div>
    );
  }

  return (
    <div className="espacio-barra-movil mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href="/marketplace" className="text-sm text-secundario hover:text-tinta">
        ← Marketplace
      </Link>
      <h1 className="mt-3 text-2xl font-black text-tinta sm:text-3xl">Mensajes</h1>
      <p className="mt-1 text-sm text-secundario">
        Tus conversaciones con compradores y vendedores. El WhatsApp se habilita cuando el
        vendedor responde.
      </p>

      {convos.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-borde bg-superficie p-8 text-center text-sm text-secundario sombra-tarjeta">
          Todavía no tienes conversaciones. Abre el chat desde cualquier anuncio del{" "}
          <Link href="/marketplace" className="font-semibold text-marca">
            marketplace
          </Link>
          .
        </p>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-[20rem_1fr]">
          {/* Lista */}
          <ul className="flex flex-col gap-1.5">
            {convos.map((c) => {
              const activo = c.id === sel;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setSel(c.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition ${
                      activo
                        ? "border-marca bg-marca-tinte"
                        : "border-borde bg-superficie hover:bg-superficie-tenue"
                    }`}
                  >
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-superficie-tenue">
                      {c.publicacion_foto && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={c.publicacion_foto}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-bold text-tinta">
                          {c.contraparte_nombre}
                        </p>
                        <span className="shrink-0 text-[10px] text-secundario">
                          {cuando(c.ultimo_mensaje_en)}
                        </span>
                      </div>
                      <p className="truncate text-xs text-secundario">
                        {c.mi_rol === "vendedor" ? "Vendes · " : "Compras · "}
                        {c.publicacion_titulo}
                      </p>
                      <p className="truncate text-xs text-secundario">
                        {c.ultimo_mensaje ?? "Sin mensajes"}
                      </p>
                    </div>
                    {c.no_leidos > 0 && (
                      <span className="shrink-0 rounded-full bg-accion px-1.5 py-0.5 text-[10px] font-bold text-superficie">
                        {c.no_leidos}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Hilo */}
          <div>
            {sel != null ? (
              <PanelChat key={sel} conversacionId={sel} onActualizar={onHiloActualizado(setConvos)} alto="26rem" />
            ) : (
              <p className="rounded-2xl border border-borde bg-superficie p-8 text-center text-sm text-secundario sombra-tarjeta">
                Elige una conversación.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Cuando el hilo abierto cambia (llega un mensaje, se habilita el contacto), refresca
// ese ítem de la lista sin recargar toda la bandeja.
function onHiloActualizado(
  setConvos: React.Dispatch<React.SetStateAction<ConversacionResumen[]>>
) {
  return (c: Conversacion) => {
    setConvos((lista) =>
      lista.map((it) =>
        it.id === c.id
          ? {
              ...it,
              contacto_habilitado: c.contacto_habilitado,
              estado: c.estado,
              no_leidos: 0,
              ultimo_mensaje:
                c.mensajes.length > 0 ? c.mensajes[c.mensajes.length - 1].cuerpo : it.ultimo_mensaje,
            }
          : it
      )
    );
  };
}
