/**
 * A FRASE QUE O CLIENTE LÊ QUANDO A IA SAI DE CAMPO.
 *
 * ## O defeito que este arquivo existe para consertar
 *
 * O sistema tem duas passagens para humano, escritas por times diferentes e em
 * mundos diferentes — `performHumanHandoff` (motor, `pg`) e `triggerHandoff`
 * (CRM, `supabase-js`). As duas fazem a mesma coisa bem: silenciam o automático,
 * devolvem a conversa à fila e abrem o aviso na Central. E as duas fazem a mesma
 * coisa errada: **não dizem nada a quem está do outro lado**.
 *
 * Medido em produção em 2026-08-26, duas conversas reais na mesma hora:
 *
 *   - conversa `b934ba2d` — o cliente disse que não conseguia acessar um curso; o
 *     agente respondeu e PERGUNTOU o e-mail dele. Entre a pergunta e a resposta,
 *     o worker de sentimento disparou `triggerHandoff('low_sentiment')`. O cliente
 *     mandou o e-mail às 14:51:2x e o turno foi pulado ("lead em handoff humano").
 *     Ele respondeu uma pergunta da própria IA para o vazio.
 *   - conversa `cdd9cbd8` — o cliente escreveu "preciso de falar com atendente".
 *     A detecção determinística casou, `performHumanHandoff` rodou e o turno deu
 *     `return` com o comentário "bot silencia: sem modelo, sem envio neste turno".
 *     Silêncio absoluto.
 *
 * Do lado de fora as duas são a mesma coisa: a pessoa falou e ninguém respondeu.
 * O invariante 4 da doutrina do Sistema Vivo — nenhuma demanda sem próximo passo —
 * vale para o SISTEMA e valia; o que faltava era ele valer para a PESSOA.
 *
 * ## Por que o texto mora aqui, e sozinho
 *
 * Porque são dois emissores e um texto. Deixar cada mundo escrever a própria
 * frase é como as sete leituras de "quem manda na conversa" divergiram
 * (`lib/inbox/comando-da-conversa.ts`): dois lugares, duas redações, e a segunda
 * envelhece calada. Aqui a função é PURA — comparar frase é barato, comparar
 * linha de banco é caro — e cada mundo só a chama.
 *
 * ## Por que o texto muda com o MOTIVO
 *
 * "Vou chamar um atendente" está certo para quem pediu atendente e está ERRADO
 * para quem pediu para parar de receber mensagem. O motivo já viaja até aqui
 * (`conversations.last_handoff_reason`), então a frase o respeita em vez de
 * escolher um genérico que serve mal aos dois.
 *
 * ## Por que o texto muda com a DISPONIBILIDADE
 *
 * Mesma razão de `fraseDeExpectativa` em `./disponibilidade.ts`, e a mesma
 * fonte: prometer "alguém já vai te atender" para uma conta que não tem NINGUÉM
 * configurado é a pior primeira impressão possível num produto self-host, e é o
 * estado real de toda instalação recém-feita. A diferença é o destinatário —
 * lá a frase é INSTRUÇÃO ao modelo, aqui é FALA ao cliente.
 */

import { createHash } from "node:crypto";

import type { Idioma } from "@/lib/i18n/idiomas";

import type { QuemPodeAssumir } from "./disponibilidade";

/**
 * Por que a IA está saindo de campo. É o mesmo vocabulário de
 * `conversations.last_handoff_reason` — `HandoffReason` do orquestrador do CRM e
 * o `reason` que o motor grava —, reduzido ao que MUDA A FRASE.
 *
 * `outro` não é preguiça: os motivos são vocabulário aberto (o atendente escreve
 * texto livre ao escalar um caso), e um mapa exaustivo obrigaria este arquivo a
 * conhecer cada motivo novo para não quebrar. O default é a frase honesta e
 * genérica — nunca o silêncio.
 */
export type MotivoDoAviso =
  /** O cliente pediu uma pessoa, com todas as letras. */
  | "pediu_humano"
  /** Suspeita de que o cliente pediu para parar de receber mensagens. */
  | "suspeita_de_opt_out"
  /** O teto de gasto com IA parou o atendimento automático. */
  | "orcamento_de_ia"
  /** O sistema decidiu escalar (sentimento, baixa confiança, etapa, termo jurídico…). */
  | "outro";

