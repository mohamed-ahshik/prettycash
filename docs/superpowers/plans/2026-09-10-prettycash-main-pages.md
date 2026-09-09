# PrettyCash Main Pages Implementation Plan

Implementation status: Not started

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the main screens of the PrettyCash budget app (Home pixel-perfect, Insights/Wallets/Profile placeholders) with mock data, before any real functionality.

**Architecture:** React Native + Expo (TypeScript) app with React Navigation bottom tabs and a custom floating pill tab bar. Styling uses central theme tokens (`src/theme`) with `StyleSheet`; all data is hardcoded in `src/data/mockData.ts`.

**Tech Stack:** Expo (blank-typescript template), React Navigation (native + bottom-tabs), `@expo/vector-icons` (MaterialCommunityIcons), `react-native-svg` (balance card dot pattern), `@expo-google-fonts/dm-sans`, `expo-font`.

## Global Constraints

- Language: TypeScript (strict).
- Data: hardcoded mock only — no state, persistence, or real logic this pass.
- Verification for every task: `npx tsc --noEmit` (unit tests are explicitly deferred per spec).
- Palette (verbatim): background `#FAFAFA`, foreground `#1E2422`, card `#FFFFFF`, primary `#00674F`, primary-foreground `#FFFFFF`, secondary `#DFF0EB`, secondary-foreground `#004D3B`, muted `#F0F5F3`, muted-foreground `#6C757D`, accent `#FFEEE3`, accent-foreground `#7A4A2E`, border `#E6EDEB`, ring `#00674F`.
- Income green `#2E7D32`, expense red `#D9534F`.
- Category pairs (bg / icon fg): Food `#DFF0EB`/`#00674F`, Travel `#E8EFFD`/`#3B5BDB`, Fun `#FFEEE3`/`#E67E22`, Coffee `#FFF4D6`/`#9C7A00`, Income `#E8F5E9`/`#2E7D32`.
- Font: DM Sans, weights 400/500/600/700 via `@expo-google-fonts/dm-sans`.
- Icons: MaterialCommunityIcons (approx Solar mapping).
- Screens: Home, Insights, Wallets, Profile are tab routes; the Add button is present in the tab bar but inert.

---

## Task 1: Scaffold Expo project + install dependencies

**Files:**
- Create: Expo template files in repo root (`App.tsx`, `app.json`, `package.json`, `tsconfig.json`, `babel.config.js`, `index.ts`, `assets/`, `.gitignore`)
- Modify: `app.json` (name/slug)

**Interfaces:**
- Produces: a runnable Expo TypeScript project. Later tasks add files under `src/`.

- [x] **Step 1: Scaffold into a temp dir and copy into the repo**

The repo root is non-empty (`README.md`, `design/`, `docs/`), so `create-expo-app` refuses to scaffold in place. Scaffold to a temp dir, then copy over (excluding `.git` and `node_modules`).

```bash
SCAFFOLD=$(mktemp -d)
npx create-expo-app@latest "$SCAFFOLD" --template blank-typescript --yes
rsync -a --exclude '.git' --exclude 'node_modules' "$SCAFFOLD"/ ./
rm -rf "$SCAFFOLD"
```

- [x] **Step 2: Install navigation, font, and SVG dependencies**

```bash
npx expo install react-native-screens react-native-safe-area-context react-native-svg @expo/vector-icons expo-font
npm install @react-navigation/native @react-navigation/bottom-tabs @expo-google-fonts/dm-sans
```

- [ ] **Step 3: Set app name/slug**

In `app.json`, set `expo.name` to `"PrettyCash"` and `expo.slug` to `"prettycash"`.

- [ ] **Step 4: Verify the template type-checks**

