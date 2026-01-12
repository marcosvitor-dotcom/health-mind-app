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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { sendMessageToN8N } from '../../services/n8nApi';
import { useAuth } from '../../contexts/AuthContext';

export default function ChatScreen() {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: '1',
      text: 'Olá! Como você está se sentindo hoje?',
      isAI: true,
      timestamp: new Date(),
    },
  ]);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const handleSend = async () => {
    if (message.trim() && !isLoading) {
      const userMessage = {
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
        const aiResponseText = await sendMessageToN8N(
          messageToSend,
          user?.id || 'user-123',
          'psych-456'
        );

        const aiResponse = {
          id: (Date.now() + 1).toString(),
          text: aiResponseText,
          isAI: true,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiResponse]);
      } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        const errorResponse = {
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
            <Text style={styles.subtitle}>Seu diário pessoal</Text>
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
          <TextInput
            style={styles.input}
            placeholder="Escreva como você está se sentindo..."
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={500}
            editable={!isLoading}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!message.trim() || isLoading) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!message.trim() || isLoading}
          >
            <Ionicons
              name="send"
              size={24}
              color={message.trim() && !isLoading ? '#fff' : '#ccc'}
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
});
