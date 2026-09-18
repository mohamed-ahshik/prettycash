import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BreakdownCard } from '../components/BreakdownCard';
import { DonutChart } from '../components/DonutChart';
import { Icon } from '../components/Icon';
import { MonthYearPickerModal } from '../components/MonthYearPickerModal';
import { useCategories } from '../context/CategoriesContext';
import { useTransactions } from '../context/TransactionsContext';
import { colors, fonts } from '../theme';
import { MONTH_NAMES } from '../utils/format';
import { getInsightsData } from '../utils/insights';

export function InsightsScreen() {
  const navigation = useNavigation<any>();
  const { transactions } = useTransactions();
  const { expenseCategories, incomeCategories } = useCategories();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [activeType, setActiveType] = useState<'expense' | 'income'>('expense');
  const [pickerVisible, setPickerVisible] = useState(false);

  const activeCategories = activeType === 'expense' ? expenseCategories : incomeCategories;
  const ym = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
  const insightsData = getInsightsData(activeType, activeCategories, transactions, ym);

  const toggleType = () => {
    setActiveType((prev) => (prev === 'expense' ? 'income' : 'expense'));
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header bar */}
      <View style={styles.headerBar}>
        <Pressable style={styles.backButton} onPress={() => navigation.navigate('Home')}>
          <Icon name="arrow-left" size={24} color={colors.foreground} />
        </Pressable>

        <Pressable style={styles.monthSelector} onPress={() => setPickerVisible(true)}>
          <Text style={styles.monthTitle}>
            {MONTH_NAMES[selectedMonth]} {selectedYear}
          </Text>
          <Icon name="chevron-down" size={18} color={colors.mutedForeground} />
        </Pressable>

        {/* Spacer to keep center balanced */}
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Summary Card with Donut Chart */}
        <DonutChart
          items={insightsData.items}
          total={insightsData.total}
          type={activeType}
          onToggleType={toggleType}
        />

        {/* Breakdown Card */}
        <BreakdownCard items={insightsData.items} type={activeType} />
      </ScrollView>

      <MonthYearPickerModal
        visible={pickerVisible}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onClose={() => setPickerVisible(false)}
        onSelect={(m, y) => {
          setSelectedMonth(m);
          setSelectedYear(y);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  monthTitle: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.foreground,
  },
  headerRightSpacer: {
    width: 40,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 120,
  },
});
