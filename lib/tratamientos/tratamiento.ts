/**
 * Claud.ia — el tratamiento de un cliente: qué contrató, cuánto pagó y sus
 * sesiones (fecha, si ya se hizo y qué se le hizo).
 *
 * Tabla `contact_treatments` (SQL en el parche 18). Las sesiones viven en un
 * jsonb de la misma fila: se editan juntas, en una sola pantalla, y nunca se
 * consultan sueltas. Cada sesión con fecha se guarda TAMBIÉN como cita en la
 * Agenda (`appointment_id`): así aparece en el calendario y el recordatorio por
 * WhatsApp que ya existe le llega solo al cliente.
 */
import { z } from "zod";

export const sesionSchema = z.object({
  numero: z.number().int().min(1).max(50),
  /** ISO con zona, o null si todavía no tiene fecha. */
  fecha: z.string().datetime({ offset: true }).nullable(),
  hecha: z.boolean(),
  nota: z.string().max(500).default(""),
  appointment_id: z.string().uuid().nullable().default(null),
});
export type Sesion = z.infer<typeof sesionSchema>;

const camposBase = {
  nombre: z.string().trim().min(1).max(120),
  sesiones_total: z.number().int().min(1).max(50),
  precio_total: z.number().min(0).max(1_000_000).nullable(),
  pagado: z.number().min(0).max(1_000_000),
  notas: z.string().max(2000).nullable(),
  event_type_id: z.string().uuid().nullable(),
  estado: z.enum(["en_curso", "terminado", "cancelado"]),
};

export const crearTratamientoSchema = z.object({
  ...camposBase,
  precio_total: camposBase.precio_total.default(null),
  pagado: camposBase.pagado.default(0),
  notas: camposBase.notas.default(null),
  event_type_id: camposBase.event_type_id.default(null),
  estado: camposBase.estado.default("en_curso"),
});

export const editarTratamientoSchema = z
  .object({ ...camposBase, sesiones: z.array(sesionSchema).max(50) })
  .partial();

export type Tratamiento = {
  id: string;
  contact_id: string;
  nombre: string;
  sesiones_total: number;
  precio_total: number | null;
  pagado: number;
  notas: string | null;
  sesiones: Sesion[];
  estado: "en_curso" | "terminado" | "cancelado";
  event_type_id: string | null;
  created_at: string;
  updated_at: string;
};

export const COLUMNAS =
  "id, contact_id, nombre, sesiones_total, precio_total, pagado, notas, sesiones, estado, event_type_id, created_at, updated_at";

/** Las sesiones completas 1..total, conservando lo que ya estaba anotado. */
export function sesionesCompletas(total: number, sesiones: readonly Sesion[]): Sesion[] {
  const porNumero = new Map(sesiones.map((s) => [s.numero, s]));
  return Array.from({ length: total }, (_, i) => {
    const n = i + 1;
    return porNumero.get(n) ?? { numero: n, fecha: null, hecha: false, nota: "", appointment_id: null };
  });
}

/** "2 de 3 hechas", la próxima sesión con fecha y lo que falta pagar. */
export function resumenDelTratamiento(t: Pick<Tratamiento, "sesiones_total" | "sesiones" | "precio_total" | "pagado">, ahora = new Date()) {
  const sesiones = sesionesCompletas(t.sesiones_total, t.sesiones);
  const hechas = sesiones.filter((s) => s.hecha).length;
  const proxima =
    sesiones
      .filter((s) => !s.hecha && s.fecha && new Date(s.fecha).getTime() >= ahora.getTime() - 3600_000)
      .sort((a, b) => new Date(a.fecha!).getTime() - new Date(b.fecha!).getTime())[0] ?? null;
  const falta = t.precio_total == null ? null : Math.max(0, Number(t.precio_total) - Number(t.pagado));
  return { hechas, total: t.sesiones_total, proxima, falta };
}

/** Soles con dos decimales: "S/ 1,250.00". */
export function soles(n: number | null | undefined): string {
  if (n == null) return "—";
  return `S/ ${Number(n).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
