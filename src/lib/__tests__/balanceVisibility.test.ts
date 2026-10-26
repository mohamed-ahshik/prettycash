import AsyncStorage from '@react-native-async-storage/async-storage';
import { EXPENSE_MASK, INCOME_MASK, loadBalanceHidden, saveBalanceHidden } from '../balanceVisibility';

beforeEach(async () => {
  await AsyncStorage.clear();
});

it('defaults to visible when unset', async () => {
  await expect(loadBalanceHidden()).resolves.toBe(false);
});

it('round-trips the hidden flag', async () => {
  await saveBalanceHidden(true);
  await expect(loadBalanceHidden()).resolves.toBe(true);
  await saveBalanceHidden(false);
  await expect(loadBalanceHidden()).resolves.toBe(false);
});

it('keeps the income and expense signs in the hidden masks', () => {
  expect(INCOME_MASK).toBe('+••••');
  expect(EXPENSE_MASK).toBe('-••••');
});