Run: `npx tsc --noEmit`
Expected: no errors (template only).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: scaffold Expo TypeScript project with navigation deps"
```

---

## Task 2: Theme tokens + domain types

**Files:**
- Create: `src/theme/colors.ts`
- Create: `src/theme/typography.ts`
- Create: `src/theme/spacing.ts`
- Create: `src/theme/categories.ts`
- Create: `src/theme/index.ts`
- Create: `src/types/index.ts`

**Interfaces:**
- Produces: `colors`, `fonts`, `spacing`, `radii`, `CATEGORY_STYLES`, and types `Category`, `TransactionType`, `Transaction`, `TransactionGroup`. Later tasks import these.

- [ ] **Step 1: Create `src/theme/colors.ts`**

```ts
export const colors = {
  background: '#FAFAFA',
  foreground: '#1E2422',
  card: '#FFFFFF',
  primary: '#00674F',
  primaryForeground: '#FFFFFF',
  secondary: '#DFF0EB',
  secondaryForeground: '#004D3B',
  muted: '#F0F5F3',
  mutedForeground: '#6C757D',
  accent: '#FFEEE3',
  accentForeground: '#7A4A2E',
  border: '#E6EDEB',
  ring: '#00674F',
  incomeText: '#2E7D32',
  expenseText: '#D9534F',
} as const;
```

- [ ] **Step 2: Create `src/theme/typography.ts`**

```ts
export const fonts = {
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semibold: 'DMSans_600SemiBold',
  bold: 'DMSans_700Bold',
} as const;
```

- [ ] **Step 3: Create `src/theme/spacing.ts`**

```ts
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const radii = {
  sm: 12,
  md: 16,
  lg: 20,
  pill: 999,
} as const;
```

- [ ] **Step 4: Create `src/types/index.ts`**

```ts
export type Category = 'Food' | 'Travel' | 'Fun' | 'Coffee' | 'Income' | 'Other';

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  name: string;
  time: string;
  category: Category;
  type: TransactionType;
  amount: number;
  icon: string;
}

export interface TransactionGroup {
  label: string;
  total: number;
  transactions: Transaction[];
}
```

- [ ] **Step 5: Create `src/theme/categories.ts`**

```ts
import { Category } from '../types';
import { colors } from './colors';

export const CATEGORY_STYLES: Record<Category, { bg: string; fg: string }> = {
  Food: { bg: '#DFF0EB', fg: '#00674F' },
  Travel: { bg: '#E8EFFD', fg: '#3B5BDB' },
  Fun: { bg: '#FFEEE3', fg: '#E67E22' },
  Coffee: { bg: '#FFF4D6', fg: '#9C7A00' },
  Income: { bg: '#E8F5E9', fg: '#2E7D32' },
  Other: { bg: colors.muted, fg: colors.mutedForeground },
};
```

- [ ] **Step 6: Create `src/theme/index.ts`**

```ts
export { colors } from './colors';
export { fonts } from './typography';
export { spacing, radii } from './spacing';
export { CATEGORY_STYLES } from './categories';
```

- [ ] **Step 7: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add theme tokens and domain types"
```

---

## Task 3: Formatting utils + mock data

**Files:**
- Create: `src/utils/format.ts`
- Create: `src/data/mockData.ts`

**Interfaces:**
- Consumes: `TransactionGroup` from `src/types`.
- Produces: `formatMoney`, `formatSignedAmount`, `formatSignedMoney`, and mock data `mockUser`, `mockMonth`, `mockBalance`, `mockTransactions`.

- [ ] **Step 1: Create `src/utils/format.ts`**

```ts
export function formatMoney(value: number): string {
  return Number.isInteger(value)
    ? value.toLocaleString('en-US')
    : value.toFixed(2);
}

export function formatSignedAmount(type: 'income' | 'expense', amount: number): string {
  const sign = type === 'income' ? '+' : '-';
  return `${sign}$${formatMoney(amount)}`;
}

export function formatSignedMoney(value: number): string {
  const sign = value >= 0 ? '+' : '-';
  return `${sign}$${formatMoney(Math.abs(value))}`;
}
```

- [ ] **Step 2: Create `src/data/mockData.ts`**

```ts
import { TransactionGroup } from '../types';

export const mockUser = {
  name: 'Maya',
  initial: 'M',
  date: 'Tue, Sep 9',
};

export const mockMonth = 'September 2026';

export const mockBalance = {
  total: 4280.5,
  income: 5200,
  expense: 2140,
};

export const mockTransactions: TransactionGroup[] = [
  {
    label: 'Today • Sep 9',
    total: -86.4,
    transactions: [
      { id: '1', name: 'Whole Foods Market', time: '9:42 AM', category: 'Food', type: 'expense', amount: 86.4, icon: 'cart-outline' },
      { id: '2', name: 'Uber', time: '8:15 AM', category: 'Travel', type: 'expense', amount: 24.8, icon: 'car-outline' },
    ],
  },
  {
    label: 'Yesterday • Sep 8',
    total: -22.19,
    transactions: [
      { id: '3', name: 'Netflix', time: '7:30 PM', category: 'Fun', type: 'expense', amount: 15.99, icon: 'play' },
      { id: '4', name: 'Coffee Run', time: '8:05 AM', category: 'Coffee', type: 'expense', amount: 6.2, icon: 'coffee-outline' },
    ],
  },
  {
    label: 'Sep 1',
    total: 5200,
    transactions: [
      { id: '5', name: 'Salary September', time: '9:00 AM', category: 'Income', type: 'income', amount: 5200, icon: 'briefcase-outline' },
    ],
  },
];
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add formatting utils and mock data"
```

