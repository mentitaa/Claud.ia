/**
 * Claud.ia — feriados nacionales del Perú 2026-2030.
 *
 * Los usa el plazo de las solicitudes de datos personales (Ley 29733) para no
 * contar días no hábiles. Mismo formato que `holidays-br.ts` (`YYYY-MM-DD`).
 *
 * Fijos (16 al año, lista oficial 2026): Año Nuevo, Día del Trabajo, Batalla de
 * Arica y Día de la Bandera, San Pedro y San Pablo, Día de la Fuerza Aérea,
 * Fiestas Patrias (2), Batalla de Junín, Santa Rosa de Lima, Combate de Angamos,
 * Todos los Santos, Inmaculada Concepción, Batalla de Ayacucho y Navidad.
 * Móviles: Jueves y Viernes Santo, escritos a mano por año.
 *
 * Los "días no laborables" que decreta el Gobierno cada año NO entran: son
 * para el sector público y no cambian el plazo legal. Si el Congreso mueve un
 * feriado a lunes, hay que actualizar esta lista.
 */
const YEARS = [2026, 2027, 2028, 2029, 2030];
const FIJOS = [
  "01-01", // Año Nuevo
  "05-01", // Día del Trabajo
  "06-07", // Batalla de Arica y Día de la Bandera
  "06-29", // San Pedro y San Pablo
  "07-23", // Día de la Fuerza Aérea del Perú
  "07-28", // Fiestas Patrias
  "07-29", // Fiestas Patrias
  "08-06", // Batalla de Junín
  "08-30", // Santa Rosa de Lima
  "10-08", // Combate de Angamos
  "11-01", // Todos los Santos
  "12-08", // Inmaculada Concepción
  "12-09", // Batalla de Ayacucho
  "12-25", // Navidad
];

/** Jueves y Viernes Santo (Pascua 2026: 5 abr; 2027: 28 mar; 2028: 16 abr; 2029: 1 abr; 2030: 21 abr). */
const SEMANA_SANTA = [
  "2026-04-02", "2026-04-03",
  "2027-03-25", "2027-03-26",
  "2028-04-13", "2028-04-14",
  "2029-03-29", "2029-03-30",
  "2030-04-18", "2030-04-19",
];

export const FERIADOS_PE_ISO: readonly string[] = [
  ...YEARS.flatMap((y) => FIJOS.map((md) => `${y}-${md}`)),
  ...SEMANA_SANTA,
].sort();
