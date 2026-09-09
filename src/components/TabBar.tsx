import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radii } from '../theme';
import { Icon } from './Icon';

type TabName = 'Home' | 'Insights' | 'Wallets' | 'Profile';

const TAB_ICONS: Record<TabName, { active: string; inactive: string }> = {
  Home: { active: 'home', inactive: 'home-outline' },
  Insights: { active: 'chart-pie', inactive: 'chart-pie' },
  Wallets: { active: 'wallet', inactive: 'wallet-outline' },
  Profile: { active: 'account', inactive: 'account-outline' },
};

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const activeRoute = state.routes[state.index];

  const renderTab = (name: TabName) => {
    const route = state.routes.find((r) => r.name === name);
    if (!route) return null;
    const { options } = descriptors[route.key];
    const isFocused = activeRoute.key === route.key;
    const label = options.title ?? name;
    const icons = TAB_ICONS[name];
    const color = isFocused ? colors.primary : colors.mutedForeground;

    return (
      <Pressable
        key={route.key}
        style={styles.item}
        onPress={() => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(name);
          }
        }}
      >
        <Icon name={isFocused ? icons.active : icons.inactive} size={22} color={color} />
        <Text
          style={[
            styles.label,
            { color, fontFamily: isFocused ? fonts.bold : fonts.medium },
          ]}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.wrapper, { bottom: insets.bottom + 20 }]}>
      {renderTab('Home')}
      {renderTab('Insights')}
      <View style={styles.addWrap}>
        <Pressable style={styles.addButton} onPress={() => {}}>
          <Icon name="plus" size={28} color={colors.primaryForeground} />
        </Pressable>
      </View>
      {renderTab('Wallets')}
      {renderTab('Profile')}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  item: {
    width: 56,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
  },
  addWrap: {
    width: 56,
    alignItems: 'center',
  },
  addButton: {
    height: 56,
    width: 56,
    marginTop: -32,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondaryForeground,
    borderWidth: 4,
    borderColor: colors.background,
  },
});
