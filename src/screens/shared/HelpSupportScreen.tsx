import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Linking,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import * as supportService from '../../services/supportService';
import type { SupportTicket } from '../../services/supportService';

// ========================================
// FAQ DATA
// ========================================

interface FaqItem {
  question: string;
  answer: string;
  roles: string[];
}

const FAQ_DATA: FaqItem[] = [
  // Paciente
  {
    question: 'Como agendar uma consulta?',
    answer:
      'Acesse a aba "Agendar" no menu inferior, selecione o psicologo desejado, escolha a data e horario disponivel e confirme o agendamento.',
    roles: ['patient', 'client'],
  },
  {
    question: 'Como cancelar uma consulta?',
    answer:
      'Va ate a aba "Agenda", toque na consulta que deseja cancelar e selecione "Cancelar consulta". Lembre-se de cancelar com antecedencia para evitar cobranças.',
    roles: ['patient', 'client'],
  },
  {
    question: 'Como falar com meu psicologo?',
    answer:
      'Voce pode enviar mensagens diretas pelo chat disponivel na aba de mensagens. As mensagens ficam registradas para sua conveniencia.',
    roles: ['patient', 'client'],
  },
  {
    question: 'Como usar o diario emocional?',
    answer:
      'Acesse a secao "Diario" no menu. La voce pode registrar como esta se sentindo diariamente. Seu psicologo pode acompanhar suas anotacoes para entender melhor seu progresso.',
    roles: ['patient', 'client'],
  },
  {
    question: 'Estou em crise, o que fazer?',
    answer:
      'Em caso de emergencia, ligue para o CVV (Centro de Valorizacao da Vida) no 188, disponivel 24h. Voce tambem pode acessar o chat pelo site cvv.org.br. Se estiver em perigo imediato, ligue 192 (SAMU) ou va ao pronto-socorro mais proximo.',
    roles: ['patient', 'client'],
  },
  // Psicologo
  {
    question: 'Como agendar uma consulta para meu paciente?',
    answer:
      'Acesse "Agenda", toque em "Nova consulta", selecione o paciente, data, horario e tipo de consulta. Voce pode definir o valor da sessao e escolher se deseja replicar para datas futuras.',
    roles: ['psychologist'],
  },
  {
    question: 'Como configurar consultas recorrentes?',
    answer:
      'Ao criar um agendamento, ative a opcao "Replicar" e defina a quantidade de semanas. O sistema criara automaticamente consultas nas mesmas datas e horarios nas semanas seguintes.',
    roles: ['psychologist'],
  },
  {
    question: 'Como acessar os relatorios?',
    answer:
      'Acesse a aba "Relatorios" no menu inferior. La voce encontra resumos de atendimentos, evolucao dos pacientes e dados financeiros do periodo selecionado.',
    roles: ['psychologist'],
  },
  {
    question: 'Como funciona o financeiro?',
    answer:
      'Na aba "Financeiro", voce visualiza o resumo de pagamentos, valores a receber e confirmados. Voce pode registrar pagamentos recebidos e acompanhar o fluxo financeiro de suas sessoes.',
    roles: ['psychologist'],
  },
  {
    question: 'Como reservar uma sala na clinica?',
    answer:
      'Ao criar um agendamento presencial, voce pode selecionar uma sala disponivel da clinica vinculada. O valor de sublocacao sera exibido antes da confirmacao.',
    roles: ['psychologist'],
  },
  // Clinica
  {
    question: 'Como convidar um psicologo para a clinica?',
    answer:
      'Acesse a aba "Psicologos", toque em "Convidar" e insira o e-mail do profissional. Ele recebera um convite para se vincular a sua clinica.',
    roles: ['clinic'],
  },
  {
    question: 'Como gerenciar as salas?',
    answer:
      'Na aba "Salas", voce pode cadastrar novas salas, definir valores de sublocacao, horarios de disponibilidade e visualizar a agenda de cada sala.',
    roles: ['clinic'],
  },
  {
    question: 'Como funciona o financeiro da clinica?',
    answer:
      'Na aba "Financeiro", voce acompanha a receita da clinica, incluindo valores de sublocacao de salas, pagamentos por psicologo e resumo geral do periodo.',
    roles: ['clinic'],
  },
  {
    question: 'Como funciona a sublocacao de salas?',
    answer:
      'Quando um psicologo vinculado agenda uma consulta presencial em uma de suas salas, o valor de sublocacao definido por voce e automaticamente registrado. Voce pode acompanhar os pagamentos na aba Financeiro.',
    roles: ['clinic'],
  },
  {
    question: 'Como gerenciar pacientes da clinica?',
    answer:
      'Na aba "Pacientes", voce visualiza todos os pacientes atendidos pela clinica. Voce pode convidar novos pacientes e acompanhar os atendimentos realizados.',
    roles: ['clinic'],
  },
];

