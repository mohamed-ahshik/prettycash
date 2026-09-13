jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({})),
}));

import { secureStorageAdapter } from '../supabase';

describe('secureStorageAdapter', () => {
  it('round-trips a value through getItem/setItem', async () => {
    await secureStorageAdapter.setItem('k', 'v');
    await expect(secureStorageAdapter.getItem('k')).resolves.toBe('v');
    await secureStorageAdapter.removeItem('k');
    await expect(secureStorageAdapter.getItem('k')).resolves.toBeNull();
  });

  it('returns null for a missing key', async () => {
    await expect(secureStorageAdapter.getItem('missing-key-xyz')).resolves.toBeNull();
  });
});
