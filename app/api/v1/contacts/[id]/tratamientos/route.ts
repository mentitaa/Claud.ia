/**
 * Claud.ia — los tratamientos de un contacto.
 * GET  — la lista (más nuevo primero).
 * POST — crea uno (nombre, n.º de sesiones, precio, pagado…).
 *
 * Con la sesión del usuario (RLS de `contact_treatments`): solo ve y escribe la
 * gente de la organización, y escribir pide `agent` o más.
 */
import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";
import { COLUMNAS, crearTratamientoSchema } from "@/lib/tratamientos/tratamiento";

export const dynamic = "force-dynamic";

const TABLA = "contact_treatments" as never;

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const requestId = randomUUID();
  const auth = await requireRole("viewer", { requestId, resource: "contacts" });
  if (!auth.ok) return auth.response;
  const { id: contactId } = await ctx.params;

  const db = await createClient();
  const { data, error } = await db
    .from(TABLA)
    .select(COLUMNAS)
    .eq("organization_id" as never, auth.org.orgId)
    .eq("contact_id" as never, contactId)
    .order("created_at" as never, { ascending: false });
  if (error) return fail("internal_error", "No se pudieron leer los tratamientos.", 500, { requestId });
  return ok(data ?? [], { requestId });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const requestId = randomUUID();
  const auth = await requireRole("agent", { requestId, resource: "contacts" });
  if (!auth.ok) return auth.response;
  const { id: contactId } = await ctx.params;

  const parsed = crearTratamientoSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("validation_failed", "Revisa los datos del tratamiento.", 422, { requestId });

  const db = await createClient();
  // El contacto tiene que ser de esta organización (el id viene de la URL).
  const { data: contacto } = await db
    .from("contacts")
    .select("id")
    .eq("id", contactId)
    .eq("organization_id", auth.org.orgId)
    .maybeSingle();
  if (!contacto) return fail("not_found", "Contacto no encontrado.", 404, { requestId });

  const { data, error } = await db
    .from(TABLA)
    .insert({
      ...parsed.data,
      organization_id: auth.org.orgId,
      contact_id: contactId,
      created_by: auth.user.id,
      sesiones: [],
      // El pago inicial (si hubo) queda como el primer pago de la lista.
      pagos: parsed.data.pagado > 0 ? [{ monto: parsed.data.pagado, fecha: new Date().toISOString(), nota: "Pago inicial" }] : [],
    } as never)
    .select(COLUMNAS)
    .single();
  if (error) return fail("internal_error", "No se pudo guardar el tratamiento.", 500, { requestId });
  return ok(data, { status: 201, requestId });
}
