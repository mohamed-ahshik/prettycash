jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      signInAnonymously: jest.fn(),
    },
  },
}));

import { supabase } from '../../lib/supabase';
import { resolveInitialSession } from '../session';

const mockGetSession = supabase.auth.getSession as unknown as jest.Mock;
const mockSignInAnonymously = supabase.auth.signInAnonymously as unknown as jest.Mock;

beforeEach(() => {
  mockGetSession.mockReset();
  mockSignInAnonymously.mockReset();
});

describe('resolveInitialSession', () => {
  it('returns an existing session without signing in anonymously', async () => {
    const session = { access_token: 'existing' };
    mockGetSession.mockResolvedValue({ data: { session } });

    await expect(resolveInitialSession(false)).resolves.toEqual({ session, error: null });
    expect(mockSignInAnonymously).not.toHaveBeenCalled();
  });

  it('signs in anonymously when there is no session and auth UI is hidden', async () => {
    const session = { access_token: 'anon' };
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockSignInAnonymously.mockResolvedValue({ data: { session }, error: null });

    await expect(resolveInitialSession(false)).resolves.toEqual({ session, error: null });
    expect(mockSignInAnonymously).toHaveBeenCalledTimes(1);
  });

  it('returns the error when anonymous sign-in fails', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockSignInAnonymously.mockResolvedValue({
      data: { session: null },
      error: { message: 'Anonymous sign-ins are disabled' },
    });

    await expect(resolveInitialSession(false)).resolves.toEqual({
      session: null,
      error: 'Anonymous sign-ins are disabled',
    });
  });

  it('returns no session without anonymous sign-in when auth UI is shown', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    await expect(resolveInitialSession(true)).resolves.toEqual({ session: null, error: null });
    expect(mockSignInAnonymously).not.toHaveBeenCalled();
  });
});
