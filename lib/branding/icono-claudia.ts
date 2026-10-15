/**
 * Claud.ia — el ícono "{c}": las llaves y la "c" del logotipo, en la misma
 * rejilla de píxeles (13 × 7 cuadros). Es el ícono de la app en el iPhone, la
 * pestaña del navegador y el globito de las notificaciones.
 *
 * Los PNG de `public/claudia/icono-*.png` y `public/apple-touch-icon.png` son
 * este mismo dibujo, generado una vez: el iPhone pide el ícono sin sesión y un
 * archivo con extensión pasa directo, sin tocar el login.
 */

export const VERDE_CLAUDIA = "#2E7048";
export const CREMA_CLAUDIA = "#F5F4EF";

/** "X" = cuadro lleno. Fila por fila, de arriba hacia abajo. */
export const MAPA_DEL_ICONO = [
  ".XX.......XX.",
  ".X.........X.",
  ".X...XXX...X.",
  "X...X...X...X",
  ".X..X......X.",
  ".X..X...X..X.",
  ".XX..XXX..XX.",
] as const;

export const ICONO_ANCHO = 13;
export const ICONO_ALTO = 7;

/** Los cuadros llenos, listos para dibujar como `<rect>` (1 × 1 cada uno). */
export const CUADROS_DEL_ICONO: readonly { x: number; y: number }[] = MAPA_DEL_ICONO.flatMap((fila, y) =>
  [...fila].flatMap((c, x) => (c === "X" ? [{ x, y }] : [])),
);
