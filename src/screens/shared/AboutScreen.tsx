import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

const APP_VERSION = '1.0.0';

interface Props {
  navigation: any;
}

export default function AboutScreen({ navigation }: Props) {
  const { colors, isDark } = useTheme();

  const openLink = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Sobre</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* App Info */}
        <View style={styles.appInfoSection}>
          <View style={[styles.logoContainer, { backgroundColor: colors.primary }]}>
            <Ionicons name="heart" size={40} color="#fff" />
          </View>
          <Text style={[styles.appName, { color: colors.textPrimary }]}>Health Mind</Text>
          <Text style={[styles.appDescription, { color: colors.textSecondary }]}>
            Cuidando da sua saude mental
          </Text>
          <View style={[styles.versionBadge, { backgroundColor: isDark ? colors.surfaceSecondary : '#E8F4FD' }]}>
            <Text style={[styles.versionText, { color: colors.primary }]}>Versao {APP_VERSION}</Text>
          </View>
        </View>

        {/* Links */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, backgroundColor: colors.surfaceSecondary }]}>
            Links
          </Text>

          <TouchableOpacity
            style={[styles.linkItem, { borderBottomColor: colors.borderLight }]}
            onPress={() => openLink('https://healthmind.app')}
          >
            <View style={[styles.linkIcon, { backgroundColor: isDark ? '#1A2E3D' : '#E8F4FD' }]}>
              <Ionicons name="globe-outline" size={22} color={colors.primary} />
            </View>
            <View style={styles.linkContent}>
              <Text style={[styles.linkTitle, { color: colors.textPrimary }]}>Site Oficial</Text>
              <Text style={[styles.linkSubtitle, { color: colors.textTertiary }]}>healthmind.app</Text>
            </View>
            <Ionicons name="open-outline" size={20} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.linkItem, { borderBottomColor: colors.borderLight }]}
            onPress={() => openLink('https://instagram.com/healthmind.app')}
          >
            <View style={[styles.linkIcon, { backgroundColor: isDark ? '#2D1A3D' : '#F3E8FD' }]}>
              <Ionicons name="logo-instagram" size={22} color="#C13584" />
            </View>
            <View style={styles.linkContent}>
              <Text style={[styles.linkTitle, { color: colors.textPrimary }]}>Instagram</Text>
              <Text style={[styles.linkSubtitle, { color: colors.textTertiary }]}>@healthmind.app</Text>
            </View>
            <Ionicons name="open-outline" size={20} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.linkItem, { borderBottomColor: colors.borderLight }]}
            onPress={() => openLink('https://wa.me/5561983730910')}
          >
            <View style={[styles.linkIcon, { backgroundColor: isDark ? '#1A3D1F' : '#E8FFE8' }]}>
              <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
            </View>
            <View style={styles.linkContent}>
              <Text style={[styles.linkTitle, { color: colors.textPrimary }]}>WhatsApp</Text>
              <Text style={[styles.linkSubtitle, { color: colors.textTertiary }]}>+55 (61) 98373-0910</Text>
            </View>
            <Ionicons name="open-outline" size={20} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.linkItem, { borderBottomColor: colors.borderLight }]}
            onPress={() => openLink('mailto:admin@losningtech.com')}
          >
            <View style={[styles.linkIcon, { backgroundColor: isDark ? '#1A2E3D' : '#E8F4FD' }]}>
              <Ionicons name="mail-outline" size={22} color="#4A90E2" />
            </View>
            <View style={styles.linkContent}>
              <Text style={[styles.linkTitle, { color: colors.textPrimary }]}>E-mail</Text>
              <Text style={[styles.linkSubtitle, { color: colors.textTertiary }]}>admin@losningtech.com</Text>
            </View>
            <Ionicons name="open-outline" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Legal */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, backgroundColor: colors.surfaceSecondary }]}>
            Legal
          </Text>

          <TouchableOpacity
            style={[styles.linkItem, { borderBottomColor: colors.borderLight }]}
            onPress={() => navigation.navigate('LegalDocument', { type: 'terms' })}
          >
            <Ionicons name="document-text-outline" size={22} color={colors.textSecondary} />
            <View style={[styles.linkContent, { marginLeft: 12 }]}>
              <Text style={[styles.linkTitle, { color: colors.textPrimary }]}>Termos de Uso</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.linkItem, { borderBottomColor: colors.borderLight }]}
            onPress={() => navigation.navigate('LegalDocument', { type: 'privacy' })}
          >
            <Ionicons name="shield-checkmark-outline" size={22} color={colors.textSecondary} />
            <View style={[styles.linkContent, { marginLeft: 12 }]}>
              <Text style={[styles.linkTitle, { color: colors.textPrimary }]}>Politica de Privacidade</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Credits */}
        <View style={styles.creditsSection}>
          <Text style={[styles.creditsText, { color: colors.textTertiary }]}>
            Desenvolvido por Losning Tech
          </Text>
          <Text style={[styles.creditsText, { color: colors.textTertiary }]}>
            © 2025 Health Mind. Todos os direitos reservados.
          </Text>
        </View>
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
    padding: 20,
    paddingBottom: 40,
  },
  appInfoSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  appDescription: {
    fontSize: 14,
    marginBottom: 12,
  },
  versionBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  versionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    padding: 16,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  linkIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  linkContent: {
    flex: 1,
  },
  linkTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  linkSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  creditsSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  creditsText: {
    fontSize: 12,
    marginBottom: 4,
    textAlign: 'center',
  },
});
