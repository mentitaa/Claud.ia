/**
 * OS QUATRO FOLLOW-UPS DE UMA CLÍNICA — consulta, exame, cirurgia e falta.
 *
 * São as quatro vezes em que um paciente some no meio do caminho, e cada uma
 * tem um relógio próprio: quem parou de responder no meio da marcação volta em
 * dias; quem está decidindo uma cirurgia volta em semanas, e cobrar esse em
 * dias é o jeito mais rápido de virar bloqueio. Por isso são quatro modelos e
 * não um com prazos configuráveis: o prazo É o modelo.
 *
 * ⚠️ TRÊS REGRAS QUE OS TEXTOS OBEDECEM, E QUE NÃO SÃO ESTILO:
 *
 * 1. **Nenhum texto nomeia doença, exame, especialidade ou procedimento.**
 *    "o exame que o médico pediu", nunca o nome do exame. Dado de saúde é dado
 *    pessoal SENSÍVEL (LGPD art. 11), e a mensagem aparece na tela de bloqueio
 *    do celular, às vezes lida por outra pessoa. O modo `text` do nó de ação não interpola nada
 *    — não há como um campo da ficha vazar para dentro da mensagem, e
 *    `modelos.test.ts` reprova texto com `{{` para que continue assim.
 * 2. **Nenhum texto promete horário, preço ou prazo clínico.** "posso ver os
 *    horários", nunca "tenho quinta às 14h": a mensagem é escrita hoje e enviada
 *    daqui a três semanas, e a agenda não é consultada para montá-la.
 * 3. **Nenhum texto nomeia a clínica.** Uma imagem serve todas as marcas
 *    (doutrina de marca própria); o nome do remetente já vai no canal.
 *
 * ⚠️ `cancel_on_reply: true` NOS QUATRO, e é a decisão de produto mais
 * importante deste arquivo. Respondeu qualquer coisa — "oi", "quem é?", "pode
 * ser quinta" — a inscrição é CANCELADA (`outcome='replied'`) e a conversa volta
 * para quem atende, agente ou humano. O contrário (o fluxo seguir roteando por
 * palavra-chave) põe um robô falando por cima de um paciente que acabou de
 * responder uma pergunta de saúde. Quem marca a consulta é o atendimento, que
 * tem a agenda na mão; o follow-up só existe para o silêncio.
 */
import type { ModeloDeFollowup } from "./tipos";
import { montarEscada } from "./escada";

const MIN_MS = 60_000;
const DIA_MS = 86_400_000;

/** Quem responde um follow-up está falando com o atendimento, não com o fluxo. */
const O_ATENDIMENTO_ASSUME = "El paciente respondió; la conversación la sigue el equipo de atención.";

