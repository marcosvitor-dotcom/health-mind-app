import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Card from '../../components/Card';

export default function ClientsScreen({ navigation }: any) {
  const clients = [
    {
      id: '1',
      name: 'Ana Costa',
      age: 28,
      sessions: 12,
      lastSession: '2025-12-20',
      status: 'active',
    },
    {
      id: '2',
      name: 'Pedro Alves',
      age: 35,
      sessions: 3,
      lastSession: '2025-12-21',
      status: 'new',
    },
    {
      id: '3',
      name: 'Carla Silva',
      age: 42,
      sessions: 28,
      lastSession: '2025-12-19',
      status: 'active',
    },
    {
      id: '4',
      name: 'Marcos Lima',
      age: 31,
      sessions: 8,
      lastSession: '2025-12-18',
      status: 'active',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#50C878';
      case 'new':
        return '#4A90E2';
      case 'inactive':
        return '#999';
      default:
        return '#999';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Ativo';
      case 'new':
        return 'Novo';
      case 'inactive':
        return 'Inativo';
      default:
        return status;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Meus Pacientes</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.invitationsButton}
            onPress={() => navigation.navigate('Invitations')}
          >
            <Ionicons name="mail-open" size={18} color="#50C878" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.inviteButton}
            onPress={() => navigation.navigate('InvitePatient')}
          >
            <Ionicons name="mail" size={18} color="#fff" />
            <Text style={styles.inviteButtonText}>Convidar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AddClient')}
          >
            <Ionicons name="person-add" size={24} color="#50C878" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar paciente..."
          placeholderTextColor="#999"
        />
      </View>

      <ScrollView style={styles.list}>
        {clients.map((client) => (
          <Card key={client.id}>
            <View style={styles.clientHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {client.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </Text>
              </View>
              <View style={styles.clientInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>{client.name}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(client.status) + '20' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(client.status) },
                      ]}
                    >
                      {getStatusLabel(client.status)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.age}>{client.age} anos</Text>
              </View>
            </View>

            <View style={styles.statsContainer}>
              <View style={styles.stat}>
                <Ionicons name="calendar" size={16} color="#666" />
                <Text style={styles.statText}>
                  {client.sessions} sessões
                </Text>
              </View>
              <View style={styles.stat}>
                <Ionicons name="time" size={16} color="#666" />
                <Text style={styles.statText}>
                  Última: {new Date(client.lastSession).toLocaleDateString('pt-BR')}
                </Text>
              </View>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="chatbubbles" size={18} color="#4A90E2" />
                <Text style={styles.actionText}>Chat</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="document-text" size={18} color="#4A90E2" />
                <Text style={styles.actionText}>Prontuário</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="calendar" size={18} color="#4A90E2" />
                <Text style={styles.actionText}>Agendar</Text>
              </TouchableOpacity>
            </View>
          </Card>
        ))}
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
    backgroundColor: '#E8FFF0',
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#50C878',
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
    color: '#333',
  },
  list: {
    flex: 1,
    paddingHorizontal: 10,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  clientInfo: {
    marginLeft: 12,
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  age: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4A90E2',
    marginHorizontal: 4,
  },
  actionText: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: '500',
  },
});
