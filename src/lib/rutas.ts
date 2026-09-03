// Rutas que se muestran AISLADAS del resto de la web: sin Header, Footer, barra de
// navegación de celular ni widget de chat. Es una superficie propia para un servicio
// distinto al de comprar/vender.
//
// Hoy: `/verificar` (consulta de datos del vehículo). Ver
// `docs/producto/consulta_datos_fases.md` en el repo del backend.

const PREFIJOS_AISLADOS = ["/verificar"];

export function esRutaAislada(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return PREFIJOS_AISLADOS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}
