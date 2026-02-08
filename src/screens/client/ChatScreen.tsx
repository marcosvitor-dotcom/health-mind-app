import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import * as chatService from '../../services/chatService';
import { useAuth } from '../../contexts/AuthContext';

interface LocalMessage {
  id: string;
  text: string;
  isAI: boolean;
  timestamp: Date;
}

export default function ChatScreen() {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);

  // Voice-to-text state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [speechAvailable, setSpeechAvailable] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const patientId = user?._id || user?.id || '';

  useEffect(() => {
    loadChatHistory();
  }, []);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  useEffect(() => {
    const checkSpeech = async () => {
      try {
        const available = await ExpoSpeechRecognitionModule.isRecognitionAvailable();
        setSpeechAvailable(available);
      } catch {
        setSpeechAvailable(false);
      }
    };
    checkSpeech();
  }, []);

  // Pulse animation helpers
  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopPulseAnimation = () => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  };

  // Speech recognition event handlers
  useSpeechRecognitionEvent('result', (event) => {
    if (event.results && event.results.length > 0) {
      const transcript = event.results[0].transcript;
      if (event.isFinal) {
        setMessage((prev) => {
          const separator = prev.trim() ? ' ' : '';
          return prev + separator + transcript;
        });
        setIsTranscribing(false);
      }
    }
  });

  useSpeechRecognitionEvent('start', () => {
    setIsRecording(true);
    startPulseAnimation();
  });

  useSpeechRecognitionEvent('end', () => {
    setIsRecording(false);
    setIsTranscribing(false);
    stopPulseAnimation();
  });

  useSpeechRecognitionEvent('error', (event) => {
    console.error('Speech recognition error:', event.error, event.message);
    setIsRecording(false);
    setIsTranscribing(false);
    stopPulseAnimation();

    if (event.error !== 'no-speech') {
      Alert.alert(
        'Erro no reconhecimento de voz',
        'Nao foi possivel transcrever o audio. Tente novamente.'
      );
    }
  });

  const handleMicPress = async () => {
    if (isRecording) {
      ExpoSpeechRecognitionModule.stop();
      setIsTranscribing(true);
      return;
    }

    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!result.granted) {
      Alert.alert(
        'Permissao necessaria',
        'Para usar a funcao de voz, permita o acesso ao microfone e ao reconhecimento de fala nas configuracoes do dispositivo.'
      );
      return;
    }

    try {
      ExpoSpeechRecognitionModule.start({
        lang: 'pt-BR',
        interimResults: false,
        continuous: false,
        requiresOnDeviceRecognition: false,
        addsPunctuation: true,
      });
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      Alert.alert('Erro', 'Nao foi possivel iniciar o reconhecimento de voz.');
    }
  };

  const loadChatHistory = async () => {
    if (!patientId) {
      setIsLoadingHistory(false);
      setMessages([
        {
          id: '1',
          text: 'Ola! Como voce esta se sentindo hoje?',
          isAI: true,
          timestamp: new Date(),
        },
      ]);
      return;
    }

    try {
      setIsLoadingHistory(true);
      const history = await chatService.getChatHistory(patientId, 1, 50);

      if (history.messages.length > 0) {
        const loadedMessages: LocalMessage[] = history.messages.map((msg) => ({
          id: msg._id,
          text: msg.isAI ? (msg.response || msg.message) : msg.message,
          isAI: msg.isAI,
          timestamp: new Date(msg.createdAt),
        }));
        setMessages(loadedMessages);
      } else {
        // Sem historico - mensagem de boas-vindas
        setMessages([
          {
            id: '1',
            text: 'Ola! Como voce esta se sentindo hoje?',
            isAI: true,
            timestamp: new Date(),
          },
        ]);
      }
    } catch (error) {
      console.error('Erro ao carregar historico:', error);
      // Mesmo com erro, mostrar mensagem de boas-vindas
      setMessages([
        {
          id: '1',
          text: 'Ola! Como voce esta se sentindo hoje?',
          isAI: true,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSend = async () => {
    if (message.trim() && !isLoading) {
      const userMessage: LocalMessage = {
        id: Date.now().toString(),
        text: message,
        isAI: false,
        timestamp: new Date(),
      };

      const messageToSend = message;
      setMessages((prev) => [...prev, userMessage]);
      setMessage('');
      setIsLoading(true);

      try {
        const response = await chatService.sendMessage(patientId, messageToSend);

        const aiResponse: LocalMessage = {
          id: response.aiMessage._id || (Date.now() + 1).toString(),
          text: response.aiMessage.response || response.aiMessage.message,
          isAI: true,
          timestamp: new Date(response.aiMessage.createdAt || new Date()),
        };

        // Atualizar ID da mensagem do usuario com o real da API
        setMessages((prev) => {
          const updated = [...prev];
          const userMsgIndex = updated.findIndex((m) => m.id === userMessage.id);
          if (userMsgIndex >= 0) {
            updated[userMsgIndex] = {
              ...updated[userMsgIndex],
              id: response.userMessage._id || updated[userMsgIndex].id,
            };
          }
          return [...updated, aiResponse];
        });
      } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        const errorResponse: LocalMessage = {
          id: (Date.now() + 1).toString(),
          text: 'Desculpe, ocorreu um erro. Tente novamente.',
          isAI: true,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorResponse]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  if (isLoadingHistory) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.headerTextContainer}>
            <View style={styles.aiIndicator}>
              <View style={styles.aiDot} />
              <Text style={styles.aiText}>Assistente</Text>
            </View>
            <Text style={styles.subtitle}>Seu diario pessoal</Text>
          </View>
        </View>
        <View style={styles.loadingHistoryContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingHistoryText}>Carregando conversas...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.header}>
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.headerTextContainer}>
            <View style={styles.aiIndicator}>
              <View style={styles.aiDot} />
              <Text style={styles.aiText}>Assistente</Text>
            </View>
            <Text style={styles.subtitle}>Seu diario pessoal</Text>
          </View>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          keyboardShouldPersistTaps="handled"
        >
        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.messageWrapper,
              msg.isAI ? styles.aiMessageWrapper : styles.userMessageWrapper,
            ]}
          >
            <View
              style={[
                styles.messageBubble,
                msg.isAI ? styles.aiMessage : styles.userMessage,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  msg.isAI ? styles.aiMessageText : styles.userMessageText,
                ]}
              >
                {msg.text}
              </Text>
              <Text
                style={[
                  styles.timestamp,
                  msg.isAI ? styles.aiTimestamp : styles.userTimestamp,
                ]}
              >
                {msg.timestamp.toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          </View>
        ))}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#4A90E2" />
            <Text style={styles.loadingText}>Digitando...</Text>
          </View>
        )}
        </ScrollView>

        <View style={styles.inputContainer}>
          {speechAvailable && (
            <TouchableOpacity
              style={styles.micButton}
              onPress={handleMicPress}
              disabled={isLoading}
            >
              <Animated.View
                style={[
                  styles.micIconContainer,
                  isRecording && styles.micIconContainerActive,
                  { transform: [{ scale: isRecording ? pulseAnim : 1 }] },
                ]}
              >
                <Ionicons
                  name={isRecording ? 'stop' : 'mic'}
                  size={22}
                  color={isRecording ? '#fff' : '#4A90E2'}
                />
              </Animated.View>
            </TouchableOpacity>
          )}

          <TextInput
            style={styles.input}
            placeholder={
              isRecording
                ? 'Ouvindo...'
                : isTranscribing
                ? 'Transcrevendo...'
                : 'Escreva como voce esta se sentindo...'
            }
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={2000}
            editable={!isLoading && !isRecording}
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              (!message.trim() || isLoading || isRecording) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!message.trim() || isLoading || isRecording}
          >
            <Ionicons
              name="send"
              size={24}
              color={message.trim() && !isLoading && !isRecording ? '#fff' : '#ccc'}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  logo: {
    width: 50,
    height: 50,
    marginRight: 12,
    borderRadius: 10,
    overflow: 'hidden',
  },
  headerTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  aiIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#50C878',
    marginRight: 8,
  },
  aiText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageWrapper: {
    marginBottom: 12,
    maxWidth: '80%',
  },
  aiMessageWrapper: {
    alignSelf: 'flex-start',
  },
  userMessageWrapper: {
    alignSelf: 'flex-end',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
  },
  aiMessage: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  userMessage: {
    backgroundColor: '#4A90E2',
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  aiMessageText: {
    color: '#333',
  },
  userMessageText: {
    color: '#fff',
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
  },
  aiTimestamp: {
    color: '#999',
  },
  userTimestamp: {
    color: '#E8F4FD',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 15,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#f0f0f0',
  },
  micButton: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  micIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micIconContainerActive: {
    backgroundColor: '#E53935',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    marginBottom: 12,
  },
  loadingText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic',
  },
  loadingHistoryContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingHistoryText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
});
