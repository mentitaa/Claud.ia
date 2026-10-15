import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { citacaoDaLei, paisesOferecidos, perfilDoPais } from "@/lib/legal/perfil-do-pais";
import { FERIADOS_PE_ISO } from "@/lib/lgpd/feriados-pe";
import { botonPrincipalDeSesion, cambioAlMarcarHecha } from "@/lib/tratamientos/tratamiento";

const RAIZ = join(__dirname, "..", "..");
const leer = (rel: string) => readFileSync(join(RAIZ, rel), "utf8");

describe("Claud.ia 22 · botones de cada sesión de la ficha", () => {
  it("sin fecha, lo principal es poner fecha; con fecha, marcar hecha; hecha, deshacer", () => {
    expect(botonPrincipalDeSesion({ fecha: null, hecha: false })).toBe("poner_fecha");
    expect(botonPrincipalDeSesion({ fecha: "2026-11-03T15:00:00.000Z", hecha: false })).toBe("marcar_hecha");
    expect(botonPrincipalDeSesion({ fecha: null, hecha: true })).toBe("deshacer");
  });

  it("marcar hecha una sesión SIN fecha le pone la fecha de hoy", () => {
    const hoy = new Date("2026-11-10T16:30:00.000Z");
    expect(cambioAlMarcarHecha({ fecha: null, hecha: false }, hoy)).toEqual({ hecha: true, fecha: hoy.toISOString() });
  });

  it("marcar hecha una sesión CON fecha no toca la fecha; deshacer tampoco", () => {
    expect(cambioAlMarcarHecha({ fecha: "2026-11-03T15:00:00.000Z", hecha: false })).toEqual({ hecha: true });
    expect(cambioAlMarcarHecha({ fecha: "2026-11-03T15:00:00.000Z", hecha: true })).toEqual({ hecha: false });
  });

  it("la ficha usa estas dos funciones (y no vuelve el botón verde en cada sesión pendiente)", () => {
    const ficha = leer("components/tratamientos/TratamientosDelContacto.tsx");
    expect(ficha).toContain("botonPrincipalDeSesion(s)");
    expect(ficha).toContain("cambioAlMarcarHecha(s)");
  });
});

describe("Claud.ia 22 · /admin/google sin portugués fijo", () => {
  const form = leer("app/admin/(protected)/google/_form.tsx");
  it("el botón y la fecha pasan por t()", () => {
    expect(form).toContain('t("Salvando…") : t("Salvar")');
    expect(form).toContain('t("Última alteração em")');
    expect(form).not.toMatch(/>\s*Cole exatamente isto/);
  });
});

describe("Claud.ia 22 · perfil del Perú", () => {
  const pe = perfilDoPais("PE");

  it("documento: DNI de 8 dígitos o carné/pasaporte de 9 a 12", () => {
    expect(pe.documento.rotulo).toBe("DNI / CE");
    expect(pe.documento.valida("12.345.678")).toBe(true);
    expect(pe.documento.valida("001234567")).toBe(true);
    expect(pe.documento.valida("1234567")).toBe(false);
    expect(pe.documento.normaliza("12 345 678")).toBe("12345678");
  });

  it("cita la Ley 29733 (derecho de acceso, art. 19) y Perú se ofrece en Configuración", () => {
    expect(citacaoDaLei(pe)).toBe("Ley de Protección de Datos Personales art. 19 (Ley N.º 29733)");
    expect(paisesOferecidos().map((p) => p.codigo)).toContain("PE");
  });

  it("feriados del Perú: 16 por año (14 fijos + Jueves y Viernes Santo)", () => {
    for (const y of ["2026", "2027", "2028", "2029", "2030"]) {
      expect(FERIADOS_PE_ISO.filter((d) => d.startsWith(y))).toHaveLength(16);
    }
    expect(FERIADOS_PE_ISO).toContain("2026-07-28");
    expect(FERIADOS_PE_ISO).toContain("2026-04-03");
    expect(pe.calendario.feriados).toBe(FERIADOS_PE_ISO);
  });

  it("el DNI solo se redacta junto a la palabra «DNI» (los n.º de operación de Yape quedan legibles)", () => {
    const re = () => new RegExp(pe.padroesDePii[0]!.fonte, "gi");
    expect("Mi DNI: 12345678".replace(re(), "[DNI]")).toBe("Mi [DNI]");
    expect("DNI N° 12345678".replace(re(), "[DNI]")).toBe("[DNI]");
    expect("Operación 87654321".replace(re(), "[DNI]")).toBe("Operación 87654321");
  });
});
