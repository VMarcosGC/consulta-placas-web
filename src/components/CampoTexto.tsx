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
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={requerido}
        placeholder={placeholder}
        className="focus-glow w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm"
      />
    </label>
  );
}