"use client";

interface Props {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  requerido?: boolean;
  placeholder?: string;
}

export function CampoTexto({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  requerido,
  placeholder,
}: Props) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input
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