/**
 * Traduz o `last_handoff_reason` gravado no banco para o motivo que muda a frase.
 * Aceita `string` porque a coluna é vocabulário ABERTO — ver `MotivoDoAviso`.
 */
export function motivoDoAviso(reason: string): MotivoDoAviso {
  if (reason === "requested_human") return "pediu_humano";
  if (reason === "suspected_optout") return "suspeita_de_opt_out";
  if (reason === "orcamento_de_ia") return "orcamento_de_ia";
  return "outro";
}

/**
 * ═══ POR QUE HÁ VARIANTES, E POR QUE ELAS SÃO SORTEADAS PELO LEAD ═══
 *
 * Porque um texto FIXO se veta sozinho. O `spinningGate` da cadeia de envio
 * (`lib/agent-engine/spinning/engine.ts`) conta quantas das últimas 20 mensagens
 * DAQUELE NÚMERO são idênticas ou quase (Jaccard ≥ 0,8) à candidata, e veta a
 * partir da terceira (`SPINNING_DEFAULTS.repetitionThreshold = 2`). A janela é
 * por `(organization_id, channel_session_id)` — ou seja, CRUZA leads. Numa
 * central com movimento, o terceiro cliente a pedir um atendente receberia
 * exatamente o silêncio que este arquivo existe para acabar, e pelo guardrail
 * que existe para proteger o número.
 *
 * A saída é a mesma que a re-entrada determinística já usa
 * (`pickReentryVariant`): variante escolhida por hash do lead. Mesmo lead ⇒
 * sempre a mesma frase (nada de o cliente ver a redação mudar entre tentativas
 * do mesmo job); leads diferentes ⇒ frases diferentes. Sem estado, sem relógio.
 *
 * As variantes NÃO são a mesma frase com sinônimos: um "spin" superficial não
 * baixa o Jaccard, e o gate o pega igual. `tests/unit/aviso-ao-lead.test.ts`
 * mede a similaridade entre TODOS os pares com a função REAL do gate — é ela
 * que diz se as variantes são de verdade, não a nossa impressão ao lê-las.
 */

/** Aberturas por motivo. O índice sai do hash do lead — ver o bloco acima. */
const ABERTURAS: Record<MotivoDoAviso, readonly string[]> = {
  // Quem pediu para parar não quer ouvir sobre atendente. Confirma o que ele
  // pediu, diz que uma pessoa vai conferir, e para. Responder ao pedido de
  // parada é padrão de mensageria (a confirmação de opt-out), não insistência.
  suspeita_de_opt_out: [
    "Entendi. Vou parar de te enviar mensagens automáticas por aqui.",
    "Certo, anotado: não mando mais nada automático para este número.",
    "Ok! Encerro os envios automáticos deste canal agora mesmo.",
  ],
  pediu_humano: [
    "Claro! Já estou chamando alguém da equipe para falar com você.",
    "Sem problema — acabei de acionar uma pessoa do time para continuar daqui.",
    "Perfeito. Passei sua conversa para um atendente humano agora.",
  ],
  orcamento_de_ia: [
    "Vou passar seu atendimento para uma pessoa da equipe.",
    "A partir daqui quem continua com você é alguém do time.",
    "Estou transferindo esta conversa para um atendente humano.",
  ],
  outro: [
    "Esse caso é melhor resolvido por uma pessoa. Já acionei o time.",
    "Prefiro não arriscar aqui: passei seu pedido para um atendente humano.",
    "Vou pedir ajuda de alguém da equipe para cuidar disso com você.",
  ],
};

/** Fechos por estado da equipe. Mesmo sorteio, mesma razão. */
const FECHOS = {
  /** Ninguém configurado, ou leitura falhou: NADA de prazo. */
  sem_equipe: [
    "Seu pedido ficou registrado e a equipe responde assim que possível.",
    "Deixei tudo anotado; retornamos para você assim que der.",
    "Já registrei aqui, e alguém te responde na primeira oportunidade.",
  ],
  /** Tem equipe, ninguém elegível agora: nada de prazo curto. */
  fora_de_expediente: [
    "No momento ninguém está disponível, mas seu pedido ficou registrado.",
    "Agora não tem ninguém livre; deixei sua solicitação anotada para o time.",
    "Não há atendente disponível neste instante — sua conversa entrou na fila.",
  ],
  /** Há gente elegível: pode convidar a aguardar. */
  com_equipe: [
    "É só aguardar um instante aqui na conversa.",
    "Fica por aqui que já te respondem.",
    "Aguarde só um momento nesta conversa, por favor.",
  ],
} as const;

