import type { ImagePickerAsset } from 'expo-image-picker';

export interface PickedReceiptImage {
  base64: string;
  mimeType: string;
}

export async function getImageBase64(
  asset: ImagePickerAsset,
): Promise<PickedReceiptImage | null> {
  const mimeType = asset.mimeType ?? 'image/jpeg';
  if (asset.base64) return { base64: asset.base64, mimeType };
  if (asset.file) {
    const b64 = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve((r.result as string).split(',')[1] ?? '');
      r.onerror = () => reject(new Error('read failed'));
      r.readAsDataURL(asset.file as Blob);
    });
    return { base64: b64, mimeType };
  }
  return null;
}
