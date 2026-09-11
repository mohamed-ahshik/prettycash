import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AboutModal } from '../components/AboutModal';
import { CurrencyPickerModal } from '../components/CurrencyPickerModal';
import { Icon } from '../components/Icon';
import { RecurringModal } from '../components/RecurringModal';
import { INITIAL_PROFILE, INITIAL_RECURRING_ITEMS } from '../data/profileData';
import { colors, fonts, radii } from '../theme';
import { RecurringItem, UserProfile } from '../types';

export function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile>(INITIAL_PROFILE);
  const [recurringItems, setRecurringItems] = useState<RecurringItem[]>(INITIAL_RECURRING_ITEMS);

  const [recurringVisible, setRecurringVisible] = useState(false);
  const [currencyVisible, setCurrencyVisible] = useState(false);
  const [aboutVisible, setAboutVisible] = useState(false);

  const activeCount = recurringItems.filter((it) => it.active).length;

  const handleToggleRecurring = (id: string) => {
    setRecurringItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, active: !it.active } : it))
    );
  };

  const handleAddRecurring = (newItem: Omit<RecurringItem, 'id' | 'active'>) => {
    const itemWithId: RecurringItem = {
      ...newItem,
      id: `rec-${Date.now()}`,
      active: true,
    };
    setRecurringItems((prev) => [itemWithId, ...prev]);
  };

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
              onValueChange={(val) => setProfile((p) => ({ ...p, notificationsEnabled: val }))}
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
              onValueChange={(val) => setProfile((p) => ({ ...p, hapticsEnabled: val }))}
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
        onSelect={(cur) => setProfile((p) => ({ ...p, currency: cur }))}
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
