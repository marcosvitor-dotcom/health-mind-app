import axios from 'axios';
import { PsychologistFormData, gerarSystemPrompt } from '../utils/systemPromptGenerator';

const BASE_URL = 'https://health-mind-app.vercel.app/api';

/**
 * Gera um system prompt personalizado chamando a API do backend.
 * Usa timeout estendido de 90s para acomodar a geração pelo Claude.
 * Em caso de timeout ou falha de rede, faz fallback para geração local.
 */
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
  } catch (error: any) {
    const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
    const isNetwork = error.code === 'ERR_NETWORK' || error.message?.includes('Network Error');

    if (isTimeout || isNetwork) {
      // Gera localmente sem precisar de chamada de rede
      return gerarSystemPrompt(dados);
    }

    throw error;
  }
};
