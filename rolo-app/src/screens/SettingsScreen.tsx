import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../utils/theme';
import { useContacts } from '../utils/ContactsContext';
import { useAuth } from '../utils/AuthContext';
import { supabase } from '../utils/supabase';
import { Contact } from '../types/contact';
import PaywallSheet from '../components/PaywallSheet';

const MOCK_PHONE_CONTACTS = [
  { name: 'Mom', phone: '+1 (555) 123-4567' },
  { name: 'Dad', phone: '+1 (555) 123-4568' },
  { name: 'Alex Rivera', phone: '+1 (212) 555-0199' },
  { name: 'Sarah Kim', phone: '+1 (310) 555-0234' },
  { name: 'Dr. Patel', phone: '+1 (646) 555-0312' },
  { name: 'Jake from State Farm', phone: '+1 (800) 555-0100' },
  { name: 'Lisa Wong', phone: '+1 (415) 555-0456' },
  { name: 'Carlos Mendez', phone: '+1 (305) 555-0789' },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { contacts, reloadDemo, clearAll, importContacts } = useContacts();
  const { user, signOut } = useAuth();
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const displayEmail = user?.email || '';
  const avatarLetter = displayName.charAt(0).toUpperCase();
  const [showPaywall, setShowPaywall] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [checkedImports, setCheckedImports] = useState<boolean[]>(MOCK_PHONE_CONTACTS.map(() => true));
  const [isPro, setIsPro] = useState(false);

  function handleLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  async function handleDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your contacts. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.rpc('delete_user');
            if (error) {
              Alert.alert('Error', 'Could not delete account. Please try again.');
            } else {
              await signOut();
            }
          },
        },
      ]
    );
  }

  function handleImport() {
    const toImport: Contact[] = [];
    checkedImports.forEach((checked, i) => {
      if (!checked) return;
      const mc = MOCK_PHONE_CONTACTS[i];
      toImport.push({
        id: `import-${Date.now()}-${i}`,
        name: mc.name,
        phone: mc.phone,
        title: '', company: '', email: '', website: '', address: '',
        notes: 'Imported from phone contacts',
        category: '',
        createdAt: new Date().toISOString(),
      });
    });
    importContacts(toImport);
    setShowImport(false);
    Alert.alert('Imported', `${toImport.length} contacts imported.`);
  }

  return (
    <ScrollView style={[s.container, { paddingTop: insets.top + 14 }]} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      {/* Pro Banner */}
      {!isPro && (
        <TouchableOpacity style={s.proBanner} activeOpacity={0.9} onPress={() => setShowPaywall(true)}>
          <Text style={s.proIcon}>⚡</Text>
          <View style={s.proText}>
            <Text style={s.proTitle}>Upgrade to Rolo Pro</Text>
            <Text style={s.proDesc}>Unlimited contacts, AI scanning & more</Text>
          </View>
          <Text style={s.proArrow}>›</Text>
        </TouchableOpacity>
      )}

      {/* Integrations */}
      <Text style={s.sectionLabel}>Integrations</Text>
      <View style={s.card}>
        <View style={s.connectHeader}>
          <View style={s.connectIcon}><Text style={{ fontSize: 20 }}>👥</Text></View>
          <View>
            <Text style={s.connectTitle}>Phone Contacts</Text>
            <Text style={s.connectSub}>Device address book</Text>
          </View>
        </View>
        <Text style={s.connectDetail}>Import and sync contacts directly from your iPhone or Android address book.</Text>
        <TouchableOpacity style={[s.btn, s.btnPrimary]} onPress={() => setShowImport(true)}>
          <Text style={s.btnPrimaryText}>Connect Address Book</Text>
        </TouchableOpacity>
      </View>

      {/* Data */}
      <Text style={s.sectionLabel}>Data</Text>
      <View style={s.card}>
        <TouchableOpacity style={[s.btn, s.btnSubtle]} onPress={reloadDemo}>
          <Text style={s.btnSubtleText}>Reload Demo Contacts</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.btn, s.btnSubtle, { borderColor: '#f1c5c5' }]}
          onPress={() => Alert.alert('Clear All?', 'This will delete all contacts.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Clear', style: 'destructive', onPress: clearAll },
          ])}
        >
          <Text style={[s.btnSubtleText, { color: '#9d2b2b' }]}>Clear All Contacts</Text>
        </TouchableOpacity>
      </View>

      {/* Account */}
      <Text style={s.sectionLabel}>Account</Text>
      <View style={s.card}>
        <View style={s.accountRow}>
          <View style={s.accountAvatar}><Text style={s.accountAvatarText}>{avatarLetter}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.accountName}>{displayName}</Text>
            <Text style={s.accountEmail}>{displayEmail}</Text>
            <View style={[s.badge, isPro && { backgroundColor: colors.ink }]}>
              <Text style={[s.badgeText, isPro && { color: '#fff' }]}>{isPro ? 'Pro Plan' : 'Free Plan'}</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity style={[s.btn, s.btnSubtle]} onPress={handleLogout}>
          <Text style={s.btnSubtleText}>Sign Out</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.btn, s.btnSubtle, { borderColor: '#f1c5c5' }]} onPress={handleDeleteAccount}>
          <Text style={[s.btnSubtleText, { color: '#9d2b2b' }]}>Delete Account</Text>
        </TouchableOpacity>
      </View>

      {/* About */}
      <Text style={s.sectionLabel}>About</Text>
      <View style={s.card}>
        <Text style={{ fontWeight: '800', fontSize: 16.5 }}>🗂️ Rolo</Text>
        <Text style={{ fontSize: 13, color: colors.muted, lineHeight: 18 }}>Scan, save, and organize your business contacts — all in one place.</Text>
        <Text style={{ fontSize: 11.5, color: colors.muted, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 8, marginTop: 4 }}>Version 1.0  ·  Expo build</Text>
      </View>

      {/* Paywall */}
      {showPaywall && (
        <PaywallSheet
          onClose={() => setShowPaywall(false)}
          onPurchase={() => { setIsPro(true); setShowPaywall(false); }}
        />
      )}

      {/* Import Overlay */}
      {showImport && (
        <Modal transparent animationType="slide" onRequestClose={() => setShowImport(false)}>
          <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={() => setShowImport(false)} />
          <View style={s.importSheet}>
            <View style={s.handle} />
            <View style={s.importIcon}><Text style={{ fontSize: 28 }}>👥</Text></View>
            <Text style={s.importTitle}>Import Phone Contacts</Text>
            <Text style={s.importDesc}>Select contacts from your device address book to add to your Rolo.</Text>
            <View style={s.importList}>
              {MOCK_PHONE_CONTACTS.map((mc, i) => (
                <TouchableOpacity key={i} style={[s.importRow, i < MOCK_PHONE_CONTACTS.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.line }]}
                  onPress={() => { const c = [...checkedImports]; c[i] = !c[i]; setCheckedImports(c); }}
                >
                  <View style={s.importAvatar}><Text style={s.importAvatarText}>{mc.name.charAt(0)}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.importName}>{mc.name}</Text>
                    <Text style={s.importPhone}>{mc.phone}</Text>
                  </View>
                  <View style={[s.importCheck, checkedImports[i] && s.importChecked]}>
                    {checkedImports[i] && <Text style={{ color: '#fff', fontSize: 10.5, fontWeight: '800' }}>✓</Text>}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={[s.btn, s.btnPrimary]} onPress={handleImport}>
              <Text style={s.btnPrimaryText}>Import Selected</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, s.btnSubtle]} onPress={() => setShowImport(false)}>
              <Text style={[s.btnSubtleText, { textAlign: 'center' }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.panel },
  content: { paddingHorizontal: 14, paddingBottom: 120, gap: 10 },
  sectionLabel: { fontSize: 10.5, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.7, color: colors.muted, paddingHorizontal: 4, marginTop: 4 },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e7edf5', borderRadius: 20, padding: 12, gap: 10 },
  btn: { borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
  btnPrimary: { backgroundColor: colors.accent },
  btnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  btnSubtle: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line },
  btnSubtleText: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  proBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1d1d1f', borderRadius: 16, padding: 14 },
  proIcon: { fontSize: 22 },
  proText: { flex: 1 },
  proTitle: { color: '#fff', fontWeight: '700', fontSize: 15 },
  proDesc: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 1 },
  proArrow: { color: 'rgba(255,255,255,0.4)', fontSize: 18 },
  connectHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  connectIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  connectTitle: { fontWeight: '700', fontSize: 15 },
  connectSub: { fontSize: 12.5, color: colors.muted, marginTop: 2 },
  connectDetail: { fontSize: 13, color: colors.muted, lineHeight: 19, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 10 },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.line },
  accountAvatar: { width: 48, height: 48, borderRadius: 999, backgroundColor: '#1d1d1f', alignItems: 'center', justifyContent: 'center' },
  accountAvatarText: { color: '#fff', fontWeight: '800', fontSize: 17 },
  accountName: { fontWeight: '700', fontSize: 15 },
  accountEmail: { fontSize: 12.5, color: colors.muted, marginTop: 2 },
  badge: { backgroundColor: colors.accentSoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4, alignSelf: 'flex-start' },
  badgeText: { fontSize: 9.5, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', color: colors.accent },
  fieldGroup: { gap: 10 },
  field: {},
  fieldLabel: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.6, color: colors.muted, marginBottom: 4 },
  fieldInput: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, fontWeight: '500', color: colors.ink, backgroundColor: colors.bg },
  // Import
  backdrop: { flex: 1, backgroundColor: 'rgba(21,24,33,0.48)' },
  importSheet: { backgroundColor: colors.panel, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, gap: 14, maxHeight: '85%' },
  handle: { width: 36, height: 4, backgroundColor: colors.line, borderRadius: 999, alignSelf: 'center' },
  importIcon: { width: 64, height: 64, borderRadius: 999, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  importTitle: { fontSize: 17, fontWeight: '800', textAlign: 'center' },
  importDesc: { fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 19 },
  importList: { backgroundColor: colors.bg, borderRadius: 14, overflow: 'hidden' },
  importRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 11, paddingHorizontal: 14 },
  importAvatar: { width: 38, height: 38, borderRadius: 999, backgroundColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  importAvatarText: { fontWeight: '700', fontSize: 13.5, color: colors.muted },
  importName: { fontWeight: '600', fontSize: 14, color: colors.ink },
  importPhone: { fontSize: 12, color: colors.muted },
  importCheck: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  importChecked: { backgroundColor: colors.accent, borderColor: colors.accent },
});
