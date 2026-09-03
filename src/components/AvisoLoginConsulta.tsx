// Aviso "inicia sesión para el detalle" en la pantalla de resultado de la consulta.
// Solo se muestra cuando NO hay sesión: con cuenta, los bloques ampliados ya se
// revelan (gratis, §1.0.3). `tieneSesion()` se lee tras montar (no en render) para
// no romper la hidratación.

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { tieneSesion } from "@/lib/auth";

export function AvisoLoginConsulta() {
  const pathname = usePathname();
  const [haySesion, setHaySesion] = useState(true); // asume sesión hasta comprobar → no parpadea para logueados

  useEffect(() => {
    let vivo = true;
    const leer = async () => {
      if (vivo) setHaySesion(tieneSesion());
    };
    void leer();
    window.addEventListener("sesion-cambiada", leer);
    return () => {
      vivo = false;
      window.removeEventListener("sesion-cambiada", leer);
    };
  }, []);

  if (haySesion) return null;

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-marca-tinte bg-marca-tinte px-4 py-3">
      <p className="text-sm text-marca-texto">
        <span className="font-bold">Estás viendo lo básico.</span> Con una cuenta ves
        multas con detalle, valores de matrícula, identificadores y n.º de dueños — también
        gratis.
      </p>
      <Link
        href={`/login?next=${encodeURIComponent(pathname ?? "/verificar")}`}
        className="shrink-0 rounded-full bg-accion px-4 py-2 text-sm font-semibold text-superficie transition hover:opacity-90"
      >
        Iniciar sesión
      </Link>
    </div>
  );
}
