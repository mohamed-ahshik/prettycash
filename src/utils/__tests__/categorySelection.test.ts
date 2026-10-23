import { CategoryItem } from '../../types';
import { buildCategoryPayload, selectInitialCategoryId } from '../categorySelection';

function category(overrides: Partial<CategoryItem> & Pick<CategoryItem, 'id' | 'name'>): CategoryItem {
  return {
    type: 'expense',
    icon: 'x',
    colorBg: '#fff',
    colorFg: '#000',
    ...overrides,
  };
}

it('excludes Uncategorized and non-expense categories, caps at 50, and truncates descriptions', () => {
  const categories = Array.from({ length: 53 }, (_, i) =>
    category({
      id: `c${i}`,
      name: `C${i}`,
      notes: 'x'.repeat(201),
      isUncategorized: i === 0,
      type: i === 1 ? 'income' : 'expense',
    }),
  );
  const payload = buildCategoryPayload(categories);
  expect(payload).toHaveLength(50);
  expect(payload[0].id).toBe('c2');
  expect(payload[0].description).toHaveLength(200);
});

it('uses the draft category only when it is still valid', () => {
  const categories = [
    category({ id: 'u', name: 'Uncategorized', isUncategorized: true }),
    category({ id: 'f', name: 'Food' }),
  ];
  expect(selectInitialCategoryId({ categoryId: 'f' }, categories)).toBe('f');
  expect(selectInitialCategoryId({ categoryId: 'gone' }, categories)).toBe('u');
  expect(selectInitialCategoryId(null, categories)).toBe('u');
  expect(selectInitialCategoryId({ categoryId: 'f' }, [])).toBeUndefined();
});
