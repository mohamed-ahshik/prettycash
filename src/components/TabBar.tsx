import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { fonts, radii, shadows } from '../theme';
import type { ThemeColors } from '../theme';
import { motion } from '../theme/motion';
import { hapticSelection } from '../lib/haptics';
import { AddTransactionSheet } from './AddTransactionSheet';
import { Icon } from './Icon';

type TabName = 'Home' | 'Insights' | 'Categories' | 'Profile';

const TAB_ICONS: Record<TabName, { active: string; inactive: string }> = {
  Home: { active: 'home', inactive: 'home-outline' },
  Insights: { active: 'chart-pie', inactive: 'chart-donut' },
  Categories: { active: 'shape', inactive: 'shape-outline' },
  Profile: { active: 'account', inactive: 'account-outline' },
};

interface TabItemProps {
  label: string;
  icon: string;
  color: string;
  isFocused: boolean;
  onPress: () => void;
}

function TabItem({ label, icon, color, isFocused, onPress }: TabItemProps) {
  const styles = useThemedStyles(makeStyles);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.92, motion.spring.press);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, motion.spring.press);
      }}
    >
      <Animated.View style={[styles.item, animatedStyle]}>
        <Icon name={icon} size={22} color={color} />
        <Text style={[styles.label, { color, fontFamily: isFocused ? fonts.bold : fonts.medium }]}>
          {label}
        </Text>
        {isFocused ? <View style={styles.dot} /> : null}
      </Animated.View>
    </Pressable>
  );
}

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const activeRoute = state.routes[state.index];
  const [sheetVisible, setSheetVisible] = useState(false);

  const renderTab = (name: TabName) => {
    const route = state.routes.find((r) => r.name === name);
    if (!route) return null;
    const { options } = descriptors[route.key];
    const isFocused = activeRoute.key === route.key;
    const label = options.title ?? name;
    const icons = TAB_ICONS[name];
    const color = isFocused ? colors.primary : colors.mutedForeground;

    return (
      <TabItem
        key={route.key}
        label={label}
        icon={isFocused ? icons.active : icons.inactive}
        color={color}
        isFocused={isFocused}
        onPress={() => {
          hapticSelection();
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(name);
          }
        }}
      />
    );
  };

  return (
    <View style={[styles.wrapper, { bottom: insets.bottom + 20 }]}>
      {renderTab('Home')}
      {renderTab('Insights')}
      <View style={styles.addWrap}>
        <Pressable
          style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
          onPress={() => setSheetVisible(true)}
        >
          <Icon name="plus" size={28} color={colors.primaryForeground} />
        </Pressable>
      </View>
      {renderTab('Categories')}
      {renderTab('Profile')}
      <AddTransactionSheet visible={sheetVisible} onClose={() => setSheetVisible(false)} />
    </View>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
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
    ...shadows.e2,
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
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
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
  pressed: {
    opacity: 0.85,
  },
});
