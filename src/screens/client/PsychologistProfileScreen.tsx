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
import { PsychologistProfile } from '../../services/profileService';

interface Props {
  navigation: any;
  route?: { params?: { psychologistId?: string } };
}

export default function PsychologistProfileScreen({ navigation, route }: Props) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<PsychologistProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const patientId = user?._id || user?.id || '';

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await profileService.getPsychologistProfile(patientId);
      setProfile(data);
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao carregar perfil do psicólogo');
    } finally {
      setLoading(false);
    }
  };

  const handleCall = () => {
    if (profile?.phone) {
      Linking.openURL(`tel:${profile.phone}`);
    }
  };

  const handleWhatsApp = () => {
    if (profile?.phone) {
      const phone = profile.phone.replace(/\D/g, '');
      const brPhone = phone.startsWith('55') ? phone : `55${phone}`;
      Linking.openURL(`https://wa.me/${brPhone}`);
    }
  };

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Carregando perfil...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerBarTitle}>Meu Psicólogo</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="person-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>Nenhum psicólogo vinculado</Text>
        </View>
      </SafeAreaView>
    );
  }

  const tp = profile.therapeuticProfile;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerBarTitle}>Meu Psicólogo</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          {profile.avatar ? (
            <Image source={{ uri: profile.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>{getInitials(profile.name)}</Text>
            </View>
          )}
          <Text style={styles.profileName}>{profile.name}</Text>
          {profile.crp && (
            <Text style={styles.profileCrp}>CRP {profile.crp}</Text>
          )}
          {tp?.abordagemPrincipal && (
            <View style={styles.approachBadge}>
              <Text style={styles.approachBadgeText}>{tp.abordagemPrincipal}</Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          {profile.phone && (
            <>
              <TouchableOpacity style={styles.actionBtn} onPress={handleCall}>
                <View style={[styles.actionIcon, { backgroundColor: '#E8FFE8' }]}>
                  <Ionicons name="call" size={20} color="#50C878" />
                </View>
                <Text style={styles.actionLabel}>Ligar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={handleWhatsApp}>
                <View style={[styles.actionIcon, { backgroundColor: '#E8FFE8' }]}>
                  <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
                </View>
                <Text style={styles.actionLabel}>WhatsApp</Text>
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('DirectChat', {
              recipientId: profile._id || profile.id,
              recipientName: profile.name,
              recipientRole: 'psychologist',
            })}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#E8F4FD' }]}>
              <Ionicons name="chatbubbles" size={20} color="#4A90E2" />
            </View>
            <Text style={styles.actionLabel}>Mensagem</Text>
          </TouchableOpacity>
          {profile.email && (
            <TouchableOpacity style={styles.actionBtn} onPress={() => Linking.openURL(`mailto:${profile.email}`)}>
              <View style={[styles.actionIcon, { backgroundColor: '#E8F4FD' }]}>
                <Ionicons name="mail" size={20} color="#4A90E2" />
              </View>
              <Text style={styles.actionLabel}>Email</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.content}>
          {/* Sobre */}
          {tp?.descricaoTrabalho && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sobre</Text>
              <Text style={styles.sectionText}>{tp.descricaoTrabalho}</Text>
            </View>
          )}

          {/* Formação */}
          {(tp?.formacaoAcademica || tp?.posGraduacao) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Formação</Text>
              {tp?.formacaoAcademica && (
                <View style={styles.formationItem}>
                  <Ionicons name="school-outline" size={18} color="#4A90E2" />
                  <Text style={styles.formationText}>{tp.formacaoAcademica}</Text>
                </View>
              )}
              {tp?.posGraduacao && (
                <View style={styles.formationItem}>
                  <Ionicons name="ribbon-outline" size={18} color="#4A90E2" />
                  <Text style={styles.formationText}>{tp.posGraduacao}</Text>
                </View>
              )}
            </View>
          )}

          {/* Especialidades */}
          {profile.specialties && profile.specialties.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Especialidades</Text>
              <View style={styles.chipGroup}>
                {profile.specialties.map((s, i) => (
                  <View key={i} style={styles.chip}>
                    <Text style={styles.chipText}>{s}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Público-alvo */}
          {tp?.publicosEspecificos && tp.publicosEspecificos.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Público-alvo</Text>
              <View style={styles.chipGroup}>
                {tp.publicosEspecificos.map((p, i) => (
                  <View key={i} style={[styles.chip, styles.chipAlt]}>
                    <Text style={[styles.chipText, styles.chipTextAlt]}>{p}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Temas */}
          {tp?.temasEspecializados && tp.temasEspecializados.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Temas Especializados</Text>
              <View style={styles.chipGroup}>
                {tp.temasEspecializados.map((t, i) => (
                  <View key={i} style={[styles.chip, styles.chipTheme]}>
                    <Text style={[styles.chipText, styles.chipTextTheme]}>{t}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Diferenciais */}
          {tp?.diferenciais && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Diferenciais</Text>
              <Text style={styles.sectionText}>{tp.diferenciais}</Text>
            </View>
          )}

          {/* Atendimento */}
          {profile.settings && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Atendimento</Text>
              <View style={styles.settingsRow}>
                <View style={styles.settingsItem}>
                  <Ionicons name="time-outline" size={20} color="#666" />
                  <Text style={styles.settingsText}>
                    {profile.settings.defaultSessionDuration || 50} min/sessão
                  </Text>
                </View>
                {profile.settings.acceptsOnline && (
                  <View style={styles.settingsItem}>
                    <Ionicons name="videocam-outline" size={20} color="#50C878" />
                    <Text style={styles.settingsText}>Online</Text>
                  </View>
                )}
                {profile.settings.acceptsInPerson && (
                  <View style={styles.settingsItem}>
                    <Ionicons name="location-outline" size={20} color="#4A90E2" />
                    <Text style={styles.settingsText}>Presencial</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Clínica */}
          {profile.clinicId && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Clínica</Text>
              <TouchableOpacity
                style={styles.clinicCard}
                onPress={() => navigation.navigate('ClinicInfo')}
              >
                <View style={styles.clinicCardLeft}>
                  <Ionicons name="business-outline" size={24} color="#4A90E2" />
                  <Text style={styles.clinicName}>{profile.clinicId.name}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </TouchableOpacity>
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
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#fff',
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 12,
  },
  avatarPlaceholder: {
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
  },
  profileCrp: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  approachBadge: {
    marginTop: 10,
    backgroundColor: '#E8F4FD',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  approachBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A90E2',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  actionBtn: {
    alignItems: 'center',
    gap: 6,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 12,
    color: '#666',
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
    marginBottom: 10,
  },
  sectionText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
  },
  formationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  formationText: {
    flex: 1,
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#E8F4FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  chipText: {
    fontSize: 13,
    color: '#4A90E2',
    fontWeight: '500',
  },
  chipAlt: {
    backgroundColor: '#FFF5E6',
  },
  chipTextAlt: {
    color: '#E6A000',
  },
  chipTheme: {
    backgroundColor: '#F0E8FF',
  },
  chipTextTheme: {
    color: '#7B61FF',
  },
  settingsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  settingsText: {
    fontSize: 14,
    color: '#555',
  },
  clinicCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9f9f9',
    padding: 14,
    borderRadius: 10,
  },
  clinicCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clinicName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
});
