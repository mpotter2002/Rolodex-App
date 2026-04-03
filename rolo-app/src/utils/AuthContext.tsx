import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { supabase } from './supabase';
import { clearUserData } from './storage';

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  recoveryMode: boolean;
  setRecoveryMode: (value: boolean) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  session: null,
  user: null,
  loading: true,
  recoveryMode: false,
  setRecoveryMode: () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [recoveryMode, setRecoveryMode] = useState(false);

  useEffect(() => {
    const createSessionFromUrl = async (url: string | null) => {
      if (!url) return;

      const hashParams = new URLSearchParams(url.split('#')[1] ?? '');
      const queryParams = new URLSearchParams(url.split('?')[1] ?? '');
      const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
      const type = hashParams.get('type') || queryParams.get('type');

      if (type === 'recovery') {
        setRecoveryMode(true);
      }

      if (!accessToken || !refreshToken) return;

      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        console.warn('[Auth] setSession from URL failed:', error.message);
      }
    };

    // Restore persisted session from AsyncStorage
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setLoading(false);
    });

    Linking.getInitialURL().then(createSessionFromUrl);
    const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
      createSessionFromUrl(url);
    });

    // Stay in sync with auth state changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryMode(true);
      } else if (event === 'SIGNED_OUT') {
        setRecoveryMode(false);
      }
      setSession(session ?? null);
    });

    return () => {
      linkingSubscription.remove();
      subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await clearUserData(); // clear local contacts/account before session drops
    await supabase.auth.signOut();
    // session will be cleared by onAuthStateChange above
  }

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, recoveryMode, setRecoveryMode, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
