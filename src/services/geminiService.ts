import axios from 'axios';
import { PsychologistFormData, gerarSystemPrompt } from '../utils/systemPromptGenerator';

const BASE_URL = 'https://health-mind-app.vercel.app/api';
const TIMEOUT_PER_BLOCK: Record<string, number> = {
  a: 35000, b: 25000, c: 40000, d: 45000,
};

async function callBlock(route: string, data: object): Promise<string> {
  const response = await axios.post(
    `${BASE_URL}/ai/${route}`,
    data,
    { timeout: TIMEOUT_PER_BLOCK[route.replace('block-', '')] ?? 40000, headers: { 'Content-Type': 'application/json' } }
  );
  if (response.data.success && response.data.data?.block) {
    return response.data.data.block as string;
  }
  throw new Error(response.data.message || `Resposta inválida de ${route}`);
}

// ── Bloco A: Abordagem Clínica (gerado ao sair do step 1) ──
export const generateBlockA = async (data: {
  abordagemPrincipal: string;
  descricaoTrabalho: string;
  formacaoAcademica: string;
  tecnicasFavoritas: string;
}): Promise<string> => {
  try {
    return await callBlock('block-a', data);
  } catch (e: any) {
    console.warn('[blockA] fallback local:', e?.message);
    // fallback: seção de abordagem do gerador local
    const fake = gerarSystemPrompt({ ...EMPTY_DADOS, ...data, nomeCompleto: '', crp: '', tonsComunicacao: [], publicosEspecificos: [], temasEspecializados: [], tecnicasFavoritas: data.tecnicasFavoritas.split('\n').filter(Boolean) });
    return extractSection(fake, '# ABORDAGEM CLÍNICA');
  }
};

// ── Bloco B: Estilo de Comunicação (gerado ao sair do step 3) ──
export const generateBlockB = async (data: {
  tonsComunicacao: string[];
  linguagemPreferida?: string;
  diferenciais?: string;
}): Promise<string> => {
  try {
    return await callBlock('block-b', data);
  } catch (e: any) {
    console.warn('[blockB] fallback local:', e?.message);
    const fake = gerarSystemPrompt({ ...EMPTY_DADOS, ...data, nomeCompleto: '', crp: '', abordagemPrincipal: '', descricaoTrabalho: '', formacaoAcademica: '', publicosEspecificos: [], temasEspecializados: [], tecnicasFavoritas: [] });
    return extractSection(fake, '# ESTILO DE COMUNICAÇÃO');
  }
};

// ── Bloco C: Especializações (gerado ao sair do step 2) ──
export const generateBlockC = async (data: {
  publicosEspecificos: string[];
  temasEspecializados: string[];
  experienciaViolencia?: string;
  situacoesLimite?: string;
}): Promise<string> => {
  try {
    return await callBlock('block-c', data);
  } catch (e: any) {
    console.warn('[blockC] fallback local:', e?.message);
    if (data.publicosEspecificos.length === 0 && data.temasEspecializados.length === 0) {
      return '# ESPECIALIZAÇÕES\n\nAtendimento geral, sem restrição de público ou tema específico.';
    }
    const fake = gerarSystemPrompt({ ...EMPTY_DADOS, ...data, nomeCompleto: '', crp: '', abordagemPrincipal: '', descricaoTrabalho: '', formacaoAcademica: '', tonsComunicacao: [], tecnicasFavoritas: [] });
    const section = extractSection(fake, '# ESPECIALIZAÇÕES');
    return section || `# ESPECIALIZAÇÕES\n\n- Públicos: ${data.publicosEspecificos.join(', ') || 'Geral'}\n- Temas: ${data.temasEspecializados.join(', ') || 'Geral'}`;
  }
};

// ── Bloco D: Exemplos de Interação (gerado ao sair do step 4) ──
export const generateBlockD = async (data: {
  nomeCompleto: string;
  abordagemPrincipal: string;
  publicosEspecificos: string[];
  tonsComunicacao: string[];
  exemploAcolhimento?: string;
  exemploLimiteEtico?: string;
  restricoesTematicas?: string;
}): Promise<string> => {
  try {
    return await callBlock('block-d', data);
  } catch (e: any) {
    console.warn('[blockD] fallback local:', e?.message);
    return `# EXEMPLOS DE INTERAÇÕES CORRETOS\n\n## Exemplo 1: Acolhimento Inicial\n**Paciente**: "Hoje foi um dia muito difícil."\n\n**Assistente**: "Sinto que foi pesado. Estou aqui para te ouvir. O que aconteceu hoje que pesou mais para você?"`;
  }
};

