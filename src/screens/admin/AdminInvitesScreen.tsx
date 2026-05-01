import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { ThemeColors } from '../../constants/theme';
import * as adminService from '../../services/adminService';
import { AdminInvitation } from '../../types';

type StatusFilter = 'all' | 'pending' | 'accepted' | 'expired';

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap }> = {
  clinic: { label: 'Clínica', color: '#3498DB', icon: 'business' },
  psychologist: { label: 'Psicólogo', color: '#9B59B6', icon: 'medkit' },
  patient: { label: 'Paciente', color: '#27AE60', icon: 'person' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: '#E67E22' },
  accepted: { label: 'Aceito', color: '#27AE60' },
  expired: { label: 'Expirado', color: '#95A5A6' },
};

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `Há ${diffDays} dias`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function AdminInvitesScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [invitations, setInvitations] = useState<AdminInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadInvitations = useCallback(
    async (reset = true) => {
      try {
        const currentPage = reset ? 1 : page;
        const data = await adminService.listAllInvitations({
          status: statusFilter === 'all' ? undefined : statusFilter,
          page: currentPage,
          limit: 20,
        });

        if (reset) {
          setInvitations(data.invitations);
          setPage(1);
        } else {
          setInvitations((prev) => [...prev, ...data.invitations]);
        }

        setHasMore(data.pagination.page < data.pagination.pages);
      } catch {
        // silently fail on list errors — not critical
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [statusFilter, page]
  );

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadInvitations(true);
    }, [statusFilter])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadInvitations(true);
  }, [loadInvitations]);

  const handleLoadMore = () => {
    if (!hasMore || loadingMore || loading) return;
    setLoadingMore(true);
    setPage((p) => p + 1);
    loadInvitations(false);
  };

  const renderInvitation = ({ item }: { item: AdminInvitation }) => {
    const roleCfg = ROLE_CONFIG[item.role] ?? ROLE_CONFIG.clinic;
    const statusCfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.expired;

    return (
      <View style={styles.inviteCard}>
        <View style={styles.inviteHeader}>
          <View style={[styles.roleIcon, { backgroundColor: roleCfg.color + '20' }]}>
            <Ionicons name={roleCfg.icon} size={22} color={roleCfg.color} />
          </View>
          <View style={styles.inviteInfo}>
            <Text style={styles.inviteName} numberOfLines={1}>
              {item.name || item.email}
            </Text>
            {item.name && (
              <Text style={styles.inviteEmail} numberOfLines={1}>
                {item.email}
              </Text>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusCfg.color + '20' }]}>
            <Text style={[styles.statusText, { color: statusCfg.color }]}>
              {statusCfg.label}
            </Text>
          </View>
        </View>

        <View style={styles.inviteMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="pricetag-outline" size={13} color={colors.textTertiary} />
            <Text style={styles.metaText}>{roleCfg.label}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="person-outline" size={13} color={colors.textTertiary} />
            <Text style={styles.metaText} numberOfLines={1}>
              {item.invitedBy?.userName || 'Desconhecido'}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={13} color={colors.textTertiary} />
            <Text style={styles.metaText}>{formatRelativeDate(item.createdAt)}</Text>
          </View>
        </View>
      </View>
    );
  };

  const FilterTab = ({ value, label }: { value: StatusFilter; label: string }) => (
    <TouchableOpacity
      style={[styles.filterTab, statusFilter === value && styles.filterTabActive]}
      onPress={() => setStatusFilter(value)}
    >
      <Text style={[styles.filterTabText, statusFilter === value && styles.filterTabTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Convites</Text>
        <Text style={styles.subtitle}>Adicione novos usuários à plataforma</Text>
      </View>

      {/* Action Cards */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('InviteClinic')}
          activeOpacity={0.7}
        >
          <View style={[styles.cardIcon, { backgroundColor: '#EBF5FB' }]}>
            <Ionicons name="business" size={28} color="#3498DB" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Convidar Clínica</Text>
            <Text style={styles.cardDescription}>
              Envie um convite para uma nova clínica.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.border} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('InvitePsychologist')}
          activeOpacity={0.7}
        >
          <View style={[styles.cardIcon, { backgroundColor: '#F5EEF8' }]}>
            <Ionicons name="medkit" size={28} color="#9B59B6" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Convidar Psicólogo</Text>
            <Text style={styles.cardDescription}>
              Convide um psicólogo autônomo.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.border} />
        </TouchableOpacity>
      </View>

      {/* Divider + Histórico */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Histórico de Convites</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <FilterTab value="all" label="Todos" />
        <FilterTab value="pending" label="Pendentes" />
        <FilterTab value="accepted" label="Aceitos" />
        <FilterTab value="expired" label="Expirados" />
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#E74C3C" />
        </View>
      ) : invitations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="mail-outline" size={56} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>Nenhum convite encontrado</Text>
          <Text style={styles.emptySubtitle}>
            {statusFilter === 'all'
              ? 'Nenhum convite foi enviado ainda'
              : `Nenhum convite ${STATUS_CONFIG[statusFilter]?.label.toLowerCase()}`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={invitations}
          renderItem={renderInvitation}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#E74C3C']} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator style={{ paddingVertical: 16 }} color="#E74C3C" />
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 12,
    },
    title: {
      fontSize: 26,
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 4,
    },
    actionsContainer: {
      paddingHorizontal: 16,
      gap: 10,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 3,
      gap: 12,
    },
    cardIcon: {
      width: 52,
      height: 52,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardContent: {
      flex: 1,
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 3,
    },
    cardDescription: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    sectionHeader: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 8,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    filterContainer: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingBottom: 8,
      gap: 8,
    },
    filterTab: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterTabActive: {
      backgroundColor: '#E74C3C',
      borderColor: '#E74C3C',
    },
    filterTabText: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    filterTabTextActive: {
      color: '#fff',
      fontWeight: '600',
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: colors.textPrimary,
      marginTop: 16,
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 6,
      textAlign: 'center',
    },
    listContent: {
      padding: 16,
      paddingTop: 4,
      gap: 10,
    },
    inviteCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    inviteHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 10,
    },
    roleIcon: {
      width: 42,
      height: 42,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    inviteInfo: {
      flex: 1,
    },
    inviteName: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    inviteEmail: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '600',
    },
    inviteMeta: {
      flexDirection: 'row',
      gap: 12,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
      paddingTop: 10,
      flexWrap: 'wrap',
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metaText: {
      fontSize: 12,
      color: colors.textTertiary,
    },
  });