// ========================================
// HELPERS
// ========================================

const STATUS_LABELS: Record<string, string> = {
  open: 'Aberto',
  in_progress: 'Em Andamento',
  resolved: 'Resolvido',
  closed: 'Fechado',
};

const STATUS_COLORS: Record<string, string> = {
  open: '#F5A623',
  in_progress: '#4A90E2',
  resolved: '#50C878',
  closed: '#9B9B9B',
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ========================================
// COMPONENT
// ========================================

interface Props {
  navigation: any;
}

export default function HelpSupportScreen({ navigation }: Props) {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();

  // FAQ state
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Ticket form state
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  // Tickets list state
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Active section
  const [activeSection, setActiveSection] = useState<'faq' | 'contact' | 'ticket' | 'history'>('faq');

  const userRole = user?.role || 'patient';

  const filteredFaq = FAQ_DATA.filter((item) => item.roles.includes(userRole));

  const loadTickets = useCallback(async () => {
    try {
      setLoadingTickets(true);
      const data = await supportService.getMyTickets();
      setTickets(data);
    } catch (error: any) {
      console.error('Erro ao carregar tickets:', error);
    } finally {
      setLoadingTickets(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (activeSection === 'history') {
      loadTickets();
    }
  }, [activeSection, loadTickets]);

  const handleSendTicket = async () => {
    if (!subject.trim()) {
      Alert.alert('Atencao', 'Informe o assunto da mensagem.');
      return;
    }
    if (!message.trim()) {
      Alert.alert('Atencao', 'Escreva sua mensagem.');
      return;
    }

    try {
      setSending(true);
      await supportService.createTicket(subject.trim(), message.trim());
      Alert.alert('Enviado!', 'Sua mensagem foi enviada com sucesso. Nossa equipe respondera em breve.');
      setSubject('');
      setMessage('');
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Nao foi possivel enviar a mensagem.');
    } finally {
      setSending(false);
    }
  };

  const handleOpenEmail = () => {
    Linking.openURL('mailto:admin@losningtech.com?subject=Suporte Health Mind');
  };

  const handleOpenWhatsApp = () => {
    Linking.openURL('https://wa.me/5561983730910?text=Olá, preciso de ajuda com o Health Mind App.');
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTickets();
  };

  // ========================================
  // SECTION TABS
  // ========================================

  const renderTabs = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tabsContainer}
    >
      {[
        { key: 'faq' as const, label: 'FAQ', icon: 'help-circle-outline' as const },
        { key: 'contact' as const, label: 'Contato', icon: 'call-outline' as const },
        { key: 'ticket' as const, label: 'Enviar Mensagem', icon: 'chatbubble-ellipses-outline' as const },
        { key: 'history' as const, label: 'Meus Chamados', icon: 'list-outline' as const },
      ].map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[
            styles.tab,
            {
              backgroundColor: activeSection === tab.key ? colors.primary : colors.surface,
              borderColor: activeSection === tab.key ? colors.primary : colors.border,
            },
          ]}
          onPress={() => setActiveSection(tab.key)}
        >
          <Ionicons
            name={tab.icon}
            size={18}
            color={activeSection === tab.key ? '#fff' : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeSection === tab.key ? '#fff' : colors.textSecondary },
            ]}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  // ========================================
  // FAQ SECTION
  // ========================================

  const renderFaq = () => (
    <View style={styles.sectionContent}>
      <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
        Perguntas frequentes para {userRole === 'clinic' ? 'clinicas' : userRole === 'psychologist' ? 'psicologos' : 'pacientes'}
      </Text>
      {filteredFaq.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.faqItem,
            {
              backgroundColor: colors.surface,
              borderColor: expandedFaq === index ? colors.primary : colors.border,
            },
          ]}
          onPress={() => setExpandedFaq(expandedFaq === index ? null : index)}
          activeOpacity={0.7}
        >
          <View style={styles.faqHeader}>
            <Ionicons
              name="help-circle"
              size={22}
              color={expandedFaq === index ? colors.primary : colors.textSecondary}
              style={{ marginRight: 10 }}
            />
            <Text
              style={[
                styles.faqQuestion,
                { color: colors.textPrimary, flex: 1 },
              ]}
            >
              {item.question}
            </Text>
            <Ionicons
              name={expandedFaq === index ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textTertiary}
            />
          </View>
          {expandedFaq === index && (
            <Text style={[styles.faqAnswer, { color: colors.textSecondary }]}>
              {item.answer}
            </Text>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  // ========================================
  // CONTACT SECTION
  // ========================================

  const renderContact = () => (
    <View style={styles.sectionContent}>
      <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
        Entre em contato conosco por um dos canais abaixo
      </Text>

      <TouchableOpacity
        style={[styles.contactCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={handleOpenEmail}
        activeOpacity={0.7}
      >
        <View style={[styles.contactIconContainer, { backgroundColor: '#4A90E220' }]}>
          <Ionicons name="mail" size={28} color="#4A90E2" />
        </View>
        <View style={styles.contactInfo}>
          <Text style={[styles.contactTitle, { color: colors.textPrimary }]}>E-mail</Text>
          <Text style={[styles.contactValue, { color: colors.primary }]}>admin@losningtech.com</Text>
          <Text style={[styles.contactHint, { color: colors.textTertiary }]}>Toque para enviar e-mail</Text>
        </View>
        <Ionicons name="open-outline" size={20} color={colors.textTertiary} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.contactCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={handleOpenWhatsApp}
        activeOpacity={0.7}
      >
        <View style={[styles.contactIconContainer, { backgroundColor: '#25D36620' }]}>
          <Ionicons name="logo-whatsapp" size={28} color="#25D366" />
        </View>
        <View style={styles.contactInfo}>
          <Text style={[styles.contactTitle, { color: colors.textPrimary }]}>WhatsApp</Text>
          <Text style={[styles.contactValue, { color: '#25D366' }]}>+55 (61) 98373-0910</Text>
          <Text style={[styles.contactHint, { color: colors.textTertiary }]}>Toque para abrir WhatsApp</Text>
        </View>
        <Ionicons name="open-outline" size={20} color={colors.textTertiary} />
      </TouchableOpacity>
    </View>
  );

  // ========================================
  // TICKET FORM SECTION
  // ========================================

  const renderTicketForm = () => (
    <View style={styles.sectionContent}>
      <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
        Envie uma mensagem para nossa equipe de suporte
      </Text>

      <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Assunto</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.surfaceSecondary,
              color: colors.textPrimary,
              borderColor: colors.border,
            },
          ]}
          placeholder="Ex: Problema com agendamento"
          placeholderTextColor={colors.textTertiary}
          value={subject}
          onChangeText={setSubject}
          maxLength={200}
        />

        <Text style={[styles.inputLabel, { color: colors.textPrimary, marginTop: 16 }]}>Mensagem</Text>
        <TextInput
          style={[
            styles.input,
            styles.textArea,
            {
              backgroundColor: colors.surfaceSecondary,
              color: colors.textPrimary,
              borderColor: colors.border,
            },
          ]}
          placeholder="Descreva seu problema ou duvida com detalhes..."
          placeholderTextColor={colors.textTertiary}
          value={message}
          onChangeText={setMessage}
          maxLength={2000}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />
        <Text style={[styles.charCount, { color: colors.textTertiary }]}>
          {message.length}/2000
        </Text>

        <TouchableOpacity
          style={[
            styles.sendButton,
            { backgroundColor: colors.primary, opacity: sending ? 0.6 : 1 },
          ]}
          onPress={handleSendTicket}
          disabled={sending}
          activeOpacity={0.7}
        >
          {sending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="send" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.sendButtonText}>Enviar</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  // ========================================
  // TICKETS HISTORY SECTION
  // ========================================

  const renderTicketsHistory = () => (
    <View style={styles.sectionContent}>
      <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
        Acompanhe o status das suas mensagens enviadas
      </Text>

      {loadingTickets && !refreshing ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : tickets.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="chatbubbles-outline" size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
            Voce ainda nao enviou nenhuma mensagem
          </Text>
        </View>
      ) : (
        tickets.map((ticket) => (
          <TouchableOpacity
            key={ticket._id}
            style={[
              styles.ticketCard,
              {
                backgroundColor: colors.surface,
                borderColor: expandedTicket === ticket._id ? colors.primary : colors.border,
              },
            ]}
            onPress={() =>
              setExpandedTicket(expandedTicket === ticket._id ? null : ticket._id)
            }
            activeOpacity={0.7}
          >
            <View style={styles.ticketHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.ticketSubject, { color: colors.textPrimary }]}>
                  {ticket.subject}
                </Text>
                <Text style={[styles.ticketDate, { color: colors.textTertiary }]}>
                  {formatDate(ticket.createdAt)}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: STATUS_COLORS[ticket.status] + '20' },
                ]}
              >
                <Text
                  style={[styles.statusText, { color: STATUS_COLORS[ticket.status] }]}
                >
                  {STATUS_LABELS[ticket.status]}
                </Text>
              </View>
            </View>

            {expandedTicket === ticket._id && (
              <View style={[styles.ticketBody, { borderTopColor: colors.border }]}>
                <Text style={[styles.ticketMessageLabel, { color: colors.textSecondary }]}>
                  Sua mensagem:
                </Text>
                <Text style={[styles.ticketMessage, { color: colors.textPrimary }]}>
                  {ticket.message}
                </Text>

                {ticket.responses && ticket.responses.length > 0 && (
                  <View style={{ marginTop: 16 }}>
                    <Text style={[styles.ticketMessageLabel, { color: colors.textSecondary }]}>
                      Respostas:
                    </Text>
                    {ticket.responses.map((resp, idx) => (
                      <View
                        key={idx}
                        style={[
                          styles.responseItem,
                          { backgroundColor: colors.surfaceSecondary },
                        ]}
                      >
                        <View style={styles.responseHeader}>
                          <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
                          <Text style={[styles.responseAuthor, { color: colors.primary }]}>
                            Suporte
                          </Text>
                          <Text style={[styles.responseDate, { color: colors.textTertiary }]}>
                            {formatDate(resp.createdAt)}
                          </Text>
                        </View>
                        <Text style={[styles.responseMessage, { color: colors.textPrimary }]}>
                          {resp.message}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </TouchableOpacity>
        ))
      )}
    </View>
  );

  // ========================================
  // RENDER
  // ========================================

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Central de Ajuda</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      {renderTabs()}

      {/* Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          activeSection === 'history' ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          ) : undefined
        }
      >
        {activeSection === 'faq' && renderFaq()}
        {activeSection === 'contact' && renderContact()}
        {activeSection === 'ticket' && renderTicketForm()}
        {activeSection === 'history' && renderTicketsHistory()}
      </ScrollView>
    </SafeAreaView>
  );
}

// ========================================
// STYLES
// ========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  tabsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 6,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  sectionContent: {
    paddingHorizontal: 16,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
  },

  // FAQ
  faqItem: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '500',
  },
  faqAnswer: {
    fontSize: 14,
    lineHeight: 22,
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 0,
  },

  // Contact
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  contactIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  contactInfo: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  contactHint: {
    fontSize: 12,
  },

  // Ticket form
  formCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  textArea: {
    minHeight: 140,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  sendButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 16,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Tickets history
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 15,
    marginTop: 12,
    textAlign: 'center',
  },
  ticketCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  ticketSubject: {
    fontSize: 15,
    fontWeight: '500',
  },
  ticketDate: {
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  ticketBody: {
    padding: 14,
    borderTopWidth: 1,
  },
  ticketMessageLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  ticketMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  responseItem: {
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  responseAuthor: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  responseDate: {
    fontSize: 11,
    marginLeft: 'auto',
  },
  responseMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
});