---

## Task 4: Icon, MonthPicker, and BalanceCard components

**Files:**
- Create: `src/components/Icon.tsx`
- Create: `src/components/MonthPicker.tsx`
- Create: `src/components/BalanceCard.tsx`

**Interfaces:**
- Consumes: `colors`, `fonts`, `radii` from `src/theme`; `formatMoney` from `src/utils/format`.
- Produces: `<Icon name size color />`, `<MonthPicker month />`, `<BalanceCard total income expense />`.

- [ ] **Step 1: Create `src/components/Icon.tsx`**

```tsx
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';

type MCIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface IconProps {
  name: string;
  size?: number;
  color?: string;
}

export function Icon({ name, size = 24, color }: IconProps) {
  return <MaterialCommunityIcons name={name as MCIconName} size={size} color={color} />;
}
```

- [ ] **Step 2: Create `src/components/MonthPicker.tsx`**

```tsx
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, fonts, radii } from '../theme';
import { Icon } from './Icon';

interface MonthPickerProps {
  month: string;
}

export function MonthPicker({ month }: MonthPickerProps) {
  return (
    <Pressable style={styles.pill}>
      <Icon name="calendar" size={18} color={colors.primary} />
      <Text style={styles.label}>{month}</Text>
      <Icon name="chevron-down" size={18} color={colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'center',
    marginTop: 16,
    borderRadius: radii.pill,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 44,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: fonts.bold,
    color: colors.foreground,
  },
});
```

- [ ] **Step 3: Create `src/components/BalanceCard.tsx`**

```tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Mask, Pattern, Rect, Stop } from 'react-native-svg';
import { colors, fonts, radii } from '../theme';
import { formatMoney } from '../utils/format';
import { Icon } from './Icon';

interface BalanceCardProps {
  total: number;
  income: number;
  expense: number;
}

export function BalanceCard({ total, income, expense }: BalanceCardProps) {
  return (
    <View style={styles.stack}>
      <View style={[styles.backdrop, styles.backdropOuter]} />
      <View style={[styles.backdrop, styles.backdropInner]} />
      <View style={styles.card}>
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
            <Defs>
              <Pattern id="dots" width={18} height={18} patternUnits="userSpaceOnUse">
                <Circle cx={1.1} cy={1.1} r={1.1} fill={colors.secondary} />
              </Pattern>
              <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#000" stopOpacity={1} />
                <Stop offset="0.7" stopColor="#000" stopOpacity={0} />
              </LinearGradient>
              <Mask id="mask">
                <Rect width="100%" height="100%" fill="url(#fade)" />
              </Mask>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#dots)" mask="url(#mask)" opacity={0.9} />
          </Svg>
        </View>

        <View style={styles.topRow}>
          <View style={styles.balanceLabelRow}>
            <Text style={styles.balanceLabel}>Total balance</Text>
            <Icon name="eye-outline" size={16} color={colors.mutedForeground} />
          </View>
          <Text style={styles.balanceValue}>${formatMoney(total)}</Text>
        </View>

        <View style={styles.split}>
          <View style={styles.splitItem}>
            <View style={styles.splitIcon}>
              <Icon name="arrow-down-left" size={18} color={colors.incomeText} />
            </View>
            <View>
              <Text style={styles.splitLabel}>Income</Text>
              <Text style={styles.splitValue}>+${formatMoney(income)}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.splitItem}>
            <View style={styles.splitIcon}>
              <Icon name="arrow-up-right" size={18} color={colors.expenseText} />
            </View>
            <View>
              <Text style={styles.splitLabel}>Expense</Text>
              <Text style={styles.splitValue}>${formatMoney(expense)}</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    marginTop: 24,
  },
  backdrop: {
    position: 'absolute',
    height: 96,
    borderRadius: radii.lg,
  },
  backdropOuter: {
    top: -8,
    left: 12,
    right: 12,
    backgroundColor: '#DFF0EB',
  },
  backdropInner: {
    top: -4,
    left: 24,
    right: 24,
    backgroundColor: '#C9E7DE',
  },
  card: {
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    overflow: 'hidden',
  },
  topRow: {
    marginBottom: 16,
  },
  balanceLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: fonts.medium,
    color: colors.mutedForeground,
  },
  balanceValue: {
    marginTop: 4,
    fontSize: 32,
    fontWeight: '700',
    fontFamily: fonts.bold,
    letterSpacing: -0.5,
    color: colors.foreground,
  },
  split: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radii.md,
    padding: 12,
    backgroundColor: colors.muted,
  },
  splitItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  splitIcon: {
    height: 36,
    width: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  splitLabel: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily: fonts.medium,
    color: colors.mutedForeground,
  },
  splitValue: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: fonts.bold,
    color: colors.foreground,
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
});
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Icon, MonthPicker, and BalanceCard components"
```

