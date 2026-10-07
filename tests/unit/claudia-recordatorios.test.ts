import { describe, expect, it } from "vitest";

import { montarLembrete } from "@/app/api/v1/cron/agenda-reminder/route";
import { renderizar } from "@/lib/campanhas/renderizador";
import { interpolateTemplate } from "@/lib/inbox/template-vars";
import { claveDeVariable } from "@/lib/i18n/variaveis";

const QUANDO = new Date("2026-10-06T15:00:00Z"); // martes 6, 10:00 en Lima

describe("Claud.ia · recordatorios de cita", () => {
  it("acepta las variables en español y en portugués", () => {
    expect(claveDeVariable("primer_nombre")).toBe("primeiro_nome");
    expect(claveDeVariable("Direccion")).toBe("endereco");
    expect(claveDeVariable("primeiro_nome")).toBe("primeiro_nome");
    const texto = montarLembrete({
      nomeDoContato: "Ana Torres",
      titulo: "PAGADO · Ana Torres · Endolifting de papada",
      quando: QUANDO,
      timezone: "America/Lima",
      local: "Av. España 123",
      idioma: "es",
      tipoNome: "Evaluación",
      molde: "Hola {{primer_nombre}}, tu {{servicio}} es el {{dia}} a las {{hora}} en {{direccion}}. ({{primeiro_nome}})",
    });
    expect(texto).toContain("Hola Ana, tu Endolifting de papada es el");
    expect(texto).toContain("a las 10:00 en Av. España 123. (Ana)");
  });

  it("nunca manda la etiqueta interna PAGADO al paciente", () => {
    const porDefecto = montarLembrete({
      nomeDoContato: "Luis",
      titulo: "PAGADO · Luis",
      quando: QUANDO,
      timezone: "America/Lima",
      local: null,
      idioma: "es",
      tipoNome: "Evaluación",
    });
    expect(porDefecto).not.toMatch(/PAGADO/i);
    expect(porDefecto).toContain("Evaluación");
  });

  it("respuestas guardadas y campañas entienden {{primer_nombre}}", () => {
    expect(interpolateTemplate("Hola {{primer_nombre}}", { name: "María Pérez" })).toBe("Hola María");
    expect(renderizar("Hola {{nombre}}", { nome: "María Pérez" }).texto).toBe("Hola María Pérez");
  });
});
