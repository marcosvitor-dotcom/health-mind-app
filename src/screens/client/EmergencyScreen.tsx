import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Card from '../../components/Card';
import { useAuth } from '../../contexts/AuthContext';
import { getPatient, PatientWithPsychologist } from '../../services/profileService';

export default function EmergencyScreen({ navigation }: any) {
  const { user } = useAuth();
  const [psychologist, setPsychologist] = useState<PatientWithPsychologist['psychologistId'] | null>(null);
  const [loading, setLoading] = useState(true);

  const patientId = user?._id || user?.id || '';

  useEffect(() => {
    loadPsychologistData();
  }, []);

  const loadPsychologistData = async () => {
    try {
      const patientData = await getPatient(patientId);
      if (patientData.psychologistId && typeof patientData.psychologistId === 'object') {
        setPsychologist(patientData.psychologistId);
      }
    } catch (error) {
      console.error('Erro ao carregar dados do psicólogo:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCall = (number: string) => {
    Linking.openURL(`tel:${number}`);
  };

  const handleWhatsApp = (number: string) => {
    const cleanPhone = number.replace(/\D/g, '');
    Linking.openURL(`whatsapp://send?phone=55${cleanPhone}`).catch(() => {
      Linking.openURL(`https://wa.me/55${cleanPhone}`);
    });
  };

  const psychologistData = psychologist && typeof psychologist === 'object' ? psychologist : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView>
        <Card style={styles.alertCard}>
          <Ionicons name="alert-circle" size={48} color="#FF6B6B" />
          <Text style={styles.alertTitle}>Em caso de emergência</Text>
          <Text style={styles.alertText}>
            Se você está passando por uma crise ou pensando em se machucar,
            procure ajuda imediata pelos canais abaixo.
          </Text>
        </Card>

        {/* Recursos de Emergência - Agora no topo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recursos de Emergência</Text>

          <Card>
            <TouchableOpacity
              style={styles.resourceItem}
              onPress={() => handleCall('188')}
            >
              <View style={styles.resourceIcon}>
                <Ionicons name="call" size={24} color="#4A90E2" />
              </View>
              <View style={styles.resourceInfo}>
                <Text style={styles.resourceName}>CVV - 188</Text>
                <Text style={styles.resourceDescription}>
                  Centro de Valorização da Vida - 24h
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#ccc" />
            </TouchableOpacity>
          </Card>

          <Card>
            <TouchableOpacity
              style={styles.resourceItem}
              onPress={() => handleCall('192')}
            >
              <View style={styles.resourceIcon}>
                <Ionicons name="medkit" size={24} color="#FF6B6B" />
              </View>
              <View style={styles.resourceInfo}>
                <Text style={styles.resourceName}>SAMU - 192</Text>
                <Text style={styles.resourceDescription}>
                  Atendimento médico de urgência - 24h
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#ccc" />
            </TouchableOpacity>
          </Card>

          <Card>
            <TouchableOpacity
              style={styles.resourceItem}
              onPress={() => handleCall('190')}
            >
              <View style={styles.resourceIcon}>
                <Ionicons name="shield" size={24} color="#FFB347" />
              </View>
              <View style={styles.resourceInfo}>
                <Text style={styles.resourceName}>Polícia - 190</Text>
                <Text style={styles.resourceDescription}>
                  Em caso de risco imediato
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#ccc" />
            </TouchableOpacity>
          </Card>
        </View>

        {/* Seu Psicólogo - Agora abaixo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seu Psicólogo</Text>
          <Card>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#4A90E2" />
                <Text style={styles.loadingText}>Carregando...</Text>
              </View>
            ) : psychologistData ? (
              <>
                <View style={styles.contactHeader}>
                  {psychologistData.avatar ? (
                    <Image
                      source={{ uri: psychologistData.avatar }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {psychologistData.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)}
                      </Text>
                    </View>
                  )}
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{psychologistData.name}</Text>
                    {psychologistData.crp && (
                      <Text style={styles.contactRole}>Psicólogo - CRP {psychologistData.crp}</Text>
                    )}
                    {psychologistData.email && (
                      <Text style={styles.contactEmail}>{psychologistData.email}</Text>
                    )}
                  </View>
                </View>

                {psychologistData.phone && (
                  <View style={styles.contactButtons}>
                    <TouchableOpacity
                      style={[styles.emergencyButton, styles.whatsappButton]}
                      onPress={() => handleWhatsApp(psychologistData.phone!)}
                    >
                      <Ionicons name="logo-whatsapp" size={24} color="#fff" />
                      <Text style={styles.emergencyButtonText}>WhatsApp</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.chatButton}
                  onPress={() => navigation.navigate('DirectChat', {
                    recipientId: psychologistData._id,
                    recipientName: psychologistData.name,
                    recipientRole: 'psychologist',
                  })}
                >
                  <Ionicons name="chatbubbles" size={20} color="#4A90E2" />
                  <Text style={styles.chatButtonText}>Enviar Mensagem no App</Text>
                  <Ionicons name="chevron-forward" size={20} color="#4A90E2" />
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.noPsychologist}>
                <Ionicons name="person-outline" size={40} color="#ccc" />
                <Text style={styles.noPsychologistText}>
                  Nenhum psicólogo vinculado
                </Text>
              </View>
            )}
          </Card>
        </View>

        <Card style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#4A90E2" />
          <Text style={styles.infoText}>
            Lembre-se: buscar ajuda é um ato de coragem. Você não está sozinho(a).
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  alertCard: {
    margin: 16,
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FF6B6B',
    marginTop: 12,
  },
  alertText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
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
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  contactInfo: {
    marginLeft: 12,
    flex: 1,
  },
  contactName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  contactRole: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  contactEmail: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  contactButtons: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  emergencyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90E2',
    paddingVertical: 14,
    borderRadius: 8,
    marginHorizontal: 4,
    gap: 8,
  },
  whatsappButton: {
    backgroundColor: '#25D366',
  },
  emergencyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F4FD',
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 8,
  },
  chatButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90E2',
    flex: 1,
  },
  noPsychologist: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noPsychologistText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resourceIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  resourceInfo: {
    flex: 1,
  },
  resourceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  resourceDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  infoCard: {
    margin: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F4FD',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
    lineHeight: 20,
  },
});
