"use client";

import { estiloDoChip } from "@/lib/tags/cor-da-etiqueta";
import { ESTADOS_DEL_CLIENTE, conEstado, estadoActual } from "@/lib/tags/estados-del-cliente";
import { useUpdateConversationTags } from "@/hooks/inbox/useConversationTags";
import { cn } from "@/lib/utils";

/**
 * Claud.ia — "¿En qué está este cliente?": cuatro etiquetas fijas para tocar,
 * sin escribir nada. Se marca UNA a la vez (un cliente está en un solo punto);
 * tocar la marcada la quita. Se guardan como etiquetas de la conversación, así
 * que también salen en la lista del Inbox y sirven para filtrar.
 */
export function EstadoDelCliente({
  conversationId,
  tags,
  disabled = false,
}: {
  conversationId: string;
  tags: string[];
  disabled?: boolean;
}) {
  const mutation = useUpdateConversationTags();
  const actual = estadoActual(tags);

  return (
    <section data-testid="estado-del-cliente">
      <h3 className="text-xs font-semibold text-text">{TITULO}</h3>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {ESTADOS_DEL_CLIENTE.map((e) => {
          const marcado = actual === e.tag;
          return (
            <button
              key={e.tag}
              type="button"
              aria-pressed={marcado}
              disabled={disabled || mutation.isPending}
              onClick={() =>
                mutation.mutate({ conversation_id: conversationId, tags: conEstado(tags, marcado ? null : e.tag) })
              }
              style={marcado ? estiloDoChip(e.cor) : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors disabled:opacity-50",
                marcado ? "font-medium" : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {!marcado && (
                <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: e.cor }} />
              )}
              {e.rotulo}
            </button>
          );
        })}
      </div>
    </section>
  );
}

const TITULO = "Estado del cliente";