---

## Task 5: Transaction row and group components

**Files:**
- Create: `src/components/TransactionRow.tsx`
- Create: `src/components/TransactionGroup.tsx`

**Interfaces:**
- Consumes: `Transaction`, `TransactionGroup` from `src/types`; `CATEGORY_STYLES`, `colors`, `fonts` from `src/theme`; `formatSignedAmount`, `formatSignedMoney` from `src/utils/format`; `Icon` from `./Icon`.
- Produces: `<TransactionRow transaction />`, `<TransactionGroup group />`.

- [ ] **Step 1: Create `src/components/TransactionRow.tsx`**

```tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Transaction } from '../types';
import { CATEGORY_STYLES, colors, fonts } from '../theme';
import { formatSignedAmount } from '../utils/format';
import { Icon } from './Icon';

interface TransactionRowProps {
  transaction: Transaction;
}

export function TransactionRow({ transaction }: TransactionRowProps) {
  const category = CATEGORY_STYLES[transaction.category];
  const isIncome = transaction.type === 'income';
  const amountColor = isIncome ? colors.incomeText : colors.foreground;

  return (
    <View style={styles.row}>
      <View style={[styles.iconCircle, { backgroundColor: category.bg }]}>
        <Icon name={transaction.icon} size={20} color={category.fg} />
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{transaction.name}</Text>
        <Text style={styles.meta}>{transaction.time} • {transaction.category}</Text>
      </View>
      <Text style={[styles.amount, { color: amountColor }]}>
        {formatSignedAmount(transaction.type, transaction.amount)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  iconCircle: {
    height: 40,
    width: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: fonts.semibold,
    color: colors.foreground,
  },
  meta: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  amount: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
});
```

- [ ] **Step 2: Create `src/components/TransactionGroup.tsx`**

```tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TransactionGroup as TransactionGroupType } from '../types';
import { colors, fonts } from '../theme';
import { formatSignedMoney } from '../utils/format';
import { TransactionRow } from './TransactionRow';

interface TransactionGroupProps {
  group: TransactionGroupType;
}

export function TransactionGroup({ group }: TransactionGroupProps) {
  const totalColor = group.total >= 0 ? colors.incomeText : colors.foreground;

  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.label}>{group.label}</Text>
        <Text style={[styles.total, { color: totalColor }]}>{formatSignedMoney(group.total)}</Text>
      </View>
      {group.transactions.map((transaction) => (
        <TransactionRow key={transaction.id} transaction={transaction} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: fonts.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.foreground,
  },
  total: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
});
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add TransactionRow and TransactionGroup components"
```

---

## Task 6: Custom floating tab bar

**Files:**
- Create: `src/components/TabBar.tsx`

**Interfaces:**
- Consumes: `BottomTabBarProps` from `@react-navigation/bottom-tabs`; `useSafeAreaInsets` from `react-native-safe-area-context`; `colors`, `fonts`, `radii` from `src/theme`; `Icon` from `./Icon`.
- Produces: `TabBar` — passed as `tabBar` in the navigator's `screenOptions` (Task 8). Expects routes named `Home`, `Insights`, `Wallets`, `Profile`.

- [ ] **Step 1: Create `src/components/TabBar.tsx`**

```tsx
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
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add custom floating tab bar"
```

---

## Task 7: Screens

**Files:**
- Create: `src/screens/HomeScreen.tsx`
- Create: `src/screens/InsightsScreen.tsx`
- Create: `src/screens/WalletsScreen.tsx`
- Create: `src/screens/ProfileScreen.tsx`

**Interfaces:**
- Consumes: `BalanceCard`, `MonthPicker`, `TransactionGroup` components; `mockUser`, `mockMonth`, `mockBalance`, `mockTransactions` from `src/data/mockData`; `colors`, `fonts` from `src/theme`.
- Produces: `HomeScreen`, `InsightsScreen`, `WalletsScreen`, `ProfileScreen` — used as tab screen components in Task 8.

- [ ] **Step 1: Create `src/screens/HomeScreen.tsx`**

