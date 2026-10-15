/**
 * Claud.ia — el aviso push de "el cliente llegó / está llegando / pide cómo llegar".
 *
 * Se activa por organización con `organizations.settings.avisos_push =
 * "solo_llegadas"`. En ese modo el panel deja de avisar por cada mensaje (con la
 * IA respondiendo todo, eso es ruido) y avisa SOLO estas llegadas, a todos los
 * del equipo que activaron las notificaciones (iPhone → también el Apple Watch).
 *
 * Lo llaman dos caminos:
 *  - el mensaje de texto, desde `push.handler.ts` (evento `message.received`);
 *  - el audio, desde `workers/media-derive-worker.ts`, cuando la transcripción
 *    queda lista (antes de eso no hay texto que revisar).
 *
 * "Pide indicaciones" solo avisa si la persona tiene una cita hoy: preguntar
 * "¿dónde quedan?" mientras averigua precios no es una llegada, y Claud.ia ya
 * le responde con la dirección.
 */
import { limitesDeHoy } from "@/lib/inicio/resumo";
import { rotuloDoContato, SEM_NOME } from "@/lib/contacts/rotulo-do-contato";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { detectarLlegada, textoDelAvisoDeLlegada } from "./llegada";
import { enviarPushDaOrg } from "./web_push";

export const MODO_SOLO_LLEGADAS = "solo_llegadas";

type Admin = ReturnType<typeof createAdminClient>;

/** ¿La organización pidió avisos solo de llegada? Ante cualquier duda, no (modo normal). */
export async function soloAvisosDeLlegada(organizationId: string, admin: Admin = createAdminClient()): Promise<boolean> {
  const { data } = await admin.from("organizations").select("settings").eq("id", organizationId).maybeSingle();
  const settings = (data as { settings?: Record<string, unknown> | null } | null)?.settings ?? null;
  return settings?.avisos_push === MODO_SOLO_LLEGADAS;
}

async function zonaDeLaOrg(admin: Admin, organizationId: string): Promise<string> {
  const { data } = await admin.from("organizations").select("timezone").eq("id", organizationId).maybeSingle();
  return (data as { timezone?: string | null } | null)?.timezone || "America/Lima";
}

/** La hora de la cita de hoy de este contacto ("10:00 a. m."), o null si no tiene. */
async function horaDeLaCitaDeHoy(
  admin: Admin,
  organizationId: string,
  contactId: string | null,
  agora: Date,
): Promise<string | null> {
  if (!contactId) return null;
  const fuso = await zonaDeLaOrg(admin, organizationId);
  const { hasta } = limitesDeHoy(agora, fuso);
  // Desde 4 h atrás: quien llega tarde a la cita de las 9 sigue siendo "su cita".
  const desde = new Date(agora.getTime() - 4 * 3600_000);
  const { data } = await admin
    .from("calendar_appointments")
    .select("starts_at")
    .eq("organization_id", organizationId)
    .eq("contact_id", contactId)
    .gte("starts_at", desde.toISOString())
    .lt("starts_at", hasta.toISOString())
    .in("status", ["pending", "confirmed"])
    .order("starts_at", { ascending: true })
    .limit(1);
  const fila = (data as { starts_at: string }[] | null)?.[0];
  if (!fila) return null;
  return new Intl.DateTimeFormat("es-PE", { timeZone: fuso, hour: "numeric", minute: "2-digit", hour12: true }).format(
    new Date(fila.starts_at),
  );
}

async function nombreDelContacto(admin: Admin, organizationId: string, contactId: string | null): Promise<string | null> {
  if (!contactId) return null;
  const { data } = await admin
    .from("contacts")
    .select("display_name, name, phone_number, is_anonymized")
    .eq("id", contactId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  const rotulo = rotuloDoContato(data as Parameters<typeof rotuloDoContato>[0]);
  return rotulo === SEM_NOME ? null : rotulo;
}

/**
 * Revisa el texto (o la transcripción) y, si es una llegada, avisa al equipo.
 * Devuelve qué pasó, para el registro del evento. Nunca lanza.
 */
export async function avisarSiEsLlegada(input: {
  organizationId: string;
  conversationId: string | null;
  contactId: string | null;
  texto: string | null | undefined;
  agora?: Date;
  admin?: Admin;
}): Promise<{ enviado: number; detalle: string }> {
  try {
    const tipo = detectarLlegada(input.texto);
    if (!tipo) return { enviado: 0, detalle: "no_es_llegada" };
    const admin = input.admin ?? createAdminClient();
    const agora = input.agora ?? new Date();
    const hora = await horaDeLaCitaDeHoy(admin, input.organizationId, input.contactId, agora);
    if (tipo === "indicaciones" && !hora) return { enviado: 0, detalle: "indicaciones_sin_cita_hoy" };
    const nombre = await nombreDelContacto(admin, input.organizationId, input.contactId);
    const { title, body } = textoDelAvisoDeLlegada({ tipo, nombre, hora, mensaje: input.texto ?? "" });
    const href = input.conversationId ? `/app/inbox?id=${input.conversationId}` : "/app/inbox";
    const tag = input.conversationId ? `llegada:${input.conversationId}` : "llegada";
    const { sent } = await enviarPushDaOrg(input.organizationId, { title, body, href, tag, forzar: true });
    return { enviado: sent, detalle: `llegada:${tipo}:sent:${sent}` };
  } catch (err) {
    logger.warn("aviso_de_llegada_fallo", {
      organization_id: input.organizationId,
      detail: err instanceof Error ? err.message : String(err),
    });
    return { enviado: 0, detalle: "error" };
  }
}
