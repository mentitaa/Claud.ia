/**
 * Tradução, NA HORA DE MOSTRAR, dos avisos da Central (`agent_inbox_items`).
 *
 * Os ~30 escritores do runtime gravam `title`/`body` em português, recheados de
 * dado (nome de conexão, número, contagem, motivo técnico). Mexer em cada
 * escritor mudaria chaves de dedup (`.eq("title", …)`) e textos que os testes de
 * invariante observam — por isso a tradução acontece aqui, na leitura.
 *
 * Ordem de tentativa para `es`:
 *   1. a frase inteira no `DICIONARIO` (o que já tem par em espanhol);
 *   2. a frase inteira em `FIXOS` (textos fixos dos escritores);
 *   3. um dos `PADROES` (frases interpoladas, ancoradas em ^…$);
 *   4. corpo composto de parágrafos (`\n\n`) ou trechos (` · `): cada pedaço
 *      passa pelos passos acima;
 *   5. senão, o texto como veio.
 *
 * O dado de gente (nome do cliente, nome de funil, motivo cru) NUNCA passa pelo
 * dicionário sozinho: só a frase inteira casa, então nada que a pessoa digitou
 * é trocado por outra palavra.
 */
import { DICIONARIO } from "@/lib/i18n/dicionario";

/** Textos fixos gravados pelos escritores da Central — pt → es. */
const FIXOS: Record<string, string> = {
  // ── lib/channels/health.ts ────────────────────────────────────────────────
  "Escanear o QR não resolve: a chave que o CRM usa para falar com o servidor de WhatsApp não confere com a que o servidor espera. Enquanto isso durar, nenhuma mensagem entra nem sai por NENHUMA conexão. Quem cuida do servidor precisa conferir a WAHA_API_KEY do .env e recriar o contêiner do WhatsApp.":
    "Escanear el QR no lo resuelve: la clave que usa el CRM para hablar con el servidor de WhatsApp no coincide con la que espera el servidor. Mientras esto dure, ningún mensaje entra ni sale por NINGUNA conexión. Quien administra el servidor tiene que revisar la WAHA_API_KEY del .env y volver a crear el contenedor de WhatsApp.",
  "Enquanto isso não acontecer, nenhuma mensagem entra nem sai por esta conexão.":
    "Hasta que eso pase, ningún mensaje entra ni sale por esta conexión.",
  "Nenhuma mensagem entra nem sai por esta conexão até ela voltar.":
    "Ningún mensaje entra ni sale por esta conexión hasta que vuelva.",

  // ── lib/channels/zernio/avisos.ts ─────────────────────────────────────────
  "Número ativado.": "Número activado.",
  "Número reativado.": "Número reactivado.",
  "Documentação enviada para verificação.": "Documentación enviada para verificación.",
  "A plataforma pede verificação deste número.": "La plataforma pide verificar este número.",
  "A plataforma pede uma ação neste número.": "La plataforma pide una acción en este número.",
  "Número recusado pela plataforma.": "Número rechazado por la plataforma.",
  "Número SUSPENSO — não é possível enviar.": "Número SUSPENDIDO: no se puede enviar.",
  "Número liberado e não utilizável (terminal).": "Número liberado y ya no utilizable (definitivo).",
  "A conta do canal foi desconectada.": "La cuenta del canal se desconectó.",
  "Conta do canal conectada.": "Cuenta del canal conectada.",
  "Verificação recusada.": "Verificación rechazada.",
  "Verificação aprovada.": "Verificación aprobada.",

  // ── app/api/v1/cron/canal-mudo-watcher ────────────────────────────────────
  "Este canal está em modo de teste — a IA não responde ninguém":
    "Este canal está en modo de prueba: la IA no le responde a nadie",
  "Este canal está em modo de teste e não tem nenhum número autorizado, então a IA não responde a ninguém nele — as mensagens chegam no Inbox e ficam sem resposta automática. Em Conexões, autorize os números de teste ou abra o canal ao público.":
    "Este canal está en modo de prueba y no tiene ningún número autorizado, así que la IA no le responde a nadie aquí: los mensajes llegan al Inbox y se quedan sin respuesta automática. En Conexiones, autoriza los números de prueba o abre el canal al público.",
  "o canal ganhou número autorizado": "el canal recibió un número autorizado",
  "o canal saiu do modo de teste": "el canal salió del modo de prueba",
  "o canal foi arquivado": "el canal fue archivado",

  // ── app/api/v1/cron/snooze-watcher ────────────────────────────────────────
  "Lead não respondeu no prazo": "El lead no respondió dentro del plazo",

  // ── app/api/v1/cron/recover-stuck-messages ────────────────────────────────
  "Uma resposta não chegou ao cliente": "Una respuesta no llegó al cliente",

  // ── app/api/v1/cron/followup-sem-agente (COMO_DISPARA) ────────────────────
  "depois de um tempo sem o contato responder": "después de un tiempo sin que el contacto responda",
  "quando um negócio entra numa etapa do funil": "cuando un negocio entra en una etapa del embudo",
  "quando um atendimento é aberto": "cuando se abre una atención",
  "quando alguém confirma que o contato não compareceu": "cuando alguien confirma que el contacto no asistió",
  "quando o contato volta a escrever depois de um tempo sem falar":
    "cuando el contacto vuelve a escribir después de un tiempo sin hablar",
  "quando um negócio nasce": "cuando se crea un negocio",
  "pelo gatilho configurado": "por el disparador configurado",

  // ── app/api/v1/cron/case-stale-watcher (braço das passagens, em pt) ───────
  "A IA passou esta conversa para uma pessoa e ninguém assumiu desde então. Abra a conversa: o contexto do que já foi dito está lá.":
    "La IA pasó esta conversación a una persona y nadie la ha tomado desde entonces. Abre la conversación: ahí está el contexto de lo que ya se dijo.",
  "Este é o último aviso automático sobre esta conversa.":
    "Este es el último aviso automático sobre esta conversación.",

  // ── lib/automation/desfecho-do-envio.ts + lib/channels/frases-de-falha.ts ─
  "Uma automação não conseguiu falar com o cliente": "Una automatización no pudo comunicarse con el cliente",
  "A mensagem não saiu.": "El mensaje no salió.",
  "A mensagem está na fila e sai assim que o canal aceitar.":
    "El mensaje está en la cola y sale apenas el canal lo acepte.",
  "O número escolhido não está conectado no momento. Reconecte em Conexões — a mensagem sai sozinha quando ele voltar.":
    "El número elegido no está conectado en este momento. Reconéctalo en Conexiones: el mensaje sale solo cuando vuelva.",
  "A conexão de WhatsApp ainda não foi configurada nesta instalação.":
    "La conexión de WhatsApp todavía no se configuró en esta instalación.",
  "Esse número foi excluído da Central de Conexões. Escolha outro número nesta automação.":
    "Ese número se eliminó de la Central de Conexiones. Elige otro número en esta automatización.",
  "O contato não tem telefone para receber a mensagem.": "El contacto no tiene teléfono para recibir el mensaje.",
  "Não conseguimos falar com o serviço de WhatsApp. Confira se ele está no ar.":
    "No pudimos comunicarnos con el servicio de WhatsApp. Revisa si está funcionando.",
  "O WhatsApp Oficial recusou o envio. Confira a conexão em Conexões.":
    "WhatsApp Oficial rechazó el envío. Revisa la conexión en Conexiones.",
  "O canal recusou o envio. Confira a conexão em Conexões.": "El canal rechazó el envío. Revisa la conexión en Conexiones.",
  "Não conseguimos preparar o arquivo para envio.": "No pudimos preparar el archivo para enviarlo.",

  // ── lib/escalacao/aviso-ao-suporte.ts (+ vocabulario-do-aviso.ts) ─────────
  "Um aviso de atendimento não chegou ao WhatsApp da equipe": "Un aviso de atención no llegó al WhatsApp del equipo",
  "A conexão de WhatsApp escolhida para os avisos está fora do ar.":
    "La conexión de WhatsApp elegida para los avisos está caída.",
  "A conexão de WhatsApp escolhida para os avisos foi removida.":
    "La conexión de WhatsApp elegida para los avisos fue eliminada.",
  "A conexão escolhida só envia mensagens aprovadas — ela não serve para o aviso de caso.":
    "La conexión elegida solo envía mensajes aprobados, así que no sirve para el aviso de caso.",
  "O serviço de WhatsApp desta instalação não está configurado.":
    "El servicio de WhatsApp de esta instalación no está configurado.",
  "O número de aviso não foi aceito pelo WhatsApp.": "WhatsApp no aceptó el número de aviso.",
  "O número que envia os avisos atingiu o limite diário do período de aquecimento.":
    "El número que envía los avisos alcanzó el límite diario del periodo de calentamiento.",
  "Esta instalação ainda não tem um endereço público — o aviso não teria link para abrir.":
    "Esta instalación todavía no tiene una dirección pública, así que el aviso no tendría un enlace para abrir.",
  "O cliente deste atendimento pediu para ser esquecido.": "El cliente de esta atención pidió que se borren sus datos.",
  "O aviso ficou mais de 24 horas sem conseguir sair e foi encerrado.":
    "El aviso pasó más de 24 horas sin poder salir y se cerró.",
  "O WhatsApp recusou o envio do aviso.": "WhatsApp rechazó el envío del aviso.",
  "O aviso não saiu e a causa não pôde ser identificada.": "El aviso no salió y no se pudo identificar la causa.",

  // ── lib/event-log/aviso-de-evento-morto.ts ────────────────────────────────
  "A IA deixou de responder uma mensagem de cliente": "La IA dejó de responder un mensaje de un cliente",
  "Uma tarefa automática parou de tentar": "Una tarea automática dejó de intentarlo",
  "Um cliente escreveu e a IA não respondeu; se ele não escrever de novo, a conversa fica sem resposta. Abra o Inbox e responda as conversas que estão esperando.":
    "Un cliente escribió y la IA no respondió; si no vuelve a escribir, la conversación se queda sin respuesta. Abre el Inbox y responde las conversaciones que están esperando.",
  "Enquanto este aviso estiver aberto, outras respostas da IA que pararem de tentar não abrem aviso novo: depois de corrigida a causa, marque-o como resolvido para voltar a ser avisado.":
    "Mientras este aviso esté abierto, otras respuestas de la IA que dejen de intentarlo no abren un aviso nuevo: después de corregir la causa, márcalo como resuelto para que se te vuelva a avisar.",
  "Uma tarefa automática do sistema falhou e parou de tentar: o que ela ia fazer não aconteceu, e não será tentado de novo.":
    "Una tarea automática del sistema falló y dejó de intentarlo: lo que iba a hacer no ocurrió y no se volverá a intentar.",
  "Enquanto este aviso estiver aberto, outras tarefas automáticas que pararem de tentar não abrem aviso novo (a IA que deixa de responder um cliente abre o seu próprio): depois de corrigida a causa, marque-o como resolvido para voltar a ser avisado.":
    "Mientras este aviso esté abierto, otras tareas automáticas que dejen de intentarlo no abren un aviso nuevo (cuando la IA deja de responder a un cliente, abre su propio aviso): después de corregir la causa, márcalo como resuelto para que se te vuelva a avisar.",

  // ── lib/event-log/aviso-do-laco.ts ────────────────────────────────────────
  "Processamento rápido de eventos está em modo degradado": "El procesamiento rápido de eventos está en modo degradado",
  "O processamento rápido do event_log não carregou neste worker. O cron de segurança continua processando a fila, mas automações e efeitos derivados podem levar até cerca de 1 minuto a mais. Quem administra a instalação deve revisar o worker.":
    "El procesamiento rápido del event_log no cargó en este worker. El cron de seguridad sigue procesando la cola, pero las automatizaciones y los efectos derivados pueden tardar hasta cerca de 1 minuto más. Quien administra la instalación debe revisar el worker.",

  // ── lib/ai/handoff/orchestrator.ts ────────────────────────────────────────
  "Atendimento automático parou — assumir a conversa": "La atención automática se detuvo: toma la conversación",

  // ── lib/atendimento/aviso-caso-obsoleto.ts ────────────────────────────────
  "Resposta registrada; atendimento mudou": "Respuesta registrada; la atención cambió",
  "Resposta registrada; não repassada porque o atendimento mudou. Revise a conversa.":
    "Respuesta registrada; no se reenvió porque la atención cambió. Revisa la conversación.",

  // ── lib/contacts/proposta-de-dado.ts ──────────────────────────────────────
  "Uma informação de cliente venceu sem alguém conferir": "Un dato de un cliente venció sin que nadie lo revisara",
  "O assistente ouviu um dado na conversa com um cliente e ninguém confirmou a tempo. Ele saiu da ficha para não parecer que já estava salvo. Se a informação ainda importa, peça de novo ou preencha à mão.":
    "El asistente escuchó un dato en la conversación con un cliente y nadie lo confirmó a tiempo. Salió de la ficha para que no parezca que ya estaba guardado. Si el dato todavía importa, pídelo de nuevo o complétalo a mano.",
  "O assistente ouviu alguns dados na conversa com clientes e ninguém confirmou a tempo. Eles saíram da ficha para não parecer que já estava salvo. Se a informação ainda importa, peça de novo ou preencha à mão.":
    "El asistente escuchó algunos datos en conversaciones con clientes y nadie los confirmó a tiempo. Salieron de la ficha para que no parezca que ya estaban guardados. Si la información todavía importa, pídela de nuevo o complétala a mano.",

  // ── lib/followup/engine.ts + turn-bridge.ts ───────────────────────────────
  "Um fluxo de follow-up parou de tentar": "Un flujo de follow-up dejó de intentarlo",
  "Um retorno programado não pôde ser enviado": "Un seguimiento programado no se pudo enviar",
  "Cliente faltou e não respondeu à recuperação": "El cliente faltó y no respondió a la recuperación",
  "As mensagens de reengajamento pós-falta foram enviadas e o cliente não respondeu. Decida o próximo passo e mova o card no funil.":
    "Se enviaron los mensajes para recuperar al cliente después de la falta y no respondió. Decide el siguiente paso y mueve la tarjeta en el embudo.",

  // ── lib/agent-engine/pacing/aviso-de-janela.ts ────────────────────────────
  "As respostas da IA estão esperando a janela de envio abrir":
    "Las respuestas de la IA están esperando que se abra la ventana de envío",

  // ── lib/agent-engine/edge/llm/orcamento.ts + run-model-call.ts ────────────
  "O gasto de IA passou do aviso que você definiu": "El gasto de IA superó el aviso que definiste",
  "A IA continua respondendo normalmente — isto é o aviso, não a parada. Veja quanto já foi gasto e ajuste o limite em Uso de IA › Orçamento.":
    "La IA sigue respondiendo con normalidad: esto es el aviso, no la parada. Mira cuánto se ha gastado y ajusta el límite en Uso de IA › Presupuesto.",
  "O limite de gasto com IA foi atingido": "Se alcanzó el límite de gasto en IA",
  "A IA recusou usar o endereço próprio desta empresa sem a chave dela":
    "La IA se negó a usar la dirección propia de esta empresa sin su clave",

  // ── lib/agent-engine/obs/metrics.ts ───────────────────────────────────────
  "Cache hit de prompt abaixo do alvo — custo por run acima do esperado":
    "Cache hit del prompt por debajo del objetivo: costo por ejecución mayor al esperado",

  // ── lib/agent-engine/cron/scheduler.ts ────────────────────────────────────
  "Cron desabilitado após falha de disparo": "Cron deshabilitado tras una falla de disparo",

  // ── lib/agent-engine/agent/human-handoff.ts + inbound-turn.ts ─────────────
  "Handoff humano solicitado — assumir a conversa": "Se pidió pasar a una persona: toma la conversación",
  "Teto de gasto com IA atingido — assumir a conversa": "Se alcanzó el tope de gasto en IA: toma la conversación",
  "Suspeita de opt-out — confirmar bloqueio do contato no CRM":
    "Posible opt-out: confirma el bloqueo del contacto en el CRM",
  "O agente atendeu sem as capacidades que você ligou": "El agente atendió sin las capacidades que activaste",
  "Um retorno prometido a um cliente ficou sem dono": "Un seguimiento prometido a un cliente quedó sin responsable",
  "O assistente prometeu algo a esta pessoa nesta conversa e o passo que registra o cumprimento não chegou a ser agendado. Abra a conversa, veja o que foi combinado e cumpra você mesmo.":
    "El asistente le prometió algo a esta persona en esta conversación y el paso que registra el cumplimiento no llegó a programarse. Abre la conversación, revisa lo que se acordó y cúmplelo tú mismo.",
  "Lead com sinal de urgência represado pelo cap de envio do número":
    "Lead con señal de urgencia retenido por el límite de envío del número",

  // ── lib/agent-engine/edge/crm/move-lead-stage.ts ──────────────────────────
  "O assistente quis organizar um negócio de um funil que não é dele":
    "El asistente quiso organizar un negocio de un embudo que no es suyo",
  "O assistente quis marcar um negócio como perdido — e isso exige um motivo":
    "El asistente quiso marcar un negocio como perdido, y eso exige un motivo",
  "Espelho de stage no CRM falhou — funil possivelmente inconsistente":
    "Falló el reflejo de etapa en el CRM: el embudo puede estar inconsistente",

  // ── lib/agent-engine/queue/queue.ts ───────────────────────────────────────
  "Job descartado após esgotar tentativas": "Job descartado tras agotar los intentos",

  // ── lib/agent-engine/guardrails/** ────────────────────────────────────────
  "Possível manipulação do agente — revisar conversa": "Posible manipulación del agente: revisa la conversación",
  "Contato anonimizado — envio bloqueado por LGPD": "Contacto anonimizado: envío bloqueado por protección de datos",
  "Base legal ausente/inválida — 1º toque bloqueado por LGPD":
    "Base legal ausente o inválida: primer contacto bloqueado por protección de datos",
  "O contato deste lead está anonimizado no CRM (anonimização é irreversível): nenhum envio pode ir a ele. Confira o cadastro no CRM — se for engano, reverta a anonimização lá.":
    "El contacto de este lead está anonimizado en el CRM (la anonimización es irreversible): no se le puede enviar nada. Revisa el registro en el CRM; si es un error, revierte la anonimización allí.",
  'O 1º toque de prospecção a este lead foi bloqueado por falta de base legal válida (consent concedido, ou legitimate_interest com LIA; origem "import" exige prova). Registre a base legal no CRM antes de prospectar este contato.':
    'El primer contacto de prospección con este lead se bloqueó por falta de una base legal válida (consent otorgado, o legitimate_interest con LIA; el origen "import" exige prueba). Registra la base legal en el CRM antes de prospectar a este contacto.',

  // ── lib/agent-engine/health/circuit.ts ────────────────────────────────────
  "Número novo aguardando liberação (go-live)": "Número nuevo esperando liberación (go-live)",
  "Saúde do número degradada — outbound em espera automática":
    "Salud del número degradada: envíos salientes en espera automática",
  "Número novo aguardando liberação (go-live). Os disparos que o sistema começa — follow-up e cadência de prospecção — nascem em espera por segurança: a fila retém, nada é perdido. RESPONDER quem te escreveu continua funcionando normalmente. Resolva este item quando o número estiver pronto para disparar.":
    "Número nuevo esperando liberación (go-live). Los envíos que inicia el sistema (follow-up y cadencia de prospección) nacen en espera por seguridad: la cola los retiene, no se pierde nada. RESPONDER a quien te escribió sigue funcionando con normalidad. Resuelve este ítem cuando el número esté listo para enviar.",

  // ── lib/wacalls/motivo-da-chamada.ts ──────────────────────────────────────
  "Quem ligou desligou antes de alguém atender.": "Quien llamó colgó antes de que alguien contestara.",
  "A chamada foi recusada.": "La llamada fue rechazada.",
  "O telefone tocou e ninguém atendeu.": "El teléfono sonó y nadie contestó.",
  "A linha estava ocupada.": "La línea estaba ocupada.",
  "A chamada foi cancelada.": "La llamada fue cancelada.",
  "A chamada falhou antes de completar.": "La llamada falló antes de completarse.",
  'O aparelho estava no modo "não perturbe".': 'El equipo estaba en modo "no molestar".',
  "A chamada terminou sem que o WhatsApp informasse o motivo.":
    "La llamada terminó sin que WhatsApp informara el motivo.",

  // ── workers/rag-indexer.ts ────────────────────────────────────────────────
  "Falta uma chave da OpenAI para preparar o material. Cadastre uma em IA › Credenciais e a indexação recomeça sozinha — nada do que você enviou foi perdido.":
    "Falta una clave de OpenAI para preparar el material. Registra una en IA › Credenciales y la indexación se reanuda sola: no se perdió nada de lo que enviaste.",

  // ── workers/media-derive-worker.ts (consequências e motivos) ──────────────
  "Enquanto isso, o agente responde avisando que não conseguiu abrir o arquivo.":
    "Mientras tanto, el agente responde avisando que no pudo abrir el archivo.",
  "O conteúdo do arquivo não chegou ao agente. Da próxima mensagem em diante ele sabe que houve um arquivo que não deu para ler, e responde avisando em vez de supor o que estava nele.":
    "El contenido del archivo no llegó al agente. Desde el próximo mensaje sabe que hubo un archivo que no se pudo leer, y responde avisando en lugar de suponer lo que contenía.",
  "a leitura deu erro em todas as tentativas, ao abrir o arquivo ou ao chamar o provedor de IA":
    "la lectura falló en todos los intentos, al abrir el archivo o al llamar al proveedor de IA",
  "o endereço de IA configurado para esta empresa só é usado com a credencial dela: cadastre a chave da empresa em Agente de IA e Provedores, ou tire o endereço próprio para voltar ao provedor padrão da instalação":
    "la dirección de IA configurada para esta empresa solo se usa con su propia credencial: registra la clave de la empresa en Agente de IA y Proveedores, o quita la dirección propia para volver al proveedor predeterminado de la instalación",
  "o endereço configurado para a visão não foi aceito como destino, então não enviei a imagem nem a chave para lá — confira o endereço do provedor em Agente de IA e Provedores; endereço escolhido pela empresa não pode apontar para a rede interna do servidor":
    "la dirección configurada para la visión no se aceptó como destino, así que no envié la imagen ni la clave allí: revisa la dirección del proveedor en Agente de IA y Proveedores; una dirección elegida por la empresa no puede apuntar a la red interna del servidor",
  "falta uma chave da OpenAI para transcrever": "falta una clave de OpenAI para transcribir",
  "o endereço configurado para a transcrição não foi aceito como destino, então não enviei o áudio nem a chave para lá — confira TRANSCRIPTION_BASE_URL; se o serviço roda na rede interna, quem administra a instalação libera o endereço em Administração › Destinos internos":
    "la dirección configurada para la transcripción no se aceptó como destino, así que no envié el audio ni la clave allí: revisa TRANSCRIPTION_BASE_URL; si el servicio corre en la red interna, quien administra la instalación libera la dirección en Administración › Destinos internos",

  // ── lib/ai/agents/legacy-notice.ts + fn_agent_legacy_notice ───────────────
  "Agente recuperado": "Agente recuperado",
  "Agente precisa concluir a configuração": "El agente necesita terminar la configuración",
  "Conecte ou escolha um canal de WhatsApp para este agente.": "Conecta o elige un canal de WhatsApp para este agente.",
  "Cadastre e valide a chave do provedor de inteligência artificial.":
    "Registra y valida la clave del proveedor de inteligencia artificial.",
  "Sincronize o catálogo e escolha um modelo compatível com ferramentas.":
    "Sincroniza el catálogo y elige un modelo compatible con herramientas.",
  "Escolha explicitamente o provedor e o modelo para este agente.":
    "Elige explícitamente el proveedor y el modelo para este agente.",
  "Este agente ainda não tem uma versão publicada. Retome a configuração preservada.":
    "Este agente todavía no tiene una versión publicada. Retoma la configuración guardada.",
  "A recuperação não terminou. Retome a configuração preservada e revise canal, modelo e credencial.":
    "La recuperación no terminó. Retoma la configuración guardada y revisa canal, modelo y credencial.",
  "A configuração foi recuperada. As respostas usam a versão publicada do agente.":
    "La configuración se recuperó. Las respuestas usan la versión publicada del agente.",
  "A configuração foi recuperada. As respostas usam a versão publicada.":
    "La configuración se recuperó. Las respuestas usan la versión publicada.",

  // ── SQL (supabase/baseline.sql) ───────────────────────────────────────────
  "A pausa antiga de IA por gasto foi desligada": "Se desactivó la pausa antigua de IA por gasto",
  'Esta organização estava marcada como desabilitada por gasto num mecanismo que nunca teve como ser reativado. Para voltar a parar a IA no limite, use Uso de IA › Orçamento e escolha "Parar a IA ao chegar no limite".':
    'Esta organización estaba marcada como deshabilitada por gasto en un mecanismo que nunca tuvo forma de reactivarse. Para volver a detener la IA en el límite, usa Uso de IA › Presupuesto y elige "Detener la IA al llegar al límite".',
  "Presença sem confirmação há mais tempo": "Asistencia sin confirmar desde hace más tiempo",
  "Confirme a presença no compromisso": "Confirma la asistencia a la cita",
  "A recuperação não foi iniciada": "La recuperación no se inició",
  "Este contato já tem outro acompanhamento. Revise o próximo passo; nenhuma recuperação ficou aguardando vaga.":
    "Este contacto ya tiene otro seguimiento. Revisa el siguiente paso; ninguna recuperación quedó esperando cupo.",
  "Mais de um fluxo atende a esta falta. Deixe apenas um configurado ou escolha manualmente o próximo passo.":
    "Más de un flujo atiende esta falta. Deja solo uno configurado o elige manualmente el siguiente paso.",
  "Configure um fluxo de recuperação e habilite-o em um assistente publicado. Esta falta não será iniciada retroativamente.":
    "Configura un flujo de recuperación y actívalo en un asistente publicado. Esta falta no se iniciará de forma retroactiva.",
  "O contexto mudou ou não há contato vinculado. Abra o compromisso e escolha o próximo passo.":
    "El contexto cambió o no hay un contacto vinculado. Abre la cita y elige el siguiente paso.",
  "O acompanhamento não conseguiu enviar a mensagem": "El seguimiento no pudo enviar el mensaje",
  "envio indisponível": "envío no disponible",
  "Link da reunião precisa de atenção": "El enlace de la reunión necesita atención",
  "Abra o compromisso na Agenda para verificar o link ou autorizar uma nova entrega.":
    "Abre la cita en la Agenda para verificar el enlace o autorizar un nuevo envío.",
  "Uma conversa aguarda um responsável": "Una conversación espera un responsable",
  "Confira o canal de origem desta conversa nas Conexões.": "Revisa el canal de origen de esta conversación en Conexiones.",
  "Confira os responsáveis do canal em Configurações → Atendimento e a disponibilidade da equipe. A distribuição continuará tentando.":
    "Revisa los responsables del canal en Configuración → Atención y la disponibilidad del equipo. La distribución seguirá intentándolo.",
};

