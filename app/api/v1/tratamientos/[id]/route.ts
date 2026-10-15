/**
 * Claud.ia — editar o borrar un tratamiento.
 * PATCH  — cualquier campo, incluidas las sesiones (lista completa).
 * DELETE — lo borra (las citas de la agenda NO se tocan: se cancelan allá).
 */
import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";
import { COLUMNAS, editarTratamientoSchema } from "@/lib/tratamientos/tratamiento";

export const dynamic = "force-dynamic";

const TABLA = "contact_treatments" as never;

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const requestId = randomUUID();
  const auth = await requireRole("agent", { requestId, resource: "contacts" });
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;

  const parsed = editarTratamientoSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("validation_failed", "Revisa los datos del tratamiento.", 422, { requestId });

  const db = await createClient();
  const { data, error } = await db
    .from(TABLA)
    .update({ ...parsed.data, updated_at: new Date().toISOString() } as never)
    .eq("id" as never, id)
    .eq("organization_id" as never, auth.org.orgId)
    .select(COLUMNAS)
    .maybeSingle();
  if (error) return fail("internal_error", "No se pudo guardar el tratamiento.", 500, { requestId });
  if (!data) return fail("not_found", "Tratamiento no encontrado.", 404, { requestId });
  return ok(data, { requestId });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const requestId = randomUUID();
  const auth = await requireRole("agent", { requestId, resource: "contacts" });
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;

  const db = await createClient();
  const { error } = await db
    .from(TABLA)
    .delete()
    .eq("id" as never, id)
    .eq("organization_id" as never, auth.org.orgId);
  if (error) return fail("internal_error", "No se pudo borrar el tratamiento.", 500, { requestId });
  return ok({ ok: true }, { requestId });
}
