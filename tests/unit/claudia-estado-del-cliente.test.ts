import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { ESTADOS_DEL_CLIENTE, conEstado, estadoActual } from "@/lib/tags/estados-del-cliente";

describe("Claud.ia · estado del cliente", () => {
  it("son los cuatro que pidió la clínica", () => {
    expect(ESTADOS_DEL_CLIENTE.map((e) => e.rotulo)).toEqual([
      "Busca información",
      "Negociando",
      "Agendó / Paciente",
      "No interesado",
    ]);
  });

  it("marcar uno reemplaza al anterior y no toca las otras etiquetas", () => {
    const antes = ["claud.ia", "busca información"];
    expect(conEstado(antes, "negociando")).toEqual(["claud.ia", "negociando"]);
    expect(estadoActual(conEstado(antes, "negociando"))).toBe("negociando");
  });

  it("tocar el marcado lo quita", () => {
    expect(conEstado(["claud.ia", "negociando"], null)).toEqual(["claud.ia"]);
    expect(estadoActual(["claud.ia"])).toBeNull();
  });

  it("las etiquetas caben en lo que acepta la API (≤ 40 letras, minúsculas)", () => {
    for (const e of ESTADOS_DEL_CLIENTE) {
      expect(e.tag.length).toBeLessThanOrEqual(40);
      expect(e.tag).toBe(e.tag.toLowerCase());
    }
  });

  it("el panel del chat: simple para quien no administra", () => {
    const p = fs.readFileSync(path.join(process.cwd(), "components/inbox/CRMSidePanel.tsx"), "utf8");
    expect(p).toMatch(/const simple = !!activeOrg && activeOrg\.role !== "admin";/);
    expect(p).toMatch(/<EstadoDelCliente/);
    expect(p).not.toMatch(/t\("Novo Lead"\)\}\s*<\/Button>/);
  });
});
