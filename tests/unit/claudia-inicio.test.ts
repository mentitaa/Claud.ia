import { describe, expect, it } from "vitest";

import {
  desdeAnoche,
  fueraDeHorario,
  haceCuanto,
  leerPago,
  limitesDeHoy,
  saludo,
  soles,
  tratamientoDelTitulo,
} from "@/lib/inicio/resumo";

const LIMA = "America/Lima";
const JORNADA = [
  ...[1, 2, 3, 4, 5].map((dow) => ({ dow, start: "09:00", end: "19:00" })),
  { dow: 6, start: "09:00", end: "14:00" },
];

describe("Claud.ia · Inicio — leer el pago que el agente grava", () => {
  it("lee título y descripción en el formato del agente", () => {
    const p = leerPago(
      "PAGADO · Ana Torres · Endolifting de papada",
      "Adelanto S/ 50 por Yape · Op. 0048213 · 27/09 23:13 · Interés: Endolifting de papada",
    );
    expect(p).toEqual({ pagado: true, app: "Yape", monto: 50, operacion: "0048213" });
  });

  it("no inventa lo que no está", () => {
    expect(leerPago("Evaluación — María", null)).toEqual({
      pagado: false,
      app: null,
      monto: null,
      operacion: null,
    });
  });

  it("acepta Plin, decimales con coma y 'operación n.º'", () => {
    const p = leerPago("Pagado · Luis · Enzimas", "S/ 50,00 por Plin, operación n.º 7731025");
    expect(p.app).toBe("Plin");
    expect(p.monto).toBe(50);
    expect(p.operacion).toBe("7731025");
  });

  it("saca el tratamiento del título", () => {
    expect(tratamientoDelTitulo("PAGADO · Ana Torres · Endolifting de papada")).toBe("Endolifting de papada");
    expect(tratamientoDelTitulo("PAGADO · Ana Torres")).toBeNull();
    expect(tratamientoDelTitulo("Control con el doctor")).toBe("Control con el doctor");
  });
});

describe("Claud.ia · Inicio — horario y relojes de la clínica", () => {
  it("fuera de horario: domingo, noche y sábado por la tarde", () => {
    // 2026-09-27 es domingo. 15:00 UTC = 10:00 en Lima.
    expect(fueraDeHorario(new Date("2026-09-27T15:00:00Z"), LIMA, JORNADA)).toBe(true);
    // Lunes 28, 23:30 en Lima.
    expect(fueraDeHorario(new Date("2026-09-29T04:30:00Z"), LIMA, JORNADA)).toBe(true);
    // Lunes 28, 10:00 en Lima.
    expect(fueraDeHorario(new Date("2026-09-28T15:00:00Z"), LIMA, JORNADA)).toBe(false);
    // Sábado 3, 15:00 en Lima.
    expect(fueraDeHorario(new Date("2026-10-03T20:00:00Z"), LIMA, JORNADA)).toBe(true);
  });

  it("sin jornada configurada usa lunes a sábado de 9 a 19", () => {
    expect(fueraDeHorario(new Date("2026-09-28T15:00:00Z"), LIMA, [])).toBe(false);
    expect(fueraDeHorario(new Date("2026-09-28T02:00:00Z"), LIMA, [])).toBe(true);
  });

  it("hoy va de medianoche a medianoche en Lima", () => {
    const { desde, hasta } = limitesDeHoy(new Date("2026-09-28T03:00:00Z"), LIMA); // 27/09 22:00 Lima
    expect(desde.toISOString()).toBe("2026-09-27T05:00:00.000Z");
    expect(hasta.toISOString()).toBe("2026-09-28T05:00:00.000Z");
  });

  it("desde anoche = las 19 h de ayer en Lima", () => {
    expect(desdeAnoche(new Date("2026-09-28T15:00:00Z"), LIMA).toISOString()).toBe("2026-09-28T00:00:00.000Z");
  });

  it("saludo, tiempo relativo y soles", () => {
    expect(saludo(1)).toBe("Boa noite");
    expect(saludo(8)).toBe("Bom dia");
    expect(saludo(15)).toBe("Boa tarde");
    expect(saludo(21)).toBe("Boa noite");
    const ahora = new Date("2026-09-28T15:00:00Z");
    expect(haceCuanto(new Date("2026-09-28T14:54:00Z"), ahora)).toBe("hace 6 min");
    expect(haceCuanto(new Date("2026-09-28T12:00:00Z"), ahora)).toBe("hace 3 h");
    expect(haceCuanto(new Date("2026-09-27T14:00:00Z"), ahora)).toBe("ayer");
    expect(soles(1100)).toBe("S/ 1,100");
    expect(soles(50.5)).toBe("S/ 50.50");
  });
});
