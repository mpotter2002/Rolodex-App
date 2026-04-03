import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/utils/AuthContext';
import { ContactsProvider } from './src/utils/ContactsContext';
import { ThemeProvider, useTheme } from './src/utils/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import AuthFlow from './src/screens/AuthFlow';
import OnboardingScreen from './src/screens/OnboardingScreen';
import { isOnboarded, setOnboarded } from './src/utils/storage';

/** Needs to live inside AuthProvider so useAuth() works */
function InnerApp() {
  const { session, user, loading, recoveryMode, setRecoveryMode } = useAuth();
  const [onboarded, setOnboardedState] = useState<boolean | null>(null);

  // Check onboarding flag whenever we have a session
  useEffect(() => {
    if (session) {
      isOnboarded().then(setOnboardedState);
    } else {
      // Reset so we re-check after next sign-in
      setOnboardedState(null);
    }
  }, [session]);

  async function handleOnboardingDone() {
    await setOnboarded();
    setOnboardedState(true);
  }

  if (loading) return null;
  if (recoveryMode) {
    return <AuthFlow initialScreen="reset" onPasswordResetDone={() => setRecoveryMode(false)} />;
  }
  if (!session) return <AuthFlow />;

  // Wait until we know the onboarding status
  if (onboarded === null) return null;

  if (!onboarded) {
    return <OnboardingScreen onDone={handleOnboardingDone} />;
  }

  return (
    <ContactsProvider userId={user?.id}>
      <AppNavigator />
    </ContactsProvider>
  );
}

/** Sits inside ThemeProvider so useTheme() works */
function AppShell() {
  const { colors, isDark } = useTheme();
  const isWeb = Platform.OS === 'web';
  const { width: winW, height: winH } = useWindowDimensions();

  const content = (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <InnerApp />
      </NavigationContainer>
    </AuthProvider>
  );

  if (isWeb) {
    const frameH = Math.min(880, winH - 16);
    const frameW = Math.min(420, winW - 16);
    return (
      <View style={[styles.webOuter, { backgroundColor: colors.bg }]}>
        <View style={[styles.webFrame, { width: frameW, height: frameH, backgroundColor: colors.panel, borderColor: isDark ? colors.line : '#f0f3f8' }]}>
          {content}
        </View>
      </View>
    );
  }

  return content;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppShell />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  webOuter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  webFrame: {
    borderRadius: 34,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#192434',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.15,
    shadowRadius: 50,
    elevation: 10,
  },
});
