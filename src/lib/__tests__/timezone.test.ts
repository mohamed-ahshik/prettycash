import { getDeviceTimeZone, isValidTimeZone } from '../timezone';

describe('isValidTimeZone', () => {
  it('accepts IANA timezones', () => {
    expect(isValidTimeZone('Asia/Singapore')).toBe(true);
    expect(isValidTimeZone('America/New_York')).toBe(true);
    expect(isValidTimeZone('UTC')).toBe(true);
  });

  it('rejects missing and invalid timezones', () => {
    expect(isValidTimeZone('')).toBe(false);
    expect(isValidTimeZone(undefined)).toBe(false);
    expect(isValidTimeZone('Not/AZone')).toBe(false);
  });
});

describe('getDeviceTimeZone', () => {
  it('returns a valid IANA timezone on this device', () => {
    const timeZone = getDeviceTimeZone();
    expect(timeZone).not.toBeNull();
    expect(isValidTimeZone(timeZone)).toBe(true);
  });
});
