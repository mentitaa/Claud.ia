import type { MetadataRoute } from "next";

import { marcaDaSaida } from "@/lib/branding/saida";
import { VERDE_CLAUDIA } from "@/lib/branding/icono-claudia";

/**
 * Claud.ia — lo que el iPhone (y Android) usan al "Agregar a pantalla de inicio".
 *
 * `force-dynamic` es la corrección: sin esa línea el `next build` armaba este
 * archivo UNA vez, sin base de datos, y quedaba congelado con el nombre por
 * defecto del repositorio original ("DeskcommCRM"). Ahora el nombre se lee en
 * cada pedido, del mismo lugar que el resto del panel (Claud.ia).
 */
export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const marca = await marcaDaSaida(null);
  return {
    name: marca.nome,
    short_name: marca.nome,
    description: "Tu asistente de WhatsApp que agenda citas por ti.",
    lang: "es-PE",
    display: "standalone",
    start_url: "/app",
    scope: "/",
    background_color: VERDE_CLAUDIA,
    theme_color: VERDE_CLAUDIA,
    icons: [
      { src: "/claudia/icono-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/claudia/icono-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/claudia/icono-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
