/**
 * Serviço de integração com n8n para o chat com IA
 */

const N8N_API_URL = 'https://losningtech.app.n8n.cloud/webhook/chat/message';

export interface ChatRequest {
  userId: string;
  psychologistId: string;
  message: string;
}

export interface ChatResponse {
  resposta: string;
  psicologo: string;
}

/**
 * Envia uma mensagem para o chat do n8n e retorna a resposta da IA
 * @param message - Mensagem do usuário
 * @param userId - ID do usuário (cliente)
 * @param psychologistId - ID do psicólogo responsável
 * @returns Texto da resposta da IA ou mensagem de erro
 */
export const sendMessageToN8N = async (
  message: string,
  userId: string,
  psychologistId: string
): Promise<string> => {
  console.log('🔵 [n8nApi] Iniciando chamada ao n8n...');
  console.log('📤 [n8nApi] Dados enviados:', { message, userId, psychologistId });

  try {
    const requestBody = {
      message: message,
      userId: userId,
      psychologistId: psychologistId,
    };

    console.log('🌐 [n8nApi] URL:', N8N_API_URL);
    console.log('📦 [n8nApi] Body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(N8N_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('📊 [n8nApi] Status da resposta:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [n8nApi] Erro na resposta:', errorText);
      throw new Error(`Erro na API: ${response.status} - ${errorText}`);
    }

    // Pega o texto da resposta primeiro
    const responseText = await response.text();
    console.log('📄 [n8nApi] Texto bruto da resposta:', responseText);

    // Tenta fazer parse do JSON
    if (!responseText || responseText.trim() === '') {
      console.error('❌ [n8nApi] Resposta vazia da API');
      throw new Error('API retornou resposta vazia');
    }

    let data: ChatResponse;
    try {
      data = JSON.parse(responseText);
      console.log('✅ [n8nApi] Resposta recebida:', data);
      console.log('💬 [n8nApi] Texto da resposta:', data.resposta);
    } catch (parseError) {
      console.error('❌ [n8nApi] Erro ao fazer parse do JSON:', parseError);
      console.error('❌ [n8nApi] Resposta recebida não é JSON válido:', responseText);
      throw new Error(`Resposta inválida da API: ${responseText.substring(0, 100)}`);
    }

    return data.resposta || 'Desculpe, não recebi uma resposta válida.';

  } catch (error) {
    console.error('❌ [n8nApi] Erro ao enviar mensagem para n8n:', error);
    console.error('❌ [n8nApi] Detalhes do erro:', JSON.stringify(error, null, 2));
    return 'Desculpe, ocorreu um erro na conexão. Tente novamente em instantes.';
  }
};
