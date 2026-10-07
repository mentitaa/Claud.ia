/**
 * Claud.ia — o cliente de uma organização em espanhol nunca lê português.
 *
 * Prende as duas camadas desta mudança: o aviso que sai ao paciente quando a IA
 * passa a conversa a uma pessoa, e os rótulos do resumo da passagem na Central.
 */
import { describe, expect, it } from "vitest";

import { textoDoAviso, type MotivoDoAviso } from "@/lib/escalacao/aviso-ao-lead";
import type { QuemPodeAssumir } from "@/lib/escalacao/disponibilidade";
import { montarBriefingDaPassagem } from "@/lib/escalacao/briefing-da-passagem";
import { traduzirResumoDaPassagem } from "@/lib/escalacao/traduzir-resumo-da-passagem";

const MOTIVOS: MotivoDoAviso[] = ["pediu_humano", "suspeita_de_opt_out", "orcamento_de_ia", "outro"];
const ESTADOS: Array<QuemPodeAssumir | null> = [
  null,
  { disponiveis: 0, total: 0 },
  { disponiveis: 0, total: 3 },
  { disponiveis: 2, total: 3 },
];
const PALAVRAS_EM_PORTUGUES = /\b(você|seu|sua|atendente|equipe|não|conversa entrou|fila|agora|Encaminhei|pedido ficou)\b/i;
const FRASES_PROIBIDAS = /no hay nadie|prefiero no arriesgarme/i;

describe("aviso ao paciente em espanhol", () => {
  it("nenhuma combinação de motivo, estado e lead sai com português", () => {
    for (const motivo of MOTIVOS) {
      for (const quem of ESTADOS) {
        for (let i = 0; i < 40; i++) {
          const texto = textoDoAviso(motivo, quem, `lead-${i}`, "es");
          expect(texto, texto).not.toMatch(PALAVRAS_EM_PORTUGUES);
          expect(texto, texto).not.toMatch(FRASES_PROIBIDAS);
        }
      }
    }
  });

  it("mantém três redações por caso, como em português", () => {
    for (const motivo of MOTIVOS) {
      for (const quem of ESTADOS) {
        const textos = new Set(
          Array.from({ length: 60 }, (_, i) => textoDoAviso(motivo, quem, `lead-${i}`, "es")),
        );
        expect(textos.size, motivo).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("sem idioma, o padrão continua o português de antes", () => {
    const pt = textoDoAviso("pediu_humano", { disponiveis: 0, total: 3 }, "lead-1");
    expect(pt).toBe(textoDoAviso("pediu_humano", { disponiveis: 0, total: 3 }, "lead-1", "pt-BR"));
  });
});

describe("resumo da passagem traduzido na tela", () => {
  const body = montarBriefingDaPassagem({
    motivo: { codigo: "requested_human", texto: "Cliente listo para agendar" },
    declaradoPeloModelo: { cliente_quer: "Agendar evaluación" },
    checkpoint: {
      commitments: [],
      objections: ["Preguntó por botox"],
      next_action: "Confirmar horario",
      rolling_summary: "",
      declaracao: null,
    },
    pendentesDoCliente: ["ya pe, quiero agendar"],
  }).body;

  it("troca os rótulos e o motivo, e preserva o texto da IA e do cliente", () => {
    const es = traduzirResumoDaPassagem(body, "es");
    expect(es).toContain("Por qué la IA pasó la conversación: El cliente pidió hablar con una persona");
    expect(es).toContain('Quien la pasó escribió: "Cliente listo para agendar"');
    expect(es).toContain("Objeciones: Preguntó por botox");
    expect(es).toContain("Próxima acción: Confirmar horario");
    expect(es).toContain('"ya pe, quiero agendar"');
    expect(es).not.toMatch(/Por que a IA passou|Quem passou|Objeções|Próxima ação|segundo a IA/);
  });

  it("em português não muda nada", () => {
    expect(traduzirResumoDaPassagem(body, "pt-BR")).toBe(body);
  });
});