export const MODELOS_DE_CLINICA: readonly ModeloDeFollowup[] = [
  {
    id: "clinica-consulta-retomada",
    nicho: "clinica",
    nome: "Consulta · retomar a quien no terminó de agendar",
    jornada: "Consulta",
    resumo:
      "El paciente preguntó por una consulta, la conversación se detuvo antes de agendar la cita y nadie la retomó.",
    oQueDispara: "Un día entero sin que el paciente responda, con la cita pendiente.",
    pedeEtapa: false,
    // `pause`: atendente assumiu a conversa, o follow-up espera. Não cancela —
    // se o atendimento não fechar a marcação, a escada continua de onde parou.
    handoffPolicy: "pause",
    gatilho: () => ({
      kind: "silence",
      params: { threshold_minutes: 24 * 60 },
      cancel_on_reply: true,
    }),
    grafo: montarEscada({
      prazoDeRespostaMs: 2 * DIA_MS,
      sim: { rotulo: "Quiere agendar", padrao: "quiero" },
      notaDeResposta: O_ATENDIMENTO_ASSUME,
      toques: [
        {
          rotulo: "Retoma la cita",
          texto:
            "¡Hola! Habíamos quedado en coordinar el horario de tu consulta y la conversación se quedó aquí. ¿Quieres que revise qué horarios siguen libres?",
        },
        {
          esperaAntesMs: 2 * DIA_MS,
          rotulo: "Pregunta el momento del día",
          texto:
            "Paso de nuevo por aquí 🙂 Si todavía quieres agendar, solo dime qué momento te acomoda más —mañana o tarde— y te busco un horario.",
        },
        {
          esperaAntesMs: 4 * DIA_MS,
          rotulo: "Último mensaje",
          texto:
            "Esta es la última vez que te escribo sobre esto. Si quieres retomar la cita, respóndeme cuando gustes. Y si prefieres dejarlo para más adelante, también está bien.",
        },
      ],
    }),
  },

  {
    id: "clinica-exame-marcar",
    nicho: "clinica",
    nome: "Examen · agendar el examen indicado",
    jornada: "Examen",
    resumo:
      "Ya salió la orden del examen y el paciente todavía no agenda su cita. El flujo insiste durante dos semanas y después se retira.",
    oQueDispara: "Que el negocio entre en la etapa del embudo que elijas.",
    pedeEtapa: true,
    handoffPolicy: "pause",
    gatilho: ({ stageId }) => ({
      kind: "stage_change",
      params: { stage_id: stageId! },
      cancel_on_reply: true,
    }),
    grafo: montarEscada({
      prazoDeRespostaMs: 3 * DIA_MS,
      sim: { rotulo: "Quiere agendar", padrao: "quiero" },
      notaDeResposta: O_ATENDIMENTO_ASSUME,
      toques: [
        {
          // Um dia de espera, e não zero: a etapa quase sempre muda DURANTE a
          // conversa, e mandar na mesma hora é falar por cima de quem atende.
          esperaAntesMs: DIA_MS,
          rotulo: "Ofrece agendar",
          texto:
            "¡Hola! Sobre el examen que te indicaron: ¿quieres que revise los horarios disponibles? Respóndeme por aquí y lo coordino.",
        },
        {
          esperaAntesMs: 3 * DIA_MS,
          rotulo: "Pregunta el momento del día",
          texto:
            "Todavía puedes agendar tu examen. Dime qué momento te acomoda mejor —mañana o tarde— y te busco una fecha.",
        },
        {
          esperaAntesMs: 5 * DIA_MS,
          rotulo: "Cierra y libera",
          texto:
            "Último recordatorio sobre el examen 🙂 Si quieres agendarlo, respóndeme y te busco una fecha. Y si ya te lo hiciste en otro lugar, avísame y cierro el tema por aquí.",
        },
      ],
    }),
  },

  {
    id: "clinica-cirurgia-decisao",
    nicho: "clinica",
    nome: "Cirugía · acompañar la decisión",
    jornada: "Cirugía",
    resumo:
      "Quien fue evaluado y no agendó no desistió: está decidiendo. El flujo lo acompaña durante casi tres meses, sin presionar.",
    oQueDispara: "Que el negocio entre en la etapa del embudo que elijas.",
    pedeEtapa: true,
    // `pause` também aqui: a decisão de uma cirurgia passa por conversa com
    // médico e família, e essa conversa é sempre humana. O fluxo espera.
    handoffPolicy: "pause",
    gatilho: ({ stageId }) => ({
      kind: "stage_change",
      params: { stage_id: stageId! },
      cancel_on_reply: true,
    }),
    grafo: montarEscada({
      prazoDeRespostaMs: 5 * DIA_MS,
      sim: { rotulo: "Quiere retomar", padrao: "quiero" },
      notaDeResposta: O_ATENDIMENTO_ASSUME,
      toques: [
        {
          esperaAntesMs: 3 * DIA_MS,
          rotulo: "Abre espacio a dudas",
          texto:
            "¡Hola! Sé que no es una decisión sencilla y no hay ningún apuro de nuestra parte. ¿Te quedó alguna duda de lo que conversaron en la consulta? Puedes preguntarme por aquí.",
        },
        {
          esperaAntesMs: 10 * DIA_MS,
          rotulo: "Ofrece revisar condiciones",
          texto:
            "Te escribo para saber cómo lo vas pensando. Si quieres revisar las condiciones, la preparación o las fechas posibles, escríbeme y te lo explico todo de nuevo con calma.",
        },
        {
          esperaAntesMs: 21 * DIA_MS,
          rotulo: "Invita a retomar",
          texto:
            "Hace un tiempo que no conversamos sobre tu caso. Si quieres retomarlo, respóndeme por aquí y veo una fecha con el equipo.",
        },
        {
          esperaAntesMs: 30 * DIA_MS,
          rotulo: "Deja la puerta abierta",
          texto:
            "Este es mi último mensaje sobre esto; no quiero incomodarte. Si en algún momento quieres retomarlo, solo escríbeme: tu historial sigue con nosotros.",
        },
      ],
    }),
  },

  {
    id: "clinica-falta-remarcar",
    nicho: "clinica",
    nome: "Inasistencia · reprogramar a quien no vino",
    jornada: "Inasistencia",
    resumo:
      "Se confirmó en la agenda la inasistencia del paciente y el horario quedó libre. El flujo ofrece otra fecha en lugar de dejar que el paciente desaparezca.",
    oQueDispara: "Que alguien confirme en la agenda que el paciente no asistió.",
    pedeEtapa: false,
    handoffPolicy: "pause",
    gatilho: () => ({ kind: "appointment_no_show", cancel_on_reply: true }),
    grafo: montarEscada({
      prazoDeRespostaMs: 2 * DIA_MS,
      sim: { rotulo: "Quiere reprogramar", padrao: ["reprogramar", "reagendar"] },
      notaDeResposta: O_ATENDIMENTO_ASSUME,
      toques: [
        {
          // Duas horas, não na mesma hora: a confirmação da falta costuma ser
          // registrada logo depois do horário, e o paciente pode estar a
          // caminho, preso no trânsito ou resolvendo o que o fez faltar.
          esperaAntesMs: 120 * MIN_MS,
          rotulo: "Ofrece otra fecha",
          texto:
            "¡Hola! Vi que no pudimos vernos en el horario de hoy. Son cosas que pasan 🙂 ¿Quieres que te busque otra fecha?",
        },
        {
          esperaAntesMs: 2 * DIA_MS,
          rotulo: "Pide día y momento",
          texto:
            "Puedo darte otro horario. Dime qué día de la semana y en qué momento del día te acomoda más.",
        },
        {
          esperaAntesMs: 5 * DIA_MS,
          rotulo: "Cierra el tema",
          texto:
            "Si todavía quieres reprogramar, solo respóndeme. Después de este mensaje ya no te escribo más, para no llenarte la bandeja 🙂",
        },
      ],
    }),
  },
];
