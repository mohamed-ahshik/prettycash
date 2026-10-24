import { CategoryItem, ReceiptDraft } from '../types';

export function buildCategoryPayload(categories: CategoryItem[]) {
  return categories
    .filter((c) => c.type === 'expense' && !c.isUncategorized)
    .slice(0, 50)
    .map((c) => ({
      id: c.id,
      name: c.name,
      description: (c.notes ?? '').slice(0, 200),
    }));
}

export function selectInitialCategoryId(
  draft: Pick<ReceiptDraft, 'categoryId'> | null | undefined,
  expenseCategories: CategoryItem[],
): string | undefined {
  const fallback = expenseCategories.find((c) => c.isUncategorized) ?? expenseCategories[0];
  return draft?.categoryId && expenseCategories.some((c) => c.id === draft.categoryId)
    ? draft.categoryId
    : fallback?.id;
}
