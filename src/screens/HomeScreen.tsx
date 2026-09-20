import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BalanceCard } from '../components/BalanceCard';
import { EditTransactionSheet } from '../components/EditTransactionSheet';
import { EmptyState } from '../components/EmptyState';
import { MonthPicker } from '../components/MonthPicker';
import { MonthYearPickerModal } from '../components/MonthYearPickerModal';
import { TransactionGroup } from '../components/TransactionGroup';
import { useMonth } from '../context/MonthContext';
import { useTransactions } from '../context/TransactionsContext';
import { colors, radii, shadows, text } from '../theme';
import { Transaction } from '../types';
import { filterByMonth, monthBalance, monthTotals } from '../utils/aggregate';
import { formatHeaderDate, MONTH_NAMES } from '../utils/format';
import { groupTransactionsByDay } from '../utils/groupTransactions';

export function HomeScreen() {
  const { transactions } = useTransactions();
  const { month, year, setMonth } = useMonth();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const ym = `${year}-${String(month + 1).padStart(2, '0')}`;
  const balance = useMemo(() => monthBalance(transactions, ym), [transactions, ym]);
  const totals = useMemo(() => monthTotals(transactions, ym), [transactions, ym]);
  const groups = useMemo(
    () => groupTransactionsByDay(filterByMonth(transactions, ym)),
    [transactions, ym],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={[text.title, styles.brandingTitle]}>PrettyCash</Text>
            <Text style={[text.caption, styles.date]}>{formatHeaderDate()}</Text>
          </View>
        </View>

        <MonthPicker
          month={`${MONTH_NAMES[month]} ${year}`}
          onPress={() => setPickerVisible(true)}
        />

        <BalanceCard total={balance} income={totals.income} expense={totals.expense} />

        <View style={styles.sectionHeader}>
          <Text style={[text.overline, styles.sectionTitle]}>Daily transactions</Text>
        </View>

        <View style={styles.listCard}>
          {groups.length === 0 ? (
            <EmptyState
              icon="receipt"
              title="No transactions yet"
              subtitle="Tap + to add one and it will show up here."
            />
          ) : (
            groups.map((group) => (
              <TransactionGroup
                key={group.label}
                group={group}
                onPressTransaction={setEditing}
              />
            ))
          )}
        </View>
      </ScrollView>

      <MonthYearPickerModal
        visible={pickerVisible}
        selectedMonth={month}
        selectedYear={year}
        onClose={() => setPickerVisible(false)}
        onSelect={(m, y) => setMonth(m, y)}
      />

      <EditTransactionSheet transaction={editing} onClose={() => setEditing(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandingTitle: {
    color: colors.foreground,
  },
  date: {
    color: colors.mutedForeground,
    marginTop: 2,
  },
  sectionHeader: {
    marginTop: 28,
  },
  sectionTitle: {
    color: colors.mutedForeground,
  },
  listCard: {
    marginTop: 12,
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingBottom: 8,
    ...shadows.e1,
  },
});
