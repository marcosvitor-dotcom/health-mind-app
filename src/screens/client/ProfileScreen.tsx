import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Card from '../../components/Card';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import * as profileService from '../../services/profileService';
import { PatientWithPsychologist } from '../../services/profileService';

interface ProfileScreenProps {
  navigation: any;
}

export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  const { user, logout } = useAuth();
  const { colors, isDark } = useTheme();
  const [patientData, setPatientData] = useState<PatientWithPsychologist | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  const patientId = user?._id || user?.id || '';

  useEffect(() => {
    loadPatientData();
  }, []);

  const loadPatientData = async () => {
    if (!patientId) {
      setLoadingData(false);
      return;
    }
    try {
      const data = await profileService.getPatient(patientId);
      setPatientData(data);
    } catch (error) {
      console.error('Erro ao carregar dados do paciente:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const psychologist = patientData?.psychologistId;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView>
      <TouchableOpacity style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]} onPress={() => navigation.navigate('EditProfile')}>
        {user?.avatar ? (
          <Image source={{ uri: user.avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>
              {user?.name
                ?.split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)}
            </Text>
          </View>
        )}
        <Text style={[styles.name, { color: colors.textPrimary }]}>{user?.name}</Text>
        <Text style={[styles.email, { color: colors.textSecondary }]}>{user?.email}</Text>
        <View style={styles.editProfileHint}>
          <Text style={[styles.editProfileText, { color: colors.primary }]}>Toque para editar perfil</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </View>
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Meu Tratamento</Text>

        <Card>
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.borderLight }]}
            onPress={() => navigation.navigate('PsychologistProfile')}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIcon, { backgroundColor: isDark ? colors.surfaceSecondary : '#E8F4FD' }]}>
                <Ionicons name="person" size={20} color={colors.primary} />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={[styles.menuText, { color: colors.textPrimary }]}>Meu Psicologo</Text>
                {loadingData ? (
                  <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 4 }} />
                ) : psychologist ? (
                  <Text style={[styles.menuSubtext, { color: colors.textSecondary }]}>
                    {psychologist.name}{psychologist.crp ? ` - CRP ${psychologist.crp}` : ''}
                  </Text>
                ) : (
                  <Text style={[styles.menuSubtext, { color: colors.textSecondary }]}>Nao atribuido</Text>
                )}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.borderLight }]}
            onPress={() => navigation.navigate('ClinicInfo')}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIcon, { backgroundColor: isDark ? colors.surfaceSecondary : '#E8F4FD' }]}>
                <Ionicons name="business" size={20} color={colors.primary} />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={[styles.menuText, { color: colors.textPrimary }]}>Minha Clinica</Text>
                <Text style={[styles.menuSubtext, { color: colors.textSecondary }]}>Ver dados e psicologos</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.borderLight }]} onPress={() => navigation.navigate('RequestDocument')}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIcon, { backgroundColor: isDark ? '#3D3020' : '#FFF5E6' }]}>
                <Ionicons name="document-text" size={20} color="#FFB347" />
              </View>
              <Text style={[styles.menuText, { color: colors.textPrimary }]}>Solicitar Documento</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.textTertiary} />
          </TouchableOpacity>
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Configuracoes</Text>

        <Card>
          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.borderLight }]} onPress={() => navigation.navigate('Settings')}>
            <View style={styles.menuLeft}>
              <Ionicons name="settings" size={20} color={colors.textSecondary} />
              <Text style={[styles.menuText, { color: colors.textPrimary }]}>Configuracao</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.borderLight }]}>
            <View style={styles.menuLeft}>
              <Ionicons name="language" size={20} color={colors.textSecondary} />
              <Text style={[styles.menuText, { color: colors.textPrimary }]}>Idioma</Text>
            </View>
            <View style={styles.menuRight}>
              <Text style={[styles.menuValue, { color: colors.textSecondary }]}>Portugues</Text>
              <Ionicons name="chevron-forward" size={24} color={colors.textTertiary} />
            </View>
          </TouchableOpacity>
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Suporte</Text>

        <Card>
          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.borderLight }]} onPress={() => navigation.navigate('HelpSupport')}>
            <View style={styles.menuLeft}>
              <Ionicons name="help-circle" size={20} color={colors.textSecondary} />
              <Text style={[styles.menuText, { color: colors.textPrimary }]}>Central de Ajuda</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.borderLight }]} onPress={() => navigation.navigate('LegalDocument', { type: 'terms' })}>
            <View style={styles.menuLeft}>
              <Ionicons name="document" size={20} color={colors.textSecondary} />
              <Text style={[styles.menuText, { color: colors.textPrimary }]}>Termos de Uso</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.borderLight }]} onPress={() => navigation.navigate('LegalDocument', { type: 'privacy' })}>
            <View style={styles.menuLeft}>
              <Ionicons name="shield-checkmark" size={20} color={colors.textSecondary} />
              <Text style={[styles.menuText, { color: colors.textPrimary }]}>Politica de Privacidade</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.borderLight }]} onPress={() => navigation.navigate('About')}>
            <View style={styles.menuLeft}>
              <Ionicons name="information-circle" size={20} color={colors.textSecondary} />
              <Text style={[styles.menuText, { color: colors.textPrimary }]}>Sobre</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.textTertiary} />
          </TouchableOpacity>
        </Card>
      </View>

      <TouchableOpacity style={[styles.logoutButton, { backgroundColor: colors.surface }]} onPress={logout}>
        <Ionicons name="log-out" size={20} color="#FF6B6B" />
        <Text style={styles.logoutText}>Sair</Text>
      </TouchableOpacity>

      <Text style={[styles.version, { color: colors.textTertiary }]}>Versao 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    padding: 32,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  avatarPlaceholder: {
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  editProfileHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  editProfileText: {
    fontSize: 14,
    marginRight: 4,
  },
  name: {
    fontSize: 22,
    fontWeight: '600',
  },
  email: {
    fontSize: 14,
    marginTop: 4,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuText: {
    fontSize: 16,
  },
  menuSubtext: {
    fontSize: 13,
    marginTop: 2,
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuValue: {
    fontSize: 14,
    marginRight: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF6B6B',
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  version: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 32,
  },
});
