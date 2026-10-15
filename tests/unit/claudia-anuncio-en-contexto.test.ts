import { describe, expect, it } from "vitest";

import { extraerContextoDelAnuncio, notaDelAnuncioParaLaIA } from "@/lib/anuncios/contexto-del-anuncio";
import { corpoDaMensagem } from "@/lib/agent-engine/edge/crm/get-lead-context";

const CLICK = {
  extendedTextMessage: {
    text: "¡Hola! Quiero más información",
    contextInfo: {
      externalAdReply: {
        title: "Enzimas para papada — 3 sesiones",
        body: "Promo de octubre: S/ 450. Resultados desde la 1ra sesión.",
        sourceUrl: "https://fb.me/abc123",
        sourceType: "ad",
        ctwaClid: "xyz",
      },
    },
  },
};

describe("Claud.ia · la IA sabe de qué anuncio le escriben", () => {
  it("lee la ficha del anuncio que manda WhatsApp", () => {
    expect(extraerContextoDelAnuncio(CLICK)).toEqual({
      titulo: "Enzimas para papada — 3 sesiones",
      cuerpo: "Promo de octubre: S/ 450. Resultados desde la 1ra sesión.",
      url: "https://fb.me/abc123",
      pagado: true,
    });
  });

  it("también una publicación no pagada", () => {
    const post = { extendedTextMessage: { contextInfo: { externalAdReply: { title: "Limpieza facial", sourceType: "post" } } } };
    expect(extraerContextoDelAnuncio(post)?.pagado).toBe(false);
  });

  it("sin ficha no inventa nada", () => {
    expect(extraerContextoDelAnuncio({ conversation: "hola" })).toBeNull();
    expect(notaDelAnuncioParaLaIA({ raw_type: "chat" })).toBe("");
  });

  it("el texto que lee la IA lleva el anuncio y la orden de no volver a preguntar", () => {
    const anuncio = extraerContextoDelAnuncio(CLICK);
    const texto = corpoDaMensagem({
      type: "text",
      body: "¡Hola! Quiero más información",
      media_url: null,
      media_storage_path: null,
      media_derived_text: null,
      metadata: { anuncio },
    });
    expect(texto).toContain("¡Hola! Quiero más información");
    expect(texto).toContain("Enzimas para papada");
    expect(texto).toMatch(/NO le preguntes sobre qué quiere información/);
  });

  it("un mensaje normal queda igual que antes", () => {
    expect(
      corpoDaMensagem({ type: "text", body: "hola", media_url: null, media_storage_path: null, media_derived_text: null }),
    ).toBe("hola");
  });
});
