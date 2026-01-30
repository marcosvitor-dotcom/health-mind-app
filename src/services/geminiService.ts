import axios from 'axios';
import { PsychologistFormData } from '../utils/systemPromptGenerator';

const GEMINI_API_KEY = 'AIzaSyCI6VpYjJNez_TfHp_q1pzE0Zs3xzkEUHc';

const MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
];

const SECOES_OBRIGATORIAS = `

---

## REGRAS CRITICAS E LIMITES ETICOS

### 1. Diagnosticos Medicos ou Psiquiatricos
- **NUNCA** nomeie transtornos (depressao, ansiedade, borderline, etc.)
- **NUNCA** interprete sintomas como doencas
- Se o paciente perguntar sobre diagnosticos, responda: "Essa e uma avaliacao que apenas o(a) [NOME_PSICOLOGO] pode fazer durante as sessoes ou por um neuropsicologo a partir de um processo de avaliacao psicologica. O que posso fazer e acolher o que voce esta sentindo agora."

### 2. Prescricao ou Orientacao sobre Medicamentos
- **NUNCA** sugira, comente ou opine sobre medicacao
- **NUNCA** recomende alteracoes em tratamentos medicos
- Redirecione para o(a) psicologo(a) ou psiquiatra

### 3. Etica Profissional
- **NUNCA** substitua a terapia presencial - voce e um complemento
- **NUNCA** faca julgamentos morais ou de conselhos diretos
- **NUNCA** diga "voce deveria fazer X" - prefira "Como voce imagina que poderia lidar com isso?"
- Respeite a autonomia e as escolhas do paciente
- Mantenha sigilo e confidencialidade

### 4. PROTOCOLO DE EMERGENCIA

Se identificar **risco iminente de suicidio, autolesao grave ou violencia**:

**PARE O ATENDIMENTO IMEDIATAMENTE** e responda:

"Percebo que voce esta passando por um momento muito dificil e de muita dor. Neste momento, e fundamental que voce tenha apoio imediato e especializado.

**Por favor, entre em contato agora:**

- CVV - Centro de Valorizacao da Vida: 188 (Ligacao gratuita, atendimento 24h, tambem por chat no site cvv.org.br)
- SAMU: 192 (em caso de emergencia medica)
- Policia Militar: 190 (em caso de violencia ou risco imediato)
- 180 - Central de Atendimento a Mulher (em casos de violencia de genero)
- Procure o pronto-socorro ou UPA mais proximo

Voce nao esta sozinha(o) e sua vida importa. Vou comunicar o(a) [NOME_PSICOLOGO] sobre essa situacao para que ele(a) possa te acompanhar com urgencia."

**Apos enviar essa mensagem, nao continue a conversa ate que o paciente confirme que buscou ajuda ou que o momento de crise passou.**

#### Sinais de alerta que acionam o protocolo:
- Mencao explicita de planos ou ideacao suicida
- Descricao de metodos especificos de autolesao
- Despedidas ou mensagens de "fim"
- Relatos de violencia fisica grave em curso e/ou automutilacao
- Indicacao de abuso ou risco iminente a criancas

---
`;

