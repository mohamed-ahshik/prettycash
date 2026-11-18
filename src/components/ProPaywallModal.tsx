import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';
import { useSubscription } from '../context/SubscriptionContext';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { fonts, radii, text } from '../theme';
import type { ThemeColors } from '../theme';
import { Icon } from './Icon';

function planLabel(pkg: PurchasesPackage): string {
  if (pkg.identifier === '$rc_annual') return 'Annual';
  if (pkg.identifier === '$rc_monthly') return 'Monthly';
  return pkg.product.title || 'Plan';
}

export function ProPaywallModal() {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const {
    paywallVisible,
    closePaywall,
    offerings,
    loading,
    unavailableReason,
    purchasePackage,
    restorePurchases,
    isPro,
  } = useSubscription();
  const packages = offerings?.current?.availablePackages ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);

  const selectedPackage = useMemo(
    () => packages.find((pkg) => pkg.identifier === selectedId) ?? packages[0],
    [packages, selectedId],
  );

  useEffect(() => {
    if (!selectedId && packages[0]) setSelectedId(packages[0].identifier);
  }, [packages, selectedId]);

  if (!paywallVisible) return null;

  const handlePurchase = async () => {
    if (!selectedPackage) return;
    setBusy(true);
    setError(null);
    try {
      await purchasePackage(selectedPackage);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Purchase could not be completed.');
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async () => {
    setBusy(true);
    setError(null);
    setRestored(false);
    try {
      await restorePurchases();
      setRestored(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Purchases could not be restored.');
    } finally {
      setBusy(false);
    }
  };

  const openUrl = (key: 'privacy' | 'terms') => {
    const url =
      key === 'privacy'
        ? process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL
        : process.env.EXPO_PUBLIC_TERMS_URL;
    if (url) void Linking.openURL(url);
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={closePaywall}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={[text.overline, styles.eyebrow]}>PrettyCash Pro</Text>
              <Text style={styles.title}>Unlock unlimited AI scans</Text>
            </View>
            <Pressable style={styles.closeButton} onPress={closePaywall}>
              <Icon name="close" size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <Text style={styles.description}>
              The AI receipt scanner turns a photo into a complete transaction. Manual tracking
              stays free forever.
            </Text>

            <View style={styles.benefits}>
              {['Unlimited AI receipt scans', 'No daily trial cap', 'All future Pro features'].map(
                (benefit) => (
                  <View key={benefit} style={styles.benefitRow}>
                    <Icon name="check-circle" size={18} color={colors.primary} />
                    <Text style={styles.benefitText}>{benefit}</Text>
                  </View>
                ),
              )}
            </View>

            {isPro ? (
              <View style={styles.configured}>
                <Text style={styles.configuredText}>You already have PrettyCash Pro.</Text>
              </View>
            ) : loading ? (
              <ActivityIndicator color={colors.primary} style={styles.loader} />
            ) : packages.length === 0 ? (
              <View style={styles.unavailable}>
                <Text style={styles.unavailableText}>
                  {unavailableReason ?? 'Subscription plans are temporarily unavailable.'}
                </Text>
                <Text style={styles.unavailableHint}>
                  Make sure the Google Play products are active, then try again.
                </Text>
              </View>
            ) : (
              <View style={styles.planList}>
                {packages.map((pkg) => {
                  const selected = selectedPackage?.identifier === pkg.identifier;
                  return (
                    <Pressable
                      key={pkg.identifier}
                      style={[styles.plan, selected && styles.planSelected]}
                      onPress={() => setSelectedId(pkg.identifier)}
                    >
                      <View style={styles.planInfo}>
                        <Text style={styles.planName}>{planLabel(pkg)}</Text>
                        <Text style={styles.planPrice}>{pkg.product.priceString}</Text>
                      </View>
                      {selected ? (
                        <Icon name="check-circle" size={22} color={colors.primary} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            )}

            {selectedPackage ? (
              <Text style={styles.trialNote}>
                Your 7-day trial includes 3 AI scans per day. Pro removes the daily cap.
              </Text>
            ) : null}

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {restored ? <Text style={styles.success}>Purchases restored.</Text> : null}
          </ScrollView>

          <Pressable
            style={[styles.cta, (!selectedPackage || busy) && styles.ctaDisabled]}
            disabled={!selectedPackage || busy}
            onPress={() => void handlePurchase()}
          >
            <Text style={styles.ctaText}>
              {busy ? 'Connecting…' : selectedPackage ? 'Continue' : 'Plans unavailable'}
            </Text>
          </Pressable>

          <Text style={styles.compliance}>
            Subscriptions auto-renew until canceled in Google Play Store settings. Manage or cancel
            anytime.
          </Text>

          <View style={styles.footerActions}>
            <Pressable onPress={() => void handleRestore()} disabled={busy}>
              <Text style={styles.footerLink}>Restore Purchases</Text>
            </Pressable>
            <View style={styles.legalLinks}>
              <Pressable onPress={() => openUrl('privacy')}>
                <Text style={styles.footerLink}>Privacy Policy</Text>
              </Pressable>
              <Text style={styles.footerSeparator}>·</Text>
              <Pressable onPress={() => openUrl('terms')}>
                <Text style={styles.footerLink}>Terms of Service</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: colors.overlay,
    },
    sheet: {
      maxHeight: '92%',
      backgroundColor: colors.card,
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      padding: 22,
      paddingBottom: 30,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 16,
    },
    eyebrow: {
      color: colors.primary,
      marginBottom: 6,
    },
    title: {
      fontSize: 25,
      lineHeight: 31,
      fontFamily: fonts.bold,
      color: colors.foreground,
      letterSpacing: -0.6,
    },
    closeButton: {
      padding: 8,
      borderRadius: 18,
      backgroundColor: colors.muted,
    },
    content: {
      paddingTop: 16,
      paddingBottom: 12,
    },
    description: {
      fontSize: 14,
      lineHeight: 20,
      fontFamily: fonts.regular,
      color: colors.mutedForeground,
    },
    benefits: {
      marginTop: 16,
      gap: 8,
    },
    benefitRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    benefitText: {
      fontSize: 14,
      fontFamily: fonts.medium,
      color: colors.foreground,
    },
    planList: {
      marginTop: 20,
      gap: 10,
    },
    plan: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 15,
      borderRadius: radii.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    planSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.secondary,
    },
    planInfo: {
      gap: 3,
    },
    planName: {
      fontSize: 15,
      fontFamily: fonts.bold,
      color: colors.foreground,
    },
    planPrice: {
      fontSize: 13,
      fontFamily: fonts.medium,
      color: colors.mutedForeground,
    },
    trialNote: {
      marginTop: 14,
      fontSize: 12,
      lineHeight: 18,
      fontFamily: fonts.regular,
      color: colors.mutedForeground,
    },
    loader: {
      marginVertical: 24,
    },
    unavailable: {
      marginTop: 18,
      padding: 14,
      borderRadius: radii.md,
      backgroundColor: colors.muted,
    },
    unavailableText: {
      fontSize: 13,
      lineHeight: 19,
      fontFamily: fonts.medium,
      color: colors.foreground,
    },
    unavailableHint: {
      marginTop: 4,
      fontSize: 12,
      lineHeight: 17,
      fontFamily: fonts.regular,
      color: colors.mutedForeground,
    },
    configured: {
      marginTop: 18,
      padding: 14,
      borderRadius: radii.md,
      backgroundColor: colors.secondary,
    },
    configuredText: {
      fontSize: 14,
      fontFamily: fonts.semibold,
      color: colors.primary,
    },
    error: {
      marginTop: 12,
      fontSize: 13,
      lineHeight: 18,
      fontFamily: fonts.regular,
      color: colors.expenseText,
    },
    success: {
      marginTop: 12,
      fontSize: 13,
      fontFamily: fonts.medium,
      color: colors.primary,
    },
    cta: {
      marginTop: 14,
      borderRadius: radii.pill,
      paddingVertical: 15,
      alignItems: 'center',
      backgroundColor: colors.primary,
    },
    ctaDisabled: {
      opacity: 0.5,
    },
    ctaText: {
      fontSize: 16,
      fontFamily: fonts.bold,
      color: colors.primaryForeground,
    },
    compliance: {
      marginTop: 12,
      fontSize: 11,
      lineHeight: 16,
      fontFamily: fonts.regular,
      textAlign: 'center',
      color: colors.mutedForeground,
    },
    footerActions: {
      marginTop: 12,
      alignItems: 'center',
      gap: 9,
    },
    legalLinks: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    footerLink: {
      fontSize: 12,
      fontFamily: fonts.medium,
      color: colors.primary,
      textDecorationLine: 'underline',
    },
    footerSeparator: {
      color: colors.mutedForeground,
    },
  });
