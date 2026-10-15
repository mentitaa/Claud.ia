/**
 * O PERFIL DO PAÍS DA ORGANIZAÇÃO — o documento do titular, a lei citada, o
 * calendário do prazo e os padrões de dado pessoal que o anonimizador redige.
 *
 * ─── Por que por ORGANIZAÇÃO, e não por instalação ─────────────────────────
 *
 * Duas organizações no mesmo banco podem estar em países diferentes, e cada
 * uma vê o documento, a lei e o prazo do país DELA. Um `.env` (`APP_COUNTRY`)
 * não sabe disso: ele responde por processo, e o processo serve todas as
 * organizações. A coluna `organizations.country` (ISO-3166 alpha-2, `null` =
 * Brasil) é a resposta; este módulo é quem a lê.
 *
 * ─── Por que uma função, e não `select` inline em cada rota ───────────────
 *
 * Mesmo motivo escrito no cabeçalho de `lib/catalogo/moeda-da-org.ts`: são
 * vários consumidores (validador do contato, importação por planilha,
 * anonimizador, PDF de acesso, página de privacidade, prazo do SLA) e duas
 * leituras inline divergem no dia em que uma ganhar fallback e a outra não.
 * A divergência aqui seria pior do que no catálogo: um documento afirmaria a
 * lei de um país e o prazo seria contado pelo calendário de outro.
 *
 * ─── A régua para um país ENTRAR (lida da issue #1033) ────────────────────
 *
 * "País entra na lista com a citação revisada, ou não entra." O PDF de acesso
 * responde a um direito legal do titular, e citar a lei errada — ou o artigo
 * errado — é pior do que não citar artigo nenhum. Por isso:
 *
 *   • `lei.revisada === false` (ou `lei === null`) faz o documento NÃO citar
 *     lei nenhuma. Não há fallback para a lei brasileira: afirmar a LGPD para
 *     um titular em Angola é exatamente a citação errada;
 *   • `paisesOferecidos()` — a lista que o seletor de Configurações mostra —
 *     só inclui país com citação revisada. O registro pode conhecer mais
 *     países do que a lista oferece; é o que permite preparar o trabalho sem
 *     publicar o que ninguém revisou.
 *
 * ─── A separação documento × forma (regra adotada do #928) ────────────────
 *
 * Não se inventa dígito verificador. País com checksum público documentado
 * (Brasil) mantém o mod-11 de hoje, sem regressão; país sem checksum valida
 * FORMA e a `regra` do perfil diz isso com todas as letras, para que a
 * mensagem de erro não prometa uma garantia que o validador não dá.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { HOLIDAYS_BR_ISO } from "@/lib/lgpd/holidays-br";
import { FERIADOS_PE_ISO } from "@/lib/lgpd/feriados-pe";

/** ISO-3166 alpha-2, em maiúsculas. `null`/vazio na coluna significa Brasil. */
export type CodigoDePais = string;

/**
 * Um padrão de dado pessoal que ESTE país redige antes de a conversa ir para o
 * modelo de IA.
 *
 * `fonte` é a regex em texto, e não um `RegExp` montado: quem consome precisa
 * de instância nova por chamada — o `lastIndex` do `/g` atravessa `.test()` e
 * corrompe a guarda de vazamento (mesma razão anotada em
 * `lib/ai/anonymize/index.ts`).
 */
export interface PadraoDePiiDoPais {
  /** Rótulo do tipo, o mesmo que aparece no marcador: `[CPF]`, `[BI]`. */
  tipo: string;
  /** Marcador que substitui o dado no texto anonimizado, com colchetes. */
  marcador: string;
  /** A regex, em texto, sem as flags. Cada consumidor cria a instância. */
  fonte: string;
  /**
   * O que este padrão **não** cobre. A issue #1033 exige a declaração: um
   * padrão largo demais redige número de pedido e cria ruído no RAG; largo de
   * menos deixa o documento chegar ao modelo — e os dois defeitos são
   * silenciosos sem esta linha escrita.
   */
  naoCobre: string;
}

