import { afterEach, describe, expect, it, vi } from "vitest";

// Fuera de las pruebas (en el servidor real y en el navegador) VITEST no existe:
// así se simula el producto de verdad.
describe("Claud.ia · solo español", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("cualquier idioma guardado o pedido por el navegador termina en español", async () => {
    vi.stubEnv("VITEST", "");
    vi.resetModules();
    const m = await import("@/lib/i18n/idiomas");
    expect(m.SOLO_ESPANOL).toBe(true);
    expect(m.IDIOMA_PADRAO).toBe("es");
    expect(m.normalizarIdioma("pt-BR")).toBe("es");
    expect(m.normalizarIdioma(null)).toBe("es");
    expect(m.parseAcceptLanguage("pt-BR,pt;q=0.9")).toBe("es");
  });
});