const buildGeminiPrompt = (dados: PsychologistFormData): string => {
  const especializacoes = [
    ...dados.publicosEspecificos.map(p => `publico ${p}`),
    ...dados.temasEspecializados.map(t => t),
  ].filter(Boolean).join(', ');

  const tecnicas = dados.tecnicasFavoritas
    .filter(t => t.trim())
    .map(t => `- "${t.trim()}"`)
    .join('\n');

  return `Voce e um especialista em construir system prompts para assistentes terapeuticas digitais de psicologos.

Com base nos dados abaixo, gere um system prompt completo e personalizado para a assistente digital deste psicologo. O prompt deve ser detalhado, profissional e seguir a estrutura de um bom system prompt terapeutico.

## DADOS DO PSICOLOGO:

- **Nome Completo**: ${dados.nomeCompleto}
- **CRP**: ${dados.crp}
- **Formacao Academica**: ${dados.formacaoAcademica}
- **Abordagem Principal**: ${dados.abordagemPrincipal}
- **Descricao do trabalho**: ${dados.descricaoTrabalho}
- **Publicos especificos**: ${dados.publicosEspecificos.join(', ') || 'Nao especificado'}
- **Temas especializados**: ${dados.temasEspecializados.join(', ') || 'Nao especificado'}
- **Tons de comunicacao**: ${dados.tonsComunicacao.join(', ')}
- **Tecnicas favoritas**: ${tecnicas || 'Nao especificado'}
- **Restricoes tematicas**: ${dados.restricoesTematicas || 'Nenhuma'}
- **Diferenciais**: ${dados.diferenciais || 'Nao especificado'}

## INSTRUCOES PARA GERAR O SYSTEM PROMPT:

1. **IDENTIDADE E CONTEXTO**: Apresente a assistente como extensao do processo terapeutico do(a) psicologo(a), com base na abordagem informada.

2. **SOBRE O PSICOLOGO**: Inclua nome, CRP, formacao, abordagem e especializacoes.

3. **PROPOSITO E FUNCAO**: Defina que a assistente e um espaco de acolhimento e registro entre sessoes - NAO substitui terapia.

4. **ABORDAGEM CLINICA**: Detalhe principios e tecnicas da abordagem ${dados.abordagemPrincipal} que a assistente deve seguir, usando as tecnicas favoritas informadas.

5. **ESTILO DE COMUNICACAO**: Defina o tom como ${dados.tonsComunicacao.join(', ')}. Respostas de no maximo 3 paragrafos, terminando com pergunta reflexiva.

6. **ESPECIALIZACOES**: Gere orientacoes especificas para cada publico e tema listado (${especializacoes || 'geral'}).

7. **EXEMPLOS DE INTERACAO**: Crie 3-5 exemplos de dialogos realistas entre paciente e assistente.

8. **INICIO DA INTERACAO**: Crie uma mensagem de boas-vindas personalizada.

## SECOES OBRIGATORIAS (inclua EXATAMENTE como esta abaixo, substituindo [NOME_PSICOLOGO] por ${dados.nomeCompleto}):

${SECOES_OBRIGATORIAS}

## FORMATO DE SAIDA:
- Retorne APENAS o system prompt, sem explicacoes ou comentarios adicionais
- Use markdown para formatacao
- O prompt deve ter entre 3000 e 8000 caracteres
- Substitua todas as ocorrencias de [NOME_PSICOLOGO] pelo nome real: ${dados.nomeCompleto}`;
};

const callGemini = async (prompt: string, modelIndex: number = 0): Promise<string> => {
  if (modelIndex >= MODELS.length) {
    throw new Error('Todos os modelos Gemini falharam. Tente novamente mais tarde.');
  }

  const model = MODELS[modelIndex];
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

  try {
    const response = await axios.post(
      url,
      {
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
        },
      },
      {
        timeout: 60000,
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.warn(`Modelo ${model} retornou resposta vazia, tentando proximo...`);
      return callGemini(prompt, modelIndex + 1);
    }

    return text;
  } catch (error: any) {
    console.warn(`Modelo ${model} falhou: ${error.message}. Tentando proximo...`);
    return callGemini(prompt, modelIndex + 1);
  }
};

/**
 * Gera um system prompt personalizado usando a API do Gemini
 */
export const gerarSystemPromptComGemini = async (dados: PsychologistFormData): Promise<string> => {
  const prompt = buildGeminiPrompt(dados);
  const systemPrompt = await callGemini(prompt);

  // Garantir que as secoes obrigatorias estejam presentes
  const secoesComNome = SECOES_OBRIGATORIAS.replace(
    /\[NOME_PSICOLOGO\]/g,
    dados.nomeCompleto
  );

  // Verificar se o prompt gerado ja contem o protocolo de emergencia
  if (!systemPrompt.includes('188') || !systemPrompt.includes('192')) {
    return systemPrompt + '\n' + secoesComNome;
  }

  return systemPrompt;
};
