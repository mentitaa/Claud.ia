/**
 * Claud.ia — los estados fijos del cliente, para elegir con un toque.
 *
 * Son etiquetas de conversación normales (minúsculas, como las guarda la API),
 * con su color. Un cliente está en UN estado: marcar uno quita el anterior; las
 * demás etiquetas que tenga la conversación (p. ej. "claud.ia") no se tocan.
 */

export type EstadoDelCliente = { tag: string; rotulo: string; cor: string };

export const ESTADOS_DEL_CLIENTE: readonly EstadoDelCliente[] = [
  { tag: "busca información", rotulo: "Busca información", cor: "#0091ff" },
  { tag: "negociando", rotulo: "Negociando", cor: "#ffb224" },
  { tag: "agendó / paciente", rotulo: "Agendó / Paciente", cor: "#12a594" },
  { tag: "no interesado", rotulo: "No interesado", cor: "#6f6f6f" },
];

const TAGS = new Set(ESTADOS_DEL_CLIENTE.map((e) => e.tag));

/** El estado marcado hoy en estas etiquetas, o null. */
export function estadoActual(tags: readonly string[]): string | null {
  return tags.find((t) => TAGS.has(t.trim().toLowerCase()))?.trim().toLowerCase() ?? null;
}

/** Las etiquetas con `estado` como único estado (null = sin estado). */
export function conEstado(tags: readonly string[], estado: string | null): string[] {
  const resto = tags.filter((t) => !TAGS.has(t.trim().toLowerCase()));
  return estado ? [...resto, estado] : resto;
}

/** Para `organizations.settings.tags`: así los chips del Inbox salen con color. */
export function vocabularioDeEstados(): { tag: string; cor: string }[] {
  return ESTADOS_DEL_CLIENTE.map(({ tag, cor }) => ({ tag, cor }));
}
