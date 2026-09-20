import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BreakdownCard } from '../components/BreakdownCard';
import { DonutChart } from '../components/DonutChart';
import { EmptyState } from '../components/EmptyState';
import { MonthPicker } from '../components/MonthPicker';
import { MonthYearPickerModal } from '../components/MonthYearPickerModal';
import { useCategories } from '../context/CategoriesContext';
import { useTransactions } from '../context/TransactionsContext';
import { useThemedStyles } from '../context/ThemeContext';
import { text } from '../theme';
import type { ThemeColors } from '../theme';
import { formatHeaderDate, MONTH_NAMES } from '../utils/format';
import { getInsightsMonthData } from '../utils/insights';

export function InsightsScreen() {
  const styles = useThemedStyles(makeStyles);
  const { transactions } = useTransactions();
  const { expenseCategories, incomeCategories } = useCategories();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [drill, setDrill] = useState<'expense' | 'income' | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);

  const ym = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
  const monthData = getInsightsMonthData(
    transactions,
    [...expenseCategories, ...incomeCategories],
    ym,
  );

  useEffect(() => {
    setDrill(null);
  }, [ym]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View>
          <Text style={[text.title, styles.screenTitle]}>Insights</Text>
          <Text style={[text.caption, styles.date]}>{formatHeaderDate()}</Text>
        </View>

        <MonthPicker
          month={`${MONTH_NAMES[selectedMonth]} ${selectedYear}`}
          onPress={() => setPickerVisible(true)}
        />

        <DonutChart
          expense={monthData.expense}
          income={monthData.income}
          drill={drill}
          onDrill={setDrill}
        />

        {monthData.expense.total === 0 && monthData.income.total === 0 ? (
          <EmptyState
            icon="chart-pie"
            title="No data for this month"
            subtitle="Add a transaction to see your breakdown."
          />
        ) : null}

        {monthData.income.items.length > 0 ? (
          <BreakdownCard items={monthData.income.items} type="income" collapsible />
        ) : null}
        {monthData.expense.items.length > 0 ? (
          <BreakdownCard items={monthData.expense.items} type="expense" collapsible />
        ) : null}
      </ScrollView>

      <MonthYearPickerModal
        visible={pickerVisible}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onClose={() => setPickerVisible(false)}
        onSelect={(m, y) => {
          setSelectedMonth(m);
          setSelectedYear(y);
          setDrill(null);
        }}
      />
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 120,
  },
  screenTitle: {
    color: colors.foreground,
  },
  date: {
    color: colors.mutedForeground,
    marginTop: 2,
  },
});
