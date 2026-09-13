import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AboutModal } from '../components/AboutModal';
import { CurrencyPickerModal } from '../components/CurrencyPickerModal';
import { Icon } from '../components/Icon';
import { RecurringModal } from '../components/RecurringModal';
import { useAuth } from '../context/AuthContext';
import { getProfile, upsertProfile } from '../data/repositories/profileRepo';
import { insertRecurring, listRecurring, setRecurringActive } from '../data/repositories/recurringRepo';
import { colors, fonts, radii } from '../theme';
import { RecurringItem, UserProfile } from '../types';

export function ProfileScreen() {
  const { session } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [recurringItems, setRecurringItems] = useState<RecurringItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [recurringVisible, setRecurringVisible] = useState(false);
  const [currencyVisible, setCurrencyVisible] = useState(false);
  const [aboutVisible, setAboutVisible] = useState(false);

  useEffect(() => {
    if (!session) return;

    let cancelled = false;
    setLoading(true);

    Promise.all([getProfile(), listRecurring()])
      .then(([profileData, recurring]) => {
        if (cancelled) return;
        setProfile(profileData);
        setRecurringItems(recurring);
        setError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

  const updateProfile = (patch: Partial<UserProfile>) => {
    if (!profile) return;
    const next = { ...profile, ...patch };
    setProfile(next);
    upsertProfile(next).catch((e) => setError(e instanceof Error ? e.message : String(e)));
  };

  const handleToggleRecurring = (id: string) => {
    const item = recurringItems.find((it) => it.id === id);
    if (!item) return;
    const next = !item.active;
    setRecurringItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, active: next } : it))
    );
    setRecurringActive(id, next).catch((e) => setError(e instanceof Error ? e.message : String(e)));
  };

  const handleAddRecurring = async (newItem: Omit<RecurringItem, 'id' | 'active'>) => {
    try {
      const created = await insertRecurring(newItem);
      setRecurringItems((prev) => [created, ...prev]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error && !profile) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>No profile found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const activeCount = recurringItems.filter((it) => it.active).length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.screenTitle}>Profile</Text>

        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{profile.initial}</Text>
          </View>
          <Text style={styles.userName}>{profile.name}</Text>
          <Text style={styles.userSubtitle}>
            {profile.email} • Member since {profile.memberSince}
          </Text>
        </View>

        {/* Recurring Section */}
        <Text style={styles.sectionHeading}>Schedule</Text>
        <Pressable style={styles.menuRow} onPress={() => setRecurringVisible(true)}>
          <View style={[styles.menuIconBox, { backgroundColor: colors.secondary }]}>
            <Icon name="calendar-sync" size={20} color={colors.primary} />
          </View>
          <View style={styles.menuInfo}>
            <Text style={styles.menuTitle}>Recurring Transactions</Text>
            <Text style={styles.menuSubtitle}>{activeCount} active schedules</Text>
          </View>
          <Icon name="chevron-right" size={20} color={colors.mutedForeground} />
        </Pressable>

        {/* Settings Section */}
        <Text style={styles.sectionHeading}>Settings</Text>
        <View style={styles.settingsCard}>
          <Pressable style={styles.settingItem} onPress={() => setCurrencyVisible(true)}>
            <View style={styles.settingLeft}>
              <Icon name="currency-usd" size={20} color={colors.primary} />
              <Text style={styles.settingLabel}>Currency</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>{profile.currency}</Text>
              <Icon name="chevron-right" size={18} color={colors.mutedForeground} />
            </View>
          </Pressable>

          <View style={[styles.settingItem, styles.borderTop]}>
            <View style={styles.settingLeft}>
              <Icon name="bell-outline" size={20} color={colors.primary} />
              <Text style={styles.settingLabel}>Payment Reminders</Text>
            </View>
            <Switch
              value={profile.notificationsEnabled}
              onValueChange={(val) => updateProfile({ notificationsEnabled: val })}
              trackColor={{ false: colors.border, true: colors.secondary }}
              thumbColor={profile.notificationsEnabled ? colors.primary : '#FFFFFF'}
            />
          </View>

          <View style={[styles.settingItem, styles.borderTop]}>
            <View style={styles.settingLeft}>
              <Icon name="vibrate" size={20} color={colors.primary} />
              <Text style={styles.settingLabel}>Haptic Feedback</Text>
            </View>
            <Switch
              value={profile.hapticsEnabled}
              onValueChange={(val) => updateProfile({ hapticsEnabled: val })}
              trackColor={{ false: colors.border, true: colors.secondary }}
              thumbColor={profile.hapticsEnabled ? colors.primary : '#FFFFFF'}
            />
          </View>
        </View>

        {/* About Section */}
        <Text style={styles.sectionHeading}>General</Text>
        <Pressable style={styles.menuRow} onPress={() => setAboutVisible(true)}>
          <View style={[styles.menuIconBox, { backgroundColor: colors.muted }]}>
            <Icon name="information-outline" size={20} color={colors.foreground} />
          </View>
          <View style={styles.menuInfo}>
            <Text style={styles.menuTitle}>About PrettyCash</Text>
            <Text style={styles.menuSubtitle}>Version 1.0.0</Text>
          </View>
          <Icon name="chevron-right" size={20} color={colors.mutedForeground} />
        </Pressable>
      </ScrollView>

      <RecurringModal
        visible={recurringVisible}
        items={recurringItems}
        onClose={() => setRecurringVisible(false)}
        onToggleActive={handleToggleRecurring}
        onAddItem={handleAddRecurring}
      />

      <CurrencyPickerModal
        visible={currencyVisible}
        selected={profile.currency}
        onSelect={(cur) => updateProfile({ currency: cur })}
        onClose={() => setCurrencyVisible(false)}
      />

      <AboutModal visible={aboutVisible} onClose={() => setAboutVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 120,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: fonts.bold,
    color: colors.foreground,
    marginBottom: 16,
  },
  heroCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: fonts.bold,
    color: colors.primaryForeground,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: fonts.bold,
    color: colors.foreground,
  },
  userSubtitle: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.mutedForeground,
    marginTop: 4,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: fonts.bold,
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 8,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
    marginBottom: 16,
  },
  menuIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuInfo: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: fonts.semibold,
    color: colors.foreground,
  },
  menuSubtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  settingsCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  borderTop: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingLabel: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.foreground,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  settingValue: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: colors.mutedForeground,
  },
});
