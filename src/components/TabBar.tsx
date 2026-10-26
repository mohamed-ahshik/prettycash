import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { useReceiptPicker } from '../hooks/useReceiptPicker';
import { fonts, radii, shadows } from '../theme';
import type { ThemeColors } from '../theme';
import { motion } from '../theme/motion';
import { hapticSelection } from '../lib/haptics';
import type { PickedReceiptImage } from '../services/receiptPicker';
import { AddTransactionSheet } from './AddTransactionSheet';
import { Icon } from './Icon';
import { PickerErrorSheet } from './PickerErrorSheet';
import { SplitAddButton } from './SplitAddButton';

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
  compact?: boolean;
  onPress: () => void;
}

function TabItem({ label, icon, color, isFocused, compact = false, onPress }: TabItemProps) {
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
      <Animated.View style={[styles.item, compact && styles.itemCompact, animatedStyle]}>
        <Icon name={icon} size={22} color={color} />
        <Text
          style={[styles.label, compact && styles.labelCompact, { color, fontFamily: isFocused ? fonts.bold : fonts.medium }]}
          numberOfLines={1}
        >
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
  const { width } = useWindowDimensions();
  const compact = width < 340;
  const activeRoute = state.routes[state.index];
  const split = useReceiptPicker();
  const [sheetVisible, setSheetVisible] = useState(false);
  const [initialImage, setInitialImage] = useState<PickedReceiptImage | null>(null);
  const [startManual, setStartManual] = useState(false);
  const [sheetKey, setSheetKey] = useState(0);

  const scan = async () => {
    split.clearError();
    const image = await split.pickFromCamera();
    if (!image) return;
    setInitialImage(image);
    setStartManual(false);
    setSheetVisible(true);
  };

  const gallery = async () => {
    split.clearError();
    const image = await split.pickFromGallery();
    if (!image) return;
    setInitialImage(image);
    setStartManual(false);
    setSheetVisible(true);
  };

  const manual = () => {
    split.clearError();
    setInitialImage(null);
    setStartManual(true);
    setSheetVisible(true);
  };

  const closeSheet = () => {
    setSheetVisible(false);
    setInitialImage(null);
    setStartManual(false);
  };

  const retake = () => {
    closeSheet();
    setSheetKey((key) => key + 1);
    void scan();
  };

  const chooseAnother = () => {
    closeSheet();
    setSheetKey((key) => key + 1);
    void gallery();
  };

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
        compact={compact}
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
    <View style={[styles.wrapper, compact && styles.wrapperCompact, { bottom: insets.bottom + 20 }]}>
      {renderTab('Home')}
      {renderTab('Insights')}
      <SplitAddButton
        onScan={() => {
          void scan();
        }}
        onGallery={() => {
          void gallery();
        }}
        onManual={manual}
      />
      {renderTab('Categories')}
      {renderTab('Profile')}
      <AddTransactionSheet
        key={sheetKey}
        visible={sheetVisible}
        initialImage={initialImage}
        startManual={startManual}
        onClose={closeSheet}
        onRetake={retake}
        onChoosePhoto={chooseAnother}
      />
      <PickerErrorSheet
        error={split.error}
        onGallery={() => {
          void gallery();
        }}
        onClose={split.clearError}
      />
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
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  itemCompact: {
    width: 44,
  },
  label: {
    fontSize: 9,
    fontWeight: '500',
  },
  labelCompact: {
    fontSize: 8.5,
  },
  wrapperCompact: {
    left: 12,
    right: 12,
    paddingHorizontal: 4,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
});
