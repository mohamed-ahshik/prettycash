import { getAuthErrorMessage, getErrorMessage } from '../errorMessage';

describe('getErrorMessage', () => {
  it('returns the message of an Error instance', () => {
    expect(getErrorMessage(new Error('boom'))).toBe('boom');
  });

  it('returns the message of a plain-object error', () => {
    expect(getErrorMessage({ message: 'duplicate key', code: '23505' })).toBe('duplicate key');
  });

  it('falls back to String for values without a string message', () => {
    expect(getErrorMessage({ code: '23505' })).toBe('[object Object]');
    expect(getErrorMessage(null)).toBe('null');
    expect(getErrorMessage('plain')).toBe('plain');
  });
});

describe('getAuthErrorMessage', () => {
  it('replaces Supabase rate-limit errors with a friendly message', () => {
    expect(
      getAuthErrorMessage({
        code: 'over_email_send_rate_limit',
        message: 'email rate limit exceeded',
        status: 429,
      }),
    ).toBe('Too many attempts—try again later');
  });

  it('handles request rate limits and message-only errors', () => {
    expect(
      getAuthErrorMessage({ code: 'over_request_rate_limit', message: 'rate limit exceeded' }),
    ).toBe('Too many attempts—try again later');
    expect(getAuthErrorMessage({ message: 'Email rate limit exceeded' })).toBe(
      'Too many attempts—try again later',
    );
  });

  it('keeps normal auth errors unchanged', () => {
    expect(getAuthErrorMessage(new Error('Invalid login credentials'))).toBe(
      'Invalid login credentials',
    );
  });
});
