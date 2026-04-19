import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import * as financialReportService from '../../../services/financialReportService';
import ClinicFinancialScreen from '../../clinic/ClinicFinancialScreen';
import PsychologistFinancialScreen from '../../psychologist/PsychologistFinancialScreen';
import ExpensesScreen from './ExpensesScreen';
import DREScreen from './DREScreen';
import InsuranceBatchScreen from './InsuranceBatchScreen';

const TABS = [
  { key: 'revenue', label: 'Receitas', icon: '💰' },
  { key: 'expenses', label: 'Despesas', icon: '📋' },
  { key: 'dre', label: 'DRE', icon: '📊' },
  { key: 'insurance', label: 'Convênios', icon: '🏥' },
];

type TabKey = 'revenue' | 'expenses' | 'dre' | 'insurance';

export default function FinancialHubScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('revenue');
  const [overdueCount, setOverdueCount] = useState(0);
  const indicatorAnim = useRef(new Animated.Value(0)).current;

  const isClinic = user?.role === 'clinic';

  useEffect(() => {
    loadOutstanding();
  }, []);

  const loadOutstanding = async () => {
    try {
      const data = await financialReportService.getOutstandingExpenses();
      setOverdueCount(data.overdue.count);
    } catch {
      // silencia — badge não crítico
    }
  };

  const handleTabChange = (tab: TabKey, index: number) => {
    setActiveTab(tab);
    Animated.spring(indicatorAnim, {
      toValue: index,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();
  };

  const TAB_WIDTH = Dimensions.get('window').width / TABS.length;

  const renderContent = () => {
    switch (activeTab) {
      case 'revenue':
        return isClinic
          ? <ClinicFinancialScreen navigation={navigation} showHeader={false} />
          : <PsychologistFinancialScreen navigation={navigation} showHeader={false} />;
      case 'expenses':
        return <ExpensesScreen navigation={navigation} />;
      case 'dre':
        return <DREScreen navigation={navigation} />;
      case 'insurance':
        return <InsuranceBatchScreen navigation={navigation} />;
    }
  };

  const styles = createStyles(colors, isDark);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Financeiro</Text>
          <Text style={styles.subtitle}>
            {isClinic ? 'Gestão financeira da clínica' : 'Gestão financeira pessoal'}
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScrollContent}
        >
          {TABS.map((tab, index) => {
            const isActive = activeTab === tab.key;
            const showBadge = tab.key === 'expenses' && overdueCount > 0;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => handleTabChange(tab.key as TabKey, index)}
                activeOpacity={0.7}
              >
                <Text style={styles.tabIcon}>{tab.icon}</Text>
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
                {showBadge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {overdueCount > 9 ? '9+' : overdueCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {renderContent()}
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    subtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    tabBar: {
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tabScrollContent: {
      paddingHorizontal: 8,
    },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginHorizontal: 2,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
      position: 'relative',
    },
    tabActive: {
      borderBottomColor: colors.primary,
    },
    tabIcon: {
      fontSize: 14,
      marginRight: 6,
    },
    tabLabel: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    tabLabelActive: {
      color: colors.primary,
      fontWeight: '700',
    },
    badge: {
      position: 'absolute',
      top: 6,
      right: 2,
      backgroundColor: '#E74C3C',
      borderRadius: 8,
      minWidth: 16,
      height: 16,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 3,
    },
    badgeText: {
      color: '#fff',
      fontSize: 9,
      fontWeight: 'bold',
    },
    content: {
      flex: 1,
    },
  });
