import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TabBar } from './src/components/TabBar';
import { SHOW_AUTH_UI } from './src/config';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { CategoriesProvider } from './src/context/CategoriesContext';
import { MonthProvider } from './src/context/MonthContext';
import { TransactionsProvider } from './src/context/TransactionsContext';
import { getProfile, upsertProfile } from './src/data/repositories/profileRepo';
import { seedDefaultCategoriesIfNeeded } from './src/data/seed';
import { setHapticsEnabled } from './src/lib/haptics';
import { CategoriesScreen } from './src/screens/CategoriesScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { InsightsScreen } from './src/screens/InsightsScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { colors, fonts, radii } from './src/theme';

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
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}

function Gate() {
  const { session, loading, authError, retrySession } = useAuth();

  if (loading) {
    return <Splash />;
  }

  if (!session) {
    if (SHOW_AUTH_UI) {
      return (
        <SafeAreaProvider>
          <LoginScreen />
        </SafeAreaProvider>
      );
    }
    return (
      <AuthError
        error={
          authError ??
          'Could not start a session. Enable Anonymous sign-ins in Supabase (Authentication → Providers), then retry.'
        }
        onRetry={retrySession}
      />
    );
  }

  return (
    <Bootstrap>
      <SafeAreaProvider>
        <CategoriesProvider>
          <TransactionsProvider>
            <MonthProvider>
              <AppNavigator />
            </MonthProvider>
          </TransactionsProvider>
        </CategoriesProvider>
      </SafeAreaProvider>
    </Bootstrap>
  );
}

function Bootstrap({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setError(null);

    (async () => {
      try {
        const existing = await getProfile();
        setHapticsEnabled(existing?.hapticsEnabled ?? true);
        if (!existing && user) {
          const meta = user.user_metadata ?? {};
          const name = (meta.full_name as string) || (meta.name as string) || user.email || 'You';
          const email = user.email ?? '';
          await upsertProfile({
            name,
            initial: name.charAt(0).toUpperCase(),
            email,
            memberSince: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            currency: 'USD ($)',
            notificationsEnabled: true,
            hapticsEnabled: true,
          });
        }
        await seedDefaultCategoriesIfNeeded();
        if (!cancelled) setReady(true);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, attempt]);

  if (error) {
    return <BootstrapError error={error} onRetry={() => setAttempt((a) => a + 1)} />;
  }

  if (!ready) {
    return <Splash />;
  }

  return <>{children}</>;
}

function BootstrapError({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <View style={styles.errorWrap}>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorMessage}>{error}</Text>
      <Pressable style={styles.retryButton} onPress={onRetry}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </Pressable>
    </View>
  );
}

function AuthError({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <View style={styles.errorWrap}>
      <Text style={styles.errorTitle}>Sign-in unavailable</Text>
      <Text style={styles.errorMessage}>{error}</Text>
      <Pressable style={styles.retryButton} onPress={onRetry}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </Pressable>
    </View>
  );
}

function Splash() {
  return (
    <View style={styles.splash}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

function AppNavigator() {
  const content = (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Tab.Navigator
        tabBar={(props) => <TabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Insights" component={InsightsScreen} />
        <Tab.Screen name="Categories" component={CategoriesScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webOuter}>
        <View style={styles.phoneFrame}>{content}</View>
      </View>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  errorWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
    backgroundColor: colors.background,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: fonts.bold,
    color: colors.foreground,
  },
  errorMessage: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: radii.pill,
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: fonts.bold,
    color: colors.primaryForeground,
  },
  webOuter: {
    flex: 1,
    backgroundColor: '#EEF2F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneFrame: {
    flex: 1,
    width: '100%',
    maxWidth: 430,
    backgroundColor: colors.background,
    boxShadow: [{ offsetX: 0, offsetY: 4, blurRadius: 24, color: 'rgba(0,0,0,0.1)' }],
  },
});
