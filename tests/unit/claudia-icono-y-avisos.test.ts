import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { CUADROS_DEL_ICONO, ICONO_ALTO, ICONO_ANCHO, MAPA_DEL_ICONO } from "@/lib/branding/icono-claudia";
import { NAV_CATALOG, type NavMetadata } from "@/lib/navigation/catalogo";
import { destinosDaInterface, PORTAS_ESSENCIAIS } from "@/lib/navigation/interface";

const RAIZ = process.cwd();

describe("Claud.ia · ícono {c}", () => {
  it("el mapa es de 13 × 7 y simétrico en las llaves", () => {
    expect(MAPA_DEL_ICONO).toHaveLength(ICONO_ALTO);
    for (const fila of MAPA_DEL_ICONO) expect(fila).toHaveLength(ICONO_ANCHO);
    // La llave de cierre es el espejo de la de apertura.
    for (const fila of MAPA_DEL_ICONO) expect(fila.slice(10)).toBe([...fila.slice(0, 3)].reverse().join(""));
    expect(CUADROS_DEL_ICONO.length).toBeGreaterThan(20);
  });

  it("los PNG que pide el iPhone existen", () => {
    for (const f of [
      "public/apple-touch-icon.png",
      "public/claudia/icono-180.png",
      "public/claudia/icono-192.png",
      "public/claudia/icono-512.png",
      "public/claudia/icono-512-maskable.png",
    ]) {
      expect(fs.existsSync(path.join(RAIZ, f)), f).toBe(true);
    }
  });

  it("el manifest se lee en cada pedido (no queda congelado con el nombre del repo original)", () => {
    const m = fs.readFileSync(path.join(RAIZ, "app/manifest.ts"), "utf8");
    expect(m).toMatch(/export const dynamic\s*=\s*"force-dynamic"/);
    expect(m).toMatch(/icono-512-maskable\.png/);
  });
});

describe("Claud.ia · Notificaciones siempre a la vista", () => {
  it("es puerta esencial: la secretaria con menú simplificado la ve igual", () => {
    expect(PORTAS_ESSENCIAIS).toContain("/app/settings/notifications");
    const visibles = destinosDaInterface(
      { preset: "simplificada", destinos: ["/app/inicio", "/app/inbox", "/app/agenda", "/app/contacts", "/app/tasks"] },
      false,
      "agent",
    ).map((d: NavMetadata) => d.href);
    expect(visibles).toContain("/app/settings/notifications");
    expect((NAV_CATALOG as readonly NavMetadata[]).some((d) => d.href === "/app/settings/notifications")).toBe(true);
  });
});

describe("Claud.ia · los avisos del celular salen en español", () => {
  it("los textos fijos de los avisos tienen traducción", async () => {
    const { traduzir } = await import("@/lib/i18n/dicionario");
    for (const pt of [
      "Alertas ligados",
      "Alertas desligados",
      "Novas mensagens aparecem na bandeja do sistema.",
      "Este navegador não vai mais avisar na bandeja.",
      "Nova mensagem",
      "Lead atribuído a você",
      "Lead ganho",
      "Você foi mencionado",
    ]) {
      expect(traduzir(pt, "es"), pt).not.toBe(pt);
    }
  });

  it("el aviso del sistema (celular) y el push del servidor pasan por el diccionario", () => {
    const emit = fs.readFileSync(path.join(RAIZ, "lib/notifications/emit.ts"), "utf8");
    expect(emit).toMatch(/traduzir\(input\.title, IDIOMA_PADRAO\)/);
    const push = fs.readFileSync(path.join(RAIZ, "lib/notifications/web_push.ts"), "utf8");
    expect(push).toMatch(/traduzir\(payload\.title, IDIOMA_PADRAO\)/);
  });
});
