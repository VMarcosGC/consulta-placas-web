// Estado de los favoritos del comprador (MC1).
//
// Nombre: el prefijo `use` NO es una excepción al español del proyecto — es un
// requisito del protocolo de React (regla `react-hooks/rules-of-hooks`), igual que
// `default` o `async`. El dominio sigue en español: `useFavoritos`.
//
// Carga UNA vez `GET /favoritos` si hay sesión y mantiene un mapa placa → favorito.
// Las mutaciones son optimistas con rollback: el ♡ debe sentirse instantáneo en un
// celular de gama baja con red lenta.
//
// Nota sobre el lint (`react-hooks/set-state-in-effect`): ningún setState se ejecuta
// de forma síncrona dentro del efecto — todos caen después de un `await`, igual que el
// patrón ya usado en DestacadosMarket. No agregar setState antes del primer await.

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { agregarFavorito, eliminarFavorito, listarFavoritos } from "@/lib/api";
import { tieneSesion } from "@/lib/auth";
import { indexarPorPlaca, type ControlFavoritos } from "@/lib/favoritos";
import { ApiError, type Favorito } from "@/types/api";

async function traerFavoritos(): Promise<Favorito[] | null> {
  if (!tieneSesion()) return null;
  try {
    return await listarFavoritos();
  } catch {
    // Sesión vencida o backend caído: el resto de la portada debe seguir viva.
    return null;
  }
}

export function useFavoritos() {
  const [mapa, setMapa] = useState<Map<string, Favorito>>(() => new Map());
  const [haySesion, setHaySesion] = useState(false);
  const [pendientes, setPendientes] = useState<Set<string>>(() => new Set());
  // Invitación amable para el visitante anónimo que tocó un ♡ (nunca un 401 crudo).
  const [invitacion, setInvitacion] = useState(false);
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    async function sincronizar() {
      const lista = await traerFavoritos();
      if (!montado.current) return;
      // La sesión la manda `tieneSesion()`, NO el resultado de la llamada: un backend
      // caído no significa que el usuario esté deslogueado (y `alternar` decide con lo
      // mismo, así que las dos rutas no pueden divergir).
      const conSesion = tieneSesion();
      setHaySesion(conSesion);
      if (!conSesion) {
        // Cierre de sesión: los favoritos son de quien ya no está: se limpian.
        setMapa(new Map());
      } else if (lista) {
        setMapa(indexarPorPlaca(lista));
      }
      // Con sesión pero lectura fallida (lista === null) se conserva el mapa que ya
      // había: borrarlo apagaría todos los ♡ y haría desaparecer "Tus favoritos" con
      // los datos intactos en la BD.
    }
    sincronizar();
    // El login/logout de ESTA pestaña avisa por evento propio (ver src/lib/auth.ts).
    window.addEventListener("sesion-cambiada", sincronizar);
    return () => {
      montado.current = false;
      window.removeEventListener("sesion-cambiada", sincronizar);
    };
  }, []);

  const marcarPendiente = useCallback((placa: string, activo: boolean) => {
    setPendientes((previo) => {
      const siguiente = new Set(previo);
      if (activo) siguiente.add(placa);
      else siguiente.delete(placa);
      return siguiente;
    });
  }, []);

  const alternar = useCallback(
    (placa: string, precioActual: number | null) => {
      const clave = placa.toUpperCase();
      if (!tieneSesion()) {
        setInvitacion(true);
        return;
      }
      if (pendientes.has(clave)) return;

      const existente = mapa.get(clave);
      marcarPendiente(clave, true);

      if (existente) {
        // Quitar: se saca del mapa de una y se repone si el backend falla.
        setMapa((previo) => {
          const siguiente = new Map(previo);
          siguiente.delete(clave);
          return siguiente;
        });
        eliminarFavorito(existente.id)
          .catch((e) => {
            // 404 = ya no existía en el backend: el resultado deseado ya se cumplió.
            if (e instanceof ApiError && e.status === 404) return;
            if (!montado.current) return;
            setMapa((previo) => new Map(previo).set(clave, existente));
          })
          .finally(() => {
            if (montado.current) marcarPendiente(clave, false);
          });
        return;
      }

      // Guardar: entrada optimista con id provisional (-1) hasta que llegue la real.
      const provisional: Favorito = {
        id: -1,
        placa: clave,
        nota: null,
        precio_al_guardar: precioActual,
        creado_en: new Date().toISOString(),
      };
      setMapa((previo) => new Map(previo).set(clave, provisional));

      agregarFavorito({
        placa: clave,
        ...(precioActual != null ? { precio_al_guardar: Number(precioActual) } : {}),
      })
        .then((favorito) => {
          if (!montado.current) return;
          setMapa((previo) => new Map(previo).set(clave, favorito));
        })
        .catch(async (e) => {
          // 409 = ya era favorita. Para el usuario es un éxito idempotente; solo hay que
          // recuperar el id real (el DELETE lo necesita), así que se relee la lista.
          if (e instanceof ApiError && e.status === 409) {
            const lista = await traerFavoritos();
            if (!montado.current) return;
            // Si la relectura falla se deja la entrada optimista puesta: la placa SÍ es
            // favorita (por eso el 409). Con `?? []` se vaciaba el mapa entero y se
            // apagaban todos los ♡ por un fallo de red pasajero.
            if (lista) setMapa(indexarPorPlaca(lista));
            return;
          }
          if (!montado.current) return;
          setMapa((previo) => {
            const siguiente = new Map(previo);
            siguiente.delete(clave);
            return siguiente;
          });
        })
        .finally(() => {
          if (montado.current) marcarPendiente(clave, false);
        });
    },
    [mapa, pendientes, marcarPendiente]
  );

  const control = useMemo<ControlFavoritos>(
    () => ({
      esFavorito: (placa) => mapa.has(placa.toUpperCase()),
      ocupado: (placa) => pendientes.has(placa.toUpperCase()),
      alternar,
    }),
    [mapa, pendientes, alternar]
  );

  return {
    control,
    /** Mapa placa → favorito, para el badge de baja de precio. */
    mapa,
    haySesion,
    invitacion,
    cerrarInvitacion: useCallback(() => setInvitacion(false), []),
  };
}
