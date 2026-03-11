import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image, StyleSheet,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../utils/theme';
import { supabase } from '../utils/supabase';

type Screen = 'splash' | 'login' | 'signup' | 'forgot' | 'confirm';

export default function AuthFlow() {
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState<Screen>('splash');

  // form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // ─── helpers ───────────────────────────────────────────────────────────────

  function resetForm() {
    setFullName('');
    setEmail('');
    setPassword('');
    setForgotEmail('');
    setForgotSent(false);
    setLoading(false);
    setErrorMsg('');
  }

  function goTo(s: Screen) {
    resetForm();
    setScreen(s);
  }

  // ─── auth actions ──────────────────────────────────────────────────────────

  async function handleSignUp() {
    setErrorMsg('');
    if (!fullName.trim()) { setErrorMsg('Please enter your full name.'); return; }
    if (!email.trim())    { setErrorMsg('Please enter your email address.'); return; }
    if (password.length < 8) { setErrorMsg('Password must be at least 8 characters.'); return; }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim() } },
    });
    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
    } else if (data.session) {
      // Email confirmation disabled — onAuthStateChange handles navigation
    } else {
      // Email confirmation required
      setScreen('confirm');
    }
  }

  async function handleSignIn() {
    setErrorMsg('');
    if (!email.trim() || !password) { setErrorMsg('Please enter your email and password.'); return; }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
    }
    // On success, onAuthStateChange fires → session set → App renders main app
  }

  async function handleForgotPassword() {
    if (!forgotEmail.trim()) { setErrorMsg('Please enter your email address.'); return; }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim());
    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
    } else {
      setForgotSent(true);
    }
  }

  // ─── confirm email ─────────────────────────────────────────────────────────

  if (screen === 'confirm') {
    return (
      <View style={[s.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
        <View style={s.onboardingBody}>
          <Text style={s.onboardingIcon}>✉️</Text>
          <Text style={s.onboardingTitle}>Check your email</Text>
          <Text style={s.onboardingDesc}>
            We sent a confirmation link to {email || 'your email'}. Click it to activate your account, then sign in below.
          </Text>
        </View>
        <View style={[s.authActions]}>
          <TouchableOpacity style={s.btnBlack} onPress={() => goTo('login')}>
            <Text style={s.btnBlackText}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => goTo('signup')}>
            <Text style={s.skipText}>Use a different email</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── forgot password ────────────────────────────────────────────────────────

  if (screen === 'forgot') {
    return (
      <View style={[s.container, { paddingTop: insets.top }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => goTo('login')}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={s.hero}>
          <Image source={require('../../assets/rolo-logo.png')} style={s.heroLogo} />
          <Text style={s.authTitle}>Reset password.</Text>
          <Text style={s.authSubtitle}>Enter your email and we'll send you a link to reset your password.</Text>
        </View>
        {forgotSent ? (
          <View style={s.authBody}>
            <View style={s.successBox}>
              <Text style={{ fontSize: 48 }}>✉️</Text>
              <Text style={s.successTitle}>Check your email</Text>
              <Text style={s.successDesc}>We sent a password reset link to {forgotEmail}.</Text>
            </View>
            <TouchableOpacity style={s.btnBlack} onPress={() => goTo('login')}>
              <Text style={s.btnBlackText}>Back to Sign In</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.authBody}>
            <View style={s.fieldWrap}>
              <Text style={s.fieldLabel}>EMAIL</Text>
              <TextInput
                style={s.input}
                placeholder="you@email.com"
                placeholderTextColor="#b0b0b5"
                keyboardType="email-address"
                autoCapitalize="none"
                value={forgotEmail}
                onChangeText={setForgotEmail}
              />
            </View>
            {!!errorMsg && <Text style={s.errorText}>{errorMsg}</Text>}
            <TouchableOpacity style={[s.btnBlack, loading && s.btnDisabled]} onPress={handleForgotPassword} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnBlackText}>Send Reset Link</Text>}
            </TouchableOpacity>
          </View>
        )}
        <View style={s.switchRow}>
          <Text style={s.switchText}>Remember your password? </Text>
          <TouchableOpacity onPress={() => goTo('login')}><Text style={s.switchLink}>Sign in</Text></TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── sign in ────────────────────────────────────────────────────────────────

  if (screen === 'login') {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.panel }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView
        style={[s.container, { paddingTop: insets.top }]}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity style={s.backBtn} onPress={() => goTo('splash')}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={s.hero}>
          <Image source={require('../../assets/rolo-logo.png')} style={s.heroLogo} />
          <Text style={s.authTitle}>Welcome back.</Text>
          <Text style={s.authSubtitle}>Sign in to your Rolo account.</Text>
        </View>
        <View style={s.authBody}>
          <View style={s.fieldWrap}>
            <Text style={s.fieldLabel}>EMAIL</Text>
            <TextInput
              style={s.input}
              placeholder="you@email.com"
              placeholderTextColor="#b0b0b5"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>
          <View style={s.fieldWrap}>
            <Text style={s.fieldLabel}>PASSWORD</Text>
            <TextInput
              style={s.input}
              placeholder="••••••••"
              placeholderTextColor="#b0b0b5"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>
          <TouchableOpacity onPress={() => goTo('forgot')} style={{ alignSelf: 'flex-end' }}>
            <Text style={s.forgotText}>Forgot password?</Text>
          </TouchableOpacity>
          {!!errorMsg && <Text style={s.errorText}>{errorMsg}</Text>}
          <TouchableOpacity style={[s.btnBlack, loading && s.btnDisabled]} onPress={handleSignIn} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnBlackText}>Sign In</Text>}
          </TouchableOpacity>
          <View style={s.divider}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>or continue with</Text>
            <View style={s.dividerLine} />
          </View>
          <TouchableOpacity style={s.socialBtn} onPress={() => Alert.alert('Coming soon', 'Apple Sign-In will be available in the next build.')}>
            <Ionicons name="logo-apple" size={18} color="#1d1d1f" style={{ marginRight: 8 }} />
            <Text style={s.socialText}>Sign in with Apple</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.socialBtn} onPress={() => Alert.alert('Coming soon', 'Google Sign-In will be available in the next build.')}>
            <AntDesign name="google" size={16} color="#DB4437" style={{ marginRight: 8 }} />
            <Text style={s.socialText}>Sign in with Google</Text>
          </TouchableOpacity>
        </View>
        <View style={s.switchRow}>
          <Text style={s.switchText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => goTo('signup')}><Text style={s.switchLink}>Create one</Text></TouchableOpacity>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ─── sign up ────────────────────────────────────────────────────────────────

  if (screen === 'signup') {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.panel }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView
        style={[s.container, { paddingTop: insets.top }]}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity style={s.backBtn} onPress={() => goTo('splash')}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={s.hero}>
          <Image source={require('../../assets/rolo-logo.png')} style={s.heroLogo} />
          <Text style={s.authTitle}>Create your account.</Text>
          <Text style={s.authSubtitle}>Start organizing your contacts in seconds.</Text>
        </View>
        <View style={s.authBody}>
          <View style={s.fieldWrap}>
            <Text style={s.fieldLabel}>FULL NAME</Text>
            <TextInput
              style={s.input}
              placeholder="Your Name"
              placeholderTextColor="#b0b0b5"
              value={fullName}
              onChangeText={setFullName}
            />
          </View>
          <View style={s.fieldWrap}>
            <Text style={s.fieldLabel}>EMAIL</Text>
            <TextInput
              style={s.input}
              placeholder="you@email.com"
              placeholderTextColor="#b0b0b5"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>
          <View style={s.fieldWrap}>
            <Text style={s.fieldLabel}>PASSWORD</Text>
            <TextInput
              style={s.input}
              placeholder="Min. 8 characters"
              placeholderTextColor="#b0b0b5"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>
          {!!errorMsg && <Text style={s.errorText}>{errorMsg}</Text>}
          <TouchableOpacity style={[s.btnBlack, loading && s.btnDisabled]} onPress={handleSignUp} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnBlackText}>Create Account</Text>}
          </TouchableOpacity>
          <View style={s.divider}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>or sign up with</Text>
            <View style={s.dividerLine} />
          </View>
          <TouchableOpacity style={s.socialBtn} onPress={() => Alert.alert('Coming soon', 'Apple Sign-In will be available in the next build.')}>
            <Ionicons name="logo-apple" size={18} color="#1d1d1f" style={{ marginRight: 8 }} />
            <Text style={s.socialText}>Sign up with Apple</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.socialBtn} onPress={() => Alert.alert('Coming soon', 'Google Sign-In will be available in the next build.')}>
            <AntDesign name="google" size={16} color="#DB4437" style={{ marginRight: 8 }} />
            <Text style={s.socialText}>Sign up with Google</Text>
          </TouchableOpacity>
        </View>
        <View style={s.switchRow}>
          <Text style={s.switchText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => goTo('login')}><Text style={s.switchLink}>Sign in</Text></TouchableOpacity>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ─── splash ──────────────────────────────────────────────────────────────────

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.splashCenter}>
        <Image source={require('../../assets/rolo-logo.png')} style={s.splashLogo} />
        <Text style={s.splashWordmark}>Rolo</Text>
        <Text style={s.splashTagline}>Your contacts, beautifully organized.</Text>
      </View>
      <View style={[s.authActions, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={s.btnBlack} onPress={() => goTo('signup')}>
          <Text style={s.btnBlackText}>Create an Account</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btnGhost} onPress={() => goTo('login')}>
          <Text style={s.btnGhostText}>Sign In</Text>
        </TouchableOpacity>
        <Text style={s.termsText}>By continuing you agree to our Terms of Service and Privacy Policy.</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.panel },
  splashCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  splashLogo: { width: 160, height: 160, resizeMode: 'contain', marginBottom: 24 },
  splashWordmark: { fontSize: 36, fontWeight: '800', letterSpacing: -1, color: colors.ink, marginBottom: 8 },
  splashTagline: { fontSize: 14.5, color: colors.muted },
  authActions: { paddingHorizontal: 28, gap: 10 },
  btnBlack: { backgroundColor: colors.ink, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  btnBlackText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnGhost: { borderWidth: 1.5, borderColor: colors.line, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  btnGhostText: { color: colors.ink, fontSize: 15, fontWeight: '600' },
  btnDisabled: { opacity: 0.6 },
  termsText: { fontSize: 11, color: colors.muted, textAlign: 'center', opacity: 0.6, lineHeight: 16, marginTop: 6 },
  backBtn: { paddingHorizontal: 22, paddingTop: 16 },
  backText: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  heroLogo: { width: 130, height: 130, resizeMode: 'contain', marginBottom: 20 },
  authTitle: { fontSize: 27, fontWeight: '800', letterSpacing: -0.5, color: colors.ink, marginBottom: 6 },
  authSubtitle: { fontSize: 14, color: colors.muted },
  authBody: { paddingHorizontal: 24, gap: 14 },
  fieldWrap: { gap: 5 },
  fieldLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.7, color: colors.muted },
  input: { borderWidth: 1.5, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, fontWeight: '500', color: colors.ink, backgroundColor: colors.bg },
  forgotText: { color: colors.muted, fontSize: 12.5, fontWeight: '600' },
  errorText: { color: '#d93025', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.line },
  dividerText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  socialBtn: { borderWidth: 1.5, borderColor: colors.line, borderRadius: 14, paddingVertical: 13, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  socialText: { color: colors.ink, fontSize: 14.5, fontWeight: '600' },
  switchRow: { flexDirection: 'row', justifyContent: 'center', padding: 20 },
  switchText: { color: colors.muted, fontSize: 13.5 },
  switchLink: { color: colors.ink, fontSize: 13.5, fontWeight: '700', textDecorationLine: 'underline' },
  // Confirm screen
  onboardingBody: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  onboardingIcon: { fontSize: 64, marginBottom: 20 },
  onboardingTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, color: colors.ink, marginBottom: 10, textAlign: 'center' },
  onboardingDesc: { fontSize: 14.5, color: colors.muted, lineHeight: 21, textAlign: 'center', maxWidth: 280 },
  skipText: { color: colors.muted, fontSize: 13.5, fontWeight: '600', textAlign: 'center', padding: 8 },
  // Forgot
  successBox: { alignItems: 'center', gap: 10, paddingVertical: 20 },
  successTitle: { fontSize: 17, fontWeight: '800', color: colors.ink },
  successDesc: { fontSize: 13.5, color: colors.muted, textAlign: 'center', lineHeight: 20 },
});
