import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function AdminInvitesScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Convites</Text>
        <Text style={styles.subtitle}>Adicione novos usuários à plataforma</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Convidar Clínica */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('InviteClinic')}
          activeOpacity={0.7}
        >
          <View style={[styles.cardIcon, { backgroundColor: '#EBF5FB' }]}>
            <Ionicons name="business" size={32} color="#3498DB" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Convidar Clínica</Text>
            <Text style={styles.cardDescription}>
              Envie um convite para uma nova clínica se cadastrar na plataforma.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        {/* Convidar Psicólogo */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('InvitePsychologist')}
          activeOpacity={0.7}
        >
          <View style={[styles.cardIcon, { backgroundColor: '#F5EEF8' }]}>
            <Ionicons name="medkit" size={32} color="#9B59B6" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Convidar Psicólogo</Text>
            <Text style={styles.cardDescription}>
              Convide um psicólogo autônomo (sem clínica) para usar a plataforma.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Ionicons name="shield-checkmark" size={18} color="#E74C3C" />
          <Text style={styles.infoText}>
            Apenas administradores podem enviar convites. Os usuários receberão um e-mail com link para completar o cadastro.
          </Text>
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    gap: 14,
  },
  cardIcon: {
    width: 60,
    height: 60,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: '#888',
    lineHeight: 18,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FEF9F9',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FADBD8',
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#E74C3C',
    lineHeight: 18,
  },
});
