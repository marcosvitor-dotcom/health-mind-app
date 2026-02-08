import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import {
  DirectMessage,
  sendDirectMessage,
  getConversation,
  markAsRead,
} from '../../services/directMessageService';

interface Props {
  navigation: any;
  route: {
    params: {
      recipientId: string;
      recipientName: string;
      recipientRole: 'patient' | 'psychologist';
    };
  };
}

export default function DirectChatScreen({ navigation, route }: Props) {
  const { recipientId, recipientName } = route.params;
  const { user } = useAuth();
  const { colors } = useTheme();

  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);

  const fetchMessages = useCallback(async (isInitial = false) => {
    try {
      const data = await getConversation(recipientId, 1, 100);
      const fetched = data.messages;

      // Verificar se ha mensagens novas
      const lastFetched = fetched.length > 0 ? fetched[fetched.length - 1]._id : null;
      if (!isInitial && lastFetched === lastMessageIdRef.current) {
        return; // Sem mensagens novas
      }

      lastMessageIdRef.current = lastFetched;
      setMessages(fetched);

      // Marcar como lidas
      const hasUnread = fetched.some(
        (m) => m.receiverId === user?._id && !m.readAt
      );
      if (hasUnread) {
        markAsRead(recipientId).catch(() => {});
      }
    } catch (error) {
      if (isInitial) {
        console.error('Erro ao carregar conversa:', error);
      }
    } finally {
      if (isInitial) {
        setLoading(false);
      }
    }
  }, [recipientId, user?._id]);

  useEffect(() => {
    fetchMessages(true);

    // Polling a cada 4 segundos
    pollingRef.current = setInterval(() => {
      fetchMessages(false);
    }, 4000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [fetchMessages]);

  const handleSend = async () => {
    if (!inputText.trim() || sending || !user) return;

    const text = inputText.trim();
    setInputText('');
    setSending(true);

    // Envio otimista
    const optimisticMessage: DirectMessage = {
      _id: `temp_${Date.now()}`,
      conversationKey: '',
      senderId: user._id,
      senderModel: user.role === 'patient' ? 'Patient' : 'Psychologist',
      senderRole: user.role as 'patient' | 'psychologist',
      receiverId: recipientId,
      receiverModel: user.role === 'patient' ? 'Psychologist' : 'Patient',
      message: text,
      readAt: null,
      deletedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const saved = await sendDirectMessage(recipientId, text);
      // Substituir mensagem otimista pela real
      setMessages((prev) =>
        prev.map((m) => (m._id === optimisticMessage._id ? saved : m))
      );
      lastMessageIdRef.current = saved._id;
    } catch (error) {
      // Remover mensagem otimista em caso de erro
      setMessages((prev) => prev.filter((m) => m._id !== optimisticMessage._id));
      setInputText(text); // Restaurar texto
    } finally {
      setSending(false);
    }
  };

  const formatTimestamp = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const isMyMessage = (msg: DirectMessage) => msg.senderId === user?._id;

  const renderMessage = ({ item }: { item: DirectMessage }) => {
    const isMine = isMyMessage(item);
    const isTemp = item._id.startsWith('temp_');

    return (
      <View
        style={[
          styles.messageBubble,
          isMine
            ? [styles.myBubble, { backgroundColor: colors.primary }]
            : [styles.otherBubble, { backgroundColor: colors.surface }],
        ]}
      >
        <Text
          style={[
            styles.messageText,
            isMine ? styles.myText : { color: colors.textPrimary },
          ]}
        >
          {item.message}
        </Text>
        <View style={styles.messageFooter}>
          <Text
            style={[
              styles.timestamp,
              isMine ? styles.myTimestamp : { color: colors.textTertiary },
            ]}
          >
            {formatTimestamp(item.createdAt)}
          </Text>
          {isMine && (
            <Ionicons
              name={isTemp ? 'time-outline' : item.readAt ? 'checkmark-done' : 'checkmark'}
              size={14}
              color={item.readAt ? '#69c0ff' : 'rgba(255,255,255,0.7)'}
              style={styles.statusIcon}
            />
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{recipientName}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{recipientName}</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Chat seguro</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item._id}
          contentContainerStyle={[
            styles.messagesContent,
            messages.length === 0 && styles.emptyContent,
          ]}
          onContentSizeChange={() => {
            if (messages.length > 0) {
              flatListRef.current?.scrollToEnd({ animated: false });
            }
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={64} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Nenhuma mensagem ainda
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
                Envie uma mensagem para iniciar a conversa
              </Text>
            </View>
          }
        />

        {/* Input */}
        <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <View style={[styles.inputWrapper, { backgroundColor: colors.background }]}>
            <TextInput
              style={[styles.input, { color: colors.textPrimary }]}
              placeholder="Digite sua mensagem..."
              placeholderTextColor={colors.textTertiary}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={2000}
            />
            <TouchableOpacity
              style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!inputText.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons
                  name="send"
                  size={22}
                  color={inputText.trim() ? colors.primary : colors.textTertiary}
                />
              )}
            </TouchableOpacity>
          </View>
          <Text style={[styles.hint, { color: colors.textTertiary }]}>
            Mensagens criptografadas de ponta a ponta
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  messageBubble: {
    maxWidth: '78%',
    marginBottom: 10,
    borderRadius: 16,
    padding: 12,
  },
  myBubble: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myText: {
    color: '#fff',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    justifyContent: 'flex-end',
  },
  timestamp: {
    fontSize: 11,
  },
  myTimestamp: {
    color: 'rgba(255, 255, 255, 0.75)',
  },
  statusIcon: {
    marginLeft: 4,
  },
  inputContainer: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  input: {
    flex: 1,
    fontSize: 15,
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    padding: 8,
    marginLeft: 4,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  hint: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 6,
  },
});
