"use client";

interface Props {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  requerido?: boolean;
  placeholder?: string;
  /**
   * id del <input>, opcional. Existe para poder enfocarlo desde fuera del formulario
   * (`document.getElementById(...).focus()`): lo usa el login para llevar al usuario al
   * campo de correo cuando el ingreso con Google devuelve 409. Sin id no cambia nada.
   */
  id?: string;
}

export function CampoTexto({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  requerido,
  placeholder,
  id,
}: Props) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-tinta">{label}</span>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={requerido}
        placeholder={placeholder}
        // `border-borde-fuerte` y no el filete decorativo de las tarjetas: el
        // borde de un control de formulario es el límite de un componente de
        // interfaz y WCAG 1.4.11 le exige 3:1. Da 3.04:1; el `slate-300` que
        // reemplaza daba 1.48:1 (medido desde el OKLCH del paquete, no desde el hex
        // redondeado). El foco lo refuerza `.focus-glow`, ya en `--marca`.
        className="focus-glow w-full rounded-xl border border-borde-fuerte bg-superficie px-4 py-2.5 text-sm text-tinta placeholder-secundario shadow-sm"
      />
    </label>
  );
}