/** Estado de template da plataforma → como se lê em espanhol. */
const ESTADO_DO_TEMPLATE: Record<string, string> = {
  APPROVED: "APROBADA",
  REJECTED: "RECHAZADA",
  DISABLED: "DESACTIVADA",
  PAUSED: "PAUSADA",
  PENDING: "PENDIENTE",
  IN_APPEAL: "EN APELACIÓN",
  PENDING_DELETION: "ELIMINACIÓN PENDIENTE",
  UNKNOWN: "DESCONOCIDO",
};

/** O rótulo do tipo de mídia (`rotuloDoTipo`) já com artigo, como a frase pede. */
const TIPO_DE_MIDIA: Record<string, string> = {
  imagem: "una imagen",
  áudio: "un audio",
  documento: "un documento",
  vídeo: "un video",
  mídia: "un archivo",
};

const DETALHE_TECNICO_ES = "Detalle técnico, para soporte:";

/** Um pedaço de frase conhecido (dicionário ou fixo); senão, como veio. */
function trecho(texto: string): string {
  return DICIONARIO[texto]?.es ?? FIXOS[texto] ?? texto;
}

/** "há 2 dias" / "há um dia" / "há 3 horas" / "há 1 hora" → "desde hace …". */
function espera(texto: string): string {
  const m = /^há (um|\d+) (dia|dias|hora|horas)$/.exec(texto);
  if (!m) return texto;
  const n = m[1] === "um" ? 1 : Number(m[1]);
  const unidade = m[2]!.startsWith("dia") ? (n === 1 ? "día" : "días") : n === 1 ? "hora" : "horas";
  return `desde hace ${n === 1 && m[2]!.startsWith("dia") ? "un" : n} ${unidade}`;
}

