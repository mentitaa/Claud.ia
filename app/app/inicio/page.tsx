import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { partesNoFuso } from "@/lib/agenda/fuso";
import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { nomeDoContato, type ContatoNomeavel } from "@/lib/contacts/rotulo-do-contato";
import { mencionaUrgencia } from "@/lib/escalacao/aviso-ao-lead";
import {
  desdeAnoche,
  fueraDeHorario,
  haceCuanto,
  leerPago,
  limitesDeHoy,
  motivoLegible,
  primerNombre,
  saludo,
  soles,
  tratamientoDelTitulo,
  type VentanaDeHorario,
} from "@/lib/inicio/resumo";
import { traduzir } from "@/lib/i18n/dicionario";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { fusoUtilizavel } from "@/lib/tempo/fusos";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Inicio" };

/**
 * Claud.ia — Início: o painel do dono da clínica.
 *
 * Três perguntas, na ordem em que o doutor as faz ao abrir o sistema:
 *   1. Quem vem hoje, e quem já pagou o adiantamento?
 *   2. Tem alguém esperando uma pessoa (urgência, pedido de falar com alguém)?
 *   3. O que a IA fez por mim nesta semana?
 *
 * Tudo é leitura com a sessão (RLS) e com `.eq("organization_id")` explícito,
 * como a Agenda faz: a RLS é piso entre inquilinos, não escolhe a org ativa.
 * Uma consulta que falha vira seção vazia e um aviso no log — o painel nunca
 * derruba a entrada no sistema.
 */

type ContatoDoEmbed = ContatoNomeavel | ContatoNomeavel[] | null;
function contato(c: ContatoDoEmbed): ContatoNomeavel | null {
  return Array.isArray(c) ? (c[0] ?? null) : c;
}

function hora12(instante: Date, fuso: string): { hora: string; sufijo: string } {
  const p = partesNoFuso(instante, fuso);
  const h = p.hora % 12 === 0 ? 12 : p.hora % 12;
  return { hora: `${h}:${String(p.minuto).padStart(2, "0")}`, sufijo: p.hora < 12 ? "a.m." : "p.m." };
}

function Chip({ tono, children }: { tono: "pagado" | "neutro" | "espera" | "prioridad"; children: React.ReactNode }) {
  const estilos = {
    pagado: "bg-accent-soft text-accent-800 dark:text-accent-200",
    neutro: "bg-surface-elevated text-text-muted border border-border",
    espera: "bg-warning-bg text-warning-fg",
    prioridad: "bg-error-bg text-error-fg",
  }[tono];
  return (
    <span className={`inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[13px] font-medium ${estilos}`}>
      {children}
    </span>
  );
}

function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

function TituloDeSeccion({ id, children, derecha }: { id: string; children: React.ReactNode; derecha?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-text pb-3">
      <h2 id={id} className="font-display text-[2rem] font-normal leading-none">
        {children}
      </h2>
      {derecha}
    </div>
  );
}

