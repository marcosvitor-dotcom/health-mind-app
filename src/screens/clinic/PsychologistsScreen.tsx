import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Card from '../../components/Card';

export default function PsychologistsScreen({ navigation }: any) {
  const psychologists = [
    {
      id: '1',
      name: 'Dr. João Silva',
      crp: 'CRP 06/123456',
      specialties: ['TCC', 'Ansiedade'],
      patients: 15,
      nextAppointment: '14:00',
    },
    {
      id: '2',
      name: 'Dra. Maria Santos',
      crp: 'CRP 06/789012',
      specialties: ['Psicanálise', 'Depressão'],
      patients: 18,
      nextAppointment: '15:30',
    },
    {
      id: '3',
      name: 'Dr. Carlos Oliveira',
      crp: 'CRP 06/345678',
      specialties: ['Terapia Familiar', 'Casais'],
      patients: 12,
      nextAppointment: '16:00',
    },
  ];

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

      <ScrollView style={styles.list}>
        {psychologists.map((psychologist) => (
          <Card key={psychologist.id}>
            <View style={styles.psychologistHeader}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={32} color="#fff" />
              </View>
              <View style={styles.psychologistInfo}>
                <Text style={styles.name}>{psychologist.name}</Text>
                <Text style={styles.crp}>{psychologist.crp}</Text>
              </View>
            </View>

            <View style={styles.specialtiesContainer}>
              {psychologist.specialties.map((specialty, index) => (
                <View key={index} style={styles.specialtyTag}>
                  <Text style={styles.specialtyText}>{specialty}</Text>
                </View>
              ))}
            </View>

            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Ionicons name="people" size={16} color="#666" />
                <Text style={styles.statText}>
                  {psychologist.patients} pacientes
                </Text>
              </View>
              <View style={styles.stat}>
                <Ionicons name="time" size={16} color="#666" />
                <Text style={styles.statText}>
                  Próxima: {psychologist.nextAppointment}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.detailsButton}>
              <Text style={styles.detailsButtonText}>Ver Detalhes</Text>
            </TouchableOpacity>
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
    
  },
  specialtyTag: {
    backgroundColor: '#E8F4FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
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
