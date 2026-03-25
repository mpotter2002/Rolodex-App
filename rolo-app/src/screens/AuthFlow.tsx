import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image, StyleSheet,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, useColorScheme,
} from 'react-native';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../utils/ThemeContext';
import { lightColors, darkColors, ColorPalette } from '../utils/theme';
import { supabase } from '../utils/supabase';

WebBrowser.maybeCompleteAuthSession();

type Screen = 'splash' | 'login' | 'signup' | 'forgot' | 'confirm';

export default function AuthFlow() {
  const insets = useSafeAreaInsets();
  const systemScheme = useColorScheme();
  // ThemeContext may not be mounted yet if this renders before ThemeProvider loads,
  // so fall back gracefully to system color scheme.
  let themeColors: ColorPalette;
  let isDark: boolean;
  try {
    const theme = useTheme();
    themeColors = theme.colors;
    isDark = theme.isDark;
  } catch {
    isDark = systemScheme === 'dark';
    themeColors = isDark ? darkColors : lightColors;
  }
  const colors = themeColors;
  const s = useMemo(() => makeStyles(colors), [colors]);

  const logoSource = isDark
    ? require('../../assets/rolo-logo-dark.png')
    : require('../../assets/rolo-logo-light.png');

  const [screen, setScreen] = useState<Screen>('splash');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  function resetForm() {
    setFullName(''); setEmail(''); setPassword('');
    setForgotEmail(''); setForgotSent(false);
    setLoading(false); setErrorMsg('');
  }

  function goTo(s: Screen) { resetForm(); setScreen(s); }

  async function handleSignUp() {
    setErrorMsg('');
    if (!fullName.trim()) { setErrorMsg('Please enter your full name.'); return; }
    if (!email.trim())    { setErrorMsg('Please enter your email address.'); return; }
    if (password.length < 8) { setErrorMsg('Password must be at least 8 characters.'); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(), password,
      options: { data: { full_name: fullName.trim() } },
    });
    setLoading(false);
    if (error) { setErrorMsg(error.message); }
    else if (!data.session) { setScreen('confirm'); }
  }

  async function handleSignIn() {
    setErrorMsg('');
    if (!email.trim() || !password) { setErrorMsg('Please enter your email and password.'); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) { setErrorMsg(error.message); }
  }

  async function handleForgotPassword() {
    if (!forgotEmail.trim()) { setErrorMsg('Please enter your email address.'); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim());
    setLoading(false);
    if (error) { setErrorMsg(error.message); } else { setForgotSent(true); }
  }

  async function handleAppleSignIn() {
    setErrorMsg('');
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        setErrorMsg('Apple sign-in failed. Please try again.');
        return;
      }
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });
      if (error) setErrorMsg(error.message);
    } catch (e: any) {
      if (e?.code !== 'ERR_REQUEST_CANCELED') {
        setErrorMsg('Apple sign-in failed. Please try again.');
      }
    }
  }

  async function handleGoogleSignIn() {
    setErrorMsg('');
    try {
      const redirectUrl = Linking.createURL('/');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
      });
      if (error || !data.url) { setErrorMsg('Google sign-in failed. Please try again.'); return; }
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
      if (result.type === 'success') {
        const url = result.url;
        const params = new URLSearchParams(url.split('#')[1] ?? url.split('?')[1] ?? '');
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        if (accessToken && refreshToken) {
          await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        }
      }
    } catch {
      setErrorMsg('Google sign-in failed. Please try again.');
    }
  }

  // ─── confirm email ────────────────────────────────────────────────────────

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

  // ─── forgot password ──────────────────────────────────────────────────────

  if (screen === 'forgot') {
    return (
      <View style={[s.container, { paddingTop: insets.top }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => goTo('login')}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={s.hero}>
          <Image source={logoSource} style={s.heroLogo} />
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
                placeholderTextColor={colors.muted}
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

  // ─── sign in ──────────────────────────────────────────────────────────────

  if (screen === 'login') {
    return (
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.panel }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={[s.container, { paddingTop: insets.top }]} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={s.backBtn} onPress={() => goTo('splash')}>
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>
          <View style={s.hero}>
            <Image source={logoSource} style={s.heroLogo} />
            <Text style={s.authTitle}>Welcome back.</Text>
            <Text style={s.authSubtitle}>Sign in to your Rolo account.</Text>
          </View>
          <View style={s.authBody}>
            <View style={s.fieldWrap}>
              <Text style={s.fieldLabel}>EMAIL</Text>
              <TextInput
                style={s.input}
                placeholder="you@email.com"
                placeholderTextColor={colors.muted}
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
                placeholderTextColor={colors.muted}
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
            {Platform.OS === 'ios' && (
              <TouchableOpacity style={s.socialBtn} onPress={handleAppleSignIn}>
                <Ionicons name="logo-apple" size={18} color={colors.ink} style={{ marginRight: 8 }} />
                <Text style={s.socialText}>Sign in with Apple</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={s.socialBtn} onPress={handleGoogleSignIn}>
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

  // ─── sign up ──────────────────────────────────────────────────────────────

  if (screen === 'signup') {
    return (
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.panel }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={[s.container, { paddingTop: insets.top }]} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={s.backBtn} onPress={() => goTo('splash')}>
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>
          <View style={s.hero}>
            <Image source={logoSource} style={s.heroLogo} />
            <Text style={s.authTitle}>Create your account.</Text>
            <Text style={s.authSubtitle}>Start organizing your contacts in seconds.</Text>
          </View>
          <View style={s.authBody}>
            <View style={s.fieldWrap}>
              <Text style={s.fieldLabel}>FULL NAME</Text>
              <TextInput
                style={s.input}
                placeholder="Your Name"
                placeholderTextColor={colors.muted}
                value={fullName}
                onChangeText={setFullName}
              />
            </View>
            <View style={s.fieldWrap}>
              <Text style={s.fieldLabel}>EMAIL</Text>
              <TextInput
                style={s.input}
                placeholder="you@email.com"
                placeholderTextColor={colors.muted}
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
                placeholderTextColor={colors.muted}
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
            {Platform.OS === 'ios' && (
              <TouchableOpacity style={s.socialBtn} onPress={handleAppleSignIn}>
                <Ionicons name="logo-apple" size={18} color={colors.ink} style={{ marginRight: 8 }} />
                <Text style={s.socialText}>Sign up with Apple</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={s.socialBtn} onPress={handleGoogleSignIn}>
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

  // ─── splash ───────────────────────────────────────────────────────────────

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.splashCenter}>
        <Image source={logoSource} style={s.splashLogo} />
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

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.panel },
    splashCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    splashLogo: { width: 160, height: 160, resizeMode: 'contain', marginBottom: 24 },
    splashWordmark: { fontSize: 36, fontWeight: '800', letterSpacing: -1, color: c.ink, marginBottom: 8 },
    splashTagline: { fontSize: 14.5, color: c.muted },
    authActions: { paddingHorizontal: 28, gap: 10 },
    btnBlack: { backgroundColor: c.ink, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
    btnBlackText: { color: c.panel, fontSize: 15, fontWeight: '700' },
    btnGhost: { borderWidth: 1.5, borderColor: c.line, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
    btnGhostText: { color: c.ink, fontSize: 15, fontWeight: '600' },
    btnDisabled: { opacity: 0.6 },
    termsText: { fontSize: 11, color: c.muted, textAlign: 'center', opacity: 0.6, lineHeight: 16, marginTop: 6 },
    backBtn: { paddingHorizontal: 22, paddingTop: 16 },
    backText: { color: c.muted, fontSize: 14, fontWeight: '600' },
    hero: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    heroLogo: { width: 130, height: 130, resizeMode: 'contain', marginBottom: 20 },
    authTitle: { fontSize: 27, fontWeight: '800', letterSpacing: -0.5, color: c.ink, marginBottom: 6 },
    authSubtitle: { fontSize: 14, color: c.muted },
    authBody: { paddingHorizontal: 24, gap: 14 },
    fieldWrap: { gap: 5 },
    fieldLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.7, color: c.muted },
    input: { borderWidth: 1.5, borderColor: c.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, fontWeight: '500', color: c.ink, backgroundColor: c.bg },
    forgotText: { color: c.muted, fontSize: 12.5, fontWeight: '600' },
    errorText: { color: '#d93025', fontSize: 13, fontWeight: '600', textAlign: 'center' },
    divider: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    dividerLine: { flex: 1, height: 1, backgroundColor: c.line },
    dividerText: { color: c.muted, fontSize: 12, fontWeight: '600' },
    socialBtn: { borderWidth: 1.5, borderColor: c.line, borderRadius: 14, paddingVertical: 13, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
    socialText: { color: c.ink, fontSize: 14.5, fontWeight: '600' },
    switchRow: { flexDirection: 'row', justifyContent: 'center', padding: 20 },
    switchText: { color: c.muted, fontSize: 13.5 },
    switchLink: { color: c.ink, fontSize: 13.5, fontWeight: '700', textDecorationLine: 'underline' },
    onboardingBody: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
    onboardingIcon: { fontSize: 64, marginBottom: 20 },
    onboardingTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, color: c.ink, marginBottom: 10, textAlign: 'center' },
    onboardingDesc: { fontSize: 14.5, color: c.muted, lineHeight: 21, textAlign: 'center', maxWidth: 280 },
    skipText: { color: c.muted, fontSize: 13.5, fontWeight: '600', textAlign: 'center', padding: 8 },
    successBox: { alignItems: 'center', gap: 10, paddingVertical: 20 },
    successTitle: { fontSize: 17, fontWeight: '800', color: c.ink },
    successDesc: { fontSize: 13.5, color: c.muted, textAlign: 'center', lineHeight: 20 },
  });
}
