import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../utils/theme';

interface Props { onClose: () => void; onPurchase: () => void; }

type Plan = 'monthly' | 'yearly' | 'lifetime';

const FEATURES = [
  { icon: '♾️', title: 'Unlimited Contacts', desc: 'Free plan limited to 25 contacts' },
  { icon: '📷', title: 'Unlimited Card Scanning', desc: 'AI-powered OCR with no scan limits' },
  { icon: '☁️', title: 'Cloud Sync & Backup', desc: 'Access your contacts on any device' },
  { icon: '👥', title: 'Phone Contacts Import', desc: 'Sync your device address book' },
  { icon: '🔔', title: 'Follow-up Reminders', desc: 'Never forget to follow up' },
];

export default function PaywallSheet({ onClose, onPurchase }: Props) {
  const insets = useSafeAreaInsets();
  const [plan, setPlan] = useState<Plan>('monthly');

  const ctaText = plan === 'lifetime' ? 'Purchase Lifetime — $79.99'
    : plan === 'yearly' ? 'Start Free Trial — $39.99/yr'
    : 'Start Free Trial — $4.99/mo';

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.container}>
        <ScrollView style={s.sheet} showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={[s.closeBtn, { top: insets.top + 14 }]} onPress={onClose}><Text style={s.closeBtnText}>✕</Text></TouchableOpacity>
          <View style={[s.hero, { paddingTop: insets.top + 52 }]}>
            <View style={s.badge}><Text style={s.badgeText}>⚡ ROLO PRO</Text></View>
            <Text style={s.title}>{'Unlock the full\nRolo experience.'}</Text>
            <Text style={s.subtitle}>Unlimited contacts, AI scanning, cloud sync, and more.</Text>
          </View>
          <View style={s.features}>
            {FEATURES.map((f, i) => (
              <View key={i} style={[s.feature, i < FEATURES.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.bg }]}>
                <View style={s.featureIcon}><Text style={{ fontSize: 16.5 }}>{f.icon}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.featureTitle}>{f.title}</Text>
                  <Text style={s.featureDesc}>{f.desc}</Text>
                </View>
              </View>
            ))}
          </View>
          <View style={s.plans}>
            {([
              { key: 'yearly' as Plan, name: 'Yearly', detail: 'Billed annually', price: '$39.99', period: '/year', save: 'SAVE 33%' },
              { key: 'monthly' as Plan, name: 'Monthly', detail: 'Cancel anytime', price: '$4.99', period: '/month' },
              { key: 'lifetime' as Plan, name: 'Lifetime', detail: 'One-time purchase', price: '$79.99', period: 'forever' },
            ]).map((p) => (
              <TouchableOpacity key={p.key} style={[s.plan, plan === p.key && s.planSelected]} onPress={() => setPlan(p.key)}>
                {p.save && <View style={s.saveBadge}><Text style={s.saveBadgeText}>{p.save}</Text></View>}
                <View style={[s.radio, plan === p.key && s.radioSelected]}>
                  {plan === p.key && <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>✓</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.planName}>{p.name}</Text>
                  <Text style={s.planDetail}>{p.detail}</Text>
                </View>
                <View>
                  <Text style={s.planPrice}>{p.price}</Text>
                  <Text style={s.planPeriod}>{p.period}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={s.cta} onPress={onPurchase}><Text style={s.ctaText}>{ctaText}</Text></TouchableOpacity>
          <View style={s.footer}>
            <TouchableOpacity><Text style={s.restore}>Restore Purchase</Text></TouchableOpacity>
            <Text style={s.terms}>7-day free trial, then auto-renews. Cancel anytime in Settings.</Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgba(21,24,33,0.52)' },
  sheet: { flex: 1, backgroundColor: colors.panel, borderRadius: 34, margin: 0 },
  closeBtn: { position: 'absolute', top: 16, right: 16, width: 34, height: 34, borderRadius: 999, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  closeBtnText: { fontSize: 14, color: colors.muted },
  hero: { alignItems: 'center', paddingTop: 52, paddingBottom: 20, paddingHorizontal: 24 },
  badge: { backgroundColor: '#1d1d1f', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 16 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, color: colors.ink, textAlign: 'center', marginBottom: 8, lineHeight: 31 },
  subtitle: { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20 },
  features: { paddingHorizontal: 24, marginBottom: 20 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  featureIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  featureTitle: { fontSize: 14, fontWeight: '700', color: colors.ink },
  featureDesc: { fontSize: 12, color: colors.muted, marginTop: 1 },
  plans: { paddingHorizontal: 20, gap: 10, marginBottom: 16 },
  plan: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 2, borderColor: colors.line, borderRadius: 16, padding: 14, position: 'relative' as const },
  planSelected: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  radio: { width: 22, height: 22, borderRadius: 999, borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: colors.accent, backgroundColor: colors.accent },
  planName: { fontSize: 14.5, fontWeight: '700', color: colors.ink },
  planDetail: { fontSize: 12, color: colors.muted, marginTop: 1 },
  planPrice: { fontSize: 16.5, fontWeight: '800', color: colors.ink, textAlign: 'right' },
  planPeriod: { fontSize: 10.5, color: colors.muted, textAlign: 'right' },
  saveBadge: { position: 'absolute', top: -9, right: 14, backgroundColor: '#34c759', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  saveBadgeText: { color: '#fff', fontSize: 9.5, fontWeight: '800', letterSpacing: 0.5 },
  cta: { marginHorizontal: 20, padding: 15, borderRadius: 14, backgroundColor: colors.ink, alignItems: 'center', marginBottom: 12 },
  ctaText: { color: '#fff', fontSize: 15.5, fontWeight: '700' },
  footer: { alignItems: 'center', paddingHorizontal: 24, paddingBottom: 40, gap: 6 },
  restore: { color: colors.muted, fontSize: 12.5, fontWeight: '600', textDecorationLine: 'underline' },
  terms: { color: colors.muted, fontSize: 10.5, textAlign: 'center', lineHeight: 15, opacity: 0.7 },
});