export default async function InicioPage() {
  const user = await requireAuth();
  const activeOrg = await resolveActiveOrg(user);
  if (!activeOrg) redirect("/app");

  const fuso = fusoUtilizavel(activeOrg.timezone);
  const org = activeOrg.orgId;
  const agora = new Date();
  const { desde: hoyDesde, hasta: hoyHasta } = limitesDeHoy(agora, fuso);
  const haceUnaSemana = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);
  const anoche = desdeAnoche(agora, fuso);
  const supabase = await createClient();
  // `t` local: componente de SERVIDOR, o idioma já vem resolvido em `user.idioma`.
  const idioma = user.idioma;
  const t = (texto: string) => traduzir(texto, idioma);

  const [citasHoy, esperando, mensajesIa, pagadasSemana, jornadas] = await Promise.all([
    supabase
      .from("calendar_appointments")
      .select("id, title, description, starts_at, status, contacts(name, display_name)")
      .eq("organization_id", org)
      .gte("starts_at", hoyDesde.toISOString())
      .lt("starts_at", hoyHasta.toISOString())
      .neq("status", "cancelled")
      .order("starts_at"),
    supabase
      .from("conversations")
      .select("id, last_message_preview, last_inbound_at, last_handoff_at, last_handoff_reason, contacts!inner(name, display_name, force_human)")
      .eq("organization_id", org)
      .eq("status", "open")
      .eq("contacts.force_human", true)
      .order("last_inbound_at", { ascending: false })
      .limit(6),
    supabase
      .from("messages")
      .select("conversation_id, created_at")
      .eq("organization_id", org)
      .eq("direction", "outbound")
      .eq("sent_via", "ai")
      .gte("created_at", haceUnaSemana.toISOString())
      .limit(5000),
    supabase
      .from("calendar_appointments")
      .select("title, description, created_at")
      .eq("organization_id", org)
      .ilike("title", "pagad%")
      .neq("status", "cancelled")
      .gte("created_at", haceUnaSemana.toISOString()),
    supabase.from("attendant_availability").select("schedule").eq("organization_id", org),
  ]);

  for (const [nome, r] of Object.entries({ citasHoy, esperando, mensajesIa, pagadasSemana, jornadas })) {
    if (r.error) logger.warn("[inicio] consulta falhou", { consulta: nome, erro: r.error.message });
  }

  // As palavras do cliente em cada conversa que espera uma pessoa.
  const idsEsperando = (esperando.data ?? []).map((c) => c.id as string);
  const ultimas = new Map<string, string>();
  if (idsEsperando.length > 0) {
    const { data } = await supabase
      .from("messages")
      .select("conversation_id, body, media_derived_text, created_at")
      .eq("organization_id", org)
      .eq("direction", "inbound")
      .in("conversation_id", idsEsperando)
      .order("created_at", { ascending: false })
      .limit(60);
    for (const m of data ?? []) {
      const id = m.conversation_id as string;
      const texto = ((m.body as string | null) || (m.media_derived_text as string | null) || "").trim();
      if (texto && !ultimas.has(id)) ultimas.set(id, texto);
    }
  }

  const janelas: VentanaDeHorario[] = (jornadas.data ?? []).flatMap((j) => {
    const w = (j.schedule as { windows?: VentanaDeHorario[] } | null)?.windows;
    return Array.isArray(w) ? w : [];
  });

  // ── Hoje ──────────────────────────────────────────────────────────────
  const citas = (citasHoy.data ?? []).map((c) => {
    const inicio = new Date(c.starts_at as string);
    const pago = leerPago(c.title as string | null, c.description as string | null);
    const nombre = nomeDoContato(contato(c.contacts as ContatoDoEmbed)) ?? t("Paciente");
    const status = c.status as string;
    const { hora, sufijo } = hora12(inicio, fuso);
    let chip: { tono: "pagado" | "neutro" | "espera"; texto: string };
    if (status === "completed") chip = { tono: "neutro", texto: t("Atendida") };
    else if (status === "no_show") chip = { tono: "espera", texto: t("Não veio") };
    else if (pago.pagado)
      chip = {
        tono: "pagado",
        texto: [t("Pago"), [pago.app, pago.monto != null ? soles(pago.monto) : null].filter(Boolean).join(" ")]
          .filter(Boolean)
          .join(" · "),
      };
    else if (status === "pending") chip = { tono: "espera", texto: t("Aguardando confirmação") };
    else chip = { tono: "neutro", texto: t("Marcada pela equipe") };
    return {
      id: c.id as string,
      inicio,
      hora,
      sufijo,
      nombre,
      tratamiento: tratamientoDelTitulo(c.title as string | null),
      chip,
      detalle: pago.operacion ? `Op. ${pago.operacion}` : null,
    };
  });
  const indiceAhora = citas.findIndex((c) => c.inicio.getTime() > agora.getTime());
  const ahora = hora12(agora, fuso);

  // ── Esperan a una persona ─────────────────────────────────────────────
  const personas = (esperando.data ?? []).map((c) => {
    const id = c.id as string;
    const nombre = nomeDoContato(contato(c.contacts as ContatoDoEmbed)) ?? t("Paciente");
    const cita = ultimas.get(id) ?? (c.last_message_preview as string | null) ?? "";
    const urgente = mencionaUrgencia(cita);
    const cuando = c.last_inbound_at ?? c.last_handoff_at;
    return {
      id,
      nombre,
      iniciales: nombre.split(/\s+/).slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join(""),
      cita,
      urgente,
      motivo: t(urgente ? "Descreve uma possível urgência" : motivoLegible(c.last_handoff_reason as string | null)),
      cuando: cuando ? haceCuanto(new Date(cuando as string), agora) : "",
    };
  });

  // ── La semana ─────────────────────────────────────────────────────────
  const msgs = mensajesIa.data ?? [];
  const conversacionesSemana = new Set(msgs.map((m) => m.conversation_id as string)).size;
  const fueraDeHora = new Set(
    msgs
      .filter((m) => fueraDeHorario(new Date(m.created_at as string), fuso, janelas))
      .map((m) => m.conversation_id as string),
  ).size;
  const pagadas = pagadasSemana.data ?? [];
  const adelantos = pagadas.reduce((acc, p) => acc + (leerPago(p.title as string, p.description as string).monto ?? 0), 0);
  const conversacionesAnoche = new Set(
    msgs.filter((m) => new Date(m.created_at as string) >= anoche).map((m) => m.conversation_id as string),
  ).size;
  const pagadasAnoche = pagadas.filter((p) => new Date(p.created_at as string) >= anoche).length;

  const p = partesNoFuso(agora, fuso);
  const fecha = new Intl.DateTimeFormat(idioma === "pt-BR" ? "pt-BR" : "es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: fuso,
  }).format(agora);
  const nombre = primerNombre(user.full_name);

  const cuantas = (n: number, uno: string, varios: string) => `${n} ${t(n === 1 ? uno : varios)}`;
  const bajada =
    conversacionesAnoche > 0
      ? `${t("Desde ontem à noite, a Claud.ia atendeu")} ${cuantas(conversacionesAnoche, "conversa", "conversas")}${
          pagadasAnoche > 0
            ? ` ${t("e deixou")} ${cuantas(pagadasAnoche, "consulta paga", "consultas pagas")} ${t("no seu calendário")}`
            : ""
        }.`
      : t("A Claud.ia está atendendo seu WhatsApp. Aqui você vê o que aconteceu enquanto estava fora.");
  const estadisticas: [string, string][] = [
    [t("Conversas atendidas"), String(conversacionesSemana)],
    [t("Consultas pagas no calendário"), String(pagadas.length)],
    [t("Adiantamentos recebidos"), soles(adelantos)],
    [t("Respondidas com a clínica fechada"), String(fueraDeHora)],
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-10 px-6 py-8 lg:px-12">
      <header className="flex items-end justify-between gap-8">
        <div className="flex min-w-0 flex-col gap-3 pb-2">
        <p className="text-sm text-text-muted first-letter:uppercase">{fecha}</p>
        <h1 className="text-[2.75rem] leading-none sm:text-[3.5rem]">
          {t(saludo(p.hora))}
          {nombre ? (
            <>
              , <em className="italic text-accent">{nombre}.</em>
            </>
          ) : (
            "."
          )}
        </h1>
        <p className="max-w-[680px] text-[17px] leading-relaxed text-text-muted">{bajada}</p>
        </div>
        {/* Claud.ia, el personaje: saluda desde un panel menta. Solo en pantallas
            anchas; en el celular el saludo va solo para no empujar las citas. */}
        <figure className="relative mr-2 hidden h-[250px] w-[240px] shrink-0 md:block" aria-hidden>
          <div className="absolute inset-x-0 bottom-0 h-[180px] rounded-[28px] bg-gradient-to-br from-accent-soft to-neutral-50 dark:from-accent-soft dark:to-surface-elevated" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/claudia/claudia-saludo.png"
            alt=""
            width={442}
            height={540}
            className="absolute bottom-0 left-1/2 h-[250px] w-auto -translate-x-1/2 select-none"
            draggable={false}
          />
          <figcaption className="absolute -bottom-7 left-0 flex items-center gap-1.5 text-[12.5px] text-text-muted">
            <span className="h-2 w-2 rounded-full bg-accent-500" />
            {t("A Claud.ia está atendendo")}
          </figcaption>
        </figure>
      </header>

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:gap-14">
        <section aria-labelledby="hoy" className="flex min-w-0 flex-col">
          <TituloDeSeccion
            id="hoy"
            derecha={
              <Link href="/app/agenda" className="text-sm font-medium text-accent hover:text-accent-hover">
                {t("Ver a semana →")}
              </Link>
            }
          >
            {t("Hoje")}{" "}
            <span className="font-sans text-[15px] text-text-muted">
              · {citas.length === 0 ? t("sem consultas") : cuantas(citas.length, "consulta", "consultas")}
            </span>
          </TituloDeSeccion>

          {citas.length === 0 ? (
            <p className="py-10 text-[15px] text-text-muted">
              {t(
                "Nenhuma consulta para hoje. Quando a Claud.ia receber um adiantamento, a consulta aparece aqui e no seu Google Calendar.",
              )}
            </p>
          ) : (
            <ol className="flex flex-col">
              {citas.map((c, i) => (
                <li key={c.id}>
                  {i === indiceAhora && (
                    <div className="flex items-center gap-2.5 pt-2" aria-label={`${t("Agora")}, ${ahora.hora} ${ahora.sufijo}`}>
                      <span className="h-2 w-2 rounded-full bg-accent-500" />
                      <span className="text-[12.5px] font-semibold text-accent">
                        {t("Agora")} · {ahora.hora} {ahora.sufijo}
                      </span>
                      <span className="h-px flex-1 bg-accent-500" />
                    </div>
                  )}
                  <div className="grid grid-cols-[88px_minmax(0,1fr)] items-center gap-x-5 gap-y-2 border-b border-border py-4 sm:grid-cols-[104px_minmax(0,1fr)_auto]">
                    <div className="font-display text-[2.1rem] leading-none">
                      {c.hora}
                      <span className="ml-1 font-sans text-xs text-text-muted">{c.sufijo}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-base font-semibold">{c.nombre}</div>
                      <div className="mt-0.5 truncate text-sm text-text-muted">
                        {t("Avaliação")}
                        {c.tratamiento ? ` · ${c.tratamiento}` : ""}
                      </div>
                    </div>
                    <div className="col-span-2 sm:col-span-1 sm:text-right">
                      <Chip tono={c.chip.tono}>
                        {c.chip.tono === "pagado" && <Check />}
                        {c.chip.texto}
                      </Chip>
                      {c.detalle && <div className="mt-1 text-[12.5px] text-text-muted">{c.detalle}</div>}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <div className="flex min-w-0 flex-col gap-10">
          <section aria-labelledby="esperan" className="flex flex-col">
            <TituloDeSeccion id="esperan" derecha={<span className="text-sm text-text-muted">{personas.length}</span>}>
              {t("Esperam uma pessoa")}
            </TituloDeSeccion>
            {personas.length === 0 ? (
              <p className="py-6 text-[15px] text-text-muted">
                {t("Ninguém esperando agora. A Claud.ia está atendendo tudo.")}
              </p>
            ) : (
              <ul className="flex flex-col">
                {personas.map((per) => (
                  <li key={per.id} className="flex items-start gap-3.5 border-b border-border py-4">
                    <div
                      className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ${
                        per.urgente ? "bg-error-bg text-error-fg" : "bg-accent-soft text-accent-800 dark:text-accent-200"
                      }`}
                      aria-hidden
                    >
                      {per.iniciales}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[15px] font-semibold">{per.nombre}</span>
                        <Chip tono={per.urgente ? "prioridad" : "espera"}>{t(per.urgente ? "Prioridade" : "Espera")}</Chip>
                      </div>
                      {per.cita && (
                        <p className="mt-1.5 line-clamp-2 text-sm leading-snug text-text">“{per.cita}”</p>
                      )}
                      <p className="mt-1.5 text-[12.5px] text-text-muted">
                        {[per.cuando, per.motivo].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <Link
                      href={`/app/inbox?id=${per.id}`}
                      className="inline-flex h-9 shrink-0 items-center self-center rounded-full border border-text px-4 text-[13.5px] font-medium text-text hover:bg-surface-elevated"
                    >
                      {t("Atender")}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="semana" className="flex flex-col">
            <TituloDeSeccion id="semana">
              {t("Esta semana,")} <em className="italic">{t("graças à Claud.ia")}</em>
            </TituloDeSeccion>
            <dl className="flex flex-col">
              {estadisticas.map(([etiqueta, valor]) => (
                <div key={etiqueta} className="flex items-baseline justify-between gap-4 border-b border-border py-3">
                  <dt className="text-[14.5px] text-text-muted">{etiqueta}</dt>
                  <dd className="font-display text-[1.9rem] leading-none">{valor}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-[12.5px] text-text-muted">{t("Últimos 7 dias.")}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
