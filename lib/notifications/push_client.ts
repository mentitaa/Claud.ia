import { areAlertsEnabled, getPermission } from "./permission";
import { ensureNotifyServiceWorker } from "./service_worker";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/**
 * Claud.ia: o resultado, para a tela dizer o que aconteceu em vez de calar.
 * `ok` = este aparelho ficou inscrito e o servidor guardou.
 */
export type ResultadoDaInscricao = "ok" | "sin_permiso" | "sin_soporte" | "sin_servidor" | "error";

/** Liga a inscrição Web Push depois da permissão. Sem VAPID no servidor, no-op. */
export async function syncPushSubscription(): Promise<ResultadoDaInscricao> {
  if (typeof window === "undefined") return "sin_soporte";
  if (getPermission() !== "granted" || !areAlertsEnabled()) return "sin_permiso";
  const reg = await ensureNotifyServiceWorker();
  if (!reg?.pushManager) return "sin_soporte";
  // O iPhone só aceita `subscribe` com o service worker ATIVO.
  await Promise.race([
    navigator.serviceWorker.ready.catch(() => null),
    new Promise((r) => setTimeout(r, 5000)),
  ]);

  const cfg = await fetch("/api/v1/notifications/push").then((r) => r.json()).catch(() => null);
  const publicKey = cfg?.data?.public_key as string | undefined;
  if (!cfg?.data?.enabled || !publicKey) return "sin_servidor";

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });
  }

  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return "error";

  const resp = await fetch("/api/v1/notifications/push", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    }),
  }).catch(() => null);
  return resp?.ok ? "ok" : "error";
}
