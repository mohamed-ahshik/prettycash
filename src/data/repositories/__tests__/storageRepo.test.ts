jest.mock('../../../lib/supabase', () => ({
  supabase: { auth: { getUser: jest.fn() }, storage: { from: jest.fn() } },
}));

import { supabase } from '../../../lib/supabase';
import { base64ToArrayBuffer, uploadReceipt } from '../storageRepo';

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

describe('uploadReceipt', () => {
  it('uses the capture id and upserts when a capture id is provided', async () => {
    const upload = jest.fn().mockResolvedValue({ error: null });
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: 'user-1' } },
    });
    (supabase.storage.from as jest.Mock).mockReturnValue({ upload });

    const path = await uploadReceipt('AQID', 'image/jpeg', 'capture-1');

    expect(path).toBe('user-1/capture-1.jpg');
    expect(upload).toHaveBeenCalledWith(
      'user-1/capture-1.jpg',
      expect.any(ArrayBuffer),
      { contentType: 'image/jpeg', upsert: true },
    );
  });
});
