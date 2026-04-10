import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';

type BlockCode = 'SUBSCRIPTION_BLOCKED' | 'NO_SUBSCRIPTION' | 'TRIAL_EXPIRED';

interface RouteParams {
  code?: BlockCode;
  message?: string;
}

const CONTENT: Record<BlockCode, { icon: string; title: string; description: string; color: string }> = {
  TRIAL_EXPIRED: {
    icon: 'time-outline',
    title: 'Período de Avaliação Encerrado',
    description:
      'Seu período de avaliação gratuito de 10 dias chegou ao fim. Escolha um plano para continuar usando o Health Mind.',
    color: '#FF9800',
  },
  SUBSCRIPTION_BLOCKED: {
    icon: 'lock-closed-outline',
    title: 'Assinatura Bloqueada',
    description:
      'Sua assinatura foi bloqueada por inadimplência. Entre em contato com o suporte ou regularize o pagamento para retomar o acesso.',
    color: '#E74C3C',
  },
  NO_SUBSCRIPTION: {
    icon: 'card-outline',
    title: 'Sem Assinatura Ativa',
    description:
      'Você não possui uma assinatura ativa. Entre em contato com o suporte do Health Mind para iniciar seu plano.',
    color: '#4A90E2',
  },
};

export default function SubscriptionBlockedScreen({ route, navigation }: any) {
  const { colors } = useTheme();
  const { logout } = useAuth();
  const params: RouteParams = route?.params || {};
  const code: BlockCode = params.code || 'SUBSCRIPTION_BLOCKED';
  const content = CONTENT[code] || CONTENT.SUBSCRIPTION_BLOCKED;

  const handleLogout = async () => {
    await logout();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.iconCircle, { backgroundColor: content.color + '20' }]}>
          <Ionicons name={content.icon as any} size={64} color={content.color} />
        </View>

        <Text style={[styles.title, { color: colors.textPrimary }]}>{content.title}</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>{content.description}</Text>

        {params.message && params.message !== content.description && (
          <View style={[styles.apiMessage, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.apiMessageText, { color: colors.textSecondary }]}>{params.message}</Text>
          </View>
        )}

        <View style={[styles.infoBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="headset-outline" size={20} color="#4A90E2" />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Para regularizar sua situação, entre em contato com o suporte através do e-mail{' '}
            <Text style={{ color: '#4A90E2', fontWeight: '600' }}>suporte@healthmind.com.br</Text>
          </Text>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#E74C3C" />
          <Text style={styles.logoutButtonText}>Sair da Conta</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  apiMessage: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    width: '100%',
  },
  apiMessageText: { fontSize: 13, textAlign: 'center' },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    width: '100%',
  },
  infoText: { flex: 1, fontSize: 14, lineHeight: 20 },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E74C3C',
  },
  logoutButtonText: { color: '#E74C3C', fontSize: 16, fontWeight: '600' },
});
