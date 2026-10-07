/**
 * OS QUADROS PRONTOS, POR TIPO DE NEGÓCIO.
 *
 * Existem por duas razões, e a segunda é a que importa mais:
 *
 * 1. São o PLANO B. Quando a chave de IA não está no lugar, não tem saldo, ou o
 *    provedor devolve algo que não vira funil, o passo continua entregando um
 *    quadro que faz sentido — em vez de devolver a pessoa ao funil de
 *    e-commerce que o gatilho semeou. Falhar fechado na ação, aberto na
 *    informação: a tela diz que a sugestão não veio e mostra os prontos.
 *
 * 2. São a RÉGUA. É contra estes exemplos que a sugestão da IA é pedida e
 *    comparada. Sem um alvo concreto, "sugira um funil" devolve cinco colunas
 *    com nomes de manual de vendas ("Prospecção", "MQL", "Fundo de funil") que
 *    não são o que o dono de uma clínica chama as coisas.
 *
 * ⚠️ TODA ETAPA CARREGA O PASSO. Um pacote que só desse os nomes trocaria um
 * quadro errado por um quadro certo e igualmente parado — ver o cabeçalho de
 * `proposta-de-funil.ts` para a medição.
 */
import type { PropostaDeFunil } from "@/lib/onboarding/proposta-de-funil";

export interface PacoteDeFunil {
  id: string;
  /**
   * Como o dono reconhece o próprio negócio nesta lista. Não é o nome do nicho
   * no material de marketing ("vertical de saúde") — é o que ele responderia se
   * alguém perguntasse o que ele faz.
   */
  comoSeApresenta: string;
  proposta: PropostaDeFunil;
}

export const PACOTES: readonly PacoteDeFunil[] = [
  {
    id: "clinica",
    comoSeApresenta: "Clínica, consultorio o salón",
    proposta: {
      nome: "Citas",
      etapas: [
        { nome: "Nuevo contacto", passo: "new" },
        { nome: "Ya respondí", passo: "contacted" },
        { nome: "Entendiendo el caso", passo: "qualifying" },
        { nome: "Quiere agendar", passo: "qualified" },
        { nome: "Eligiendo horario", passo: "negotiating" },
        { nome: "Cita agendada", passo: "won" },
        { nome: "No va a agendar", passo: "lost" },
      ],
    },
  },
  {
    id: "imobiliaria",
    comoSeApresenta: "Inmobiliaria o asesor inmobiliario",
    proposta: {
      nome: "Interesados",
      etapas: [
        { nome: "Nuevo interesado", passo: "new" },
        { nome: "Ya respondí", passo: "contacted" },
        { nome: "Entendiendo qué busca", passo: "qualifying" },
        { nome: "Sé qué ofrecerle", passo: "qualified" },
        { nome: "Visitando inmuebles", passo: "negotiating" },
        { nome: "Cerró el trato", passo: "won" },
        { nome: "Desistió", passo: "lost" },
      ],
    },
  },
  {
    id: "servicos",
    comoSeApresenta: "Servicios, agencia u obra",
    proposta: {
      nome: "Cotizaciones",
      etapas: [
        { nome: "Pedido nuevo", passo: "new" },
        { nome: "Ya respondí", passo: "contacted" },
        { nome: "Entendiendo el proyecto", passo: "qualifying" },
        { nome: "Cotización enviada", passo: "qualified" },
        { nome: "Negociando", passo: "negotiating" },
        { nome: "Cerró", passo: "won" },
        { nome: "No cerró", passo: "lost" },
      ],
    },
  },
  {
    id: "curso",
    comoSeApresenta: "Curso, mentoría o infoproducto",
    proposta: {
      nome: "Matrículas",
      etapas: [
        { nome: "Nuevo interesado", passo: "new" },
        { nome: "Ya respondí", passo: "contacted" },
        { nome: "Resolviendo dudas", passo: "qualifying" },
        { nome: "Quiere inscribirse", passo: "qualified" },
        { nome: "Cerrando condiciones", passo: "negotiating" },
        { nome: "Matriculado", passo: "won" },
        { nome: "Desistió", passo: "lost" },
      ],
    },
  },
  {
    id: "loja",
    comoSeApresenta: "Tienda en línea o física",
    proposta: {
      nome: "Ventas",
      etapas: [
        { nome: "Nuevo contacto", passo: "new" },
        { nome: "Ya respondí", passo: "contacted" },
        { nome: "Eligiendo el producto", passo: "qualifying" },
        { nome: "Va a comprar", passo: "qualified" },
        { nome: "Esperando el pago", passo: "negotiating" },
        { nome: "Pedido pagado", passo: "won" },
        { nome: "No compró", passo: "lost" },
      ],
    },
  },
  {
    id: "generico",
    // Último de propósito: quem não se reconhece em nenhum dos outros já leu
    // todos antes de chegar aqui.
    comoSeApresenta: "Otro tipo de negocio",
    proposta: {
      nome: "Clientes",
      etapas: [
        { nome: "Nuevo contacto", passo: "new" },
        { nome: "Ya respondí", passo: "contacted" },
        { nome: "Entendiendo la necesidad", passo: "qualifying" },
        { nome: "Propuesta enviada", passo: "qualified" },
        { nome: "Negociando", passo: "negotiating" },
        { nome: "Cerró", passo: "won" },
        { nome: "No cerró", passo: "lost" },
      ],
    },
  },
] as const;

/**
 * O pacote de último recurso.
 *
 * Existe como CONSTANTE e não como `PACOTES[0]` porque quem chama precisa de uma
 * garantia de que sempre há um: um índice fixo numa lista editável é a promessa
 * que se quebra na primeira reordenação, e o desfecho seria uma tela de
 * onboarding com `undefined` no lugar do quadro.
 */
export const PACOTE_PADRAO: PacoteDeFunil =
  PACOTES.find((p) => p.id === "generico") ??
  (() => {
    throw new Error("PACOTES sem o pacote genérico — ele é o último recurso do passo do funil");
  })();
