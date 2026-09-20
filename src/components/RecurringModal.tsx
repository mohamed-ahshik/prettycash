import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { colors, fonts, radii } from '../theme';
import { useCurrency } from '../context/CurrencyContext';
import { RecurringItem } from '../types';
import { hapticSelection, hapticWarning } from '../lib/haptics';
import { formatSignedAmount } from '../utils/format';
import { AddRecurringModal } from './AddRecurringModal';
import { BottomSheet } from './BottomSheet';
import { Icon } from './Icon';

interface RecurringModalProps {
  visible: boolean;
  items: RecurringItem[];
  onClose: () => void;
  onToggleActive: (id: string) => void;
  onAddItem: (item: Omit<RecurringItem, 'id' | 'active'>) => void;
  onDeleteItem: (id: string) => void;
}

export function RecurringModal({
  visible,
  items,
  onClose,
  onToggleActive,
  onAddItem,
  onDeleteItem,
}: RecurringModalProps) {
  const [filter, setFilter] = useState<'expense' | 'income'>('expense');
  const [activeOnly, setActiveOnly] = useState(true);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [addVisible, setAddVisible] = useState(false);
  const { symbol, decimals } = useCurrency();

  const filteredItems = items.filter(
    (it) => it.type === filter && (!activeOnly || it.active),
  );

  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeight={0.85}>
          <View style={styles.topBar}>
            <Text style={styles.sheetTitle}>Recurring</Text>
            <View style={styles.topBarActions}>
              <Pressable style={styles.closeBtn} onPress={onClose}>
                <Icon name="close" size={20} color={colors.mutedForeground} />
              </Pressable>
            </View>
          </View>

          <View style={styles.toggleRow}>
            <Pressable
              style={[styles.toggleBtn, filter === 'expense' && styles.activeToggleBtn]}
              onPress={() => {
                hapticSelection();
                setFilter('expense');
              }}
            >
              <Text style={[styles.toggleText, filter === 'expense' && styles.activeToggleText]}>
                Expenses
              </Text>
            </Pressable>
            <Pressable
              style={[styles.toggleBtn, filter === 'income' && styles.activeToggleBtn]}
              onPress={() => {
                hapticSelection();
                setFilter('income');
              }}
            >
              <Text style={[styles.toggleText, filter === 'income' && styles.activeToggleText]}>
                Income
              </Text>
            </Pressable>
          </View>

          <View style={styles.filterRow}>
            <Pressable
              style={[styles.filterChip, activeOnly && styles.activeFilterChip]}
              onPress={() => {
                hapticSelection();
                setActiveOnly(true);
              }}
            >
              <Text style={[styles.filterChipText, activeOnly && styles.activeFilterChipText]}>
                Active
              </Text>
            </Pressable>
            <Pressable
              style={[styles.filterChip, !activeOnly && styles.activeFilterChip]}
              onPress={() => {
                hapticSelection();
                setActiveOnly(false);
              }}
            >
              <Text style={[styles.filterChipText, !activeOnly && styles.activeFilterChipText]}>
                All
              </Text>
            </Pressable>
          </View>

          <Pressable style={styles.addButton} onPress={() => setAddVisible(true)}>
            <Icon name="plus" size={16} color={colors.primaryForeground} />
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>

          <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false}>
            {filteredItems.length === 0 ? (
              <Text style={styles.emptyText}>
                {activeOnly ? 'No active schedules' : 'No schedules'}
              </Text>
            ) : (
              filteredItems.map((item, index) => (
                <View key={item.id} style={[styles.itemBlock, index > 0 && styles.borderTop]}>
                  <View style={styles.itemRow}>
                    <View style={[styles.iconBox, { backgroundColor: item.colorBg }]}>
                      <Icon name={item.icon} size={20} color={item.colorFg} />
                    </View>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemSchedule}>Day {item.dayOfMonth} of month</Text>
                    </View>
                    <View style={styles.amountWrap}>
                      <Text
                        style={[
                          styles.itemAmount,
                          { color: item.type === 'income' ? colors.incomeText : colors.foreground },
                        ]}
                      >
                        {formatSignedAmount(item.type, item.amount, symbol, decimals)}
                      </Text>
                      <Switch
                        value={item.active}
                        onValueChange={() => onToggleActive(item.id)}
                        trackColor={{ false: colors.border, true: colors.secondary }}
                        thumbColor={item.active ? colors.primary : '#FFFFFF'}
                      />
                      <Pressable style={styles.trashBtn} onPress={() => setConfirmId(item.id)}>
                        <Icon name="trash-can-outline" size={18} color={colors.expenseText} />
                      </Pressable>
                    </View>
                  </View>

                  {confirmId === item.id ? (
                    <View style={styles.confirmRow}>
                      <Text style={styles.confirmText}>Delete this schedule?</Text>
                      <View style={styles.confirmActions}>
                        <Pressable style={styles.cancelBtn} onPress={() => setConfirmId(null)}>
                          <Text style={styles.cancelBtnText}>Cancel</Text>
                        </Pressable>
                        <Pressable
                          style={styles.deleteBtn}
                          onPress={() => {
                            setConfirmId(null);
                            hapticWarning();
                            onDeleteItem(item.id);
                          }}
                        >
                          <Text style={styles.deleteBtnText}>Delete</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : null}
                </View>
              ))
            )}
          </ScrollView>

        <AddRecurringModal
          visible={addVisible}
          initialType={filter}
          onClose={() => setAddVisible(false)}
          onSave={onAddItem}
        />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    fontFamily: fonts.bold,
    letterSpacing: -0.3,
    color: colors.foreground,
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: colors.muted,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: colors.muted,
    borderRadius: radii.pill,
    padding: 4,
    marginBottom: 10,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  activeToggleBtn: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: fonts.semibold,
    color: colors.mutedForeground,
  },
  activeToggleText: {
    color: colors.primaryForeground,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  activeFilterChip: {
    backgroundColor: colors.secondary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: fonts.semibold,
    color: colors.mutedForeground,
  },
  activeFilterChipText: {
    color: colors.primary,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: radii.pill,
    marginBottom: 14,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: fonts.bold,
    color: colors.primaryForeground,
  },
  listScroll: {
    maxHeight: 380,
  },
  itemBlock: {
    paddingVertical: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  borderTop: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: fonts.semibold,
    color: colors.foreground,
  },
  itemSchedule: {
    fontSize: 12,
    color: colors.mutedForeground,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  amountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemAmount: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  trashBtn: {
    padding: 4,
  },
  confirmRow: {
    paddingBottom: 10,
    paddingLeft: 52,
  },
  confirmText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.foreground,
    marginBottom: 8,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radii.pill,
    alignItems: 'center',
    backgroundColor: colors.muted,
  },
  cancelBtnText: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: colors.foreground,
  },
  deleteBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radii.pill,
    alignItems: 'center',
    backgroundColor: colors.expenseText,
  },
  deleteBtnText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: colors.primaryForeground,
  },
  emptyText: {
    paddingVertical: 24,
    textAlign: 'center',
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.mutedForeground,
  },
});
