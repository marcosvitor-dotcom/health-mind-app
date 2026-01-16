import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Card from '../../components/Card';
import { useAuth } from '../../contexts/AuthContext';

interface ProfileScreenProps {
  navigation: any;
}

export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  const { user, logout } = useAuth();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView>
      <TouchableOpacity style={styles.header} onPress={() => navigation.navigate('EditProfile')}>
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
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.editProfileHint}>
          <Text style={styles.editProfileText}>Toque para editar perfil</Text>
          <Ionicons name="chevron-forward" size={16} color="#4A90E2" />
        </View>
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Meu Tratamento</Text>

        <Card>
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#E8F4FD' }]}>
                <Ionicons name="person" size={20} color="#4A90E2" />
              </View>
              <Text style={styles.menuText}>Meu Psicólogo</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#FFF5E6' }]}>
                <Ionicons name="document-text" size={20} color="#FFB347" />
              </View>
              <Text style={styles.menuText}>Solicitar Relatório</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#E8FFE8' }]}>
                <Ionicons name="stats-chart" size={20} color="#50C878" />
              </View>
              <Text style={styles.menuText}>Meu Progresso</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Configurações</Text>

        <Card>
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <Ionicons name="notifications" size={20} color="#666" />
              <Text style={styles.menuText}>Notificações</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <Ionicons name="lock-closed" size={20} color="#666" />
              <Text style={styles.menuText}>Privacidade</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <Ionicons name="language" size={20} color="#666" />
              <Text style={styles.menuText}>Idioma</Text>
            </View>
            <View style={styles.menuRight}>
              <Text style={styles.menuValue}>Português</Text>
              <Ionicons name="chevron-forward" size={24} color="#ccc" />
            </View>
          </TouchableOpacity>
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Suporte</Text>

        <Card>
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <Ionicons name="help-circle" size={20} color="#666" />
              <Text style={styles.menuText}>Central de Ajuda</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <Ionicons name="document" size={20} color="#666" />
              <Text style={styles.menuText}>Termos de Uso</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <Ionicons name="shield-checkmark" size={20} color="#666" />
              <Text style={styles.menuText}>Política de Privacidade</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>
        </Card>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Ionicons name="log-out" size={20} color="#FF6B6B" />
        <Text style={styles.logoutText}>Sair</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Versão 1.0.0</Text>
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
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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
    color: '#4A90E2',
    marginRight: 4,
  },
  name: {
    fontSize: 22,
    fontWeight: '600',
    color: '#333',
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
  menuText: {
    fontSize: 16,
    color: '#333',
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuValue: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF6B6B',
    
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  version: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginBottom: 32,
  },
});
