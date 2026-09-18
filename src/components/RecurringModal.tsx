import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { colors, fonts, radii } from '../theme';
import { RecurringItem } from '../types';
import { formatMoney } from '../utils/format';
import { AddRecurringModal } from './AddRecurringModal';
import { Icon } from './Icon';

interface RecurringModalProps {
  visible: boolean;
  items: RecurringItem[];
  onClose: () => void;
  onToggleActive: (id: string) => void;
  onAddItem: (item: Omit<RecurringItem, 'id' | 'active'>) => void;
}

export function RecurringModal({
  visible,
  items,
  onClose,
  onToggleActive,
  onAddItem,
}: RecurringModalProps) {
  const [filter, setFilter] = useState<'expense' | 'income'>('expense');
  const [addVisible, setAddVisible] = useState(false);

  const filteredItems = items.filter((it) => it.type === filter);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismissOverlay} onPress={onClose} />
        <View style={styles.sheetCard}>
          {/* Top bar */}
          <View style={styles.topBar}>
            <Text style={styles.sheetTitle}>Recurring</Text>
            <View style={styles.topBarActions}>
              <Pressable style={styles.closeBtn} onPress={onClose}>
                <Icon name="close" size={20} color={colors.mutedForeground} />
              </Pressable>
            </View>
          </View>

          {/* Toggle pill */}
          <View style={styles.toggleRow}>
            <Pressable
              style={[styles.toggleBtn, filter === 'expense' && styles.activeToggleBtn]}
              onPress={() => setFilter('expense')}
            >
              <Text style={[styles.toggleText, filter === 'expense' && styles.activeToggleText]}>
                Expenses
              </Text>
            </Pressable>
            <Pressable
              style={[styles.toggleBtn, filter === 'income' && styles.activeToggleBtn]}
              onPress={() => setFilter('income')}
            >
              <Text style={[styles.toggleText, filter === 'income' && styles.activeToggleText]}>
                Income
              </Text>
            </Pressable>
          </View>

          <Pressable style={styles.addButton} onPress={() => setAddVisible(true)}>
            <Icon name="plus" size={16} color={colors.primaryForeground} />
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>

          {/* Items list */}
          <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false}>
            {filteredItems.map((item, index) => (
              <View key={item.id} style={[styles.itemRow, index > 0 && styles.borderTop]}>
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
                    {item.type === 'income' ? '+' : '-'}${formatMoney(item.amount)}
                  </Text>
                  <Switch
                    value={item.active}
                    onValueChange={() => onToggleActive(item.id)}
                    trackColor={{ false: colors.border, true: colors.secondary }}
                    thumbColor={item.active ? colors.primary : '#FFFFFF'}
                  />
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        <AddRecurringModal
          visible={addVisible}
          initialType={filter}
          onClose={() => setAddVisible(false)}
          onSave={onAddItem}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  dismissOverlay: {
    ...StyleSheet.absoluteFill,
  },
  sheetCard: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
    maxHeight: '85%',
    width: '100%',
    maxWidth: 430,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: fonts.bold,
    color: colors.foreground,
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    marginBottom: 14,
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
  listScroll: {
    maxHeight: 380,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
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
});
