import { describe, expect, it } from "vitest";

import {
  crearTratamientoSchema,
  editarTratamientoSchema,
  resumenDelTratamiento,
  sesionesCompletas,
  soles,
} from "@/lib/tratamientos/tratamiento";

describe("Claud.ia · tratamiento con sesiones", () => {
  it("arma las sesiones 1..N y conserva lo ya anotado", () => {
    const s = sesionesCompletas(3, [
      { numero: 2, fecha: "2026-10-20T15:00:00.000Z", hecha: false, nota: "", appointment_id: null },
    ]);
    expect(s.map((x) => x.numero)).toEqual([1, 2, 3]);
    expect(s[1]!.fecha).toBe("2026-10-20T15:00:00.000Z");
    expect(s[0]!.fecha).toBeNull();
  });

  it("resume: hechas, próxima con fecha y lo que falta pagar", () => {
    const ahora = new Date("2026-10-13T12:00:00Z");
    const r = resumenDelTratamiento(
      {
        sesiones_total: 3,
        precio_total: 600,
        pagado: 200,
        sesiones: [
          { numero: 1, fecha: "2026-10-06T15:00:00Z", hecha: true, nota: "1ra aplicación", appointment_id: null },
          { numero: 2, fecha: "2026-10-27T15:00:00Z", hecha: false, nota: "", appointment_id: null },
          { numero: 3, fecha: "2026-10-20T15:00:00Z", hecha: false, nota: "", appointment_id: null },
        ],
      },
      ahora,
    );
    expect(r.hechas).toBe(1);
    expect(r.proxima?.numero).toBe(3);
    expect(r.falta).toBe(400);
  });

  it("valida lo que llega a la API", () => {
    expect(crearTratamientoSchema.safeParse({ nombre: "Enzimas", sesiones_total: 3 }).success).toBe(true);
    expect(crearTratamientoSchema.safeParse({ nombre: "", sesiones_total: 3 }).success).toBe(false);
    expect(crearTratamientoSchema.safeParse({ nombre: "X", sesiones_total: 0 }).success).toBe(false);
    expect(editarTratamientoSchema.safeParse({ pagado: 100 }).success).toBe(true);
    expect(
      editarTratamientoSchema.safeParse({ sesiones: [{ numero: 1, fecha: "mañana", hecha: false }] }).success,
    ).toBe(false);
  });

  it("muestra soles", () => {
    expect(soles(1250)).toBe("S/ 1,250.00");
    expect(soles(null)).toBe("—");
  });
});

describe("Claud.ia · pagos del tratamiento", () => {
  it("suma los pagos con dos decimales", async () => {
    const { sumaDePagos } = await import("@/lib/tratamientos/tratamiento");
    expect(
      sumaDePagos([
        { monto: 200.1, fecha: "2026-10-14T15:00:00Z", nota: "" },
        { monto: 99.95, fecha: "2026-10-15T15:00:00Z", nota: "Yape" },
      ]),
    ).toBe(300.05);
  });

  it("la API acepta la lista de pagos y rechaza montos en cero", async () => {
    const { editarTratamientoSchema } = await import("@/lib/tratamientos/tratamiento");
    expect(editarTratamientoSchema.safeParse({ pagos: [{ monto: 50, fecha: "2026-10-14T15:00:00Z" }] }).success).toBe(true);
    expect(editarTratamientoSchema.safeParse({ pagos: [{ monto: 0, fecha: "2026-10-14T15:00:00Z" }] }).success).toBe(false);
  });
});
