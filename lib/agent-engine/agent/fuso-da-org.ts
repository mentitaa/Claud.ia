/**
 * O FUSO DA ORGANIZAÇÃO — de onde o turno tira "que horas são aqui".
 *
 * ⚠️ A FONTE É `organizations.timezone`, E NÃO `channel_knobs.timezone`.
 *
 * As duas colunas guardam um IANA e hoje guardam o MESMO texto
 * (`America/Sao_Paulo`) numa instalação brasileira — o que faz a escolha
 * parecer indiferente. Não é, e o defeito só aparece no cliente que não é de
 * São Paulo:
 *
 *   - `organizations.timezone` é o fuso que a PESSOA escolheu, no wizard de
 *     boas-vindas (`app/actions/onboarding/acceptWelcome.ts`) e em
 *     Configurações › Empresa (`app/actions/settings/updateTenant.ts`).
 *   - `channel_knobs.timezone` é knob ANTI-BAN por canal: o PUT de
 *     `/api/v1/ai/pacing` grava só o que vem no body, e a coluna fica `null`
 *     em quem nunca abriu o painel. Nulo, a JANELA cai no fuso da organização
 *     (`fusoDaJanela`, em `pacing/store.ts`); preenchido, segue o número — e
 *     ler esse valor aqui faria uma escolha anti-ban mudar o relógio do
 *     agente. Até a janela ganhar essa escada, o nulo caía no literal de São
 *     Paulo: numa clínica de Manaus, uma hora de erro, calada.
 *
 * Ler o fuso do pacing seria de graça (o turno já o carrega) e é exatamente por
 * isso que a armadilha existe.
 *
 * ⚠️ FALHA ABERTA, e isso é decisão, não descuido. A leitura pode estourar num
 * clone cujo schema está atrás do código, e o valor pode ser um fuso que o
 * `Intl` recusa — `organizations.timezone` não é validado por escritor nenhum
 * (`tenantSchema` e o schema do onboarding são `z.string().max(64)` sem
 * `refine`, e a coluna não tem CHECK). Nos dois casos o turno segue com o
 * padrão do produto: derrubar o atendimento de um cliente por causa de um
 * acento no campo de configuração seria pior que uma hora de diferença.
 */

import { normalizarIdioma, type Idioma } from '@/lib/i18n/idiomas';
import { FUSO_PADRAO, fusoValido } from '@/lib/tempo/fusos';

import type { Queryable } from '../queue/queue';
import type { Logger } from '../obs/logger';

/**
 * O fuso IANA da organização, sempre utilizável.
 *
 * Nunca lança e nunca devolve string vazia — quem chama pode passar direto ao
 * `Intl`. Quando degrada, o motivo vai ao log com o valor recusado: sem isso, a
 * organização de Manaus que digitou o fuso errado veria horários de São Paulo
 * para sempre, sem nada explicando.
 */
export async function fusoDaOrganizacao(
  db: Queryable,
  organizationId: string,
  log?: Logger,
): Promise<string> {
  let bruto: string | null = null;
  try {
    const { rows } = await db.query<{ timezone: string | null }>(
      'select timezone from organizations where id = $1',
      [organizationId],
    );
    bruto = rows[0]?.timezone ?? null;
  } catch (err) {
    log?.warn('não consegui ler o fuso da organização — o turno segue no padrão', {
      fuso_padrao: FUSO_PADRAO,
      error: (err instanceof Error ? err.message : String(err)).slice(0, 120),
    });
    return FUSO_PADRAO;
  }

  const tz = bruto?.trim() ?? '';
  if (tz !== '' && fusoValido(tz)) return tz;

  log?.warn('fuso da organização inutilizável — o turno segue no padrão', {
    // O valor recusado vai ao log porque é ele que diz o que corrigir na tela.
    // Não é PII: é um código IANA de configuração, não dado de pessoa.
    fuso_recusado: tz,
    fuso_padrao: FUSO_PADRAO,
  });
  return FUSO_PADRAO;
}

/**
 * Claud.ia — o idioma da organização, para dizer ao modelo em que língua
 * escrever o que fica guardado (resumos, notas, títulos de caso). Os prompts do
 * motor são em português; sem esta linha o Haiku responde em português nos
 * campos internos mesmo com a clínica toda em espanhol. Nunca lança.
 */
export async function idiomaDaOrganizacao(db: Queryable, organizationId: string): Promise<Idioma> {
  try {
    const { rows } = await db.query<{ locale: string | null }>(
      'select locale from organizations where id = $1',
      [organizationId],
    );
    return normalizarIdioma(rows[0]?.locale ?? null);
  } catch {
    return normalizarIdioma(null);
  }
}

/** Bloco de idioma para a abertura do turno. Vazio para português. */
export function blocoDeIdioma(idioma: Idioma): string {
  if (idioma !== 'es') return '';
  return (
    '## Idioma\n' +
    'Escribe SIEMPRE en español (Perú): los mensajes al cliente, las notas de memoria, los títulos y ' +
    'resúmenes de casos, los campos de las herramientas (request_human_handoff, schedule_followup, ' +
    'open_human_case) y todo el texto del JSON de cierre (commitments, objections, next_action, ' +
    'rolling_summary, declaracao). Nunca en portugués, aunque estas instrucciones internas estén en portugués.'
  );
}
