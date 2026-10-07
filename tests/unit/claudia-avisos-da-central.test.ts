import { describe, expect, it } from "vitest";

import { traduzirAviso } from "@/lib/i18n/avisos-da-central";

describe("traduzirAviso: avisos da Central em espanhol na hora de mostrar", () => {
  it("frase fixa de um escritor vira espanhol", () => {
    expect(traduzirAviso("Lead não respondeu no prazo", "es")).toBe("El lead no respondió dentro del plazo");
    expect(traduzirAviso("Handoff humano solicitado — assumir a conversa", "es")).toBe(
      "Se pidió pasar a una persona: toma la conversación",
    );
    expect(traduzirAviso("Confirme a presença no compromisso", "es")).toMatch(/asistencia/i);
  });

  it("frase interpolada mantém o dado e traduz o resto", () => {
    expect(
      traduzirAviso('WhatsApp "Recepção" desconectado — precisa escanear o QR de novo', "es"),
    ).toBe('WhatsApp "Recepção" desconectado: hay que escanear el QR de nuevo');
    expect(traduzirAviso("3 respostas não chegaram ao cliente", "es")).toBe(
      "3 respuestas no llegaron al cliente",
    );
    expect(traduzirAviso("Um atendimento espera decisão há 2 dias", "es")).toBe(
      "Una atención espera una decisión desde hace 2 días",
    );
    expect(traduzirAviso("Chamada perdida de +51 999 888 777", "es")).toBe(
      "Llamada perdida de +51 999 888 777",
    );
    expect(
      traduzirAviso(
        "Compromisso: Limpieza dental. Abra e registre se a pessoa compareceu, faltou ou cancelou. O horário sozinho não confirma falta.",
        "es",
      ),
    ).toBe(
      "Cita: Limpieza dental. Ábrela y registra si la persona asistió, faltó o canceló. La hora por sí sola no confirma una falta.",
    );
  });

  it("corpo com trecho interno conhecido traduz o trecho", () => {
    expect(
      traduzirAviso(
        "O WhatsApp recusou o envio do aviso. O atendimento continua esperando na fila.",
        "es",
      ),
    ).toBe("WhatsApp rechazó el envío del aviso. La atención sigue esperando en la cola.");
  });

  it("corpo em parágrafos traduz cada parágrafo", () => {
    const corpo =
      "Este canal está em modo de teste e não tem nenhum número autorizado, então a IA não responde a ninguém nele — as mensagens chegam no Inbox e ficam sem resposta automática. Em Conexões, autorize os números de teste ou abra o canal ao público.\n\nAssim há 4 dia(s).";
    const saida = traduzirAviso(corpo, "es");
    expect(saida).toMatch(/^Este canal está en modo de prueba/);
    expect(saida).toMatch(/\n\nAsí desde hace 4 día\(s\)\.$/);
  });

  it("texto desconhecido passa intacto", () => {
    const livre = "Fulano de Tal pediu para falar com uma pessoa";
    expect(traduzirAviso(livre, "es")).toBe(livre);
  });

  it("fora do espanhol nada muda, e nulo vira vazio", () => {
    expect(traduzirAviso("Lead não respondeu no prazo", "pt-BR")).toBe("Lead não respondeu no prazo");
    expect(traduzirAviso("3 respostas não chegaram ao cliente", "pt-BR")).toBe(
      "3 respostas não chegaram ao cliente",
    );
    expect(traduzirAviso(null, "es")).toBe("");
    expect(traduzirAviso(undefined, "pt-BR")).toBe("");
  });
});
