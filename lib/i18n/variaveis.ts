/**
 * Claud.ia — los nombres en español de las variables `{{…}}`.
 *
 * Los moldes (recordatorios de cita, respuestas guardadas, campañas) se
 * escribieron con claves en portugués: `{{primeiro_nome}}`, `{{endereco}}`…
 * En una instalación en español la persona escribe `{{primer_nombre}}` o
 * `{{direccion}}`. Esta tabla traduce el nombre en español a la clave interna,
 * así los dos funcionan y ningún molde viejo se rompe.
 *
 * Sin tildes a propósito: los renderizadores solo reconocen `[a-zA-Z_]`.
 */
const ALIAS: Readonly<Record<string, string>> = {
  nombre: "nome",
  primer_nombre: "primeiro_nome",
  direccion: "endereco",
  saludo: "saudacao",
  servicio: "titulo",
};

/** Nombre escrito por la persona (en español o portugués) → clave interna. */
export function claveDeVariable(bruta: string): string {
  const k = bruta.toLowerCase();
  return ALIAS[k] ?? k;
}
