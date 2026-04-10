import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import * as subscriptionService from '../services/subscriptionService';
import { Subscription } from '../services/subscriptionService';

// Nomes amigáveis dos planos
const PLAN_NAMES: Record<string, string> = {
  psico_avaliacao: 'Avaliação (Trial)',
  psico_basico: 'Básico',
  psico_consciencia: 'Consciência',
  psico_equilibrio: 'Equilíbrio',
  psico_plenitude: 'Plenitude',
  clinic_essencia: 'Essência',
  clinic_amplitude: 'Amplitude',
};

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: string }
> = {
  active: { label: 'Ativo', color: '#27AE60', icon: 'checkmark-circle' },
  overdue: { label: 'Em atraso', color: '#E67E22', icon: 'alert-circle' },
  blocked: { label: 'Bloqueado', color: '#E74C3C', icon: 'lock-closed' },
  cancelled: { label: 'Cancelado', color: '#95A5A6', icon: 'close-circle' },
  none: { label: 'Sem plano', color: '#95A5A6', icon: 'card-outline' },
};

/** Calcula dias restantes de trial (pode ser negativo se expirou) */
function trialDaysLeft(trialEndsAt: string): number {
  const end = new Date(trialEndsAt).getTime();
  const now = Date.now();
  return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
}

export default function SubscriptionCard() {
  const { colors, isDark } = useTheme();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    subscriptionService
      .getMySubscription()
      .then(({ subscription: sub }) => setSubscription(sub))
      .catch(() => {}) // silencioso — é informação auxiliar
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <ActivityIndicator size="small" color={colors.textTertiary} />
      </View>
    );
  }

  if (!subscription) return null;

  const planName = PLAN_NAMES[subscription.planKey] ?? subscription.planKey;
  const statusCfg = STATUS_CONFIG[subscription.status] ?? STATUS_CONFIG.none;

  const daysLeft =
    subscription.isTrial && subscription.trialEndsAt
      ? trialDaysLeft(subscription.trialEndsAt)
      : null;

  const isTrialExpiring = daysLeft !== null && daysLeft <= 3 && daysLeft >= 0;
  const isTrialExpired = daysLeft !== null && daysLeft < 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: isDark ? colors.surfaceSecondary : '#F0F0FF' }]}>
          <Ionicons name="card-outline" size={18} color="#4A90E2" />
        </View>

        <View style={styles.info}>
          <Text style={[styles.planName, { color: colors.textPrimary }]}>{planName}</Text>

          {subscription.isTrial && daysLeft !== null ? (
            isTrialExpired ? (
              <Text style={[styles.trialText, { color: '#E74C3C' }]}>
                Trial expirado
              </Text>
            ) : (
              <Text
                style={[
                  styles.trialText,
                  { color: isTrialExpiring ? '#E67E22' : colors.textSecondary },
                ]}
              >
                {daysLeft === 0
                  ? 'Último dia do trial'
                  : `Trial: ${daysLeft} dia${daysLeft !== 1 ? 's' : ''} restante${daysLeft !== 1 ? 's' : ''}`}
              </Text>
            )
          ) : (
            <Text style={[styles.billingText, { color: colors.textTertiary }]}>
              {subscription.billing.monthlyAmount > 0
                ? `R$ ${subscription.billing.monthlyAmount.toLocaleString('pt-BR')}/mês`
                : 'Gratuito'}
            </Text>
          )}
        </View>

        <View style={[styles.statusBadge, { backgroundColor: statusCfg.color + '18' }]}>
          <Ionicons name={statusCfg.icon as any} size={12} color={statusCfg.color} />
          <Text style={[styles.statusText, { color: statusCfg.color }]}>
            {statusCfg.label}
          </Text>
        </View>
      </View>

      {/* Barra de progresso de trial */}
      {subscription.isTrial && daysLeft !== null && daysLeft >= 0 && (
        <View style={styles.trialBarWrap}>
          <View style={[styles.trialBarBg, { backgroundColor: isDark ? colors.surfaceSecondary : '#ECECEC' }]}>
            <View
              style={[
                styles.trialBarFill,
                {
                  width: `${Math.max(0, Math.min(100, (daysLeft / 10) * 100))}%`,
                  backgroundColor: isTrialExpiring ? '#E67E22' : '#4A90E2',
                },
              ]}
            />
          </View>
          <Text style={[styles.trialBarLabel, { color: colors.textTertiary }]}>
            {10 - daysLeft} de 10 dias usados
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  planName: {
    fontSize: 14,
    fontWeight: '600',
  },
  billingText: {
    fontSize: 12,
    marginTop: 2,
  },
  trialText: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  trialBarWrap: {
    marginTop: 10,
    gap: 4,
  },
  trialBarBg: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  trialBarFill: {
    height: 4,
    borderRadius: 2,
  },
  trialBarLabel: {
    fontSize: 11,
    textAlign: 'right',
  },
});
