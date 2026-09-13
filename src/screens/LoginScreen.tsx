import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { useAuth } from '../context/AuthContext';
import { colors, fonts, radii } from '../theme';

export function LoginScreen() {
  const { signInWithProvider } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'google' | 'facebook' | null>(null);

  const handleSignIn = async (provider: 'google' | 'facebook') => {
    setError(null);
    setBusy(provider);
    try {
      await signInWithProvider(provider);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Icon name="cash-multiple" size={40} color={colors.primary} />
          </View>
          <Text style={styles.title}>PrettyCash</Text>
          <Text style={styles.subtitle}>
            Sign in to sync your budget and expenses across devices.
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.button, styles.buttonPrimary, pressed && styles.pressed]}
            onPress={() => handleSignIn('google')}
            disabled={busy !== null}
          >
            <Icon name="google" size={20} color={colors.primaryForeground} />
            <Text style={styles.buttonPrimaryText}>
              {busy === 'google' ? 'Connecting…' : 'Continue with Google'}
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.button, styles.buttonSecondary, pressed && styles.pressed]}
            onPress={() => handleSignIn('facebook')}
            disabled={busy !== null}
          >
            <Icon name="facebook" size={20} color={colors.secondaryForeground} />
            <Text style={styles.buttonSecondaryText}>
              {busy === 'facebook' ? 'Connecting…' : 'Continue with Facebook'}
            </Text>
          </Pressable>

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  brand: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: fonts.bold,
    color: colors.foreground,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  actions: {
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    borderRadius: radii.pill,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonSecondary: {
    backgroundColor: colors.secondary,
  },
  buttonPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: fonts.semibold,
    color: colors.primaryForeground,
  },
  buttonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: fonts.semibold,
    color: colors.secondaryForeground,
  },
  error: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.expenseText,
    textAlign: 'center',
    marginTop: 4,
  },
  pressed: {
    opacity: 0.8,
  },
});
