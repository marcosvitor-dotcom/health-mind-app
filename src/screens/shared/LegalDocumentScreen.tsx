import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TERMS_OF_USE, PRIVACY_POLICY } from '../../constants/legalDocuments';

interface Props {
  route: { params: { type: 'terms' | 'privacy' } };
  navigation: any;
}

export default function LegalDocumentScreen({ route, navigation }: Props) {
  const { type } = route.params;
  const isTerms = type === 'terms';
  const title = isTerms ? 'Termos de Uso' : 'Politica de Privacidade';
  const content = isTerms ? TERMS_OF_USE : PRIVACY_POLICY;

  const renderContent = () => {
    const lines = content.split('\n');
    return lines.map((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return <View key={index} style={{ height: 8 }} />;

      // Main title (all caps, starts with TERMOS or POLITICA)
      if (trimmed.startsWith('TERMOS DE USO') || trimmed.startsWith('POLITICA DE PRIVACIDADE')) {
        return (
          <Text key={index} style={styles.mainTitle}>{trimmed}</Text>
        );
      }

      // Section headers (number followed by period and text, like "1. OBJETO")
      if (/^\d+\.\s+[A-Z]/.test(trimmed)) {
        return (
          <Text key={index} style={styles.sectionTitle}>{trimmed}</Text>
        );
      }

      // Sub-headers (number.number, like "1.1.")
      if (/^\d+\.\d+\./.test(trimmed)) {
        return (
          <Text key={index} style={styles.subSection}>{trimmed}</Text>
        );
      }

      // List items with letters (a), b), etc.)
      if (/^\s*[a-h]\)/.test(trimmed)) {
        return (
          <Text key={index} style={styles.listItem}>  {trimmed}</Text>
        );
      }

      // List items with dash
      if (trimmed.startsWith('-')) {
        return (
          <Text key={index} style={styles.listItem}>  {trimmed}</Text>
        );
      }

      // "Ultima atualizacao" line
      if (trimmed.startsWith('Ultima atualizacao')) {
        return (
          <Text key={index} style={styles.updateDate}>{trimmed}</Text>
        );
      }

      // Regular paragraph
      return (
        <Text key={index} style={styles.paragraph}>{trimmed}</Text>
      );
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {renderContent()}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  scrollContent: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  mainTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4A90E2',
    marginBottom: 4,
    marginTop: 8,
  },
  updateDate: {
    fontSize: 13,
    color: '#888',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
  },
  subSection: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
    marginTop: 10,
    marginBottom: 4,
    lineHeight: 22,
  },
  paragraph: {
    fontSize: 14,
    color: '#444',
    lineHeight: 22,
    marginBottom: 2,
  },
  listItem: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
    marginBottom: 2,
    paddingLeft: 8,
  },
});
