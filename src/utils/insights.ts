import { CategoryBreakdownItem, CategoryItem, InsightsData } from '../types';

export function getInsightsData(
  type: 'expense' | 'income',
  categories: CategoryItem[]
): InsightsData {
  // Weights matching the screenshot proportions for sample demonstration
  const sampleWeights = [0.823, 0.13, 0.047, 0.03, 0.02];
  const baseTotal = type === 'expense' ? 44.64 : 6000.0;

  // Map each active category from Categories tab into an insights breakdown item
  const items: CategoryBreakdownItem[] = categories.map((cat, index) => {
    const weight = index < sampleWeights.length ? sampleWeights[index] : 0.01;
    const amount = Number((baseTotal * weight).toFixed(2));
    const percentage = Number((weight * 100).toFixed(1));

    return {
      id: cat.id,
      name: cat.name,
      amount,
      percentage,
      icon: cat.icon,
      color: cat.colorFg,
      bgColor: cat.colorBg,
    };
  });

  // Calculate actual sum
  const total = items.reduce((acc, curr) => acc + curr.amount, 0);

  return {
    total: Number(total.toFixed(2)),
    type,
    items,
  };
}
