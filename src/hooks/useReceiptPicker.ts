import { useCallback, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { getImageBase64 } from '../services/receiptPicker';
import type { PickedReceiptImage } from '../services/receiptPicker';

export type ReceiptPickerError = 'camera_permission' | 'camera_failed' | 'gallery_failed';

export function useReceiptPicker() {
  const [error, setError] = useState<ReceiptPickerError | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const pickFromCamera = useCallback(async (): Promise<PickedReceiptImage | null> => {
    setError(null);
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        setError('camera_permission');
        return null;
      }
      const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.8 });
      if (result.canceled) return null;
      const image = await getImageBase64(result.assets[0]);
      if (!image) {
        setError('camera_failed');
        return null;
      }
      return image;
    } catch {
      setError('camera_failed');
      return null;
    }
  }, []);

  const pickFromGallery = useCallback(async (): Promise<PickedReceiptImage | null> => {
    setError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        base64: true,
        quality: 0.8,
      });
      if (result.canceled) return null;
      const image = await getImageBase64(result.assets[0]);
      if (!image) {
        setError('gallery_failed');
        return null;
      }
      return image;
    } catch {
      setError('gallery_failed');
      return null;
    }
  }, []);

  return { pickFromCamera, pickFromGallery, error, clearError };
}
