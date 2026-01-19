import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Card from '../../components/Card';
import { useAuth } from '../../contexts/AuthContext';
import * as clinicService from '../../services/clinicService';
import { ClinicPsychologist } from '../../services/clinicService';

export default function PsychologistsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [psychologists, setPsychologists] = useState<ClinicPsychologist[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setError(null);
      const data = await clinicService.getClinicPsychologists(user.id);
      setPsychologists(data);
    } catch (err: any) {
      console.error('Erro ao carregar psicólogos:', err);
      setError(err.message || 'Erro ao carregar psicólogos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation, loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const formatNextAppointment = (dateTime?: string) => {
    if (!dateTime) return 'Sem consultas hoje';
    const date = new Date(dateTime);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Psicólogos da Clínica</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Psicólogos da Clínica</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.invitationsButton}
            onPress={() => navigation.navigate('Invitations')}
          >
            <Ionicons name="mail-open" size={20} color="#4A90E2" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.inviteButton}
            onPress={() => navigation.navigate('InvitePsychologist')}
          >
            <Ionicons name="mail" size={20} color="#fff" />
            <Text style={styles.inviteButtonText}>Convidar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AddPsychologist')}
          >
            <Ionicons name="add-circle" size={28} color="#4A90E2" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4A90E2']} />
        }
      >
        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={48} color="#FF6B6B" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadData}>
              <Text style={styles.retryButtonText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : psychologists.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>Nenhum psicólogo cadastrado</Text>
            <Text style={styles.emptyText}>
              Convide ou cadastre psicólogos para começar a usar o sistema.
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('InvitePsychologist')}
            >
              <Ionicons name="mail" size={20} color="#fff" />
              <Text style={styles.emptyButtonText}>Convidar Psicólogo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          psychologists.map((psychologist) => (
            <Card key={psychologist._id || psychologist.id}>
              <View style={styles.psychologistHeader}>
                <View style={styles.avatar}>
                  {psychologist.avatar ? (
                    <Text style={styles.avatarText}>{getInitial(psychologist.name)}</Text>
                  ) : (
                    <Text style={styles.avatarText}>{getInitial(psychologist.name)}</Text>
                  )}
                </View>
                <View style={styles.psychologistInfo}>
                  <Text style={styles.name}>{psychologist.name}</Text>
                  <Text style={styles.crp}>{psychologist.crp}</Text>
                </View>
              </View>

              {psychologist.specialties && psychologist.specialties.length > 0 && (
                <View style={styles.specialtiesContainer}>
                  {psychologist.specialties.slice(0, 3).map((specialty, index) => (
                    <View key={index} style={styles.specialtyTag}>
                      <Text style={styles.specialtyText}>{specialty}</Text>
                    </View>
                  ))}
                  {psychologist.specialties.length > 3 && (
                    <View style={[styles.specialtyTag, styles.moreTag]}>
                      <Text style={styles.specialtyText}>+{psychologist.specialties.length - 3}</Text>
                    </View>
                  )}
                </View>
              )}

              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Ionicons name="people" size={16} color="#666" />
                  <Text style={styles.statText}>
                    {psychologist.patientCount || 0} pacientes
                  </Text>
                </View>
                <View style={styles.stat}>
                  <Ionicons name="time" size={16} color="#666" />
                  <Text style={styles.statText}>
                    Próxima: {formatNextAppointment(psychologist.nextAppointment)}
                  </Text>
                </View>
              </View>

              <TouchableOpacity style={styles.detailsButton}>
                <Text style={styles.detailsButtonText}>Ver Detalhes</Text>
              </TouchableOpacity>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  invitationsButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#E8F4FF',
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A90E2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  inviteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  addButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 40,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#4A90E2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
    gap: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  list: {
    flex: 1,
    padding: 10,
  },
  psychologistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
  },
  psychologistInfo: {
    marginLeft: 12,
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  crp: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  specialtiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 8,
  },
  specialtyTag: {
    backgroundColor: '#E8F4FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  moreTag: {
    backgroundColor: '#f0f0f0',
  },
  specialtyText: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  detailsButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  detailsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
