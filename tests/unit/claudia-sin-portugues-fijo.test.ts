/**
 * Claud.ia 22 — NINGÚN texto de pantalla en portugués escrito fijo.
 *
 * El guardia heredado (`i18n-espanhol-cobre-a-tela`) solo reconoce el portugués
 * por su ortografía (ç, ã, õ…). "Salvar", "Contato", "Status", "Email" o
 * "Carregando etapas…" no tienen esas letras, y se colaban en la pantalla sin
 * pasar por `t()` (pasó en /admin/google: el botón decía "Salvar").
 *
 * Esta prueba usa el DICCIONARIO como detector: si un texto que llega a la
 * pantalla (texto JSX, literal en posición de hijo, atributo visible, toast o
 * plantilla) es una clave del diccionario con traducción distinta en español,
 * está en portugués y no pasa por `t()`. Eso falla.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

import ts from "typescript";
import { describe, expect, it } from "vitest";

import { DICIONARIO } from "@/lib/i18n/dicionario";

const RAIZ = join(__dirname, "..", "..");
const IGNORADAS = new Set(["api", "node_modules"]);
const FUERA = ["app/design", "app/vitrine-agenda"];
const VISIBLES = new Set(["placeholder", "title", "aria-label", "alt", "label", "description"]);

function archivos(dir: string, acc: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (IGNORADAS.has(e.name) || e.name.startsWith(".")) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) archivos(p, acc);
    else if (/\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) acc.push(p);
  }
  return acc;
}

const enPortugues = (texto: string) => {
  const k = texto.trim();
  const es = DICIONARIO[k]?.es;
  return !!es && es !== k;
};

function dentroDeT(n: ts.Node): boolean {
  for (let p = n.parent; p; p = p.parent) {
    if (ts.isCallExpression(p)) {
      const a = p.expression;
      const nombre = ts.isIdentifier(a) ? a.text : ts.isPropertyAccessExpression(a) ? a.name.text : "";
      if (nombre === "t" || nombre === "traduzir") return true;
    }
  }
  return false;
}

function textosFijos(): string[] {
  const out: string[] = [];
  for (const area of ["app", "components", "hooks", "lib"]) {
    for (const f of archivos(join(RAIZ, area))) {
      const rel = relative(RAIZ, f).split(sep).join("/");
      if (FUERA.some((x) => rel.startsWith(x))) continue;
      const src = ts.createSourceFile(f, readFileSync(f, "utf8"), ts.ScriptTarget.Latest, true,
        f.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
      const loc = (n: ts.Node) => `${rel}:${src.getLineAndCharacterOfPosition(n.getStart()).line + 1}`;
      const enPantalla = (n: ts.Node): boolean => {
        for (let q = n.parent; q; q = q.parent) {
          if (ts.isJsxExpression(q)) return !ts.isJsxAttribute(q.parent) || VISIBLES.has(q.parent.name.getText(src));
          if (ts.isJsxAttribute(q)) return VISIBLES.has(q.name.getText(src));
          if (ts.isCallExpression(q)) {
            const a = q.expression;
            return ts.isPropertyAccessExpression(a) && ts.isIdentifier(a.expression) && a.expression.text === "toast";
          }
          if (ts.isFunctionLike(q) || ts.isVariableDeclaration(q) || ts.isPropertyAssignment(q)) return false;
        }
        return false;
      };
      const visita = (n: ts.Node): void => {
        if (ts.isJsxText(n)) {
          const t = n.text.replace(/\s+/g, " ").trim();
          if (t && enPortugues(t)) out.push(`${loc(n)} «${t}»`);
        }
        if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && !dentroDeT(n) && enPortugues(n.text) && enPantalla(n)) {
          const p = n.parent;
          const comparacion = p && ts.isBinaryExpression(p) &&
            [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken].includes(p.operatorToken.kind);
          if (!comparacion) out.push(`${loc(n)} «${n.text}»`);
        }
        if (ts.isTemplateExpression(n) && !dentroDeT(n) && enPortugues(n.head.text) && enPantalla(n)) {
          out.push(`${loc(n)} «${n.getText(src).slice(0, 60)}»`);
        }
        ts.forEachChild(n, visita);
      };
      visita(src);
    }
  }
  return out;
}

describe("Claud.ia · sin portugués fijo en la pantalla", () => {
  it("todo texto de pantalla que el diccionario traduce pasa por t()", () => {
    expect(textosFijos(), "envolver cada uno en t(\"…\") (la clave ya tiene español en el diccionario)").toEqual([]);
  });

  it("el detector funciona (prueba de dientes)", () => {
    expect(enPortugues("Salvar")).toBe(true);
    expect(enPortugues("Guardar")).toBe(false);
  });
});
