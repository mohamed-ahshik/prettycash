import { supabase } from '../../lib/supabase';

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer as ArrayBuffer;
}

export async function uploadReceipt(
  base64: string,
  mimeType: string,
  captureId?: string,
): Promise<string> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('not authenticated');
  const filename = captureId
    ? `${captureId}.${extFromMime(mimeType)}`
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extFromMime(mimeType)}`;
  const path = `${userId}/${filename}`;
  const { error } = await supabase.storage.from('receipts').upload(path, base64ToArrayBuffer(base64), {
    contentType: mimeType,
    upsert: Boolean(captureId),
  });
  if (error) throw error;
  return path;
}

export async function signedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('receipts').createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

function extFromMime(mimeType: string): string {
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('webp')) return 'webp';
  if (mimeType.includes('heic')) return 'heic';
  return 'jpg';
}