export interface DocumentoDoTitular {
  /** O rótulo da tela: "CPF", "Documento". */
  rotulo: string;
  /** Exemplo mostrado no formulário e nas mensagens. */
  exemplo: string;
  /** O que a validação GARANTE. Vai para a mensagem de erro. */
  regra: string;
  /**
   * A mensagem de erro pronta, por país. É texto de produto, e não remendo de
   * `regra`: país sem checksum público precisa DIZER que a validação é de
   * forma (a issue exige), e o texto brasileiro continua `CPF inválido`, o de
   * sempre, para não mexer no que quem já usa conhece.
   */
  mensagemInvalido: string;
  /** `true` quando o validador confere dígito verificador, e não só a forma. */
  confereDigito: boolean;
  /**
   * Cabeçalhos de planilha que apontam para este documento, JÁ normalizados
   * como `normalizaHeader` de `lib/contacts/csv.ts` os entrega (sem acento, em
   * minúsculas, separador `_`): quem importa tem "CPF" no Excel brasileiro e
   * "Bilhete de Identidade" no angolano. A coluna do banco continua `cpf` — o
   * vocabulário de TELA muda, o schema não (decisão escrita na issue #1033).
   */
  apelidosDoCabecalho: readonly string[];
  /** Valida o valor como o usuário digitou. */
  valida(valor: string): boolean;
  /** Como o valor é GRAVADO (a planilha não decide o formato do banco). */
  normaliza(valor: string): string;
}

export interface LeiCitada {
  /** Sigla pela qual a lei é conhecida: "LGPD", "GDPR". */
  nome: string;
  /** Número e data, como se cita em documento: "Lei nº 13.709/2018". */
  numero: string;
  /** O dispositivo do direito de acesso: "Art. 18, II". */
  artigo: string;
  /**
   * Revisão jurídica local feita por quem pode revisar. Enquanto for `false`,
   * o documento não cita esta lei (ver cabeçalho).
   */
  revisada: boolean;
}

export interface CalendarioDeDiasUteis {
  /** Datas `YYYY-MM-DD` dos feriados nacionais, no formato de `holidays-br.ts`. */
  feriados: readonly string[];
  /** Como o calendário se apresenta ao operador: "feriados nacionais brasileiros". */
  rotulo: string;
}

export interface PerfilDoPais {
  /** ISO-3166 alpha-2, maiúsculas. */
  codigo: CodigoDePais;
  /** Nome do país como o operador o lê. */
  nome: string;
  documento: DocumentoDoTitular;
  /** `null` quando o país ainda não tem lei revisada para citar. */
  lei: LeiCitada | null;
  calendario: CalendarioDeDiasUteis;
  /** Padrões PRÓPRIOS do país; e-mail/telefone são universais e moram fora. */
  padroesDePii: readonly PadraoDePiiDoPais[];
}

/** Brasil é o país de quem já instalou: `null` na coluna vale este perfil. */
export const PAIS_PADRAO: CodigoDePais = "BR";

/**
 * O mod-11 da Receita Federal — a regra brasileira, e a única do repositório
 * que confere dígito verificador. Mora aqui porque é o PERFIL que valida; quem
 * importava de `lib/schemas/contacts` continua importando (re-export).
 */
