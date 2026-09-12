import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii } from '../theme';
import { Icon } from './Icon';

interface ReceiptImagePickerProps {
  onPicked: (base64: string, mimeType: string) => void;
  onCancel: () => void;
}

export async function getImageBase64(
  asset: ImagePicker.ImagePickerAsset
): Promise<{ base64: string; mimeType: string } | null> {
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

export function ReceiptImagePicker({ onPicked, onCancel }: ReceiptImagePickerProps) {
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickFromGallery = async () => {
    setError(null);
    setPermissionDenied(false);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: 0.8,
    });
    if (result.canceled) {
      onCancel();
      return;
    }
    const extracted = await getImageBase64(result.assets[0]);
    if (extracted) {
      onPicked(extracted.base64, extracted.mimeType);
    } else {
      setError('Could not read the selected image.');
    }
  };

  const takePhoto = async () => {
    setError(null);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setPermissionDenied(true);
      return;
    }
    setPermissionDenied(false);
    const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.8 });
    if (result.canceled) {
      onCancel();
      return;
    }
    const extracted = await getImageBase64(result.assets[0]);
    if (extracted) {
      onPicked(extracted.base64, extracted.mimeType);
    } else {
      setError('Could not read the captured photo.');
    }
  };

  return (
    <View style={styles.container}>
      <Pressable style={styles.primaryButton} onPress={takePhoto}>
        <Icon name="camera" size={20} color={colors.primaryForeground} />
        <Text style={styles.primaryButtonText}>Take photo</Text>
      </Pressable>

      <Pressable style={styles.secondaryButton} onPress={pickFromGallery}>
        <Icon name="image-multiple" size={20} color={colors.primary} />
        <Text style={styles.secondaryButtonText}>Choose from gallery</Text>
      </Pressable>

      {permissionDenied && (
        <Text style={styles.errorText}>Camera permission denied</Text>
      )}
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radii.pill,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: fonts.bold,
    color: colors.primaryForeground,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.secondary,
    paddingVertical: 14,
    borderRadius: radii.pill,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: fonts.bold,
    color: colors.secondaryForeground,
  },
  errorText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.expenseText,
    textAlign: 'center',
  },
});
