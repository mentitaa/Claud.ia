import type { Metadata } from "next";
import { redirect } from "next/navigation";

/**
 * Claud.ia: el documento vigente es el de Mentita Studio, publicado en la web
 * de Claud.ia (en español, con el responsable, los proveedores y el Uso
 * Limitado de las API de Google). Esta ruta del panel queda como acceso
 * directo para los enlaces que ya apuntan aquí (registro, invitaciones,
 * pantalla de consentimiento de Google).
 */
export const metadata: Metadata = { title: "Política de privacidad" };

const DOCUMENTO_VIGENTE = "https://claudia.mentitastudio.com/privacidad";

export default function PrivacyPage() {
  redirect(DOCUMENTO_VIGENTE);
}