export function isValidCpf(raw: string): boolean {
  const s = raw.replace(/\D/g, "");
  if (!/^\d{11}$/.test(s) || /^(\d)\1{10}$/.test(s)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(s[i]!, 10) * (10 - i);
  let d1 = (sum * 10) % 11;
  if (d1 === 10) d1 = 0;
  if (d1 !== parseInt(s[9]!, 10)) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(s[i]!, 10) * (11 - i);
  let d2 = (sum * 10) % 11;
  if (d2 === 10) d2 = 0;
  return d2 === parseInt(s[10]!, 10);
}

const DOCUMENTO_BR: DocumentoDoTitular = {
  rotulo: "CPF",
  exemplo: "000.000.000-00",
  regra: "dígito verificador (mod-11 da Receita Federal)",
  mensagemInvalido: "CPF inválido",
  confereDigito: true,
  apelidosDoCabecalho: ["cpf"],
  valida: isValidCpf,
  normaliza: (valor) => valor.replace(/\D/g, ""),
};

const PERFIL_BR: PerfilDoPais = {
  codigo: "BR",
  nome: "Brasil",
  documento: DOCUMENTO_BR,
  lei: {
    nome: "LGPD",
    numero: "Lei nº 13.709/2018",
    artigo: "Art. 18, II",
    revisada: true,
  },
  calendario: {
    feriados: HOLIDAYS_BR_ISO,
    rotulo: "feriados nacionais brasileiros",
  },
  padroesDePii: [
    {
      tipo: "cpf",
      marcador: "[CPF]",
      fonte: "\\b\\d{3}\\.?\\d{3}\\.?\\d{3}-?\\d{2}\\b",
      naoCobre:
        "documento de outro país (o BI angolano `003862011LA042` não tem esta forma) nem CPF sem os 11 dígitos",
    },
    {
      tipo: "cep",
      marcador: "[CEP]",
      fonte: "\\b\\d{5}-?\\d{3}\\b",
      naoCobre: "código postal com letra (Canadá, Reino Unido) e CEP solto com menos de 8 dígitos",
    },
  ],
};

/**
 * Claud.ia — PERÚ. Es el país de todos los clientes de Claud.ia.
 *
 * Documento: DNI (8 dígitos) o carné de extranjería / pasaporte (9 a 12
 * caracteres). El número del DNI no lleva un dígito verificador que se pueda
 * comprobar desde el número solo, así que se valida la FORMA y el mensaje lo dice.
 *
 * Ley: Ley N.º 29733, Ley de Protección de Datos Personales; el derecho de
 * acceso es el art. 19 (Reglamento: D.S. N.º 016-2024-JUS). Revisado contra el
 * texto de la ley el 15 oct 2026; pendiente la revisión de un abogado.
 *
 * PII: solo se redacta el DNI cuando viene escrito junto a la palabra «DNI».
 * Ocho dígitos sueltos se confunden con el número de operación de Yape/Plin,
 * que la IA necesita leer para validar el adelanto.
 */
const DOCUMENTO_PE: DocumentoDoTitular = {
  rotulo: "DNI / CE",
  exemplo: "12345678",
  regra: "forma: DNI de 8 dígitos, o carné de extranjería / pasaporte de 9 a 12 letras o números (no se comprueba dígito verificador)",
  mensagemInvalido: "Documento inválido: el DNI tiene 8 dígitos; el carné de extranjería o pasaporte, de 9 a 12 caracteres",
  confereDigito: false,
  apelidosDoCabecalho: ["dni", "documento", "documento_de_identidad", "nro_documento", "numero_de_documento", "ce", "carne_de_extranjeria"],
  valida: (valor) => {
    const v = valor.replace(/[\s.-]/g, "");
    return /^\d{8}$/.test(v) || /^[A-Za-z0-9]{9,12}$/.test(v);
  },
  normaliza: (valor) => valor.replace(/[\s.-]/g, "").toUpperCase(),
};

const PERFIL_PE: PerfilDoPais = {
  codigo: "PE",
  nome: "Perú",
  documento: DOCUMENTO_PE,
  lei: {
    nome: "Ley de Protección de Datos Personales",
    numero: "Ley N.º 29733",
    artigo: "art. 19",
    revisada: true,
  },
  calendario: {
    feriados: FERIADOS_PE_ISO,
    rotulo: "feriados nacionales del Perú",
  },
  padroesDePii: [
    {
      tipo: "dni",
      marcador: "[DNI]",
      fonte: "\\bDNI\\s*(?:N[.°º]?\\s*[°º]?\\s*)?:?\\s*\\d{8}\\b",
      naoCobre:
        "un DNI suelto sin la palabra «DNI» delante (8 dígitos solos se confunden con el número de operación de Yape/Plin) ni el carné de extranjería",
    },
  ],
};

/**
 * O registro de países conhecidos.
 *
 * ⚠️ Conhecer ≠ oferecer. A lista que o operador escolhe é
 * `paisesOferecidos()`, e ela exige `lei.revisada`. Entram aqui, à medida do
 * trabalho de cada país: documento (forma, e checksum só quando é público),
 * lei com citação revisada, calendário de feriados e padrões de PII. País
 * incompleto mora aqui com o que já tem — nunca meio perfil publicado.
 *
 * Exportado mutável de propósito: os testes de tabela registram um país
 * sintético para provar o mecanismo sem publicar citação não revisada.
 */
export const PERFIS_DO_PAIS: Record<CodigoDePais, PerfilDoPais> = {
  BR: PERFIL_BR,
  PE: PERFIL_PE,
};

/** O perfil de um código; vazio ou desconhecido degrada para o Brasil. */
export function perfilDoPais(codigo: CodigoDePais | null | undefined): PerfilDoPais {
  const chave = (codigo ?? "").trim().toUpperCase();
  if (chave === "") return PERFIS_DO_PAIS[PAIS_PADRAO]!;
  return PERFIS_DO_PAIS[chave] ?? PERFIS_DO_PAIS[PAIS_PADRAO]!;
}

/** O que o seletor de Configurações › Empresa oferece. */
export function paisesOferecidos(): PerfilDoPais[] {
  return Object.values(PERFIS_DO_PAIS)
    .filter((p) => p.lei?.revisada === true)
    .sort((a, b) => a.nome.localeCompare(b.nome));
}

/** A citação pronta para o documento, ou `null` quando não há lei revisada. */
export function citacaoDaLei(perfil: PerfilDoPais): string | null {
  const lei = perfil.lei;
  if (!lei || !lei.revisada) return null;
  return `${lei.nome} ${lei.artigo} (${lei.numero})`;
}

/**
 * O perfil do país da ORGANIZAÇÃO.
 *
 * Degrada para o Brasil quando a linha da organização não vem (RLS negando,
 * linha removida no meio da requisição) — é o mesmo valor que a coluna vazia
 * representa, ou seja, o comportamento de antes desta feature. Derrubar um
 * cadastro de contato porque a leitura de um campo de configuração falhou
 * seria trocar um rótulo errado por um formulário que não salva (doutrina do
 * `moeda-da-org`). O silêncio, porém, deixa RASTRO: sem ele, uma organização
 * em outro país segue afirmando a lei brasileira sem que ninguém perceba.
 */
export async function perfilDaOrganizacao(
  supabase: SupabaseClient,
  orgId: string,
): Promise<PerfilDoPais> {
  const { data, error } = await supabase
    .from("organizations")
    .select("country")
    .eq("id", orgId)
    .maybeSingle();

  const declarado = (data as { country?: string | null } | null)?.country ?? null;
  const perfil = perfilDoPais(declarado);

  const chave = (declarado ?? "").trim().toUpperCase();
  if (chave !== "" && !PERFIS_DO_PAIS[chave]) {
    const motivo = `país ${chave} não tem perfil revisado; valendo ${perfil.codigo}`;
    console.error("[perfil-do-pais] caiu no padrão", { orgId, motivo });
    void import("@sentry/nextjs")
      .then((Sentry) => {
        Sentry.captureMessage(`[perfil-do-pais] ${motivo}`, {
          level: "warning",
          tags: { subsystem: "legal" },
          extra: { organization_id: orgId },
        });
      })
      .catch(() => {
        /* sem Sentry configurado: o console.error acima é o que resta */
      });
  } else if (error) {
    console.error("[perfil-do-pais] caiu no padrão", { orgId, motivo: error.message });
  }

  return perfil;
}
