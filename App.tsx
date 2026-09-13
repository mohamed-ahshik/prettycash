import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TabBar } from './src/components/TabBar';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { CategoriesProvider } from './src/context/CategoriesContext';
import { TransactionsProvider } from './src/context/TransactionsContext';
import { getProfile, upsertProfile } from './src/data/repositories/profileRepo';
import { seedDefaultCategoriesIfNeeded } from './src/data/seed';
import { CategoriesScreen } from './src/screens/CategoriesScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { InsightsScreen } from './src/screens/InsightsScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { colors } from './src/theme';

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
  const { session, loading } = useAuth();

  if (loading) {
    return <Splash />;
  }

  if (!session) {
    return (
      <SafeAreaProvider>
        <LoginScreen />
      </SafeAreaProvider>
    );
  }

  return (
    <Bootstrap>
      <SafeAreaProvider>
        <CategoriesProvider>
          <TransactionsProvider>
            <AppNavigator />
          </TransactionsProvider>
        </CategoriesProvider>
      </SafeAreaProvider>
    </Bootstrap>
  );
}

function Bootstrap({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const existing = await getProfile();
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
      } catch {
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!ready) {
    return <Splash />;
  }

  return <>{children}</>;
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
