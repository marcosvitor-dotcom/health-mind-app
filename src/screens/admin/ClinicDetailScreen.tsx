import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as adminService from '../../services/adminService';
import { AdminClinic } from '../../types';

export default function ClinicDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const clinic: AdminClinic = route.params?.clinic;

  const handleDelete = async () => {
    Alert.alert(
      'Desativar Clínica',
      `Tem certeza que deseja desativar "${clinic.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desativar',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminService.deleteClinic(clinic._id);
              Alert.alert('Sucesso', 'Clínica desativada com sucesso');
              navigation.goBack();
            } catch (err: any) {
              Alert.alert('Erro', err.message || 'Erro ao desativar clínica');
            }
          },
        },
      ]
    );
  };

  const handleRestore = async () => {
    Alert.alert(
      'Restaurar Clínica',
      `Tem certeza que deseja restaurar "${clinic.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          onPress: async () => {
            try {
              await adminService.restoreClinic(clinic._id);
              Alert.alert('Sucesso', 'Clínica restaurada com sucesso');
              navigation.goBack();
            } catch (err: any) {
              Alert.alert('Erro', err.message || 'Erro ao restaurar clínica');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Detalhes da Clínica</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Status Badge */}
        {clinic.deletedAt && (
          <View style={styles.deletedBanner}>
            <Ionicons name="warning" size={20} color="#E74C3C" />
            <Text style={styles.deletedBannerText}>
              Clínica desativada em {formatDate(clinic.deletedAt)}
            </Text>
          </View>
        )}

        {/* Main Info Card */}
        <View style={styles.card}>
          <View style={styles.clinicIconContainer}>
            <View style={[styles.clinicIcon, clinic.deletedAt && styles.clinicIconDeleted]}>
              <Ionicons name="business" size={40} color={clinic.deletedAt ? '#999' : '#3498DB'} />
            </View>
          </View>

          <Text style={[styles.clinicName, clinic.deletedAt && styles.deletedText]}>
            {clinic.name}
          </Text>

          <View style={styles.infoRow}>
            <Ionicons name="mail" size={18} color="#666" />
            <Text style={styles.infoText}>{clinic.email}</Text>
          </View>

          {clinic.phone && (
            <View style={styles.infoRow}>
              <Ionicons name="call" size={18} color="#666" />
              <Text style={styles.infoText}>{clinic.phone}</Text>
            </View>
          )}

          {clinic.cnpj && (
            <View style={styles.infoRow}>
              <Ionicons name="document-text" size={18} color="#666" />
              <Text style={styles.infoText}>CNPJ: {clinic.cnpj}</Text>
            </View>
          )}

          {clinic.address && (
            <View style={styles.infoRow}>
              <Ionicons name="location" size={18} color="#666" />
              <Text style={styles.infoText}>
                {clinic.address.street}, {clinic.address.number} - {clinic.address.city}/
                {clinic.address.state}
              </Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={18} color="#666" />
            <Text style={styles.infoText}>Criada em {formatDate(clinic.createdAt)}</Text>
          </View>
        </View>

        {/* Stats Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Estatísticas</Text>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#EBF5FB' }]}>
                <Ionicons name="medkit" size={24} color="#3498DB" />
              </View>
              <Text style={styles.statValue}>{clinic.psychologistsCount}</Text>
              <Text style={styles.statLabel}>Psicólogos</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#D5F5E3' }]}>
                <Ionicons name="people" size={24} color="#27AE60" />
              </View>
              <Text style={styles.statValue}>{clinic.patientsCount}</Text>
              <Text style={styles.statLabel}>Pacientes</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          {clinic.deletedAt ? (
            <TouchableOpacity style={styles.restoreButton} onPress={handleRestore}>
              <Ionicons name="refresh" size={20} color="#fff" />
              <Text style={styles.buttonText}>Restaurar Clínica</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Ionicons name="trash" size={20} color="#fff" />
              <Text style={styles.buttonText}>Desativar Clínica</Text>
            </TouchableOpacity>
          )}
        </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    padding: 16,
  },
  deletedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FADBD8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  deletedBannerText: {
    flex: 1,
    color: '#E74C3C',
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  clinicIconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  clinicIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EBF5FB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clinicIconDeleted: {
    backgroundColor: '#f0f0f0',
  },
  clinicName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  deletedText: {
    color: '#999',
    textDecorationLine: 'line-through',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statCard: {
    alignItems: 'center',
    padding: 16,
  },
  statIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  actionsContainer: {
    marginTop: 8,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E74C3C',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#27AE60',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
