import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import * as profileService from '../../services/profileService';
import { ClinicInfo, ClinicPsychologistItem } from '../../services/profileService';

interface Props {
  navigation: any;
}

export default function ClinicInfoScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [clinic, setClinic] = useState<ClinicInfo | null>(null);
  const [psychologists, setPsychologists] = useState<ClinicPsychologistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [transferring, setTransferring] = useState<string | null>(null);

  const patientId = user?._id || user?.id || '';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [clinicData, psyData] = await Promise.all([
        profileService.getClinicInfo(patientId),
        profileService.getClinicPsychologists(patientId).catch(() => []),
      ]);
      setClinic(clinicData);
      setPsychologists(psyData);
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao carregar dados da clínica');
    } finally {
      setLoading(false);
    }
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const formatCnpj = (cnpj: string) => {
    const digits = cnpj.replace(/\D/g, '');
    if (digits.length !== 14) return cnpj;
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  };

  const formatAddress = (address: ClinicInfo['address']) => {
    if (!address) return null;
    const parts = [
      address.street,
      address.number,
      address.city,
      address.state,
      address.zipCode,
    ].filter(Boolean);
    return parts.join(', ');
  };

  const handleTransferRequest = (psy: ClinicPsychologistItem) => {
    Alert.alert(
      'Solicitar Transferência',
      `Deseja solicitar transferência para ${psy.name}?\n\nA clínica será notificada e avaliará sua solicitação.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Solicitar',
          onPress: async () => {
            setTransferring(psy._id);
            try {
              await profileService.requestTransfer(patientId, psy._id);
              Alert.alert('Sucesso', 'Solicitação de transferência enviada com sucesso!');
            } catch (error: any) {
              Alert.alert('Erro', error.message || 'Erro ao solicitar transferência');
            } finally {
              setTransferring(null);
            }
          },
        },
      ],
    );
  };

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Carregando dados...</Text>
      </View>
    );
  }

  if (!clinic) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerBarTitle}>Minha Clínica</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="business-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>Nenhuma clínica vinculada</Text>
        </View>
      </SafeAreaView>
    );
  }

  const addressStr = formatAddress(clinic.address);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerBarTitle}>Minha Clínica</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Clinic Header */}
        <View style={styles.clinicHeader}>
          {clinic.logo ? (
            <Image source={{ uri: clinic.logo }} style={styles.logo} />
          ) : (
            <View style={[styles.logo, styles.logoPlaceholder]}>
              <Ionicons name="business" size={40} color="#fff" />
            </View>
          )}
          <Text style={styles.clinicName}>{clinic.name}</Text>
        </View>

        <View style={styles.content}>
          {/* Dados */}
          {clinic.cnpj && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Dados</Text>
              <View style={styles.infoRow}>
                <Ionicons name="document-text-outline" size={18} color="#666" />
                <Text style={styles.infoLabel}>CNPJ:</Text>
                <Text style={styles.infoValue}>{formatCnpj(clinic.cnpj)}</Text>
              </View>
            </View>
          )}

          {/* Contato */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contato</Text>

            {clinic.phone && (
              <TouchableOpacity style={styles.infoRow} onPress={() => handleCall(clinic.phone!)}>
                <Ionicons name="call-outline" size={18} color="#4A90E2" />
                <Text style={styles.infoLabel}>Telefone:</Text>
                <Text style={[styles.infoValue, styles.infoLink]}>{clinic.phone}</Text>
              </TouchableOpacity>
            )}

            {addressStr && (
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={18} color="#666" />
                <Text style={[styles.infoValue, { flex: 1 }]}>{addressStr}</Text>
              </View>
            )}
          </View>

          {/* Psicólogos */}
          {psychologists.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Psicólogos ({psychologists.length})
              </Text>
              {psychologists.map((psy) => (
                <View key={psy._id} style={styles.psyCard}>
                  <TouchableOpacity
                    style={styles.psyCardContent}
                    onPress={() => navigation.push('PsychologistProfile', { psychologistId: psy._id })}
                  >
                    {psy.avatar ? (
                      <Image source={{ uri: psy.avatar }} style={styles.psyAvatar} />
                    ) : (
                      <View style={[styles.psyAvatar, styles.psyAvatarPlaceholder]}>
                        <Text style={styles.psyAvatarText}>{getInitials(psy.name)}</Text>
                      </View>
                    )}
                    <View style={styles.psyInfo}>
                      <View style={styles.psyNameRow}>
                        <Text style={styles.psyName}>{psy.name}</Text>
                        {psy.isCurrentPsychologist && (
                          <View style={styles.currentBadge}>
                            <Text style={styles.currentBadgeText}>Seu psicólogo</Text>
                          </View>
                        )}
                      </View>
                      {psy.crp && (
                        <Text style={styles.psyCrp}>CRP {psy.crp}</Text>
                      )}
                      {psy.therapeuticProfile?.abordagemPrincipal && (
                        <Text style={styles.psyApproach}>{psy.therapeuticProfile.abordagemPrincipal}</Text>
                      )}
                      {psy.specialties && psy.specialties.length > 0 && (
                        <View style={styles.psyChipGroup}>
                          {psy.specialties.slice(0, 3).map((s, i) => (
                            <View key={i} style={styles.psyChip}>
                              <Text style={styles.psyChipText}>{s}</Text>
                            </View>
                          ))}
                          {psy.specialties.length > 3 && (
                            <Text style={styles.moreChips}>+{psy.specialties.length - 3}</Text>
                          )}
                        </View>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#ccc" />
                  </TouchableOpacity>

                  {!psy.isCurrentPsychologist && (
                    <TouchableOpacity
                      style={styles.transferBtn}
                      onPress={() => handleTransferRequest(psy)}
                      disabled={transferring === psy._id}
                    >
                      {transferring === psy._id ? (
                        <ActivityIndicator size="small" color="#4A90E2" />
                      ) : (
                        <>
                          <Ionicons name="swap-horizontal-outline" size={16} color="#4A90E2" />
                          <Text style={styles.transferBtnText}>Solicitar Transferência</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backBtn: {
    padding: 8,
  },
  headerBarTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  clinicHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#fff',
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 16,
    marginBottom: 12,
  },
  logoPlaceholder: {
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clinicName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
  },
  content: {
    padding: 16,
    gap: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  infoLink: {
    color: '#4A90E2',
  },
  psyCard: {
    borderWidth: 1,
    borderColor: '#f0f0f0',
    borderRadius: 10,
    marginBottom: 12,
    overflow: 'hidden',
  },
  psyCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  psyAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  psyAvatarPlaceholder: {
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  psyAvatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  psyInfo: {
    flex: 1,
  },
  psyNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  psyName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  currentBadge: {
    backgroundColor: '#E8FFE8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  currentBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#50C878',
  },
  psyCrp: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  psyApproach: {
    fontSize: 13,
    color: '#4A90E2',
    marginTop: 2,
  },
  psyChipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  psyChip: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  psyChipText: {
    fontSize: 11,
    color: '#666',
  },
  moreChips: {
    fontSize: 11,
    color: '#999',
    alignSelf: 'center',
    marginLeft: 4,
  },
  transferBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fafafa',
  },
  transferBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A90E2',
  },
});
