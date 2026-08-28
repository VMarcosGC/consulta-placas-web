// Servicios guardados por el cliente. Como el directorio de servicios todavía no tiene
// backend (`src/config/servicios.ts`), esto vive en `localStorage` del navegador. Los
// autos guardados sí van al backend (favoritos por placa); ver `useFavoritos`.
//
// Cuando Servicios pase a backend, esto migra a un endpoint con la misma forma.

"use client";

import { useSyncExternalStore } from "react";

const CLAVE = "servicios_guardados";
const EVENTO = "servicios-guardados-cambio";

function leer(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const crudo = window.localStorage.getItem(CLAVE);
    return new Set(crudo ? (JSON.parse(crudo) as string[]) : []);
  } catch {
    return new Set();
  }
}

function guardar(ids: Set<string>) {
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify([...ids]));
  } catch {
    /* almacenamiento bloqueado (navegación privada): vale solo esta sesión */
  }
  window.dispatchEvent(new Event(EVENTO));
}

export function alternarServicioGuardado(id: string) {
  const ids = leer();
  if (ids.has(id)) ids.delete(id);
  else ids.add(id);
  guardar(ids);
}

function suscribir(cb: () => void) {
  window.addEventListener(EVENTO, cb);
  window.addEventListener("storage", cb); // otra pestaña
  return () => {
    window.removeEventListener(EVENTO, cb);
    window.removeEventListener("storage", cb);
  };
}

// Snapshot estable: se cachea el array serializado y solo cambia la referencia cuando
// cambió el contenido (si no, `useSyncExternalStore` entra en bucle de renders).
let cacheJson = "[]";
let cacheSet: string[] = [];
function snapshot(): string[] {
  const json = JSON.stringify([...leer()].sort());
  if (json !== cacheJson) {
    cacheJson = json;
    cacheSet = JSON.parse(json) as string[];
  }
  return cacheSet;
}

/** Lista (ordenada) de ids de servicios guardados. Reactivo. */
export function useServiciosGuardados(): string[] {
  return useSyncExternalStore(suscribir, snapshot, () => []);
}
