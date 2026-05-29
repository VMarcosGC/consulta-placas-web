// Cliente de la API FastAPI. Wrapper minimo sobre fetch.
// El token JWT se lee del localStorage si esta disponible (auth.ts).

import {
  ApiError,
  ConsultaPlacaRespuesta,
  FuenteRespuesta,
  Token,
  Usuario,
  Vehiculo,
  VehiculoConsolidado,
  VehiculoCrear,
} from "@/types/api";
import { obtenerToken } from "./auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function fetchAPI<T>(
  ruta: string,
  init: RequestInit = {},
  requiereAuth = false
): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body && typeof init.body === "string") {
    headers.set("Content-Type", "application/json");
  }
  if (requiereAuth) {
    const token = obtenerToken();
    if (!token) throw new ApiError(401, "Sesion no iniciada");
    headers.set("Authorization", `Bearer ${token}`);
  }

  const respuesta = await fetch(`${BASE_URL}${ruta}`, { ...init, headers });

  if (!respuesta.ok) {
    let body: unknown;
    try {
      body = await respuesta.json();
    } catch {
      body = await respuesta.text();
    }
    const detalle =
      typeof body === "object" && body && "detail" in body
        ? (body as { detail: string }).detail
        : `Error ${respuesta.status}`;
    throw new ApiError(respuesta.status, detalle, body);
  }

  if (respuesta.status === 204) return undefined as T;
  return respuesta.json();
}

// ─── Publicos ─────────────────────────────────────────────

export function consultarPlaca(placa: string) {
  return fetchAPI<ConsultaPlacaRespuesta>(
    `/consultar/${encodeURIComponent(placa)}`
  );
}

// Perfil consolidado orientado a la entidad (secciones temáticas + estado_fuentes).
// El backend agrega las fuentes; el frontend ya no consolida en cliente.
export function consultarPerfil(placa: string) {
  return fetchAPI<VehiculoConsolidado>(
    `/consultar/${encodeURIComponent(placa)}/perfil`
  );
}

// Fuerza un nuevo intento de una fuente del worker híbrido (AMT/FGE) que quedó
// en error_fuente. Reencola el trabajo; el polling normal recoge el resultado.
export function reintentarFuente(identificador: string, fuente: "AMT" | "FGE") {
  return fetchAPI<FuenteRespuesta>(
    `/consultar/${encodeURIComponent(identificador)}/reintentar/${fuente}`,
    { method: "POST" }
  );
}

// ─── Auth ─────────────────────────────────────────────────

export function registrarUsuario(datos: {
  email: string;
  password: string;
  nombre?: string;
}) {
  return fetchAPI<Usuario>("/auth/registro", {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

export function iniciarSesion(email: string, password: string) {
  const body = new URLSearchParams({ username: email, password }).toString();
  return fetchAPI<Token>("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
}

export function obtenerPerfil() {
  return fetchAPI<Usuario>("/auth/me", {}, true);
}

// ─── Vehiculos (auth) ─────────────────────────────────────

export function listarVehiculos() {
  return fetchAPI<Vehiculo[]>("/vehiculos", {}, true);
}

export function crearVehiculo(datos: VehiculoCrear) {
  return fetchAPI<Vehiculo>(
    "/vehiculos",
    { method: "POST", body: JSON.stringify(datos) },
    true
  );
}

export function eliminarVehiculo(id: number) {
  return fetchAPI<void>(`/vehiculos/${id}`, { method: "DELETE" }, true);
}