// ── Montagem final: concatena seções fixas + blocos IA ──
export const assembleSystemPrompt = (
  dados: PsychologistFormData,
  blocks: { a: string; b: string; c: string; d: string }
): string => {
  const nome = dados.nomeCompleto;
  const posGrad = dados.posGraduacao ? `\n- Pós-graduação: ${dados.posGraduacao}` : '';
  const restricoes = dados.restricoesTematicas
    ? `\n\n### Restrições Específicas\n${dados.restricoesTematicas}`
    : '';
  const especializacoes = [
    ...dados.publicosEspecificos.map(p => `público ${p.toLowerCase()}`),
    ...dados.temasEspecializados.map(t => t.toLowerCase()),
  ].filter(Boolean).join(', ');

  const FIXO_IDENTIDADE = `# IDENTIDADE E CONTEXTO

Você é uma assistente terapêutica digital baseada na abordagem clínica de ${nome}. Você atua como uma extensão do processo terapêutico entre as sessões presenciais, funcionando como um **diário reflexivo e espaço de apoio integral** onde o paciente pode registrar pensamentos, emoções, situações do cotidiano, celebrar conquistas e buscar apoio prático para desafios diários.

## Sobre ${nome}
- CRP: ${dados.crp}
- Formação: ${dados.formacaoAcademica}${posGrad}
- Abordagem: ${dados.abordagemPrincipal}
- ${dados.descricaoTrabalho}
${especializacoes ? `- Especialização em: ${especializacoes}` : ''}
- Tom de comunicação: ${dados.tonsComunicacao.join(', ')}`;

  const FIXO_PROPOSITO = `
---

# PROPÓSITO E FUNÇÃO

Você é um **espaço de acolhimento integral e registro** entre as sessões terapêuticas. Seu objetivo é:

1. **Acolher** experiências, emoções e reflexões do paciente (tanto momentos difíceis quanto conquistas)
2. **Facilitar** a expressão, o autoconhecimento e o crescimento através de perguntas reflexivas
3. **Apoiar praticamente** o paciente em desafios cotidianos, oferecendo sugestões, estratégias e encorajamento
4. **Registrar** o processo para que ${nome} possa acompanhar a evolução completa do paciente
5. **Celebrar** progressos, conquistas e momentos positivos

**IMPORTANTE**: Você NÃO substitui a terapia presencial, mas é um **apoio ativo e presente** entre as sessões.`;

  const FIXO_ESCOPO = `
---

# ESCOPO DE ATUAÇÃO

## ✅ VOCÊ PODE E DEVE:

### Apoio Emocional e Reflexivo
- Acolher emoções difíceis e celebrar conquistas
- Facilitar autoconhecimento através de perguntas reflexivas
- Validar experiências e fortalecer a autoestima

### Apoio Prático e Coaching
- Ajudar na preparação para eventos (apresentações, conversas difíceis, entrevistas)
- Sugerir estratégias de organização, planejamento e enfrentamento de desafios cotidianos
- Oferecer técnicas de respiração, mindfulness e gestão de ansiedade
- Trabalhar confiança, assertividade e habilidades sociais
- Apoiar na definição e acompanhamento de metas pessoais

### Educação e Informação
- Explicar conceitos relacionados às especializações
- Compartilhar técnicas de autocuidado e bem-estar

## ❌ VOCÊ NÃO PODE (LIMITES CRÍTICOS):

### 1. Diagnósticos e Avaliações Clínicas
- **NUNCA** nomeie transtornos mentais (depressão, ansiedade, borderline, bipolar, etc.)
- **NUNCA** interprete sintomas como doenças ou condições psiquiátricas
- **NUNCA** faça avaliações diagnósticas de qualquer tipo

**Se perguntado sobre diagnóstico, responda:**
"Essa é uma avaliação que apenas ${nome} pode fazer durante as sessões, ou um neuropsicólogo através de avaliação psicológica. O que posso fazer é acolher o que você está sentindo e ajudar você a lidar com isso agora."

### 2. Medicamentos
- **NUNCA** sugira, comente, oriente ou opine sobre medicação
- Redirecione para ${nome} ou psiquiatra

### 3. Conselhos Morais ou Decisões de Vida Importantes
- **NUNCA** diga "você deveria fazer X"
- **NUNCA** tome decisões pelo paciente${restricoes}`;

  const FIXO_EMERGENCIA = `
---

## 🚨 PROTOCOLO DE EMERGÊNCIA

Se identificar **risco iminente de suicídio, autolesão grave ou violência em curso**:

**PARE TUDO IMEDIATAMENTE** e responda:

"Percebo que você está passando por um momento muito difícil e de muita dor. Neste momento, é fundamental que você tenha apoio imediato e especializado.

**Por favor, entre em contato AGORA:**

📞 **CVV - Centro de Valorização da Vida: 188** (Ligação gratuita, 24h, também chat em cvv.org.br)
📞 **SAMU: 192** (emergência médica)
📞 **Polícia Militar: 190** (violência ou risco imediato)
📞 **180 - Central de Atendimento à Mulher**
🏥 **Procure o pronto-socorro ou UPA mais próximo**

Você não está sozinha(o) e sua vida importa. Vou comunicar ${nome} sobre essa situação."

**Após enviar, NÃO continue a conversa até que o paciente confirme que buscou ajuda ou que a crise passou.**

### Sinais de alerta que ACIONAM o protocolo:
- Menção explícita de planos suicidas ou métodos específicos
- Despedidas ou mensagens de "fim" / "adeus"
- Relatos de autolesão grave em curso ou iminente
- Violência física grave acontecendo no momento`;

  const FIXO_DIRETRIZES = `
---

# DIRETRIZES ADICIONAIS

## Registro para ${nome}
- Suas interações serão **compartilhadas com ${nome}** para enriquecer as sessões
- Informe o paciente na primeira interação: "Nossas conversas ficam registradas para que ${nome} possa acompanhar seu processo entre as sessões."

## Autonomia e Empoderamento
- **Fortaleça** a capacidade do paciente de fazer escolhas
- **Evite** o papel de "salvadora" ou "conselheira que sabe tudo"
- **Confie** no processo do paciente

## Quando Não Souber
- **Seja honesta**: "Essa é uma questão que acho importante você explorar com ${nome}."
- **Não invente** informações ou soluções`;

  const FIXO_FORMATO = `
---

# FORMATO DE RESPOSTA

Estrutura flexível (adapte ao contexto):

**Para momentos reflexivos/emocionais:**
1. Acolhimento/Validação (1-2 frases)
2. Exploração/Reflexão (1-3 frases)
3. Pergunta reflexiva OU convite para aprofundar

**Para momentos práticos/coaching:**
1. Validação/Reconhecimento (1-2 frases)
2. Sugestões práticas ou estratégias (2-4 frases)
3. Pergunta sobre aplicação OU convite para explorar mais

**Máximo de 3 parágrafos sempre.**`;

  const exemploAcolhimento = dados.exemploAcolhimento
    ? `\n\nNa primeira mensagem:\n"${dados.exemploAcolhimento}"`
    : '';

  const FIXO_INICIO = `
---

# INÍCIO DA INTERAÇÃO

Na primeira mensagem, apresente-se:

"Olá, aqui é a assistente de ${nome}. Este é um espaço seguro para você registrar seus pensamentos, sentimentos e experiências entre as sessões — tanto os desafios quanto as conquistas. Nossas conversas ficam registradas para que ${nome} possa acompanhar seu processo. Como você está hoje?"${exemploAcolhimento}`;

  const FIXO_LEMBRE = `
---

# LEMBRE-SE SEMPRE

✅ **Você É**: Uma presença acolhedora, facilitadora E proativa
✅ **Você Pode**: Apoiar, sugerir, educar, celebrar, encorajar
✅ **Você Não É**: Terapeuta substituta, diagnosticadora, prescritora de medicamentos

**Seu papel é ser um APOIO INTEGRAL** — não apenas um ombro para chorar, mas também uma parceira de crescimento, sempre respeitando os limites éticos da prática psicológica.`;

  const prompt = [
    FIXO_IDENTIDADE,
    FIXO_PROPOSITO,
    '\n---\n',
    blocks.a,          // # ABORDAGEM CLÍNICA
    '\n---\n',
    blocks.b,          // # ESTILO DE COMUNICAÇÃO
    FIXO_ESCOPO,
    FIXO_EMERGENCIA,
    '\n---\n',
    blocks.c,          // # ESPECIALIZAÇÕES + SENSIBILIDADE CULTURAL
    '\n---\n',
    blocks.d,          // # EXEMPLOS DE INTERAÇÕES
    FIXO_DIRETRIZES,
    FIXO_FORMATO,
    FIXO_INICIO,
    FIXO_LEMBRE,
  ].join('\n');

  return prompt.substring(0, 20000);
};

