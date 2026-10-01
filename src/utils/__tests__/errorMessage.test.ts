import { getErrorMessage } from '../errorMessage';

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