/** Troca, dentro de um texto maior, cada frase fixa conhecida pela tradução. */
function trocaConhecidas(texto: string, chaves: readonly string[]): string {
  let saida = texto;
  for (const chave of chaves) {
    if (saida.includes(chave)) saida = saida.split(chave).join(FIXOS[chave] ?? chave);
  }
  return saida;
}

const FRASES_DO_EVENTO_MORTO = [
  "Um cliente escreveu e a IA não respondeu; se ele não escrever de novo, a conversa fica sem resposta. Abra o Inbox e responda as conversas que estão esperando.",
  "Enquanto este aviso estiver aberto, outras respostas da IA que pararem de tentar não abrem aviso novo: depois de corrigida a causa, marque-o como resolvido para voltar a ser avisado.",
  "Uma tarefa automática do sistema falhou e parou de tentar: o que ela ia fazer não aconteceu, e não será tentado de novo.",
  "Enquanto este aviso estiver aberto, outras tarefas automáticas que pararem de tentar não abrem aviso novo (a IA que deixa de responder um cliente abre o seu próprio): depois de corrigida a causa, marque-o como resolvido para voltar a ser avisado.",
] as const;

/** Motivo de mídia não lida: fixo ou interpolado. */
function motivoDeMidia(texto: string): string {
  const fixo = trecho(texto);
  if (fixo !== texto) return fixo;
  let m = /^o modelo (.+) não enxerga imagens$/.exec(texto);
  if (m) return `el modelo ${m[1]} no ve imágenes`;
  m =
    /^não sei se o modelo (.+) enxerga imagens, então não arrisquei enviar a foto — escolha um modelo do catálogo em Agente de IA → Provedores$/.exec(
      texto,
    );
  if (m)
    return `no sé si el modelo ${m[1]} ve imágenes, así que no arriesgué enviar la foto: elige un modelo del catálogo en Agente de IA → Proveedores`;
  m = /^o provedor (.+) não está disponível nesta instalação$/.exec(texto);
  if (m) return `el proveedor ${m[1]} no está disponible en esta instalación`;
  return texto;
}