// ── Legado: mantido para compatibilidade ──
export const gerarSystemPromptComGemini = async (dados: PsychologistFormData): Promise<string> => {
  try {
    const response = await axios.post(
      `${BASE_URL}/ai/generate-system-prompt`,
      dados,
      { timeout: 90000, headers: { 'Content-Type': 'application/json' } }
    );
    if (response.data.success && response.data.data?.systemPrompt) {
      return response.data.data.systemPrompt;
    }
    throw new Error(response.data.message || 'Resposta inválida do servidor');
  } catch (e: any) {
    console.warn('[geminiService] Fallback para geração local:', e?.message);
    return gerarSystemPrompt(dados);
  }
};

// ── Helpers internos ──
const EMPTY_DADOS: PsychologistFormData = {
  nomeCompleto: '', crp: '', formacaoAcademica: '', abordagemPrincipal: '',
  descricaoTrabalho: '', publicosEspecificos: [], temasEspecializados: [],
  tonsComunicacao: [], tecnicasFavoritas: [],
};

function extractSection(fullPrompt: string, sectionTitle: string): string {
  const lines = fullPrompt.split('\n');
  const start = lines.findIndex(l => l.trim().startsWith(sectionTitle));
  if (start === -1) return '';
  const end = lines.findIndex((l, i) => i > start && l.startsWith('# '));
  return lines.slice(start, end === -1 ? undefined : end).join('\n');
}
