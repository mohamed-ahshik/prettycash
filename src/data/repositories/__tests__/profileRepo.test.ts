jest.mock('../../../lib/supabase', () => ({
  supabase: { from: jest.fn(), auth: { getUser: jest.fn() } },
}));

import { supabase } from '../../../lib/supabase';
import { upsertProfile } from '../profileRepo';

const from = supabase.from as unknown as jest.Mock;
const getUser = supabase.auth.getUser as unknown as jest.Mock;

beforeEach(() => {
  from.mockReset();
  getUser.mockReset();
});

it('includes auto_categorize in the profile upsert', async () => {
  getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
  const upsert = jest.fn().mockResolvedValue({ error: null });
  from.mockImplementation(() => ({ upsert }));

  await upsertProfile({
    name: 'Maya', initial: 'M', email: '', memberSince: '', currency: 'USD ($)',
    notificationsEnabled: true, hapticsEnabled: true, themePreference: 'system',
    autoCategorize: false,
  });

  expect(upsert).toHaveBeenCalledWith(
    expect.objectContaining({ user_id: 'u1', auto_categorize: false }),
    { onConflict: 'user_id' },
  );
});
