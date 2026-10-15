"use client";
import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRealtimeChannel } from "@/hooks/realtime/useRealtimeChannel";
import type { AlertKind } from "@/app/api/v1/admin/dashboard/kpis/route";

const KIND_LABELS: Record<AlertKind, string> = {
  // Claud.ia: solo español (estos avisos los ve la administradora de la plataforma).
  waha_ban: "WhatsApp en riesgo",
  lgpd_at_risk: "plazo de datos personales",
  ai_budget: "presupuesto de IA",
  tenant_pending_overflow: "exceso de conversaciones",
};

interface AlertBroadcast {
  kind?: AlertKind;
  message?: string;
}

export function useAlertsRealtime() {
  const qc = useQueryClient();

  const onChange = useCallback(
    (payload: unknown) => {
      const data = (payload as { payload?: AlertBroadcast } | null)?.payload;
      const kind = data?.kind;
      const label = kind ? (KIND_LABELS[kind] ?? kind) : "aviso";
      toast.warning(`Nuevo aviso: ${label}`, { description: data?.message });
      qc.invalidateQueries({ queryKey: ["admin", "dashboard", "kpis"] });
    },
    [qc],
  );

  // Pelo hook compartilhado, e não por `.channel()` cru: o cookie de sessão é
  // httpOnly, então o supabase-js do browser não enxerga a sessão e assina como
  // ANÔNIMO — canal que recebe "ok", loga "subscribed" e nunca entrega evento.
  // A correção (24b9ec2) mora em `useRealtimeChannel`, que chama `setAuth` antes
  // do `subscribe`; quem abre canal direto ficou de fora dela.
  useRealtimeChannel({ name: "alerts-platform", broadcast: { event: "*" }, onChange });
}
