import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image, StyleSheet, Dimensions, ScrollView,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../utils/theme';
import { setOnboarded } from '../utils/storage';

type Screen = 'splash' | 'login' | 'signup' | 'forgot' | 'onboarding';

const ONBOARDING_PAGES = [
  { icon: '📇', title: 'Welcome to Rolo', desc: 'Your digital Rolodex. Scan, save, and organize all your business contacts in one place.' },
  { icon: '📷', title: 'Scan Business Cards', desc: 'Snap a photo of any business card. Our AI reads it and fills in all the contact details for you.' },
  { icon: '🗂️', title: 'Organize Your Way', desc: 'Browse your contacts in deck or list view. Filter by category, search by name — find anyone in seconds.' },
  { icon: '🚀', title: "You're All Set", desc: 'Start by scanning your first card or adding a contact manually. Your Rolo is ready to go!' },
];

export default function AuthFlow({ onComplete }: { onComplete: () => void }) {
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState<Screen>('splash');
  const [onboardingIdx, setOnboardingIdx] = useState(0);
  const [forgotSent, setForgotSent] = useState(false);

  function dismissAuth() {
    setScreen('onboarding');
    setOnboardingIdx(0);
  }

  async function finishOnboarding() {
    await setOnboarded();
    onComplete();
  }

  if (screen === 'onboarding') {
    const page = ONBOARDING_PAGES[onboardingIdx];
    const isLast = onboardingIdx === ONBOARDING_PAGES.length - 1;
    return (
      <View style={[s.container, { paddingTop: insets.top }]}>
        <View style={s.onboardingBody}>
          <Text style={s.onboardingIcon}>{page.icon}</Text>
          <Text style={s.onboardingTitle}>{page.title}</Text>
          <Text style={s.onboardingDesc}>{page.desc}</Text>
        </View>
        <View style={s.dots}>
          {ONBOARDING_PAGES.map((_, i) => (
            <View key={i} style={[s.dot, i === onboardingIdx && s.dotActive]} />
          ))}
        </View>
        <View style={[s.authActions, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity style={s.btnBlack} onPress={() => isLast ? finishOnboarding() : setOnboardingIdx(onboardingIdx + 1)}>
            <Text style={s.btnBlackText}>{isLast ? 'Get Started' : 'Next'}</Text>
          </TouchableOpacity>
          {!isLast && (
            <TouchableOpacity onPress={finishOnboarding}>
              <Text style={s.skipText}>Skip</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  if (screen === 'forgot') {
    return (
      <View style={[s.container, { paddingTop: insets.top }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => { setScreen('login'); setForgotSent(false); }}>
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
              <Text style={s.successDesc}>We sent a password reset link to your email.</Text>
            </View>
            <TouchableOpacity style={s.btnBlack} onPress={() => { setScreen('login'); setForgotSent(false); }}>
              <Text style={s.btnBlackText}>Back to Sign In</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.authBody}>
            <View style={s.fieldWrap}>
              <Text style={s.fieldLabel}>EMAIL</Text>
              <TextInput style={s.input} placeholder="you@email.com" placeholderTextColor="#b0b0b5" keyboardType="email-address" autoCapitalize="none" />
            </View>
            <TouchableOpacity style={s.btnBlack} onPress={() => setForgotSent(true)}>
              <Text style={s.btnBlackText}>Send Reset Link</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={s.switchRow}>
          <Text style={s.switchText}>Remember your password? </Text>
          <TouchableOpacity onPress={() => { setScreen('login'); setForgotSent(false); }}><Text style={s.switchLink}>Sign in</Text></TouchableOpacity>
        </View>
      </View>
    );
  }

  if (screen === 'login') {
    return (
      <ScrollView style={[s.container, { paddingTop: insets.top }]} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={s.backBtn} onPress={() => setScreen('splash')}><Text style={s.backText}>← Back</Text></TouchableOpacity>
        <View style={s.hero}>
          <Image source={require('../../assets/rolo-logo.png')} style={s.heroLogo} />
          <Text style={s.authTitle}>Welcome back.</Text>
          <Text style={s.authSubtitle}>Sign in to your Rolo account.</Text>
        </View>
        <View style={s.authBody}>
          <View style={s.fieldWrap}>
            <Text style={s.fieldLabel}>EMAIL</Text>
            <TextInput style={s.input} placeholder="you@email.com" placeholderTextColor="#b0b0b5" keyboardType="email-address" autoCapitalize="none" />
          </View>
          <View style={s.fieldWrap}>
            <Text style={s.fieldLabel}>PASSWORD</Text>
            <TextInput style={s.input} placeholder="••••••••" placeholderTextColor="#b0b0b5" secureTextEntry />
          </View>
          <TouchableOpacity onPress={() => setScreen('forgot')} style={{ alignSelf: 'flex-end' }}>
            <Text style={s.forgotText}>Forgot password?</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.btnBlack} onPress={dismissAuth}><Text style={s.btnBlackText}>Sign In</Text></TouchableOpacity>
          <View style={s.divider}><View style={s.dividerLine} /><Text style={s.dividerText}>or continue with</Text><View style={s.dividerLine} /></View>
          <TouchableOpacity style={s.socialBtn} onPress={dismissAuth}>
            <AntDesign name="apple1" size={17} color="#1d1d1f" style={{ marginRight: 8 }} />
            <Text style={s.socialText}>Sign in with Apple</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.socialBtn} onPress={dismissAuth}>
            <AntDesign name="google" size={16} color="#DB4437" style={{ marginRight: 8 }} />
            <Text style={s.socialText}>Sign in with Google</Text>
          </TouchableOpacity>
        </View>
        <View style={s.switchRow}>
          <Text style={s.switchText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => setScreen('signup')}><Text style={s.switchLink}>Create one</Text></TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  if (screen === 'signup') {
    return (
      <ScrollView style={[s.container, { paddingTop: insets.top }]} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={s.backBtn} onPress={() => setScreen('splash')}><Text style={s.backText}>← Back</Text></TouchableOpacity>
        <View style={s.hero}>
          <Image source={require('../../assets/rolo-logo.png')} style={s.heroLogo} />
          <Text style={s.authTitle}>Create your account.</Text>
          <Text style={s.authSubtitle}>Start organizing your contacts in seconds.</Text>
        </View>
        <View style={s.authBody}>
          <View style={s.fieldWrap}><Text style={s.fieldLabel}>FULL NAME</Text><TextInput style={s.input} placeholder="Michael Potter" placeholderTextColor="#b0b0b5" /></View>
          <View style={s.fieldWrap}><Text style={s.fieldLabel}>EMAIL</Text><TextInput style={s.input} placeholder="you@email.com" placeholderTextColor="#b0b0b5" keyboardType="email-address" autoCapitalize="none" /></View>
          <View style={s.fieldWrap}><Text style={s.fieldLabel}>PASSWORD</Text><TextInput style={s.input} placeholder="Min. 8 characters" placeholderTextColor="#b0b0b5" secureTextEntry /></View>
          <TouchableOpacity style={s.btnBlack} onPress={dismissAuth}><Text style={s.btnBlackText}>Create Account</Text></TouchableOpacity>
          <View style={s.divider}><View style={s.dividerLine} /><Text style={s.dividerText}>or sign up with</Text><View style={s.dividerLine} /></View>
          <TouchableOpacity style={s.socialBtn} onPress={dismissAuth}>
            <AntDesign name="apple1" size={17} color="#1d1d1f" style={{ marginRight: 8 }} />
            <Text style={s.socialText}>Sign up with Apple</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.socialBtn} onPress={dismissAuth}>
            <AntDesign name="google" size={16} color="#DB4437" style={{ marginRight: 8 }} />
            <Text style={s.socialText}>Sign up with Google</Text>
          </TouchableOpacity>
        </View>
        <View style={s.switchRow}>
          <Text style={s.switchText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => setScreen('login')}><Text style={s.switchLink}>Sign in</Text></TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // Splash
  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.splashCenter}>
        <Image source={require('../../assets/rolo-logo.png')} style={s.splashLogo} />
        <Text style={s.splashWordmark}>Rolo</Text>
        <Text style={s.splashTagline}>Your contacts, beautifully organized.</Text>
      </View>
      <View style={[s.authActions, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={s.btnBlack} onPress={() => setScreen('signup')}>
          <Text style={s.btnBlackText}>Create an Account</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btnGhost} onPress={() => setScreen('login')}>
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
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.line },
  dividerText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  socialBtn: { borderWidth: 1.5, borderColor: colors.line, borderRadius: 14, paddingVertical: 13, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  socialText: { color: colors.ink, fontSize: 14.5, fontWeight: '600' },
  switchRow: { flexDirection: 'row', justifyContent: 'center', padding: 20 },
  switchText: { color: colors.muted, fontSize: 13.5 },
  switchLink: { color: colors.ink, fontSize: 13.5, fontWeight: '700', textDecorationLine: 'underline' },
  // Onboarding
  onboardingBody: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  onboardingIcon: { fontSize: 64, marginBottom: 20 },
  onboardingTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, color: colors.ink, marginBottom: 10, textAlign: 'center' },
  onboardingDesc: { fontSize: 14.5, color: colors.muted, lineHeight: 21, textAlign: 'center', maxWidth: 280 },
  dots: { flexDirection: 'row', gap: 8, justifyContent: 'center', paddingVertical: 16 },
  dot: { width: 8, height: 8, borderRadius: 999, backgroundColor: colors.line },
  dotActive: { backgroundColor: colors.accent, width: 24 },
  skipText: { color: colors.muted, fontSize: 13.5, fontWeight: '600', textAlign: 'center', padding: 8 },
  // Forgot
  successBox: { alignItems: 'center', gap: 10, paddingVertical: 20 },
  successTitle: { fontSize: 17, fontWeight: '800', color: colors.ink },
  successDesc: { fontSize: 13.5, color: colors.muted, textAlign: 'center', lineHeight: 20 },
});