```tsx
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BalanceCard } from '../components/BalanceCard';
import { MonthPicker } from '../components/MonthPicker';
import { TransactionGroup } from '../components/TransactionGroup';
import { mockBalance, mockMonth, mockTransactions, mockUser } from '../data/mockData';
import { colors, fonts } from '../theme';

export function HomeScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{mockUser.initial}</Text>
            </View>
            <View>
              <Text style={styles.greeting}>Hi {mockUser.name}!</Text>
              <Text style={styles.date}>{mockUser.date}</Text>
            </View>
          </View>
        </View>

        <MonthPicker month={mockMonth} />

        <BalanceCard
          total={mockBalance.total}
          income={mockBalance.income}
          expense={mockBalance.expense}
        />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Daily transactions</Text>
          <Text style={styles.seeAll}>See all</Text>
        </View>

        <View style={styles.listCard}>
          {mockTransactions.map((group) => (
            <TransactionGroup key={group.label} group={group} />
          ))}
        </View>
      </ScrollView>
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
    paddingTop: 24,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    height: 48,
    width: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: fonts.bold,
    color: colors.primaryForeground,
  },
  greeting: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: fonts.semibold,
    lineHeight: 22,
    color: colors.foreground,
  },
  date: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: fonts.medium,
    color: colors.mutedForeground,
  },
  sectionHeader: {
    marginTop: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: fonts.bold,
    color: colors.foreground,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: fonts.bold,
    color: colors.primary,
  },
  listCard: {
    marginTop: 12,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
});
```

- [ ] **Step 2: Create `src/screens/InsightsScreen.tsx`**

```tsx
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';

export function InsightsScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Insights</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Spending by category</Text>
          <Text style={styles.cardBody}>Charts coming soon.</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Monthly trend</Text>
          <Text style={styles.cardBody}>Charts coming soon.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 120, gap: 16 },
  title: { fontSize: 24, fontWeight: '700', fontFamily: fonts.bold, color: colors.foreground },
  card: {
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', fontFamily: fonts.bold, color: colors.foreground },
  cardBody: { marginTop: 8, fontSize: 14, color: colors.mutedForeground },
});
```

- [ ] **Step 3: Create `src/screens/WalletsScreen.tsx`**

```tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';

export function WalletsScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.content}>
        <Text style={styles.title}>Wallets</Text>
        <Text style={styles.body}>No wallets yet.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingTop: 24 },
  title: { fontSize: 24, fontWeight: '700', fontFamily: fonts.bold, color: colors.foreground },
  body: { marginTop: 12, fontSize: 14, color: colors.mutedForeground },
});
```

- [ ] **Step 4: Create `src/screens/ProfileScreen.tsx`**

```tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';

export function ProfileScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.content}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.body}>Profile settings coming soon.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingTop: 24 },
  title: { fontSize: 24, fontWeight: '700', fontFamily: fonts.bold, color: colors.foreground },
  body: { marginTop: 12, fontSize: 14, color: colors.mutedForeground },
});
```

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Home, Insights, Wallets, and Profile screens"
```

---

## Task 8: Wire navigation in App.tsx + final verification

**Files:**
- Modify: `App.tsx`

**Interfaces:**
- Consumes: `TabBar` and all four screens.
- Produces: the app entry — NavigationContainer + bottom tab navigator with custom `TabBar`.

- [ ] **Step 1: Replace `App.tsx`**

```tsx
import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TabBar } from './src/components/TabBar';
import { HomeScreen } from './src/screens/HomeScreen';
import { InsightsScreen } from './src/screens/InsightsScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { WalletsScreen } from './src/screens/WalletsScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBar: (props) => <TabBar {...props} />,
          }}
        >
          <Tab.Screen name="Home" component={HomeScreen} />
          <Tab.Screen name="Insights" component={InsightsScreen} />
          <Tab.Screen name="Wallets" component={WalletsScreen} />
          <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
```

- [ ] **Step 2: Verify type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Smoke-test the Android bundle**

Run: `npx expo export --platform android`
Expected: bundles successfully without errors. (For interactive testing run `npx expo start` and press `a` to launch Android.)

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: wire navigation and custom tab bar in App.tsx"
```

- [ ] **Step 5: Update spec implementation status**

In `docs/superpowers/specs/2026-09-10-prettycash-main-pages-design.md`, set `Implementation status:` to `Implemented — main pages complete`.

```bash
git add docs/superpowers/specs/2026-09-10-prettycash-main-pages-design.md
git commit -m "docs: mark main pages spec as implemented"
```
