"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNotificationPermission } from "@/hooks/notifications/useNotificationPermission";
import { gravarCanal } from "@/lib/notifications/prefs";
import { syncPushSubscription, type ResultadoDaInscricao } from "@/lib/notifications/push_client";

/**
 * Claud.ia — "Avisos en este teléfono": UN botón, en vez de una tabla de
 * interruptores. Es lo que el doctor y la secretaria tienen que tocar en su
 * propio celular para que lleguen los avisos de llegada (y al Apple Watch).
 *
 * Dice en palabras simples qué falta en cada caso: abrir desde el ícono (el
 * iPhone solo permite avisos así), permiso bloqueado, o todo listo — con un
 * botón para mandarse un aviso de prueba.
 */

function esIphoneFueraDeLaApp(): boolean {
  if (typeof navigator === "undefined" || typeof window === "undefined") return false;
  const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const nav = navigator as Navigator & { standalone?: boolean };
  const instalada = nav.standalone === true || window.matchMedia?.("(display-mode: standalone)").matches;
  return ios && !instalada;
}

/** Claud.ia es solo en español: los textos van directo, sin pasar por el diccionario pt→es. */
const TEXTOS = {
  titulo: "Avisos en este teléfono",
  explicacion:
    "Claud.ia te avisa cuando un cliente llegó a su cita, está llegando o pide cómo llegar. Cada persona lo activa en su propio celular.",
  fueraDeLaApp:
    "En el iPhone los avisos solo funcionan con Claud.ia agregada a la pantalla de inicio. En Safari toca Compartir → «Agregar a pantalla de inicio», y después abre Claud.ia desde ese ícono.",
  bloqueados:
    "Los avisos están bloqueados. En el iPhone: Ajustes → Notificaciones → Claud.ia → Permitir notificaciones. Luego vuelve aquí.",
  activados: "✓ Activados en este teléfono",
  activar: "Activar avisos",
  probar: "Enviar aviso de prueba",
};

const MENSAJE_DE_RESULTADO: Record<ResultadoDaInscricao, string> = {
  ok: "Listo: este teléfono ya recibe los avisos.",
  sin_permiso: "Falta el permiso. Toca el botón otra vez y elige «Permitir».",
  sin_soporte: "Este navegador no puede recibir avisos.",
  sin_servidor: "Los avisos no están configurados en el servidor. Avísale a Mentita Studio.",
  error: "No se pudo activar. Cierra la app, ábrela otra vez desde el ícono y vuelve a intentar.",
};

export function ActivarAvisosEnEsteTelefono() {
  const { permission, request } = useNotificationPermission();
  const [fueraDeLaApp, setFueraDeLaApp] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [activo, setActivo] = useState(false);

  useEffect(() => {
    setFueraDeLaApp(esIphoneFueraDeLaApp());
    // Si ya estaba activado en este teléfono, revisa la inscripción en silencio.
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      void syncPushSubscription().then((r) => setActivo(r === "ok"));
    }
  }, []);

  async function activar() {
    setOcupado(true);
    setMensaje(null);
    try {
      let permiso = permission;
      if (permiso !== "granted") permiso = await request();
      if (permiso !== "granted") {
        setMensaje(
          permiso === "denied"
            ? "Bloqueaste los avisos. En el iPhone: Ajustes → Notificaciones → Claud.ia → Permitir notificaciones."
            : MENSAJE_DE_RESULTADO.sin_permiso,
        );
        return;
      }
      gravarCanal("message", "push", true);
      const r = await syncPushSubscription();
      setActivo(r === "ok");
      setMensaje(MENSAJE_DE_RESULTADO[r]);
    } finally {
      setOcupado(false);
    }
  }

  async function probar() {
    setOcupado(true);
    setMensaje(null);
    try {
      const resp = await fetch("/api/v1/notifications/push", { method: "POST" });
      const json = await resp.json().catch(() => null);
      const enviados = (json?.data?.enviados as number | undefined) ?? 0;
      setMensaje(
        enviados > 0
          ? "Aviso de prueba enviado. Debe llegarte en unos segundos (también al reloj, si lo tienes)."
          : "No hay ningún teléfono activado en tu cuenta todavía. Toca «Activar avisos» primero.",
      );
    } catch {
      setMensaje(MENSAJE_DE_RESULTADO.error);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Card data-testid="avisos-en-este-telefono" className="space-y-3 p-4 text-sm">
      <div>
        <h2 className="text-base font-semibold">{TEXTOS.titulo}</h2>
        <p className="text-muted-foreground">{TEXTOS.explicacion}</p>
      </div>

      {fueraDeLaApp ? (
        <p className="rounded-md bg-amber-50 p-3 text-amber-900 dark:bg-amber-900/20 dark:text-amber-200">
          {TEXTOS.fueraDeLaApp}
        </p>
      ) : permission === "denied" ? (
        <p className="rounded-md bg-amber-50 p-3 text-amber-900 dark:bg-amber-900/20 dark:text-amber-200">
          {TEXTOS.bloqueados}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {!activo && (
            <Button onClick={() => void activar()} disabled={ocupado} data-testid="activar-avisos">
              {TEXTOS.activar}
            </Button>
          )}
          {activo && <span className="self-center font-medium text-emerald-700">{TEXTOS.activados}</span>}
          <Button variant="outline" onClick={() => void probar()} disabled={ocupado} data-testid="probar-avisos">
            {TEXTOS.probar}
          </Button>
        </div>
      )}

      {mensaje && <p data-testid="avisos-mensaje">{mensaje}</p>}
    </Card>
  );
}
