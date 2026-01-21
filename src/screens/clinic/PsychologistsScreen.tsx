import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Modal, Linking } from 'react-native';
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

  // Modal de contato do psicólogo
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactPsychologist, setContactPsychologist] = useState<ClinicPsychologist | null>(null);

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

  // Abrir modal de contato do psicólogo
  const handleOpenContactModal = (psychologist: ClinicPsychologist) => {
    setContactPsychologist(psychologist);
    setShowContactModal(true);
  };

  // Abrir WhatsApp
  const handleWhatsApp = (phone?: string) => {
    if (!phone) {
      Alert.alert('Erro', 'Telefone não disponível.');
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    const url = `whatsapp://send?phone=55${cleanPhone}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Erro', 'Não foi possível abrir o WhatsApp.');
    });
  };

  // Ligar
  const handleCall = (phone?: string) => {
    if (!phone) {
      Alert.alert('Erro', 'Telefone não disponível.');
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    Linking.openURL(`tel:${cleanPhone}`);
  };

  const handleUnlinkPsychologist = (psychologist: ClinicPsychologist) => {
    const psyId = psychologist._id || psychologist.id;

    Alert.alert(
      'Desvincular Psicólogo',
      `Tem certeza que deseja desvincular ${psychologist.name} da clínica?\n\n` +
      `Atenção: Todos os pacientes vinculados a este psicólogo ficarão sem psicólogo atribuído.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desvincular',
          style: 'destructive',
          onPress: async () => {
            if (!user?.id) return;

            try {
              setLoading(true);
              await clinicService.unlinkPsychologistFromClinic(user.id, psyId);
              Alert.alert('Sucesso', `${psychologist.name} foi desvinculado da clínica.`);
              loadData();
            } catch (err: any) {
              console.error('Erro ao desvincular psicólogo:', err);
              const errorMessage = err.response?.data?.message || err.message || 'Erro ao desvincular psicólogo';
              Alert.alert('Erro', errorMessage);
              setLoading(false);
            }
          },
        },
      ]
    );
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
      </View>

      {/* Barra de ações */}
      <View style={styles.actionsBar}>
        <TouchableOpacity
          style={styles.actionBarButton}
          onPress={() => navigation.navigate('Invitations')}
        >
          <Ionicons name="mail-open" size={18} color="#4A90E2" />
          <Text style={styles.actionBarButtonText}>Convites</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBarButton}
          onPress={() => navigation.navigate('InvitePsychologist')}
        >
          <Ionicons name="send" size={18} color="#4A90E2" />
          <Text style={styles.actionBarButtonText}>Convidar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBarButton}
          onPress={() => navigation.navigate('AddPsychologist')}
        >
          <Ionicons name="person-add" size={18} color="#4A90E2" />
          <Text style={styles.actionBarButtonText}>Adicionar</Text>
        </TouchableOpacity>
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
            <TouchableOpacity
              key={psychologist._id || psychologist.id}
              activeOpacity={0.7}
              onPress={() => handleOpenContactModal(psychologist)}
            >
              <Card>
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

              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.detailsButton} onPress={() => handleOpenContactModal(psychologist)}>
                  <Text style={styles.detailsButtonText}>Ver Detalhes</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.unlinkButton}
                  onPress={() => handleUnlinkPsychologist(psychologist)}
                >
                  <Ionicons name="unlink" size={18} color="#FF6B6B" />
                  <Text style={styles.unlinkButtonText}>Desvincular</Text>
                </TouchableOpacity>
              </View>
              </Card>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Modal de Contato do Psicólogo */}
      <Modal
        visible={showContactModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowContactModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Dados do Psicólogo</Text>
              <TouchableOpacity onPress={() => setShowContactModal(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            {contactPsychologist && (
              <View>
                <View style={styles.contactAvatar}>
                  <Ionicons name="person-circle" size={80} color="#4A90E2" />
                </View>

                <Text style={styles.contactName}>{contactPsychologist.name}</Text>
                <Text style={styles.contactCrp}>{contactPsychologist.crp}</Text>

                <View style={styles.contactInfo}>
                  <View style={styles.contactInfoRow}>
                    <Ionicons name="mail" size={20} color="#666" />
                    <Text style={styles.contactInfoText}>
                      {contactPsychologist.email || 'Email não disponível'}
                    </Text>
                  </View>

                  <View style={styles.contactInfoRow}>
                    <Ionicons name="call" size={20} color="#666" />
                    <Text style={styles.contactInfoText}>
                      {contactPsychologist.phone || 'Telefone não disponível'}
                    </Text>
                  </View>

                  {contactPsychologist.specialties && contactPsychologist.specialties.length > 0 && (
                    <View style={styles.contactInfoRow}>
                      <Ionicons name="briefcase" size={20} color="#666" />
                      <Text style={styles.contactInfoText}>
                        {contactPsychologist.specialties.join(', ')}
                      </Text>
                    </View>
                  )}
                </View>

                {contactPsychologist.phone && (
                  <View style={styles.contactActions}>
                    <TouchableOpacity
                      style={[styles.contactActionButton, { backgroundColor: '#25D366' }]}
                      onPress={() => handleWhatsApp(contactPsychologist.phone)}
                    >
                      <Ionicons name="logo-whatsapp" size={24} color="#fff" />
                      <Text style={styles.contactActionText}>WhatsApp</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.contactActionButton, { backgroundColor: '#4A90E2' }]}
                      onPress={() => handleCall(contactPsychologist.phone)}
                    >
                      <Ionicons name="call" size={24} color="#fff" />
                      <Text style={styles.contactActionText}>Ligar</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.closeContactButton}
                  onPress={() => setShowContactModal(false)}
                >
                  <Text style={styles.closeContactButtonText}>Fechar</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
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
  actionsBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 8,
  },
  actionBarButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F4FF',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 6,
  },
  actionBarButtonText: {
    color: '#4A90E2',
    fontSize: 13,
    fontWeight: '600',
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
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  detailsButton: {
    flex: 1,
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
  unlinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE8E8',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  unlinkButtonText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  // Contact Modal styles
  contactAvatar: {
    alignItems: 'center',
    marginBottom: 16,
  },
  contactName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  contactCrp: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  contactInfo: {
    marginBottom: 24,
  },
  contactInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  contactInfoText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  contactActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  contactActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  contactActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  closeContactButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeContactButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
});
