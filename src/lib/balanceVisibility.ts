import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'prettycash:balanceHidden';

export const BALANCE_MASK = '••••••';
export const INCOME_MASK = '+••••';
export const EXPENSE_MASK = '••••';

export async function loadBalanceHidden(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === '1';
  } catch {
    return false;
  }
}

export async function saveBalanceHidden(hidden: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, hidden ? '1' : '0');
  } catch {}
}
