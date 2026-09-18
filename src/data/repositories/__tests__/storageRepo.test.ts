jest.mock('../../../lib/supabase', () => ({
  supabase: { auth: { getUser: jest.fn() }, storage: { from: jest.fn() } },
}));

import { base64ToArrayBuffer } from '../storageRepo';

describe('base64ToArrayBuffer', () => {
  it('decodes base64 into the matching bytes', () => {
    const buffer = base64ToArrayBuffer('AQID');
    expect(new Uint8Array(buffer)).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('preserves bytes above 127 without UTF-8 corruption', () => {
    const buffer = base64ToArrayBuffer('/w==');
    expect(new Uint8Array(buffer)).toEqual(new Uint8Array([255]));
  });
});