/**
 * ═══ ESPAÑOL ═══
 *
 * O aviso é FALA AO CLIENTE, e numa organização configurada em espanhol o
 * cliente não lê português. Mesmas regras das variantes acima: uma por motivo e
 * por estado da equipe, redações de verdade diferentes (não sinônimos), sorteio
 * pelo mesmo hash do lead.
 */
const ABERTURAS_ES: Record<MotivoDoAviso, readonly string[]> = {
  suspeita_de_opt_out: [
    "Entendido. Dejo de enviarte mensajes automáticos por aquí.",
    "Listo, anotado: no te llegará nada automático a este número.",
    "De acuerdo. Detengo ahora mismo los envíos automáticos de este canal.",
  ],
  // Claud.ia: sin "¡Perfecto!" ni "¡Claro!": la palabra clave también dispara
  // por urgencias ("me está sangrando"), y celebrar ahí suena indolente.
  pediu_humano: [
    "Ya le avisé a una persona del equipo para que te atienda.",
    "Acabo de avisar a alguien del equipo para que siga contigo desde aquí.",
    "Pasé tu conversación a una persona de nuestro equipo.",
  ],
  orcamento_de_ia: [
    "Voy a pasar tu atención a una persona del equipo.",
    "Desde aquí te sigue atendiendo alguien de nuestro equipo.",
    "Estoy pasando esta conversación a una persona del equipo.",
  ],
  // Claud.ia: en clínica este motivo cubre urgencias detectadas por el tono
  // (dolor, sangrado). Nada de "prefiero no arriesgarme": calma y prioridad.
  outro: [
    "Entiendo. Para atenderte bien, ya le avisé a una persona del equipo.",
    "Gracias por contarnos. Ya pasé tu mensaje a alguien del equipo para que te atienda.",
    "Te entiendo. Ya le avisé al equipo para que una persona se comunique contigo.",
  ],
};

// Claud.ia: nunca "no hay nadie libre" — a un paciente preocupado eso le suena
// a abandono. Sin prometer plazos, pero sin decir que no hay nadie.
const FECHOS_ES = {
  sem_equipe: [
    "Te escribimos lo antes posible.",
    "Quedó registrado y te contactamos apenas podamos.",
    "Ya está anotado; te respondemos en la primera oportunidad.",
  ],
  fora_de_expediente: [
    "Quedó registrado con prioridad y te contactamos lo antes posible.",
    "Tu mensaje quedó anotado para el equipo y te escribimos apenas sea posible.",
    "Ya está en manos del equipo; te contactamos en cuanto puedan.",
  ],
  com_equipe: [
    "Solo espera un momento aquí en el chat.",
    "Quédate por aquí que ya te responden.",
    "Espera un momentito en esta conversación, por favor.",
  ],
} as const;

/**
 * Claud.ia — URGENCIA DE SALUD EN EL ÚLTIMO MENSAJE DEL PACIENTE.
 *
 * El traspaso por palabra clave o por tono sale SIN pasar por el modelo, así
 * que la regla "orienta a emergencias" de las instrucciones nunca llegaba al
 * paciente. Si el mensaje describe una urgencia, el aviso cambia la apertura y
 * suma la orientación a emergencias.
 */
const URGENCIA = /sangr|fiebre|\bpus\b|infecci|hinchad|inflamad|desmay|no puedo respirar|me cuesta respirar|alergi|al[eé]rgic|mucho dolor|dolor (muy )?fuerte|me duele (mucho|demasiado)|emergencia|urgencia/i;

export function mencionaUrgencia(texto: string | null | undefined): boolean {
  return URGENCIA.test(texto ?? "");
}

