import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import * as subscriptionService from '../../services/subscriptionService';
import { Subscription, SubscriptionPayment } from '../../services/subscriptionService';

const PLAN_NAMES: Record<string, string> = {
  psico_avaliacao: 'Avaliação (Trial)',
  psico_basico: 'Básico',
  psico_consciencia: 'Consciência',
  psico_equilibrio: 'Equilíbrio',
  psico_plenitude: 'Plenitude',
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: 'Ativa', color: '#27AE60' },
  overdue: { label: 'Em atraso', color: '#E67E22' },
  blocked: { label: 'Bloqueada', color: '#E74C3C' },
  cancelled: { label: 'Cancelada', color: '#95A5A6' },
  none: { label: 'Sem assinatura', color: '#95A5A6' },
};

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  monthly: 'Mensalidade',
  setup: 'Taxa de setup',
  addon_patient: 'Slots extras',
};

const PAYMENT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: '#E67E22' },
  awaiting_confirmation: { label: 'Aguardando confirmação', color: '#3498DB' },
  confirmed: { label: 'Confirmado', color: '#27AE60' },
  overdue: { label: 'Em atraso', color: '#E74C3C' },
};

const UPGRADE_PLANS = [
  { key: 'psico_consciencia', name: 'Consciência', monthly: 300, setupFee: 0, invitedPatients: 5 },
  { key: 'psico_equilibrio', name: 'Equilíbrio', monthly: 500, setupFee: 150, invitedPatients: 10 },
  { key: 'psico_plenitude', name: 'Plenitude', monthly: 700, setupFee: 150, invitedPatients: 15 },
];

const BASE_CHECKOUT_URL = 'https://www.losningtech.com.br/health-mind-app/checkout';

function trialDaysLeft(trialEndsAt: string): number {
  const end = new Date(trialEndsAt).getTime();
  const now = Date.now();
  return Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
}

