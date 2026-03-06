import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ContactsProvider } from './src/utils/ContactsContext';
import AppNavigator from './src/navigation/AppNavigator';
import AuthFlow from './src/screens/AuthFlow';
import { isOnboarded } from './src/utils/storage';

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    isOnboarded().then((done) => {
      if (done) setAuthed(true);
      setLoading(false);
    });
  }, []);

  if (loading) return null;

  return (
    <SafeAreaProvider>
      <ContactsProvider>
        <NavigationContainer>
          <StatusBar style="dark" />
          {authed ? (
            <AppNavigator />
          ) : (
            <AuthFlow onComplete={() => setAuthed(true)} />
          )}
        </NavigationContainer>
      </ContactsProvider>
    </SafeAreaProvider>
  );
}
