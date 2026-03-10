import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/utils/AuthContext';
import { ContactsProvider } from './src/utils/ContactsContext';
import AppNavigator from './src/navigation/AppNavigator';
import AuthFlow from './src/screens/AuthFlow';
import { isOnboarded } from './src/utils/storage';

/** Needs to live inside AuthProvider so useAuth() works */
function InnerApp() {
  const { session, user, loading: authLoading } = useAuth();
  const [onboarded, setOnboarded] = useState(false);
  const [onboardLoading, setOnboardLoading] = useState(true);

  useEffect(() => {
    isOnboarded().then((done) => {
      setOnboarded(done);
      setOnboardLoading(false);
    });
  }, []);

  // Wait for both Supabase session check and AsyncStorage onboard flag
  if (authLoading || onboardLoading) return null;

  // Not signed in — show full splash → login/signup → onboarding flow
  if (!session) {
    return <AuthFlow onComplete={() => setOnboarded(true)} />;
  }

  // Signed in but hasn't seen onboarding (e.g. signed in on a new device)
  if (!onboarded) {
    return <AuthFlow startAtOnboarding onComplete={() => setOnboarded(true)} />;
  }

  // Signed in + onboarded — show the main app, scoped to this user's contacts
  return (
    <ContactsProvider userId={user?.id}>
      <AppNavigator />
    </ContactsProvider>
  );
}

export default function App() {
  const isWeb = Platform.OS === 'web';
  const { width: winW, height: winH } = useWindowDimensions();

  const content = (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar style="dark" />
          <InnerApp />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );

  if (isWeb) {
    // Fit snugly in the visible viewport — cap at phone proportions but never overflow
    const frameH = Math.min(880, winH - 16);
    const frameW = Math.min(420, winW - 16);

    return (
      <View style={styles.webOuter}>
        <View style={[styles.webFrame, { width: frameW, height: frameH }]}>
          {content}
        </View>
      </View>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  webOuter: {
    flex: 1,
    backgroundColor: '#f5f5f7',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  webFrame: {
    backgroundColor: '#ffffff',
    borderRadius: 34,
    borderWidth: 1,
    borderColor: '#f0f3f8',
    overflow: 'hidden',
    shadowColor: '#192434',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.15,
    shadowRadius: 50,
    elevation: 10,
  },
});
