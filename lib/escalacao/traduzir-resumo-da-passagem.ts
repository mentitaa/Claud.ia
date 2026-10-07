/**
 * O RESUMO DA PASSAGEM NO IDIOMA DE QUEM LÊ.
 *
 * O `body` da passagem é montado no instante do traspasso (`montarBriefingDaPassagem`)
 * e gravado já pronto, com rótulos em português ("Por que a IA passou:",
 * "Próxima ação:"…). O conteúdo depois dos rótulos é o que a IA escreveu — no
 * idioma da conversa —, mas os rótulos não seguiam o idioma da organização.
 *
 * Traduzir na TELA, e não na gravação, é deliberado: cobre também as passagens
 * já gravadas, não muda o formato que os testes do briefing medem e mantém a
 * mudança numa camada só, fácil de levar a cada atualização.
 *
 * Só troca RÓTULO no começo da linha. O texto da IA e as falas literais do
 * cliente passam intactos.
 */

import { traduzir } from "@/lib/i18n/dicionario";
import type { Idioma } from "@/lib/i18n/idiomas";

import { PISO_DO_BRIEFING } from "./passagem";

/** Rótulo em português → espanhol. Do mais longo ao mais curto, para "Caso" não pegar "Casos…". */
const ROTULOS_ES: ReadonlyArray<readonly [string, string]> = (
  [
    ["O que o cliente quer (segundo a IA — confira)", "Lo que quiere el cliente (según la IA, revísalo)"],
    ["Contexto acumulado (segundo a IA — confira)", "Contexto acumulado (según la IA, revísalo)"],
    ["Últimas mensagens do cliente (palavras dele)", "Últimos mensajes del cliente (sus palabras)"],
    ["A pessoa que escalou escreveu", "La persona que escaló escribió"],
    ["Por que a IA passou", "Por qué la IA pasó la conversación"],
    ["Quem passou escreveu", "Quien la pasó escribió"],
    ["O que a IA já tentou", "Lo que la IA ya intentó"],
    ["O que a pessoa quer", "Lo que la persona quiere"],
    ["Prometido a ela", "Lo que se le prometió"],
    ["Compromissos", "Compromisos"],
    ["Próxima ação", "Próxima acción"],
    ["Objeções", "Objeciones"],
    ["Bloqueio", "Bloqueo"],
    ["Caso", "Caso"],
  ] as const
)
  .slice()
  .sort((a, b) => b[0].length - a[0].length);

export function traduzirResumoDaPassagem(texto: string, idioma: Idioma): string {
  if (idioma !== "es") return texto;
  return texto
    .split("\n")
    .map((linha) => {
      if (linha.trim() === PISO_DO_BRIEFING) return traduzir(PISO_DO_BRIEFING, idioma);
      for (const [pt, es] of ROTULOS_ES) {
        if (!linha.startsWith(`${pt}:`)) continue;
        const resto = linha.slice(pt.length + 1);
        // A frase do motivo é vocabulário FECHADO (`FRASE_DO_MOTIVO`) e já tem
        // tradução no dicionário; o resto das linhas é texto livre da IA.
        if (pt === "Por que a IA passou") return `${es}: ${traduzir(resto.trim(), idioma)}`;
        return `${es}:${resto}`;
      }
      return linha;
    })
    .join("\n");
}
