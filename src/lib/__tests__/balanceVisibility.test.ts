import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadBalanceHidden, saveBalanceHidden } from '../balanceVisibility';

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
