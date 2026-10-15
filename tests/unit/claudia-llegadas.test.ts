import { describe, expect, it } from "vitest";

import { detectarLlegada, textoDelAvisoDeLlegada } from "@/lib/notifications/llegada";

describe("Claud.ia · avisos de llegada — qué mensajes cuentan", () => {
  it.each([
    "Ya llegué",
    "ya llegue doctora",
    "Hola, ya estoy aquí afuera",
    "estoy en recepción",
    "Ya estamos en la puerta",
    "Acabo de llegar al consultorio",
    "me pueden abrir porfa",
    "ya estoy en la clínica",
  ])("llegó: %s", (t) => expect(detectarLlegada(t)).toBe("llego"));

  it.each([
    "Estoy llegando",
    "voy en camino 🚗",
    "Llego en 10 minutos",
    "llego en cinco",
    "ya estoy cerca",
    "estoy a 2 cuadras",
    "Disculpe, voy a llegar un poco tarde",
    "ya salí de mi casa",
    "estoy por llegar",
  ])("está llegando: %s", (t) => expect(detectarLlegada(t)).toBe("llegando"));

  it.each([
    "¿Cómo llego?",
    "¿Dónde queda exactamente?",
    "me pasas la dirección por favor",
    "No encuentro el local",
    "¿En qué piso es?",
    "por dónde entro?",
    "¿Cuál es la dirección?",
  ])("pide indicaciones: %s", (t) => expect(detectarLlegada(t)).toBe("indicaciones"));

  it.each([
    "Hola, ¿cuánto cuesta la limpieza?",
    "Cuando llegue te aviso",
    "si llegué a pagar el adelanto?",
    "quiero sacar una cita para el jueves",
    "gracias, nos vemos",
    "",
    "Ok perfecto",
  ])("no es llegada: %s", (t) => expect(detectarLlegada(t)).toBeNull());
});

describe("Claud.ia · avisos de llegada — el texto del aviso", () => {
  it("con cita de hoy", () => {
    expect(textoDelAvisoDeLlegada({ tipo: "llego", nombre: "Ana Torres", hora: "10:00 a. m.", mensaje: "ya llegué" })).toEqual({
      title: "Ana Torres llegó a su cita",
      body: "Cita de las 10:00 a. m. · «ya llegué»",
    });
  });
  it("sin nombre ni cita", () => {
    expect(textoDelAvisoDeLlegada({ tipo: "llegando", nombre: null, hora: null, mensaje: "voy en camino" })).toEqual({
      title: "Un cliente está llegando",
      body: "«voy en camino»",
    });
  });
});
