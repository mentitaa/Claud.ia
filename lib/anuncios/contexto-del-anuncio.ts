/**
 * Claud.ia — de qué anuncio (o publicación) vino el mensaje, para que la IA
 * responda sobre ESO en vez de preguntar "¿sobre qué quieres información?".
 *
 * Cuando alguien toca "Enviar mensaje" en un anuncio de Facebook/Instagram,
 * WhatsApp manda junto al texto ("Dame más información") una ficha del anuncio:
 * título, texto y enlace (no el video ni la imagen). El ingreso la guarda en
 * `messages.metadata.anuncio` de ESE mensaje (no solo la primera vez, como la
 * atribución del contacto), y `corpoDaMensagem` la agrega al texto que lee la IA.
 */

export type ContextoDelAnuncio = {
  titulo: string | null;
  cuerpo: string | null;
  url: string | null;
  /** true = anuncio pagado; false = publicación compartida u otra vista previa. */
  pagado: boolean;
};

type Bruto = Record<string, unknown>;
const obj = (v: unknown): Bruto | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Bruto) : null);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

/**
 * Lee `contextInfo.externalAdReply` del mensaje crudo de WhatsApp (transporte por QR).
 * A diferencia de la atribución, acepta también publicaciones no pagadas: para
 * responder bien da igual si el aviso fue pagado.
 */
export function extraerContextoDelAnuncio(messageRaw: unknown): ContextoDelAnuncio | null {
  const m = obj(messageRaw);
  if (!m) return null;
  const candidatos = [
    obj(m.extendedTextMessage)?.contextInfo,
    obj(m.imageMessage)?.contextInfo,
    obj(m.videoMessage)?.contextInfo,
    m.contextInfo,
  ];
  const ad = candidatos
    .map(obj)
    .map((c) => obj(c?.externalAdReply) ?? obj(c?.externalAdReplyInfo))
    .find((x): x is Bruto => x !== null);
  if (!ad) return null;
  const titulo = str(ad.title);
  const cuerpo = str(ad.body);
  const url = str(ad.sourceUrl) ?? str(ad.source_url);
  if (!titulo && !cuerpo && !url) return null;
  const tipo = str(ad.sourceType) ?? str(ad.source_type);
  return { titulo, cuerpo, url, pagado: !tipo || tipo === "ad" };
}

function corto(s: string | null, max: number): string | null {
  if (!s) return null;
  const limpio = s.replace(/\s+/g, " ").trim();
  return limpio.length > max ? `${limpio.slice(0, max - 1)}…` : limpio;
}

/**
 * La nota que se agrega al mensaje para la IA. Vacía si el mensaje no trae
 * anuncio. El texto del anuncio es del negocio, pero igual va entre comillas
 * como DATO (no como instrucción).
 */
export function notaDelAnuncioParaLaIA(metadata: unknown): string {
  const a = obj(obj(metadata)?.anuncio);
  if (!a) return "";
  const titulo = corto(str(a.titulo), 160);
  const cuerpo = corto(str(a.cuerpo), 400);
  const url = corto(str(a.url), 200);
  if (!titulo && !cuerpo && !url) return "";
  const origen = a.pagado === false ? "una publicación del negocio" : "un anuncio del negocio";
  const partes = [titulo ? `título «${titulo}»` : null, cuerpo ? `texto «${cuerpo}»` : null, url ? `enlace ${url}` : null]
    .filter(Boolean)
    .join("; ");
  return (
    `[Contexto: el cliente escribió tocando ${origen} (${partes}). ` +
    `Ya dijo de qué quiere información: responde directo sobre ese servicio o promoción ` +
    `(qué es, precio, sesiones y cómo agendar) y NO le preguntes sobre qué quiere información. ` +
    `Si el anuncio no nombra un servicio claro, ofrécele los servicios del negocio para elegir.]`
  );
}
