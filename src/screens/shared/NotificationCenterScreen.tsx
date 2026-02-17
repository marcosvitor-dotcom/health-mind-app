import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotifications } from '../../contexts/NotificationContext';
import {
  InAppNotification,
  getNotificationIcon,
  getNotificationColor,
  deleteNotification,
} from '../../services/inAppNotificationService';

export default function NotificationCenterScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { notifications, unreadCount, loading, refresh, markAsRead, markAllAsRead } =
    useNotifications();

  const handleNotificationPress = useCallback(
    async (notification: InAppNotification) => {
      if (!notification.read) {
        await markAsRead(notification._id);
      }

      // Navegar para a tela relevante
      const screen = notification.data?.screen;
      if (screen) {
        navigation.navigate(screen);
      }
    },
    [markAsRead, navigation]
  );

  const handleDelete = useCallback(
    (notification: InAppNotification) => {
      Alert.alert('Remover Notificação', 'Deseja remover esta notificação?', [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteNotification(notification._id);
              await refresh();
            } catch {
              Alert.alert('Erro', 'Não foi possível remover a notificação.');
            }
          },
        },
      ]);
    },
    [refresh]
  );

  const handleMarkAllRead = useCallback(async () => {
    try {
      await markAllAsRead();
    } catch {
      Alert.alert('Erro', 'Não foi possível marcar as notificações como lidas.');
    }
  }, [markAllAsRead]);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffMin / 60);
    const diffD = Math.floor(diffH / 24);

    if (diffMin < 1) return 'Agora';
    if (diffMin < 60) return `${diffMin}min`;
    if (diffH < 24) return `${diffH}h`;
    if (diffD < 7) return `${diffD}d`;
    return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
  };

  const renderItem = ({ item }: { item: InAppNotification }) => {
    const iconName = getNotificationIcon(item.type) as any;
    const iconColor = getNotificationColor(item.type);

    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          {
            backgroundColor: item.read ? colors.surface : colors.primary + '10',
            borderColor: colors.border,
          },
        ]}
        onPress={() => handleNotificationPress(item)}
        onLongPress={() => handleDelete(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
          <Ionicons name={iconName} size={22} color={iconColor} />
        </View>

        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <Text
              style={[
                styles.notificationTitle,
                { color: colors.textPrimary, fontWeight: item.read ? '500' : '700' },
              ]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <Text style={[styles.notificationTime, { color: colors.textTertiary }]}>
              {formatTime(item.createdAt)}
            </Text>
          </View>
          <Text
            style={[styles.notificationBody, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {item.body}
          </Text>
        </View>

        {!item.read && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="notifications-off-outline" size={64} color={colors.textTertiary} />
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
        Nenhuma notificação
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        Você será notificado sobre consultas, mensagens e atualizações aqui.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Notificações</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllButton}>
            <Text style={[styles.markAllText, { color: colors.primary }]}>Marcar todas</Text>
          </TouchableOpacity>
        )}
        {unreadCount === 0 && <View style={styles.markAllButton} />}
      </View>

      {loading && notifications.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={notifications.length === 0 ? styles.emptyList : styles.list}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={refresh}
              colors={[colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {notifications.length > 0 && (
        <Text style={[styles.hint, { color: colors.textTertiary }]}>
          Pressione e segure para remover uma notificação
        </Text>
      )}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  markAllButton: {
    minWidth: 80,
    alignItems: 'flex-end',
  },
  markAllText: {
    fontSize: 13,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    paddingVertical: 8,
  },
  emptyList: {
    flex: 1,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 15,
    flex: 1,
    marginRight: 8,
  },
  notificationTime: {
    fontSize: 12,
    flexShrink: 0,
  },
  notificationBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  hint: {
    textAlign: 'center',
    fontSize: 12,
    paddingVertical: 8,
  },
});
