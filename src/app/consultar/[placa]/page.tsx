// `/consultar/{placa}` → `/verificar/{placa}` (redirección permanente). El resultado
// de la consulta ahora vive en la superficie aislada `/verificar`. Se conserva la
// redirección por los enlaces indexados con la placa.

import { permanentRedirect } from "next/navigation";

interface Props {
  params: Promise<{ placa: string }>;
}

export default async function ConsultarPlacaRedirect({ params }: Props) {
  const { placa } = await params;
  permanentRedirect(`/verificar/${placa.toUpperCase()}`);
}
