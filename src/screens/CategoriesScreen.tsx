import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AddCategoryModal } from '../components/AddCategoryModal';
import { CategoryRow } from '../components/CategoryRow';
import { Icon } from '../components/Icon';
import { CATEGORY_TYPE_OPTIONS, SegmentedControl } from '../components/SegmentedControl';
import { useCategories } from '../context/CategoriesContext';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { fonts, radii, shadows, text } from '../theme';
import type { ThemeColors } from '../theme';
import { CategoryItem, CategoryType } from '../types';

export function CategoriesScreen() {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const [activeType, setActiveType] = useState<CategoryType>('expense');
  const { expenseCategories, incomeCategories, addCategory, updateCategory } = useCategories();
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<CategoryItem | null>(null);

  const currentList = activeType === 'expense' ? expenseCategories : incomeCategories;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[text.title, styles.title]}>Categories</Text>
          <Pressable
            style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
            onPress={() => setModalVisible(true)}
          >
            <Icon name="plus" size={16} color={colors.primaryForeground} />
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
        </View>

        <SegmentedControl
          selected={activeType}
          onSelect={setActiveType}
          options={CATEGORY_TYPE_OPTIONS}
        />

        <View style={styles.card}>
          {currentList.map((item, index) => (
            <CategoryRow key={item.id} item={item} isFirst={index === 0} onPress={() => setEditing(item)} />
          ))}
        </View>
      </ScrollView>

      <AddCategoryModal
        visible={modalVisible || editing !== null}
        type={editing?.type ?? activeType}
        initial={editing ?? undefined}
        onClose={() => {
          setModalVisible(false);
          setEditing(null);
        }}
        onSave={(item) => {
          const action = editing
            ? updateCategory(editing.id, { name: item.name, notes: item.notes })
            : addCategory(item);
          action.catch(() => {});
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
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
    lineHeight: 18,
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
    ...shadows.e1,
  },
  pressed: {
    opacity: 0.85,
  },
});
