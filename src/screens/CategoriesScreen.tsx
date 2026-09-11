import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AddCategoryModal } from '../components/AddCategoryModal';
import { CategoryRow } from '../components/CategoryRow';
import { Icon } from '../components/Icon';
import { SegmentedControl } from '../components/SegmentedControl';
import { INITIAL_EXPENSE_CATEGORIES, INITIAL_INCOME_CATEGORIES } from '../data/categoriesData';
import { colors, fonts, radii } from '../theme';
import { CategoryItem, CategoryType } from '../types';

export function CategoriesScreen() {
  const [activeType, setActiveType] = useState<CategoryType>('expense');
  const [expenseCategories, setExpenseCategories] = useState<CategoryItem[]>(INITIAL_EXPENSE_CATEGORIES);
  const [incomeCategories, setIncomeCategories] = useState<CategoryItem[]>(INITIAL_INCOME_CATEGORIES);
  const [modalVisible, setModalVisible] = useState(false);

  const currentList = activeType === 'expense' ? expenseCategories : incomeCategories;

  const handleAddCategory = (newItem: Omit<CategoryItem, 'id'>) => {
    const itemWithId: CategoryItem = {
      ...newItem,
      id: `${newItem.type}-${Date.now()}`,
    };
    if (newItem.type === 'expense') {
      setExpenseCategories((prev) => [itemWithId, ...prev]);
    } else {
      setIncomeCategories((prev) => [itemWithId, ...prev]);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Categories</Text>
          <Pressable style={styles.addButton} onPress={() => setModalVisible(true)}>
            <Icon name="plus" size={16} color={colors.primaryForeground} />
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
        </View>

        <SegmentedControl selected={activeType} onSelect={setActiveType} />

        <View style={styles.card}>
          {currentList.map((item, index) => (
            <CategoryRow key={item.id} item={item} isFirst={index === 0} />
          ))}
        </View>
      </ScrollView>

      <AddCategoryModal
        visible={modalVisible}
        type={activeType}
        onClose={() => setModalVisible(false)}
        onSave={handleAddCategory}
      />
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
  title: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: fonts.bold,
    color: colors.foreground,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radii.pill,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: fonts.bold,
    color: colors.primaryForeground,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
});
