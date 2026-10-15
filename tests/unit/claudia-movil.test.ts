import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const leer = (f: string) => fs.readFileSync(path.join(process.cwd(), f), "utf8");

describe("Claud.ia · revisión del celular", () => {
  it("el chat: cabecera compacta y acciones en una fila que se desliza", () => {
    const h = leer("components/inbox/ConversationHeader.tsx");
    expect(h).toMatch(/px-4 py-2 md:gap-3 md:px-6 md:py-4/);
    expect(h).toMatch(/flex-nowrap items-center gap-1\.5 overflow-x-auto/);
  });

  it("la agenda no muestra «Você» crudo", () => {
    const p = leer("components/agenda/PainelDeMarcacao.tsx");
    expect(p).not.toMatch(/\{responsavel\.nome\}/);
  });

  it("perfil y empresa ofrecen Lima", () => {
    for (const f of ["app/app/settings/profile/_form.tsx", "app/app/settings/tenant/_form.tsx"]) {
      expect(leer(f)).toContain("FUSOS_OFERECIDOS");
    }
    expect(leer("app/app/settings/profile/page.tsx")).toContain('"America/Lima"');
  });

  it("la pestaña del navegador ya no dice el lema en portugués", () => {
    expect(leer("app/layout.tsx")).not.toMatch(/atendimento e vendas por WhatsApp/);
    expect(leer("app/app/contacts/page.tsx")).toMatch(/title: "Contactos"/);
  });

  it("el login no ofrece «Crear cuenta» (solo por invitación)", () => {
    expect(leer("app/(public)/login/page.tsx")).not.toMatch(/href="\/signup"/);
  });
});