export default function SubscriptionScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [recentPayments, setRecentPayments] = useState<SubscriptionPayment[]>([]);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const { subscription: sub, recentPayments: payments } =
        await subscriptionService.getMySubscription();
      setSubscription(sub);
      setRecentPayments(payments);
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Erro ao carregar assinatura');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleUpgrade = (planKey: string) => {
    setShowUpgradeModal(false);
    Linking.openURL(`${BASE_CHECKOUT_URL}/${planKey}`).catch(() => {
      Alert.alert('Erro', 'Não foi possível abrir o navegador.');
    });
  };

  const showUpgrade =
    subscription?.isTrial ||
    subscription?.status === 'overdue' ||
    subscription?.status === 'blocked';

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Minha Assinatura</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4A90E2" />
        </View>
      </SafeAreaView>
    );
  }

  const statusCfg = subscription
    ? STATUS_LABELS[subscription.status] ?? STATUS_LABELS.none
    : STATUS_LABELS.none;

  const daysLeft =
    subscription?.isTrial && subscription.trialEndsAt
      ? trialDaysLeft(subscription.trialEndsAt)
      : null;

  const trialProgress =
    subscription?.isTrial && subscription.trialEndsAt
      ? Math.max(0, Math.min(1, 1 - daysLeft! / 10))
      : null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Minha Assinatura</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Plan card */}
        {subscription ? (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={styles.cardRow}>
              <Text style={[styles.planName, { color: colors.textPrimary }]}>
                {PLAN_NAMES[subscription.planKey] ?? subscription.planKey}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: statusCfg.color + '20' }]}>
                <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
              </View>
            </View>

            {!subscription.isTrial && (
              <>
                <Text style={[styles.cardDetail, { color: colors.textSecondary }]}>
                  R$ {subscription.billing.monthlyAmount}/mês
                </Text>
                <Text style={[styles.cardDetail, { color: colors.textSecondary }]}>
                  Próximo vencimento:{' '}
                  {new Date(subscription.billing.nextBillingDate).toLocaleDateString('pt-BR')}
                </Text>
              </>
            )}

            {subscription.isTrial && daysLeft !== null && (
              <View style={styles.trialSection}>
                <Text style={[styles.trialText, { color: colors.textSecondary }]}>
                  {daysLeft > 0 ? `${daysLeft} dia${daysLeft !== 1 ? 's' : ''} restante${daysLeft !== 1 ? 's' : ''}` : 'Trial expirado'}
                </Text>
                <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${(trialProgress ?? 0) * 100}%`,
                        backgroundColor: daysLeft <= 2 ? '#E74C3C' : '#4A90E2',
                      },
                    ]}
                  />
                </View>
              </View>
            )}

            <View style={[styles.limitsRow, { borderTopColor: colors.border }]}>
              <Ionicons name="people" size={16} color={colors.textTertiary} />
              <Text style={[styles.limitsText, { color: colors.textSecondary }]}>
                Pacientes com acesso ao app:{' '}
                <Text style={{ fontWeight: '700', color: colors.textPrimary }}>
                  {subscription.limits.invitedPatients === 0
                    ? 'Nenhum (faça upgrade)'
                    : `até ${subscription.limits.invitedPatients}`}
                </Text>
              </Text>
            </View>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.planName, { color: colors.textSecondary }]}>Sem assinatura ativa</Text>
          </View>
        )}

        {/* Upgrade button */}
        {showUpgrade && (
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => setShowUpgradeModal(true)}
          >
            <Ionicons name="arrow-up-circle" size={20} color="#fff" />
            <Text style={styles.upgradeButtonText}>
              {subscription?.isTrial ? 'Assinar Plano' : 'Fazer Upgrade'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Recent payments */}
        {recentPayments.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, backgroundColor: colors.surfaceSecondary }]}>
              Pagamentos Recentes
            </Text>
            {recentPayments.map((payment) => {
              const pStatus = PAYMENT_STATUS_LABELS[payment.status] ?? { label: payment.status, color: '#999' };
              return (
                <View key={payment._id} style={[styles.paymentItem, { borderBottomColor: colors.borderLight }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.paymentType, { color: colors.textPrimary }]}>
                      {PAYMENT_TYPE_LABELS[payment.type] ?? payment.type}
                    </Text>
                    <Text style={[styles.paymentDate, { color: colors.textTertiary }]}>
                      Vencimento: {new Date(payment.dueDate).toLocaleDateString('pt-BR')}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.paymentAmount, { color: colors.textPrimary }]}>
                      R$ {payment.amount}
                    </Text>
                    <View style={[styles.paymentBadge, { backgroundColor: pStatus.color + '20' }]}>
                      <Text style={[styles.paymentBadgeText, { color: pStatus.color }]}>{pStatus.label}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={[styles.infoBox, { backgroundColor: isDark ? colors.surfaceSecondary : '#E8F4FF' }]}>
          <Ionicons name="information-circle" size={18} color="#4A90E2" />
          <Text style={[styles.infoText, { color: '#4A90E2' }]}>
            Para fazer upgrade ou mudanças no plano, você será redirecionado ao nosso site.
          </Text>
        </View>
      </ScrollView>

      {/* Upgrade modal */}
      <Modal visible={showUpgradeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Escolher Plano</Text>
              <TouchableOpacity onPress={() => setShowUpgradeModal(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              Você será redirecionado ao site para finalizar a contratação.
            </Text>
            <FlatList
              data={UPGRADE_PLANS}
              keyExtractor={(item) => item.key}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.planItem, { borderColor: colors.border, backgroundColor: colors.background }]}
                  onPress={() => handleUpgrade(item.key)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.planItemName, { color: colors.textPrimary }]}>{item.name}</Text>
                    <Text style={[styles.planItemDetail, { color: colors.textSecondary }]}>
                      R$ {item.monthly}/mês
                      {item.setupFee > 0 ? ` + R$ ${item.setupFee} setup` : ''}
                      {'  •  '}
                      {item.invitedPatients} pacientes no app
                    </Text>
                  </View>
                  <Ionicons name="open-outline" size={20} color="#4A90E2" />
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '600' },
  content: { padding: 16, gap: 16 },
  card: {
    borderRadius: 16,
    padding: 20,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planName: { fontSize: 20, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  cardDetail: { fontSize: 14 },
  trialSection: { gap: 6, marginTop: 4 },
  trialText: { fontSize: 14 },
  progressBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  limitsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 4,
  },
  limitsText: { fontSize: 14, flex: 1 },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90E2',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  upgradeButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  section: { borderRadius: 16, overflow: 'hidden' },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingVertical: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  paymentType: { fontSize: 15, fontWeight: '600' },
  paymentDate: { fontSize: 12, marginTop: 2 },
  paymentAmount: { fontSize: 15, fontWeight: '700' },
  paymentBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginTop: 4 },
  paymentBadgeText: { fontSize: 11, fontWeight: '600' },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalSubtitle: { fontSize: 14, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  planItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  planItemName: { fontSize: 15, fontWeight: '600' },
  planItemDetail: { fontSize: 13, marginTop: 2 },
});
