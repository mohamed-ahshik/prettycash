import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { BrandMark } from '../components/BrandMark';
import { FacebookLogo, GoogleLogo } from '../components/SocialLogo';
import { REVIEWER_EMAIL } from '../config';
import { useAuth } from '../context/AuthContext';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { isReviewerEmail } from '../lib/reviewerEmail';
import { fonts, radii } from '../theme';
import type { ThemeColors } from '../theme';
import { getAuthErrorMessage } from '../utils/errorMessage';

const SHOW_GOOGLE_SIGN_IN = true;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type BusyState = 'google' | 'facebook' | 'email' | null;

export function LoginScreen() {
  const styles = useThemedStyles(makeStyles);
  const { colors, isDark } = useTheme();
  const { signInWithProvider, signInWithEmailOtp, signInWithPassword, authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState<BusyState>(null);

  useEffect(() => {
    if (authError) setError(getAuthErrorMessage(authError));
  }, [authError]);

  const handleSignIn = async (provider: 'google' | 'facebook') => {
    setError(null);
    setBusy(provider);
    try {
      await signInWithProvider(provider);
    } catch (e) {
      setError(
        e && typeof e === 'object'
          ? getAuthErrorMessage(e)
          : 'Something went wrong. Please try again.'
      );
    } finally {
      setBusy(null);
    }
  };

  const reviewer = isReviewerEmail(email, REVIEWER_EMAIL);

  const handleContinue = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }

    if (reviewer && !password) {
      setError('Enter the password for this account.');
      return;
    }

    setError(null);
    setSent(false);
    setBusy('email');
    try {
      if (reviewer) {
        await signInWithPassword(normalizedEmail, password);
        return;
      }
      await signInWithEmailOtp(normalizedEmail);
      setEmail(normalizedEmail);
      setSent(true);
    } catch (e) {
      setError(getAuthErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const submitLabel =
    busy === 'email'
      ? reviewer
        ? 'Signing in…'
        : 'Sending…'
      : reviewer
        ? 'Sign in'
        : sent
          ? 'Resend link'
          : 'Continue';

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logo}>
            <BrandMark size={58} />
          </View>
          <Text style={styles.title}>Log in or sign up</Text>

          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor={colors.mutedForeground}
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              setPassword('');
              setSent(false);
              setError(null);
            }}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            accessibilityLabel="Email address"
            editable={busy === null}
          />

          {reviewer ? (
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Password"
              placeholderTextColor={colors.mutedForeground}
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                setSent(false);
                setError(null);
              }}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="password"
              autoComplete="current-password"
              accessibilityLabel="Password"
              editable={busy === null}
            />
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.continueButton,
              pressed && styles.pressed,
              busy !== null && styles.disabled,
            ]}
            onPress={handleContinue}
            disabled={busy !== null}
          >
            <Text style={styles.continueText}>{submitLabel}</Text>
          </Pressable>

          {sent ? (
            <Text style={styles.success}>Check your email for a sign-in link.</Text>
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {SHOW_GOOGLE_SIGN_IN ? (
            <Pressable
              style={({ pressed }) => [
                styles.socialButton,
                pressed && styles.pressed,
              ]}
              onPress={() => handleSignIn('google')}
              disabled={busy !== null}
            >
              <GoogleLogo size={20} />
              <Text style={styles.socialText}>
                {busy === 'google' ? 'Connecting…' : 'Continue with Google'}
              </Text>
            </Pressable>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.socialButton,
              pressed && styles.pressed,
            ]}
            onPress={() => handleSignIn('facebook')}
            disabled={busy !== null}
          >
            <FacebookLogo size={20} />
            <Text style={styles.socialText}>
              {busy === 'facebook' ? 'Connecting…' : 'Continue with Facebook'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  logo: {
    width: 76,
    height: 76,
    borderRadius: 22,
    alignSelf: 'center',
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontFamily: fonts.bold,
    fontWeight: '700',
    letterSpacing: -0.6,
    color: colors.foreground,
    textAlign: 'center',
    marginBottom: 28,
  },
  input: {
    height: 54,
    borderRadius: radii.sm,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.foreground,
    backgroundColor: colors.muted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  passwordInput: {
    marginTop: 12,
  },
  continueButton: {
    height: 54,
    marginTop: 14,
    borderRadius: radii.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueText: {
    fontSize: 16,
    fontFamily: fonts.semibold,
    fontWeight: '600',
    color: colors.primaryForeground,
  },
  success: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fonts.regular,
    color: colors.primary,
    textAlign: 'center',
  },
  error: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fonts.regular,
    color: colors.expenseText,
    textAlign: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 22,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.mutedForeground,
  },
  socialButton: {
    height: 54,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
  },
  socialText: {
    fontSize: 16,
    fontFamily: fonts.semibold,
    fontWeight: '600',
    color: colors.foreground,
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.55,
  },
});
