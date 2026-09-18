import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BalanceCard } from '../components/BalanceCard';
import { EditTransactionSheet } from '../components/EditTransactionSheet';
import { MonthPicker } from '../components/MonthPicker';
import { MonthYearPickerModal } from '../components/MonthYearPickerModal';
import { TransactionGroup } from '../components/TransactionGroup';
import { useMonth } from '../context/MonthContext';
import { useTransactions } from '../context/TransactionsContext';
import { colors, fonts } from '../theme';
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
            <Text style={styles.brandingTitle}>PrettyCash</Text>
            <Text style={styles.date}>{formatHeaderDate()}</Text>
          </View>
        </View>

        <MonthPicker
          month={`${MONTH_NAMES[month]} ${year}`}
          onPress={() => setPickerVisible(true)}
        />

        <BalanceCard total={balance} income={totals.income} expense={totals.expense} />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Daily transactions</Text>
          <Text style={styles.seeAll}>See all</Text>
        </View>

        <View style={styles.listCard}>
          {groups.length === 0 ? (
            <Text style={styles.emptyText}>No transactions</Text>
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
    fontSize: 22,
    fontWeight: '700',
    fontFamily: fonts.bold,
    color: colors.foreground,
    letterSpacing: -0.3,
  },
  date: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: fonts.medium,
    color: colors.mutedForeground,
  },
  sectionHeader: {
    marginTop: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: fonts.bold,
    color: colors.foreground,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: fonts.bold,
    color: colors.primary,
  },
  listCard: {
    marginTop: 12,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  emptyText: {
    paddingVertical: 28,
    textAlign: 'center',
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.mutedForeground,
  },
});
