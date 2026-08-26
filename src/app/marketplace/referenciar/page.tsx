// Formulario para REFERENCIAR un anuncio externo (Facebook Marketplace, OLX, etc.).
// El usuario pega el link y completa los datos a mano (no raspamos el portal).
// Es gratis. La referencia entra en moderación: aparece en el marketplace recién
// cuando un administrador la aprueba.

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { crearReferencia } from "@/lib/api";
import { tieneSesion } from "@/lib/auth";
import { FotosReferencia } from "@/components/FotosReferencia";
import { ApiError } from "@/types/api";

export default function ReferenciarPage() {
  const router = useRouter();

  const [url, setUrl] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [anio, setAnio] = useState("");
  const [precio, setPrecio] = useState("");
  const [imagen, setImagen] = useState("");
  const [placa, setPlaca] = useState("");
  // Campos ricos (M2.8): copiar el detalle del anuncio original.
  const [descripcion, setDescripcion] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [kilometraje, setKilometraje] = useState("");
  const [fotos, setFotos] = useState<string[]>([]);

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  useEffect(() => {
    if (!tieneSesion()) router.push("/login?next=/marketplace/referenciar");
  }, [router]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const urlTrim = url.trim();
    if (!/^https?:\/\/.+/i.test(urlTrim)) {
      setError("Pega un enlace válido que empiece con http:// o https://");
      return;
    }

    const anioNum = anio ? Number(anio) : undefined;
    if (anioNum !== undefined && (!Number.isInteger(anioNum) || anioNum < 1900 || anioNum > 2100)) {
      setError("El año no es válido.");
      return;
    }
    const precioNum = precio ? Number(precio) : undefined;
    if (precioNum !== undefined && (!Number.isFinite(precioNum) || precioNum <= 0)) {
      setError("El precio debe ser mayor a 0.");
      return;
    }

    setEnviando(true);
    try {
      const kmNum = kilometraje ? Number(kilometraje) : undefined;
      await crearReferencia({
        url_externa: urlTrim,
        marca: marca.trim() || undefined,
        modelo: modelo.trim() || undefined,
        anio: anioNum,
        precio_usd: precioNum,
        imagen_url: imagen.trim() || undefined,
        placa: placa.trim().toUpperCase() || undefined,
        descripcion: descripcion.trim() || undefined,
        ciudad: ciudad.trim() || undefined,
        kilometraje: Number.isFinite(kmNum) ? kmNum : undefined,
        fotos: fotos.length > 0 ? fotos : undefined,
      });
      setExito(true);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          router.push("/login?next=/marketplace/referenciar");
          return;
        }
        if (err.status === 409) {
          setError("Ese anuncio ya está referenciado en la plataforma.");
        } else {
          setError(err.message || "No pudimos guardar la referencia.");
        }
      } else {
        setError("No pudimos guardar la referencia.");
      }
    } finally {
      setEnviando(false);
    }
  }

  const inputCls =
    "w-full rounded-xl border border-borde-fuerte px-3 py-2 text-sm text-tinta focus-glow";

  if (exito) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <div className="rounded-2xl border border-confirmado bg-confirmado-tinte p-10 sombra-tarjeta">
          <p className="text-2xl font-black text-confirmado-texto">¡Referencia enviada! ✓</p>
          <p className="mt-2 text-secundario">
            La revisará nuestro equipo y, una vez aprobada, aparecerá en el marketplace
            dentro de «Referencias externas».
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/marketplace/mis-referencias"
              className="rounded-full bg-accion px-5 py-2.5 text-sm font-semibold text-superficie"
            >
              Ver mis referencias
            </Link>
            <Link
              href="/marketplace"
              className="rounded-full border border-borde-fuerte px-5 py-2.5 text-sm font-semibold text-secundario hover:bg-superficie-tenue"
            >
              Volver al marketplace
            </Link>
            <button
              onClick={() => {
                setExito(false);
                setUrl(""); setMarca(""); setModelo(""); setAnio("");
                setPrecio(""); setImagen(""); setPlaca("");
                setDescripcion(""); setCiudad(""); setKilometraje(""); setFotos([]);
              }}
              className="rounded-full border border-borde-fuerte px-5 py-2.5 text-sm font-semibold text-secundario hover:bg-superficie-tenue"
            >
              Referenciar otro
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="flex items-center justify-between">
        <Link href="/marketplace" className="text-sm text-secundario hover:text-tinta">
          ← Volver al marketplace
        </Link>
        <Link
          href="/marketplace/mis-referencias"
          className="text-sm font-semibold text-marca hover:text-marca-texto"
        >
          Mis referencias →
        </Link>
      </div>
      <h1 className="mt-3 text-3xl font-black text-tinta">Referenciar un anuncio</h1>
      <p className="mt-1 text-secundario">
        ¿Viste un auto en venta en <span className="font-semibold">Facebook Marketplace</span>,
        OLX o PatioTuerca? Pega el link y completa los datos. Es{" "}
        <span className="font-semibold">gratis</span>; nuestro equipo lo revisa antes de publicarlo.
      </p>

      <form onSubmit={enviar} className="mt-8 space-y-5">
        <div>
          <label className="mb-1 block text-sm font-semibold text-secundario">
            Enlace del anuncio
          </label>
          <input
            className={inputCls}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.facebook.com/marketplace/item/…"
            inputMode="url"
            required
          />
          <p className="mt-1 text-xs text-secundario">
            Copia la URL del anuncio desde tu navegador o la app de Facebook.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-secundario">Marca</label>
            <input
              className={inputCls}
              value={marca}
              onChange={(e) => setMarca(e.target.value)}
              placeholder="Chevrolet"
              maxLength={80}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-secundario">Modelo</label>
            <input
              className={inputCls}
              value={modelo}
              onChange={(e) => setModelo(e.target.value)}
              placeholder="Sail"
              maxLength={120}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-secundario">Año</label>
            <input
              className={inputCls}
              type="number"
              min={1900}
              max={2100}
              value={anio}
              onChange={(e) => setAnio(e.target.value)}
              placeholder="2018"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-secundario">
              Precio (USD)
            </label>
            <input
              className={inputCls}
              type="number"
              min={1}
              step="any"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              placeholder="12000"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-secundario">
            Placa (opcional)
          </label>
          <input
            className={`${inputCls} font-mono tracking-widest`}
            value={placa}
            onChange={(e) => setPlaca(e.target.value)}
            placeholder="ABC1234"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-secundario">
              Ciudad (opcional)
            </label>
            <input
              className={inputCls}
              value={ciudad}
              onChange={(e) => setCiudad(e.target.value)}
              placeholder="Quito"
              maxLength={80}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-secundario">
              Kilometraje (opcional)
            </label>
            <input
              className={inputCls}
              type="number"
              min={0}
              max={2000000}
              value={kilometraje}
              onChange={(e) => setKilometraje(e.target.value)}
              placeholder="85000"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-secundario">
            Descripción del anuncio (opcional)
          </label>
          <textarea
            className={`${inputCls} min-h-24`}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            maxLength={2000}
            placeholder="Copia aquí el texto del anuncio original: estado, extras, motivo de venta…"
          />
          <p className="mt-1 text-xs text-secundario">
            Mientras más detalle copies, más útil es la referencia. Igual se muestra como
            dato no verificado.
          </p>
        </div>

        <FotosReferencia fotos={fotos} onCambio={setFotos} />

        <div>
          <label className="mb-1 block text-sm font-semibold text-secundario">
            Imagen por enlace (opcional)
          </label>
          <input
            className={inputCls}
            value={imagen}
            onChange={(e) => setImagen(e.target.value)}
            placeholder="https://…/foto.jpg"
            inputMode="url"
          />
          <p className="mt-1 text-xs text-secundario">
            Alternativa a subir fotos: pega el enlace directo de una imagen del anuncio.
          </p>
        </div>

        {error && (
          <p className="rounded-xl border border-error bg-error-tinte p-3 text-sm text-error">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded-full bg-accion px-6 py-3 text-sm font-semibold text-superficie shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {enviando ? "Enviando…" : "Enviar referencia"}
        </button>
      </form>
    </div>
  );
}
