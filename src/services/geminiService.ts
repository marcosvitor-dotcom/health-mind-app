import api from './api';
import { PsychologistFormData } from '../utils/systemPromptGenerator';

/**
 * Gera um system prompt personalizado chamando a API do backend,
 * que por sua vez utiliza o Claude com a chave protegida no servidor.
 */
export const gerarSystemPromptComGemini = async (dados: PsychologistFormData): Promise<string> => {
  const response = await api.post('/ai/generate-system-prompt', dados);

  if (response.data.success && response.data.data?.systemPrompt) {
    return response.data.data.systemPrompt;
  }

  throw new Error(response.data.message || 'Erro ao gerar system prompt');
};
