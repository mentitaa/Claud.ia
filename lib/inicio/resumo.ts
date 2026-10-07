/**
 * Claud.ia — as peças puras do Início (o painel do dono da clínica).
 *
 * Tudo aqui é função pura, sem banco nem relógio implícito, para o teste
 * cobrir a regra sem montar a página: ler o pagamento que o agente grava no
 * compromisso, saber se um instante cai fora do horário da clínica, cumprimentar
 * na hora certa.
 *
 * O pagamento NÃO tem coluna própria. O agente, ao receber o comprovante, marca
 * o compromisso com `title` "PAGADO · Nome · Tratamento" e `description`
 * "Adelanto S/ 50 por Yape · Op. 0048213 · …" (instruções do agente, bloco
 * "CÓMO AGENDAR Y COBRAR EL ADELANTO"). É o mesmo texto que o dono vê no Google
 * Calendar, então a leitura aqui é tolerante: o que não reconhece, não inventa.
 */
import { diaDaSemanaLocal, instanteDe, partesNoFuso } from "@/lib/agenda/fuso";

export interface PagamentoLido {
  pagado: boolean;
  /** Yape, Plin, Transferencia… como veio escrito, com a inicial maiúscula. */
  app: string | null;
  /** Em soles. */
  monto: number | null;
  operacion: string | null;
}

const MARCA_PAGADO = /^\s*pagad[oa]\b/i;
const MONTO = /S\/\s*([0-9]+(?:[.,][0-9]{1,2})?)/i;
const APP = /\b(yape|plin|dale|transferencia|tarjeta|efectivo|bcp|interbank|bbva|scotiabank)\b/i;
const OPERACION = /\bop(?:eraci[oó]n)?\.?\s*(?:n\.?[º°o]\.?\s*)?[:#]?\s*([A-Za-z0-9-]{4,})/i;

export function leerPago(
  title: string | null | undefined,
  description: string | null | undefined,
): PagamentoLido {
  const t = title ?? "";
  const d = description ?? "";
  const pagado = MARCA_PAGADO.test(t);
  const texto = `${d} ${t}`;
  const m = MONTO.exec(texto);
  const a = APP.exec(texto);
  const o = OPERACION.exec(d);
  const app = a?.[1];
  const monto = m?.[1];
  return {
    pagado,
    app: app ? app.charAt(0).toUpperCase() + app.slice(1).toLowerCase() : null,
    monto: monto ? Number(monto.replace(",", ".")) : null,
    operacion: o?.[1] ?? null,
  };
}

/**
 * O tratamento, tirado do título. "PAGADO · Ana Torres · Endolifting de papada"
 * → "Endolifting de papada". Título sem o formato do agente volta inteiro.
 */
export function tratamientoDelTitulo(title: string | null | undefined): string | null {
  const t = (title ?? "").trim();
  if (!t) return null;
  const partes = t.split(/\s*[·•|]\s*/).filter(Boolean);
  const primera = partes[0] ?? "";
  if (partes.length >= 3 && MARCA_PAGADO.test(primera)) return partes.slice(2).join(" · ");
  if (partes.length === 2 && MARCA_PAGADO.test(primera)) return null;
  return t;
}

/** Chave do dicionário (português → espanhol via `t()`), como o resto da interface. */
export function saludo(hora: number): string {
  // De madrugada ainda é noite: 1 da manhã não é "bom dia".
  if (hora < 5) return "Boa noite";
  if (hora < 12) return "Bom dia";
  if (hora < 19) return "Boa tarde";
  return "Boa noite";
}

export function primerNombre(nombre: string | null | undefined): string | null {
  const n = (nombre ?? "").trim().split(/\s+/)[0];
  return n ? n : null;
}

export interface VentanaDeHorario {
  dow: number;
  start: string;
  end: string;
}

/** Horário da clínica quando ninguém configurou jornada: seg–sáb, 9h–19h. */
export const HORARIO_PADRAO: VentanaDeHorario[] = [1, 2, 3, 4, 5, 6].map((dow) => ({
  dow,
  start: "09:00",
  end: "19:00",
}));

function minutos(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** O instante cai FORA de todas as janelas de atendimento da clínica? */
export function fueraDeHorario(
  instante: Date,
  fuso: string,
  janelas: readonly VentanaDeHorario[],
): boolean {
  const lista = janelas.length > 0 ? janelas : HORARIO_PADRAO;
  const dow = diaDaSemanaLocal(instante, fuso);
  const p = partesNoFuso(instante, fuso);
  const agora = p.hora * 60 + p.minuto;
  return !lista.some((j) => j.dow === dow && agora >= minutos(j.start) && agora < minutos(j.end));
}

/** Meia-noite de hoje e de amanhã, no fuso da clínica. */
export function limitesDeHoy(agora: Date, fuso: string): { desde: Date; hasta: Date } {
  const p = partesNoFuso(agora, fuso);
  const desde = instanteDe({ ano: p.ano, mes: p.mes, dia: p.dia, hora: 0 }, fuso);
  const amanha = new Date(Date.UTC(p.ano, p.mes - 1, p.dia + 1));
  const hasta = instanteDe(
    { ano: amanha.getUTCFullYear(), mes: amanha.getUTCMonth() + 1, dia: amanha.getUTCDate(), hora: 0 },
    fuso,
  );
  return { desde, hasta };
}

/** "Desde anoche": as 19h de ontem no fuso da clínica. */
export function desdeAnoche(agora: Date, fuso: string): Date {
  const p = partesNoFuso(agora, fuso);
  const ontem = new Date(Date.UTC(p.ano, p.mes - 1, p.dia - 1));
  return instanteDe(
    { ano: ontem.getUTCFullYear(), mes: ontem.getUTCMonth() + 1, dia: ontem.getUTCDate(), hora: 19 },
    fuso,
  );
}

/** "hace 6 min", "hace 2 h", "ayer", "hace 3 días". */
export function haceCuanto(desde: Date, agora: Date): string {
  const min = Math.max(0, Math.round((agora.getTime() - desde.getTime()) / 60_000));
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "ayer" : `hace ${d} días`;
}

/** Por que a conversa está com uma pessoa — chave do dicionário, passa por `t()`. */
export function motivoLegible(codigo: string | null | undefined): string {
  switch (codigo) {
    case "low_sentiment":
      return "Notou-se incômodo na conversa";
    case "requested_human":
    case "pediu_humano":
      return "Pediu para falar com alguém da equipe";
    case "keyword":
    case "palavra_chave":
      return "Escreveu algo que pede uma pessoa";
    case "budget":
    case "orcamento":
      return "A IA chegou ao limite nesta conversa";
    default:
      return "A IA passou a conversa para a equipe";
  }
}

/** "S/ 1,100" — soles com separador de milhar, sem centavos quando redondo. */
export function soles(valor: number): string {
  const redondo = Math.round(valor * 100) / 100;
  const inteiro = Number.isInteger(redondo);
  return `S/ ${redondo.toLocaleString("en-US", {
    minimumFractionDigits: inteiro ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}
