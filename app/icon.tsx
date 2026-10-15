import { ImageResponse } from "next/og";

import {
  CREMA_CLAUDIA,
  CUADROS_DEL_ICONO,
  ICONO_ALTO,
  ICONO_ANCHO,
  VERDE_CLAUDIA,
} from "@/lib/branding/icono-claudia";

/**
 * Claud.ia — el ícono de la pestaña (y el globito de las notificaciones, que
 * `public/notify-sw.js` pide en `/icon`): el "{c}" crema sobre el verde de la
 * marca. Es el mismo dibujo que los PNG de `public/claudia/icono-*.png`.
 *
 * Antes se pintaba con la inicial del nombre (salía una "C" genérica). Claud.ia
 * es un producto propio, con un ícono propio: ya no depende de lo que diga el
 * nombre configurado.
 *
 * ⚠️ `/icon` tiene que seguir en `PUBLIC_PATHS` (`lib/auth/public-paths.ts`):
 * sin extensión, el proxy lo mandaría al login a quien todavía no entró.
 */

export const dynamic = "force-dynamic";

/** 64 y no 32: la pestaña pide 16-32 px CSS, y en pantalla retina son 32-64 reales. */
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/** 4 px por cuadro: 52 × 28, centrado, con el mismo respiro a los lados. */
const CUADRO = 4;

export default async function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: VERDE_CLAUDIA,
        }}
      >
        <svg
          viewBox={`0 0 ${ICONO_ANCHO} ${ICONO_ALTO}`}
          width={ICONO_ANCHO * CUADRO}
          height={ICONO_ALTO * CUADRO}
          shapeRendering="crispEdges"
        >
          {CUADROS_DEL_ICONO.map(({ x, y }) => (
            <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={CREMA_CLAUDIA} />
          ))}
        </svg>
      </div>
    ),
    { ...size, headers: CACHE },
  );
}

const CACHE = { "cache-control": "public, max-age=3600, stale-while-revalidate=86400" };