/** Motivo do envio de automação que falhou (frase de canal, mensagem crua ou código). */
function motivoDoEnvio(texto: string): string {
  const fixo = trecho(texto);
  if (fixo !== texto) return fixo;
  const m = /^A mensagem não saiu \((.+)\)\.$/.exec(texto);
  if (m) return `El mensaje no salió (${m[1]}).`;
  return texto;
}

interface Padrao {
  de: RegExp;
  para: (m: RegExpMatchArray) => string;
}

/** Frases interpoladas dos escritores, ancoradas. A ordem importa só entre parecidas. */
const PADROES: readonly Padrao[] = [
  // ── lib/channels/health.ts ────────────────────────────────────────────────
  {
    de: /^Conexão "(.+)": o servidor de WhatsApp recusou a chave de acesso$/,
    para: (m) => `Conexión "${m[1]}": el servidor de WhatsApp rechazó la clave de acceso`,
  },
  {
    de: /^Não foi possível verificar a conexão "(.+)"$/,
    para: (m) => `No se pudo verificar la conexión "${m[1]}"`,
  },
  {
    de: /^WhatsApp "(.+)" desconectado — precisa escanear o QR de novo$/,
    para: (m) => `WhatsApp "${m[1]}" desconectado: hay que escanear el QR de nuevo`,
  },
  {
    de: /^WhatsApp "(.+)" fora do ar \((.+)\)$/,
    para: (m) => `WhatsApp "${m[1]}" caído (${m[2]})`,
  },

  // ── lib/channels/zernio/avisos.ts ─────────────────────────────────────────
  {
    de: /^Modelo "(.+)": ([A-Z_]+)$/,
    para: (m) =>
      `Plantilla "${m[1] === "(sem nome)" ? "(sin nombre)" : m[1]}": ${ESTADO_DO_TEMPLATE[m[2]!] ?? m[2]}`,
  },

  // ── canal-mudo-watcher (parágrafos do corpo) ──────────────────────────────
  { de: /^Assim há (\d+) dia\(s\)\.$/, para: (m) => `Así desde hace ${m[1]} día(s).` },
  { de: /^Resolvido pelo sistema: (.+)\.$/, para: (m) => `Resuelto por el sistema: ${trecho(m[1]!)}.` },

  // ── recover-stuck-messages ────────────────────────────────────────────────
  {
    de: /^(\d+) respostas não chegaram ao cliente$/,
    para: (m) => `${m[1]} respuestas no llegaron al cliente`,
  },
  {
    de: /^Ficaram mais de ([\d.,]+) minutos aguardando envio e foram marcadas como falha\. Verifique se a conexão do WhatsApp está ativa e se o worker de envio está rodando\. Nada foi reenviado automaticamente — reenviar sem saber a causa arrisca mandar a mesma mensagem duas vezes\.$/,
    para: (m) =>
      `Pasaron más de ${m[1]} minutos esperando el envío y se marcaron como fallidas. Revisa que la conexión de WhatsApp esté activa y que el worker de envío esté corriendo. No se reenvió nada automáticamente: reenviar sin conocer la causa podría mandar el mismo mensaje dos veces.`,
  },

  // ── followup-sem-agente ───────────────────────────────────────────────────
  {
    de: /^O follow-up «(.+)» não está disparando$/,
    para: (m) => `El follow-up «${m[1]}» no se está disparando`,
  },
  {
    de: /^O fluxo «(.+)» está publicado e dispararia (.+?) — mas nenhum agente publicado arma ele, e por isso nenhum contato entra\. Abra IA › Agentes, escolha o agente que atende esse número, marque «\1» em "follow-ups que arma" e publique a versão\. Este aviso se resolve sozinho quando o vínculo existir\.$/,
    para: (m) =>
      `El flujo «${m[1]}» está publicado y se dispararía ${trecho(m[2]!)}, pero ningún agente publicado lo activa, así que ningún contacto entra. Abre IA › Agentes, elige el agente que atiende ese número, marca «${m[1]}» en "follow-ups que arma" y publica la versión. Este aviso se resuelve solo cuando exista el vínculo.`,
  },

  // ── case-stale-watcher ────────────────────────────────────────────────────
  {
    de: /^Um atendimento espera decisão (há .+)$/,
    para: (m) => `Una atención espera una decisión ${espera(m[1]!)}`,
  },
  {
    de: /^"([\s\S]+)" está aguardando alguém da equipe desde que foi aberto, e o cliente continua do outro lado\. Abra o caso e diga o que fazer — concluir, pedir informação ao cliente ou passar para uma pessoa\.( Este é o último aviso automático sobre ele\.)?$/,
    para: (m) =>
      `"${m[1]}" está esperando a alguien del equipo desde que se abrió, y el cliente sigue del otro lado. Abre el caso y di qué hacer: cerrarlo, pedirle información al cliente o pasarlo a una persona.` +
      (m[2] ? " Este es el último aviso automático sobre este caso." : ""),
  },
  {
    de: /^Alguém pediu atendimento e ninguém assumiu — (há .+)$/,
    para: (m) => `Alguien pidió atención y nadie la tomó: ${espera(m[1]!)}`,
  },
  {
    de: /^(A IA passou esta conversa para uma pessoa e ninguém assumiu desde então\. Abra a conversa: o contexto do que já foi dito está lá\.) (Este é o último aviso automático sobre esta conversa\.)$/,
    para: (m) => `${trecho(m[1]!)} ${trecho(m[2]!)}`,
  },

  // ── lib/automation/desfecho-do-envio.ts ───────────────────────────────────
  {
    de: /^A automação "(.+?)" disparou e a mensagem não chegou\. ([\s\S]*) Nada foi reenviado automaticamente — reenviar sem saber a causa arrisca mandar a mesma mensagem duas vezes\.$/,
    para: (m) =>
      `La automatización "${m[1]}" se disparó y el mensaje no llegó. ${motivoDoEnvio(m[2]!)} No se reenvió nada automáticamente: reenviar sin conocer la causa podría mandar el mismo mensaje dos veces.`,
  },

  // ── lib/escalacao/aviso-ao-suporte.ts ─────────────────────────────────────
  {
    de: /^([\s\S]+) O atendimento continua esperando na fila\.$/,
    para: (m) => `${trecho(m[1]!)} La atención sigue esperando en la cola.`,
  },

  // ── lib/event-log/aviso-de-evento-morto.ts ────────────────────────────────
  {
    de: /^([\s\S]+) Detalhe técnico, para quem der suporte: evento (\S+), (\d+) tentativas; motivo: ([\s\S]*)$/,
    para: (m) =>
      `${trocaConhecidas(m[1]!, FRASES_DO_EVENTO_MORTO)} ${DETALHE_TECNICO_ES} evento ${m[2]}, ${m[3]} intentos; motivo: ${m[4]}`,
  },

  // ── lib/leads/risk-seed.ts ────────────────────────────────────────────────
  {
    de: /^Revise (\d+) (?:negócio parado|negócios parados) e decida quais encerrar$/,
    para: (m) =>
      `Revisa ${m[1]} ${m[1] === "1" ? "negocio estancado" : "negocios estancados"} y decide cuáles cerrar`,
  },
  {
    de: /^(\d+) sem resposta há muito tempo e (\d+) esfriando\. Eles já estavam assim antes de o sistema passar a acompanhar — por isso aparecem juntos agora, e não porque algo aconteceu hoje\. Encerrar o que morreu é o que faz o radar voltar a significar alguma coisa\.$/,
    para: (m) =>
      `${m[1]} sin respuesta desde hace mucho tiempo y ${m[2]} enfriándose. Ya estaban así antes de que el sistema empezara a hacer seguimiento; por eso aparecen juntos ahora, y no porque algo haya pasado hoy. Cerrar lo que ya murió es lo que hace que el radar vuelva a significar algo.`,
  },

  // ── lib/leads/reactivation.ts ─────────────────────────────────────────────
  {
    de: /^Decida sobre (\d+) (?:negócio parado|negócios parados) — a sugestão de retomar venceu$/,
    para: (m) =>
      `Decide sobre ${m[1]} ${m[1] === "1" ? "negocio estancado" : "negocios estancados"}: la sugerencia de retomar venció`,
  },
  {
    de: /^(?:Um negócio esfriou|(\d+) negócios esfriaram) e a sugestão de retomar contato ficou sem resposta até o prazo\. Eles saíram do quadro para não parecerem em andamento\. Retomar ou encerrar — as duas são decisões; deixar como está é a única que não é\.$/,
    para: (m) =>
      `${m[1] ? `${m[1]} negocios se enfriaron` : "Un negocio se enfrió"} y la sugerencia de retomar el contacto quedó sin respuesta hasta el plazo. Salieron del tablero para que no parezcan en curso. Retomar o cerrar: las dos son decisiones; dejarlo como está es la única que no lo es.`,
  },

  // ── lib/contacts/proposta-de-dado.ts ──────────────────────────────────────
  {
    de: /^(\d+) informações de clientes venceram sem alguém conferir$/,
    para: (m) => `${m[1]} datos de clientes vencieron sin que nadie los revisara`,
  },

  // ── lib/followup/engine.ts ────────────────────────────────────────────────
  {
    de: /^O fluxo "(.+)" \(enrollment (\S+)\) foi marcado como "dead": ([\s\S]*)$/,
    para: (m) => `El flujo "${m[1]}" (enrollment ${m[2]}) se marcó como "dead": ${m[3]}`,
  },
  {
    de: /^O fluxo "(.+)" esperava a data do retorno, mas o atendimento que o originou foi encerrado ou substituído no meio da espera, e o envio foi cancelado \(enrollment (\S+)\)\. Fale com o contato por outro caminho se ainda fizer sentido\.$/,
    para: (m) =>
      `El flujo "${m[1]}" esperaba la fecha del seguimiento, pero la atención que lo originó se cerró o se reemplazó durante la espera, y el envío se canceló (enrollment ${m[2]}). Habla con el contacto por otro medio si todavía tiene sentido.`,
  },

  // ── lib/agent-engine/pacing/aviso-de-janela.ts ────────────────────────────
  {
    de: /^Este número está com \*\*envio aos domingos desligado\*\*, e a janela de horário é (.+?) \(fuso (.+?)\)\. Quem escrever agora recebe resposta a partir de (.+?)\. Nenhuma mensagem se perde — os turnos ficam na fila e saem na abertura\. Se quiser que o agente responda aos domingos, ligue "Enviar aos domingos" em Conexões › Anti-ban\.$/,
    para: (m) =>
      `Este número tiene el **envío los domingos desactivado**, y la ventana de horario es ${m[1]} (zona horaria ${m[2]}). Quien escriba ahora recibirá respuesta a partir de ${m[3]}. No se pierde ningún mensaje: los turnos quedan en la cola y salen cuando se abra. Si quieres que el agente responda los domingos, activa "Enviar los domingos" en Conexiones › Anti-ban.`,
  },
  {
    de: /^A janela de envio deste número é (.+?) \(fuso (.+?)\), e agora está fechada\. Quem escrever agora recebe resposta a partir de (.+?)\. Nenhuma mensagem se perde — os turnos ficam na fila e saem na abertura\. Não é preciso fazer nada: as respostas saem sozinhas na abertura\.$/,
    para: (m) =>
      `La ventana de envío de este número es ${m[1]} (zona horaria ${m[2]}) y ahora está cerrada. Quien escriba ahora recibirá respuesta a partir de ${m[3]}. No se pierde ningún mensaje: los turnos quedan en la cola y salen cuando se abra. No tienes que hacer nada: las respuestas salen solas cuando se abra.`,
  },

  // ── lib/agent-engine/edge/llm/orcamento.ts (corpoDoBloqueio) ──────────────
  {
    de: /^O gasto de IA deste mês chegou a (.+?) de um limite de (.+?) \((\d+)%\), e você escolheu que a IA parasse ao chegar nele\. As conversas que estavam sendo atendidas foram para a FILA DE ATENDIMENTO HUMANO — ninguém ficou sem próximo passo, mas alguém precisa responder\. Aumentar o limite ou desligar a parada em Uso de IA › Orçamento evita paradas NOVAS; cada conversa já parada volta ao automático pelo botão "Devolver ao automático" no cabeçalho dela\.$/,
    para: (m) =>
      `El gasto de IA de este mes llegó a ${m[1]} de un límite de ${m[2]} (${m[3]}%), y elegiste que la IA se detuviera al alcanzarlo. Las conversaciones que se estaban atendiendo pasaron a la COLA DE ATENCIÓN HUMANA: nadie se quedó sin siguiente paso, pero alguien tiene que responder. Subir el límite o desactivar la parada en Uso de IA › Presupuesto evita paradas NUEVAS; cada conversación ya detenida vuelve al automático con el botón "Devolver al automático" en su encabezado.`,
  },

  // ── lib/agent-engine/edge/llm/run-model-call.ts (endereço sem chave) ──────
  {
    de: /^A IA vai deixar de usar o endereço próprio desta empresa sem a chave dela em (.+)$/,
    para: (m) => `La IA dejará de usar la dirección propia de esta empresa sin su clave el ${m[1]}`,
  },
  {
    de: /^O ponto "(.+?)" está configurado em Agente de IA › Provedores para um endereço próprio(?: \((.+?)\))?, mas esta empresa não tem chave de (.+?) cadastrada e validada\. A chave de IA da instalação — a que paga a conta de todas as empresas deste servidor — não é enviada a um endereço escolhido por uma empresa\. (?:(A chamada foi recusada antes de sair\. Enquanto isso não for corrigido, as chamadas desse ponto continuam recusadas; quando o ponto faz parte do atendimento, o agente deixa de responder aos clientes desta empresa\. )|A chamada SEGUIU desta vez, mas isso tem prazo: a partir de (.+?) ela passa a ser recusada, e quando o ponto faz parte do atendimento o agente deixa de responder aos clientes desta empresa\. Corrija antes dessa data\. )Para resolver: cadastre a chave da empresa em Agente de IA › Provedores, ou tire o endereço próprio para voltar ao provedor padrão da instalação\.$/,
    para: (m) =>
      `El punto "${trecho(m[1]!)}" está configurado en Agente de IA › Proveedores para una dirección propia${m[2] ? ` (${m[2]})` : ""}, pero esta empresa no tiene una clave de ${m[3]} registrada y validada. La clave de IA de la instalación (la que paga la cuenta de todas las empresas de este servidor) no se envía a una dirección elegida por una empresa. ` +
      (m[4]
        ? "La llamada se rechazó antes de salir. Mientras esto no se corrija, las llamadas de ese punto seguirán rechazadas; si el punto es parte de la atención, el agente deja de responder a los clientes de esta empresa. "
        : `La llamada SIGUIÓ esta vez, pero esto tiene plazo: a partir del ${m[5]} se rechazará, y si el punto es parte de la atención, el agente dejará de responder a los clientes de esta empresa. Corrígelo antes de esa fecha. `) +
      "Para resolverlo: registra la clave de la empresa en Agente de IA › Proveedores, o quita la dirección propia para volver al proveedor predeterminado de la instalación.",
  },

  // ── lib/agent-engine/obs/metrics.ts ───────────────────────────────────────
  {
    de: /^média de cache_read\/input nos últimos (\d+) runs da janela = ([\d.]+)% \(alvo ≥ ([\d.]+)%\)\. Prefixo do prompt possivelmente abaixo do mínimo cacheável do modelo ou com conteúdo volátil antes do último breakpoint — ver CLAUDE\.md regra 15 e o smoke de caching\.$/,
    para: (m) =>
      `promedio de cache_read/input en las últimas ${m[1]} ejecuciones de la ventana = ${m[2]}% (objetivo ≥ ${m[3]}%). El prefijo del prompt posiblemente está por debajo del mínimo cacheable del modelo o tiene contenido volátil antes del último breakpoint: ver CLAUDE.md regla 15 y el smoke de caching.`,
  },

  // ── lib/agent-engine/agent/inbound-turn.ts ────────────────────────────────
  {
    de: /^As ferramentas configuradas na tela do agente não puderam ser carregadas neste atendimento, e ele respondeu ao cliente sem elas\. A conversa não foi interrompida\. Motivo técnico: ([\s\S]*)$/,
    para: (m) =>
      `Las herramientas configuradas en la pantalla del agente no se pudieron cargar en esta atención, y respondió al cliente sin ellas. La conversación no se interrumpió. Motivo técnico: ${m[1]}`,
  },
  {
    de: /^Mensagem do lead parece relatar risco\/urgência, mas o número está em warm-up\/bateu o cap diário \((.+?)\) — a resposta automática só sai em (\S+)\. Considere responder manualmente pelo WhatsApp enquanto o número aquece\.$/,
    para: (m) =>
      `El mensaje del lead parece reportar un riesgo o una urgencia, pero el número está en calentamiento o llegó al límite diario (${m[1]}): la respuesta automática recién saldrá el ${m[2]}. Considera responder manualmente por WhatsApp mientras el número se calienta.`,
  },

  // ── lib/agent-engine/edge/crm/move-lead-stage.ts ──────────────────────────
  {
    de: /^O assistente concluiu que este negócio deveria ir para "(.+?)", mas ele não cuida do funil onde o negócio está \(([\s\S]+)\)\. Ninguém mexeu no card\. Se ele deveria cuidar desse funil, marque isso na configuração do assistente; se não, não há nada a fazer\.$/,
    para: (m) =>
      `El asistente concluyó que este negocio debería pasar a "${m[1]}", pero no se encarga del embudo donde está el negocio (${m[2]}). Nadie movió la tarjeta. Si debería encargarse de ese embudo, márcalo en la configuración del asistente; si no, no hay nada que hacer.`,
  },
  {
    de: /^O assistente concluiu que este negócio deveria ir para "(.+?)", que no seu funil é uma etapa de perda\. Perder um negócio exige um motivo, e o motivo é a razão que quem está no negócio reconhece — o assistente não inventa uma\. Ninguém mexeu no card: ele continua onde estava\. Se o negócio realmente se perdeu, abra o card no funil, use "Marcar como perdido" e informe o motivo; se não, não há nada a fazer\.$/,
    para: (m) =>
      `El asistente concluyó que este negocio debería pasar a "${m[1]}", que en tu embudo es una etapa de pérdida. Perder un negocio exige un motivo, y el motivo es la razón que reconoce quien lleva el negocio: el asistente no inventa uno. Nadie movió la tarjeta: sigue donde estaba. Si el negocio realmente se perdió, abre la tarjeta en el embudo, usa "Marcar como perdido" e indica el motivo; si no, no hay nada que hacer.`,
  },
  {
    de: /^lead_state avançou para "(.+?)" no harness, mas crm_move_lead_stage falhou \(([\s\S]+)\)\. Reconcilie o stage no CRM manualmente\.$/,
    para: (m) =>
      `lead_state avanzó a "${m[1]}" en el harness, pero crm_move_lead_stage falló (${m[2]}). Concilia la etapa en el CRM manualmente.`,
  },

  // ── lib/agent-engine/guardrails/jailbreak/classifier.ts ───────────────────
  {
    de: /^A última mensagem deste lead foi sinalizada com risco de jailbreak\/injeção \(nível: (.+?)\) e, no MESMO turno, o agente tentou uma promessa fora da tabela do playbook\. Revise a conversa: o padrão sugere tentativa de manipulação para arrancar oferta indevida\.$/,
    para: (m) =>
      `El último mensaje de este lead se marcó con riesgo de jailbreak/inyección (nivel: ${m[1]}) y, en el MISMO turno, el agente intentó una promesa fuera de la tabla del playbook. Revisa la conversación: el patrón sugiere un intento de manipulación para sacar una oferta indebida.`,
  },

  // ── lib/agent-engine/health/circuit.ts ────────────────────────────────────
  {
    de: /^Bloqueios em (\d+%) dos (\d+) últimos envios do número \(limiar (\d+%)\)\. Outbound em espera automática — a fila retém, nada é perdido\. Verifique o número \(possível queima do WhatsApp\) e resolva este item para retomar\.$/,
    para: (m) =>
      `Bloqueos en ${m[1]} de los últimos ${m[2]} envíos del número (umbral ${m[3]}). Envíos salientes en espera automática: la cola los retiene, no se pierde nada. Revisa el número (posible bloqueo de WhatsApp) y resuelve este ítem para retomar.`,
  },
  {
    de: /^Taxa de resposta em (\d+%) \((\d+) de (\d+) leads contatados responderam; piso (\d+%)\)\. Outbound em espera automática — a fila retém\. Verifique a abordagem\/o número e resolva este item para retomar\.$/,
    para: (m) =>
      `Tasa de respuesta en ${m[1]} (${m[2]} de ${m[3]} leads contactados respondieron; mínimo ${m[4]}). Envíos salientes en espera automática: la cola los retiene. Revisa el enfoque o el número y resuelve este ítem para retomar.`,
  },

  // ── lib/wacalls/events-bridge.ts ──────────────────────────────────────────
  { de: /^Chamada perdida de (.+)$/, para: (m) => `Llamada perdida de ${m[1]}` },
  {
    de: /^A chamada terminou por um motivo que ainda não sabemos traduzir \((.+)\)\.$/,
    para: (m) => `La llamada terminó por un motivo que todavía no sabemos traducir (${m[1]}).`,
  },

  // ── workers/rag-indexer.ts ────────────────────────────────────────────────
  {
    de: /^"(.+)" ainda não entrou na base de conhecimento$/,
    para: (m) => `"${m[1]}" todavía no entró en la base de conocimiento`,
  },
  {
    de: /^"(.+)" não entrou na base de conhecimento$/,
    para: (m) => `"${m[1]}" no entró en la base de conocimiento`,
  },
  {
    de: /^O agente ainda não sabe o que está neste material\. Motivo: ([\s\S]*)$/,
    para: (m) => `El agente todavía no sabe qué contiene este material. Motivo: ${m[1]}`,
  },

  // ── workers/media-derive-worker.ts ────────────────────────────────────────
  {
    de: /^O agente não conseguiu ler (imagem|áudio|documento|vídeo|mídia) que o cliente enviou$/,
    para: (m) => `El agente no pudo leer ${TIPO_DE_MIDIA[m[1]!] ?? m[1]} que envió el cliente`,
  },
  {
    de: /^Motivo: ([\s\S]+?)\. ([\s\S]+?) Para resolver, ajuste o modelo desse ponto em Agente de IA → Provedores, ou cadastre a chave necessária em Credenciais\.(?: Detalhe técnico, para quem der suporte: ([\s\S]*))?$/,
    para: (m) =>
      `Motivo: ${motivoDeMidia(m[1]!)}. ${trecho(m[2]!)} Para resolverlo, ajusta el modelo de ese punto en Agente de IA → Proveedores, o registra la clave necesaria en Credenciales.` +
      (m[3] !== undefined ? ` ${DETALHE_TECNICO_ES} ${m[3]}` : ""),
  },

  // ── app/api/v1/pipelines/[id]/board (next_action_ambiguous) ───────────────
  {
    de: /^A IA propôs uma próxima ação, mas o contato tem (\d+) negócios abertos$/,
    para: (m) => `La IA propuso una próxima acción, pero el contacto tiene ${m[1]} negocios abiertos`,
  },
  {
    de: /^Proposta: "([\s\S]*)"\. Escolha a qual negócio ela pertence — o sistema não adivinha para não executar no negócio errado\.$/,
    para: (m) =>
      `Propuesta: "${m[1]}". Elige a qué negocio pertenece: el sistema no adivina para no ejecutarla en el negocio equivocado.`,
  },

  // ── SQL: fn_appointment_confirmation_sweep / fn_followup_inline_settle ────
  {
    de: /^Compromisso: ([\s\S]*)\. Abra e registre se a pessoa compareceu, faltou ou cancelou\. O horário sozinho não confirma falta\.$/,
    para: (m) =>
      `Cita: ${m[1]}. Ábrela y registra si la persona asistió, faltó o canceló. La hora por sí sola no confirma una falta.`,
  },
  {
    de: /^Abra o acompanhamento e confira o canal\. Motivo: ([\s\S]*)$/,
    para: (m) => `Abre el seguimiento y revisa el canal. Motivo: ${trecho(m[1]!)}`,
  },

  // ── lib/ai/agents/legacy-notice.ts ────────────────────────────────────────
  {
    de: /^([\s\S]+) Abra IA → Agentes → Recuperar agente legado\.$/,
    para: (m) => `${trecho(m[1]!)} Abre IA → Agentes → Recuperar agente heredado.`,
  },
];

