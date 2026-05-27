# CLAUDE.md — `consulta-placas-web` (frontend)

Frontend del proyecto `consulta_placas_ec`. Backend FastAPI vive en repo aparte y deploy en Render.

## Propósito

App web comercial que expone la plataforma `ConsultaPlacas EC`. Cuatro flujos:
1. **Landing** — captación de usuarios, planes.
2. **Consulta pública** (`/consultar/[placa]`) — sin auth, agregada de ANT/AMT/SRI/Fiscalía.
3. **Auth** + **Mi garage** — usuario autenticado guarda vehículos.
4. **Precios** — monetización futura (Pro mensual + tokens compra-venta).

## Stack

- **Next.js 16** (App Router, RSC, Turbopack).
- **React 19**.
- **Tailwind CSS 4** con `@theme` inline (no `tailwind.config.js`).
- **TypeScript estricto**.
- Fonts: **Geist** y **Geist Mono** de Google (via `next/font`).
- Deploy: **Vercel free**.

## Convenciones

- **Idioma**: TODO en español, igual que el backend. Nombres de componentes, archivos, props, funciones, comentarios. Ver [feedback en memoria del backend](../consulta_placas_ec/CLAUDE.md#5-convenciones-de-código).
- **Theme oscuro por default**: `<html className="dark">`. Paleta neutra: `zinc-950` bg, `zinc-100` text. Acento: gradient `violet-500 → pink-500 → amber-500` definido como `--color-brand-*` en globals.css.
- **Componentes cliente**: archivos que usan `useState`/`useEffect`/event handlers llevan `"use client"` arriba. Todo lo demás es Server Component por default.
- **Cliente API**: [src/lib/api.ts](src/lib/api.ts) wrappea fetch tipado con tipos en [src/types/api.ts](src/types/api.ts) que mirror los schemas Pydantic del backend.
- **Auth**: JWT guardado en `localStorage` ([src/lib/auth.ts](src/lib/auth.ts)). Sin SSR para reducir complejidad del MVP. Token se inyecta en headers vía `Authorization: Bearer <token>`.

## Estructura

```
src/
  app/
    page.tsx                Landing
    layout.tsx              Root layout con Header/Footer
    globals.css             Tailwind + theme + utilidades brand
    consultar/
      page.tsx              Form de búsqueda
      [placa]/page.tsx      Resultado (Server Component, fetch al backend)
    login/page.tsx          Login (useSearchParams en <Suspense>)
    registro/page.tsx       Registro + auto-login
    mi-garage/page.tsx      Dashboard del usuario (CRUD vehículos)
    precios/page.tsx        Planes detallados
  components/
    Header.tsx              Nav superior con estado de login
    Footer.tsx
    ConsultaForm.tsx        Input de placa con normalización y validación
    ResultadoConsulta.tsx   Cards de las 4 fuentes + resumen
    CampoTexto.tsx          Input estilado reusable
  lib/
    api.ts                  Cliente fetch del backend
    auth.ts                 localStorage del JWT
  types/
    api.ts                  Tipos compartidos con el backend
```

## Variables de entorno

- `NEXT_PUBLIC_API_URL` — URL del backend FastAPI. En dev local: `http://localhost:8000`. En prod (Vercel): URL del servicio Render.

## Comandos

```bash
npm run dev      # Dev server (Turbopack) en :3000
npm run build    # Build de producción
npm run lint     # ESLint
```

## Reglas duras

- **Sin estado privado en el frontend**: el JWT vive solo en localStorage del cliente. Sin SSR de páginas privadas — el server no debe ver tokens.
- **Sin secrets en variables `NEXT_PUBLIC_*`**: estas se inyectan en el bundle público. Solo URLs, flags y IDs no sensibles.
- **CORS**: el backend solo acepta orígenes en `CORS_ORIGINS`. Cuando se cambie la URL del frontend (Vercel preview vs prod), actualizar la variable en Render.
- **No commitear `.env.local`** (gitignored). Configurar variables en el dashboard de Vercel.

## Despliegue

1. `git push origin main`.
2. Vercel detecta el push (si está conectado al repo) y deploya automático.
3. Configurar en Vercel → Settings → Environment Variables: `NEXT_PUBLIC_API_URL=https://consulta-placas-ec.onrender.com`.
4. Después del primer deploy, copiar la URL pública y agregarla al `CORS_ORIGINS` del backend en Render.