const ABERTURAS_URGENCIA_ES = [
  "Entiendo, y lo más importante es que te atienda alguien del equipo. Ya les avisé.",
  "Te entiendo. Ya le avisé al equipo para que una persona te contacte con prioridad.",
  "Gracias por avisarnos. Ya pasé tu mensaje a una persona del equipo con prioridad.",
] as const;

const ORIENTACION_EMERGENCIA_ES =
  "Si te sientes mal o es una emergencia, acude a emergencias o llama al SAMU (106).";

/**
 * ¿Este texto es un aviso de traspaso ya enviado? Lo usan los dos emisores para
 * no mandarlo DOS veces cuando el traspaso se dispara por dos caminos a la vez
 * (palabra clave en el motor + tono en el CRM) — medido el 26 sep 2026.
 */
export function ehAvisoDeEscalacao(texto: string | null | undefined): boolean {
  const t = (texto ?? "").trim();
  if (t === "") return false;
  const aberturas = [
    ...Object.values(ABERTURAS).flat(),
    ...Object.values(ABERTURAS_ES).flat(),
    ...ABERTURAS_URGENCIA_ES,
  ];
  return aberturas.some((a) => t.startsWith(a));
}

const FECHO_DO_OPT_OUT = {
  "pt-BR": "Encaminhei seu pedido para uma pessoa da equipe confirmar.",
  es: "Pasé tu pedido a una persona del equipo para que lo confirme.",
} as const satisfies Record<Idioma, string>;

/**
 * Variante DETERMINÍSTICA por lead: sha256(lead_id) → uint32 → módulo.
 *
 * É a MESMA regra de `pickReentryVariant` (`lib/agent-engine/agent/reentry-template.ts`),
 * reescrita aqui em vez de importada porque aquela vive no motor (`agent-engine`)
 * e este módulo é dos DOIS mundos — o do CRM não pode importar do motor sem
 * arrastar `pg` para dentro de uma rota Next.
 */
function variante<T>(leadId: string, opcoes: readonly T[]): T {
  const digest = createHash("sha256").update(leadId).digest();
  return opcoes[digest.readUInt32BE(0) % opcoes.length]!;
}

/**
 * O que o cliente lê. Uma frase, sem jargão, sem prometer o que não se cumpre.
 *
 * `quem` é `null` quando a leitura de disponibilidade falhou — e aí a frase é a
 * conservadora, pelo mesmo motivo de `expectativaDeAtendimento`: errar para o
 * lado de prometer menos é recuperável; prometer o que não se cumpre, não.
 *
 * `leadId` entra SÓ como semente do sorteio — nada dele aparece no texto. O nome
 * do contato também não: o aviso sai por um caminho determinístico, sem modelo, e
 * uma saudação montada em código ("Oi, {nome}!") em cima de uma conversa já em
 * andamento soa a robô — que é exatamente o que ele é, mas não precisa parecer
 * duas vezes.
 */
export function textoDoAviso(
  motivo: MotivoDoAviso,
  quem: QuemPodeAssumir | null,
  leadId: string,
  idioma: Idioma = "pt-BR",
  urgencia = false,
): string {
  const aberturas = idioma === "es" ? ABERTURAS_ES : ABERTURAS;
  const fechos = idioma === "es" ? FECHOS_ES : FECHOS;
  const emUrgencia = urgencia && idioma === "es" && motivo !== "suspeita_de_opt_out";
  const abertura = emUrgencia
    ? variante(leadId, ABERTURAS_URGENCIA_ES)
    : variante(leadId, aberturas[motivo]);

  if (motivo === "suspeita_de_opt_out") {
    // Sem fecho de expediente: quem pediu para parar não está esperando
    // atendimento, então "aguarde um instante" seria a resposta errada à
    // pergunta que ele fez.
    return `${abertura} ${FECHO_DO_OPT_OUT[idioma]}`;
  }

  const fecho =
    quem === null || quem.total === 0
      ? variante(leadId, fechos.sem_equipe)
      : quem.disponiveis === 0
        ? variante(leadId, fechos.fora_de_expediente)
        : variante(leadId, fechos.com_equipe);

  return emUrgencia ? `${abertura} ${fecho} ${ORIENTACION_EMERGENCIA_ES}` : `${abertura} ${fecho}`;
}