/** Passos 1–3: a frase inteira, sem quebrar em pedaços. */
function fraseInteira(texto: string): string | null {
  const doDicionario = DICIONARIO[texto]?.es;
  if (doDicionario !== undefined) return doDicionario;
  const fixo = FIXOS[texto];
  if (fixo !== undefined) return fixo;
  for (const { de, para } of PADROES) {
    const m = texto.match(de);
    if (m) return para(m);
  }
  return null;
}

/**
 * O título ou corpo de um aviso da Central no idioma de quem lê.
 *
 * `null`/`undefined` → `""`. Fora do espanhol, o texto volta intocado.
 */
export function traduzirAviso(texto: string | null | undefined, idioma: string): string {
  if (texto == null) return "";
  if (idioma !== "es" || texto === "") return texto;

  const inteira = fraseInteira(texto);
  if (inteira !== null) return inteira;

  // Corpo composto: o adendo de passagem (`\n\n`), o canal mudo com o sufixo de
  // dias, o corpo curto da passagem (` · `). Cada pedaço tenta a frase inteira;
  // o que não casar fica como veio.
  for (const separador of ["\n\n", " · "]) {
    if (texto.includes(separador)) {
      const partes = texto.split(separador);
      const traduzidas = partes.map((parte) => traduzirAviso(parte, idioma));
      if (traduzidas.some((traduzida, i) => traduzida !== partes[i])) return traduzidas.join(separador);
    }
  }

  return texto;
}
