import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ContactsProvider } from './src/utils/ContactsContext';
import AppNavigator from './src/navigation/AppNavigator';
import AuthFlow from './src/screens/AuthFlow';
import { isOnboarded } from './src/utils/storage';

function AppContent() {
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    isOnboarded().then((done) => {
      if (done) setAuthed(true);
      setLoading(false);
    });
  }, []);

  if (loading) return null;

  return authed ? <AppNavigator /> : <AuthFlow onComplete={() => setAuthed(true)} />;
}

export default function App() {
  const isWeb = Platform.OS === 'web';

  const content = (
    <SafeAreaProvider>
      <ContactsProvider>
        <NavigationContainer>
          <StatusBar style="dark" />
          <AppContent />
        </NavigationContainer>
      </ContactsProvider>
    </SafeAreaProvider>
  );

  if (isWeb) {
    return (
      <View style={styles.webOuter}>
        <View style={styles.webFrame}>
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
    width: 420,
    height: 880,
    maxHeight: '100%',
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
