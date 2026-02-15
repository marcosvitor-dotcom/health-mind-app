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
import { useTheme } from '../../contexts/ThemeContext';

interface Props {
  route: { params: { type: 'terms' | 'privacy' } };
  navigation: any;
}

export default function LegalDocumentScreen({ route, navigation }: Props) {
  const { type } = route.params;
  const { colors } = useTheme();
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
          <Text key={index} style={[styles.mainTitle, { color: colors.primary }]}>{trimmed}</Text>
        );
      }

      // Section headers (number followed by period and text, like "1. OBJETO")
      if (/^\d+\.\s+[A-Z]/.test(trimmed)) {
        return (
          <Text key={index} style={[styles.sectionTitle, { color: colors.textPrimary }]}>{trimmed}</Text>
        );
      }

      // Sub-headers (number.number, like "1.1.")
      if (/^\d+\.\d+\./.test(trimmed)) {
        return (
          <Text key={index} style={[styles.subSection, { color: colors.textSecondary }]}>{trimmed}</Text>
        );
      }

      // List items with letters (a), b), etc.)
      if (/^\s*[a-h]\)/.test(trimmed)) {
        return (
          <Text key={index} style={[styles.listItem, { color: colors.textSecondary }]}>  {trimmed}</Text>
        );
      }

      // List items with dash
      if (trimmed.startsWith('-')) {
        return (
          <Text key={index} style={[styles.listItem, { color: colors.textSecondary }]}>  {trimmed}</Text>
        );
      }

      // "Ultima atualizacao" line
      if (trimmed.startsWith('Ultima atualizacao')) {
        return (
          <Text key={index} style={[styles.updateDate, { color: colors.textTertiary }]}>{trimmed}</Text>
        );
      }

      // Regular paragraph
      return (
        <Text key={index} style={[styles.paragraph, { color: colors.textSecondary }]}>{trimmed}</Text>
      );
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{title}</Text>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
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
    marginBottom: 4,
    marginTop: 8,
  },
  updateDate: {
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 8,
  },
  subSection: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 4,
    lineHeight: 22,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 2,
  },
  listItem: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 2,
    paddingLeft: 8,
  },
});
