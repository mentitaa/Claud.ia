/**
 * Claud.ia — ¿este mensaje avisa que el cliente llegó, está llegando o pide
 * cómo llegar?
 *
 * Pedido del primer cliente: la recepcionista archiva en WhatsApp los chats de
 * quienes ya son clientes, y cuando uno escribe "ya llegué" no le suena nada.
 * Con la organización en modo "solo llegadas", el aviso push del panel sale
 * únicamente para estos tres casos (ver `aviso-de-llegada.ts`).
 *
 * Detección por frases, sin IA: es instantánea, no cuesta y se puede probar.
 * Puro y sin dependencias para que el test lo cubra frase por frase.
 */

export type TipoDeLlegada = "llego" | "llegando" | "indicaciones";

/** Minúsculas, sin tildes ni signos, espacios simples. "¿Cómo LLEGO?" → "como llego". */
export function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const LUGAR = "(la )?(puerta|entrada|recepcion|sala de espera|porteria)";
const LOCAL = "(el |la )?(consultorio|clinica|local|oficina|estudio|centro)";

const LLEGO: RegExp[] = [
  // "llegué" sin "cuando/si/que/apenas" delante (eso es futuro: "cuando llegue te aviso").
  /(?<!\b(cuando|si|que|apenas|hasta|antes de|en cuanto) )\b(ya )?llegue\b(?! (a las|tarde|temprano))/,
  /\bacabo de llegar\b/,
  /\bya (estoy|estamos) (aqui|aca|afuera|abajo|presente)\b/,
  new RegExp(`\\b(ya )?(estoy|estamos) (aqui |aca )?(afuera|abajo|en ${LUGAR}|en ${LOCAL})\\b`),
  /\b(me|nos) (pueden|puedes|puede|podrian) abrir\b/,
  /\babran(me)?\b|\babrame\b/,
];

const LLEGANDO: RegExp[] = [
  /\b(estoy|voy|vamos|estamos|ya estoy|ya voy) llegando\b/,
  /\b(estoy|voy|vamos|estamos|ya voy|ya estoy) en camino\b/,
  /\b(estoy|estamos) por llegar\b/,
  /\bllego en (\d+|un|una|unos|unas|dos|tres|cinco|diez|quince|veinte|media)\b/,
  /\bya llego\b/,
  /\b(ya )?(estoy|estamos) (cerca|a (\d+|una|dos|tres|cuatro|cinco) cuadras?)\b/,
  /\b(voy|vamos|estoy) (a llegar |llegando )?(un poco |unos minutos )?tarde\b/,
  /\bllego (un poco |unos minutos )?tarde\b/,
  /\bya (sali|salimos) (de|para|hacia|a)\b/,
];

const INDICACIONES: RegExp[] = [
  /\bcomo (hago para )?(llego|llegar|llegamos)\b/,
  /\bdonde (queda|quedan|esta|estan|es|se ubica|se ubican|los encuentro|las encuentro)\b/,
  /\bcual es (la|su) (direccion|ubicacion)\b/,
  /\b(me|nos) (pasas|pasa|das|da|envias|envia|mandas|manda|compartes|comparte|puedes pasar|puede pasar|podrias pasar|podria pasar|puedes mandar|puede mandar|puedes enviar|puede enviar) (la |su )?(direccion|ubicacion)\b/,
  /\bno (encuentro|ubico|veo|hallo) (el |la )?(local|clinica|consultorio|oficina|lugar|entrada|direccion|edificio|puerta)\b/,
  /\b(en )?que piso\b/,
  /\bpor donde (entro|ingreso|es la entrada|se entra)\b/,
  /\b(direccion|ubicacion) (exacta|por favor|porfa|porfavor)\b/,
];

/**
 * El tipo de aviso, o `null` si el mensaje no habla de llegar.
 * Prioridad: ya llegó > está llegando > pide indicaciones.
 */
export function detectarLlegada(texto: string | null | undefined): TipoDeLlegada | null {
  if (!texto) return null;
  const t = normalizarTexto(texto);
  if (!t) return null;
  if (LLEGO.some((r) => r.test(t))) return "llego";
  if (LLEGANDO.some((r) => r.test(t))) return "llegando";
  if (INDICACIONES.some((r) => r.test(t))) return "indicaciones";
  return null;
}

/** Título y cuerpo del aviso. `hora` = hora de la cita de hoy ("10:00 a. m."), si hay. */
export function textoDelAvisoDeLlegada(input: {
  tipo: TipoDeLlegada;
  nombre: string | null;
  hora: string | null;
  mensaje: string;
}): { title: string; body: string } {
  const quien = input.nombre?.trim() || "Un cliente";
  const title =
    input.tipo === "llego"
      ? input.hora
        ? `${quien} llegó a su cita`
        : `${quien} llegó`
      : input.tipo === "llegando"
        ? `${quien} está llegando`
        : `${quien} pide indicaciones para llegar`;
  const cita = input.hora ? `Cita de las ${input.hora} · ` : "";
  const dicho = input.mensaje.trim().replace(/\s+/g, " ");
  const corto = dicho.length > 110 ? `${dicho.slice(0, 109)}…` : dicho;
  return { title, body: `${cita}«${corto}»` };
}
