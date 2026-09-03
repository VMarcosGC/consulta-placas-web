// La consulta de placa se movió a su propia superficie aislada: `/verificar`.
// Esta ruta queda como redirección permanente para no romper enlaces ni el SEO
// acumulado en `/consultar`.

import { permanentRedirect } from "next/navigation";

export default function ConsultarRedirect() {
  permanentRedirect("/verificar");
}
