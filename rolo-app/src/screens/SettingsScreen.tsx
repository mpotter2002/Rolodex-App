import React, { useState, useMemo, useRef, useCallback } from 'react';
import Constants from 'expo-constants';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal, Linking,
  TextInput, Animated, PanResponder,
} from 'react-native';
import * as ExpoContacts from 'expo-contacts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ColorPalette } from '../utils/theme';
import { useTheme, ThemeMode } from '../utils/ThemeContext';
import { useContacts } from '../utils/ContactsContext';
import { useAuth } from '../utils/AuthContext';
import { supabase } from '../utils/supabase';
import { clearAll } from '../utils/storage';
import { Contact } from '../types/contact';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { contacts, clearAll: clearAllContacts, importContacts } = useContacts();
  const { user, signOut } = useAuth();
  const { colors, themeMode, setThemeMode } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const debugBuildLabel = Constants.expoConfig?.extra?.debugBuildLabel ?? 'unknown';
  const appVersion = Constants.expoConfig?.version ?? Constants.nativeApplicationVersion ?? '1.0';
  const nativeBuild = Constants.nativeBuildVersion ?? 'dev';

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const displayEmail = user?.email || '';
  const avatarLetter = displayName.charAt(0).toUpperCase();
  const [showImport, setShowImport] = useState(false);
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [toast, setToast] = useState('');
  const [contactSearch, setContactSearch] = useState('');

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }
  const [phoneContacts, setPhoneContacts] = useState<ExpoContacts.ExistingContact[]>([]);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [loadingContacts, setLoadingContacts] = useState(false);
  const importBackdropOpacity = useRef(new Animated.Value(0)).current;
  const importSheetBaseY = useRef(new Animated.Value(600)).current;
  const importDragY = useRef(new Animated.Value(0)).current;

  const resetImportSheet = useCallback(() => {
    importBackdropOpacity.setValue(0);
    importSheetBaseY.setValue(600);
    importDragY.setValue(0);
    setShowImport(false);
    setPhoneContacts([]);
    setCheckedIds(new Set());
    setContactSearch('');
  }, [importBackdropOpacity, importDragY, importSheetBaseY]);

  const animateImportOpen = useCallback(() => {
    importBackdropOpacity.setValue(0);
    importSheetBaseY.setValue(600);
    importDragY.setValue(0);
    Animated.timing(importBackdropOpacity, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
    Animated.spring(importSheetBaseY, {
      toValue: 0,
      tension: 68,
      friction: 14,
      useNativeDriver: true,
    }).start();
  }, [importBackdropOpacity, importDragY, importSheetBaseY]);

  const closeImportSheet = useCallback(() => {
    Animated.parallel([
      Animated.timing(importBackdropOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(importSheetBaseY, {
        toValue: 600,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) resetImportSheet();
    });
  }, [importBackdropOpacity, importSheetBaseY, resetImportSheet]);

  async function handleDeleteAccount() {
    const { error } = await supabase.rpc('delete_user');
    if (error) {
      setConfirmingDelete(false);
      showToast('Failed to delete account. Please try again.');
    } else {
      await clearAll();
      await signOut();
    }
  }

  async function handleConnectAddressBook() {
    if (loadingContacts) return;
    setLoadingContacts(true);
    try {
      const { status, canAskAgain } = await ExpoContacts.requestPermissionsAsync();

      if (status === 'denied' || status === 'undetermined') {
        if (!canAskAgain) {
          // Permission permanently denied — send to Settings
          showToast('Open Settings to allow Rolo to access your contacts.');
          setTimeout(() => Linking.openSettings(), 1500);
        } else {
          showToast('Please allow Rolo to access your contacts.');
        }
        return;
      }

      const { data } = await ExpoContacts.getContactsAsync({
        fields: [
          ExpoContacts.Fields.Name,
          ExpoContacts.Fields.PhoneNumbers,
          ExpoContacts.Fields.Emails,
          ExpoContacts.Fields.JobTitle,
          ExpoContacts.Fields.Company,
        ],
        sort: ExpoContacts.SortTypes.LastName,
      });

      const usable = (data ?? []).filter(
        (c) => c.name && (c.phoneNumbers?.length || c.emails?.length)
      );

      if (usable.length === 0) {
        // iOS limited access with 0 contacts selected — open Settings to fix
        showToast('No contacts accessible. Opening Settings to fix this…');
        setTimeout(() => Linking.openSettings(), 1500);
        return;
      }

      setCheckedIds(new Set(usable.map((c) => c.id).filter(Boolean) as string[]));
      setPhoneContacts(usable);
      setShowImport(true);
      requestAnimationFrame(animateImportOpen);
    } catch {
      showToast('Could not load contacts. Please try again.');
    } finally {
      setLoadingContacts(false);
    }
  }

  function handleImport() {
    const toImport: Contact[] = phoneContacts
      .filter((c) => c.id && checkedIds.has(c.id))
      .map((c) => ({
        id: `import-${Date.now()}-${c.id}`,
        name: c.name || '',
        phone: c.phoneNumbers?.[0]?.number || '',
        email: c.emails?.[0]?.email || '',
        title: c.jobTitle || '',
        company: c.company || '',
        website: '',
        address: '',
        notes: 'Imported from phone contacts',
        category: '',
        createdAt: new Date().toISOString(),
      }));

    importContacts(toImport);
    closeImportSheet();
    showToast(`${toImport.length} contact${toImport.length === 1 ? '' : 's'} added to your Rolo.`);
  }

  function toggleContact(id: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const themeModes: { key: ThemeMode; label: string }[] = [
    { key: 'system', label: 'System' },
    { key: 'light', label: 'Light' },
    { key: 'dark', label: 'Dark' },
  ];

  const filteredPhoneContacts = useMemo(() => {
    const query = contactSearch.trim().toLowerCase();
    if (!query) return phoneContacts;

    return phoneContacts.filter((contact) => {
      const haystack = [
        contact.name,
        contact.company,
        contact.jobTitle,
        contact.phoneNumbers?.[0]?.number,
        contact.emails?.[0]?.email,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [contactSearch, phoneContacts]);

  const importPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 4,
        onPanResponderMove: (_, gesture) => {
          const dy = gesture.dy > 0 ? gesture.dy : gesture.dy * 0.15;
          importDragY.setValue(dy);
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy > 120 || gesture.vy > 1.1) {
            closeImportSheet();
            return;
          }

          Animated.spring(importDragY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 180,
            friction: 18,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(importDragY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 180,
            friction: 18,
          }).start();
        },
      }),
    [closeImportSheet, importDragY],
  );

  return (
    <ScrollView style={[s.container, { paddingTop: insets.top + 14 }]} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      {/* Appearance */}
      <Text style={s.sectionLabel}>Appearance</Text>
      <View style={s.card}>
        <Text style={s.cardRowTitle}>Theme</Text>
        <View style={s.themeRow}>
          {themeModes.map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={[s.themePill, themeMode === key && s.themePillActive]}
              onPress={() => setThemeMode(key)}
              activeOpacity={0.7}
            >
              <Text style={[s.themePillText, themeMode === key && s.themePillTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

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
        <Text style={s.connectDetail}>Import contacts directly from your iPhone address book.</Text>
        <TouchableOpacity style={[s.btn, s.btnPrimary]} onPress={handleConnectAddressBook} disabled={loadingContacts}>
          <Text style={s.btnPrimaryText}>{loadingContacts ? 'Loading...' : 'Import from Address Book'}</Text>
        </TouchableOpacity>
      </View>
      {toast !== '' && (
        <View style={s.toast}><Text style={s.toastText}>{toast}</Text></View>
      )}

      {/* Data */}
      <Text style={s.sectionLabel}>Data</Text>
      <View style={s.card}>
        {confirmingClear ? (
          <View style={[s.confirmRow, { borderWidth: 1, borderColor: '#f1c5c5', borderRadius: 12, padding: 10 }]}>
            <Text style={[s.confirmText, { color: '#9d2b2b' }]}>Delete all contacts? This cannot be undone.</Text>
            <View style={s.confirmBtns}>
              <TouchableOpacity style={[s.btn, s.btnSubtle, { flex: 1 }]} onPress={() => setConfirmingClear(false)}>
                <Text style={s.btnSubtleText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btn, { flex: 1, backgroundColor: '#9d2b2b' }]} onPress={() => { clearAllContacts(); setConfirmingClear(false); }}>
                <Text style={s.btnPrimaryText}>Clear All</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={[s.btn, s.btnSubtle, { borderColor: '#f1c5c5' }]}
            onPress={() => setConfirmingClear(true)}
          >
            <Text style={[s.btnSubtleText, { color: colors.danger }]}>Clear All Contacts</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Account */}
      <Text style={s.sectionLabel}>Account</Text>
      <View style={s.card}>
        <View style={s.accountRow}>
          <View style={s.accountAvatar}><Text style={s.accountAvatarText}>{avatarLetter}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.accountName}>{displayName}</Text>
            <Text style={s.accountEmail}>{displayEmail}</Text>
          </View>
        </View>
        {confirmingSignOut ? (
          <View style={s.confirmRow}>
            <Text style={s.confirmText}>Sign out of your account?</Text>
            <View style={s.confirmBtns}>
              <TouchableOpacity style={[s.btn, s.btnSubtle, { flex: 1 }]} onPress={() => setConfirmingSignOut(false)}>
                <Text style={s.btnSubtleText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btn, { flex: 1, backgroundColor: colors.accent }]} onPress={() => signOut()}>
                <Text style={[s.btnPrimaryText]}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={[s.btn, s.btnSubtle]} onPress={() => setConfirmingSignOut(true)}>
            <Text style={s.btnSubtleText}>Sign Out</Text>
          </TouchableOpacity>
        )}
        {confirmingDelete ? (
          <View style={[s.confirmRow, { borderWidth: 1, borderColor: '#f1c5c5', borderRadius: 12, padding: 10 }]}>
            <Text style={[s.confirmText, { color: '#9d2b2b' }]}>Permanently delete your account and all contacts?</Text>
            <View style={s.confirmBtns}>
              <TouchableOpacity style={[s.btn, s.btnSubtle, { flex: 1 }]} onPress={() => setConfirmingDelete(false)}>
                <Text style={s.btnSubtleText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btn, { flex: 1, backgroundColor: '#9d2b2b' }]} onPress={handleDeleteAccount}>
                <Text style={s.btnPrimaryText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={[s.btn, s.btnSubtle, { borderColor: '#f1c5c5' }]} onPress={() => setConfirmingDelete(true)}>
            <Text style={[s.btnSubtleText, { color: colors.danger }]}>Delete Account</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* About */}
      <Text style={s.sectionLabel}>About</Text>
      <View style={s.card}>
        <Text style={{ fontWeight: '800', fontSize: 16.5, color: colors.ink }}>🗂️ Rolo</Text>
        <Text style={{ fontSize: 13, color: colors.muted, lineHeight: 18 }}>Scan, save, and organize your business contacts — all in one place.</Text>
        <Text style={{ fontSize: 11.5, color: colors.muted, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 8, marginTop: 4 }}>
          Version {appVersion} ({nativeBuild})  ·  Built with Expo
        </Text>
        <Text style={s.debugLabel}>Debug build: {debugBuildLabel}</Text>
      </View>

      {/* Import Sheet */}
      {showImport && (
        <Modal transparent animationType="none" onRequestClose={closeImportSheet}>
          <View style={s.modalRoot}>
            <Animated.View style={[s.backdrop, { opacity: importBackdropOpacity }]}>
              <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={closeImportSheet} />
            </Animated.View>
            <Animated.View style={[s.importSheet, { transform: [{ translateY: Animated.add(importSheetBaseY, importDragY) }] }]}>
            <View style={s.importHandleHitArea} {...importPanResponder.panHandlers}>
              <View style={s.handle} />
            </View>
            <View style={s.importHeaderBlock}>
              <View style={s.importIcon}><Text style={{ fontSize: 28 }}>👥</Text></View>
              <Text style={s.importTitle}>Import Phone Contacts</Text>
              <Text style={s.importDesc}>
                {checkedIds.size} of {phoneContacts.length} contacts selected
              </Text>
            </View>
            <View style={s.searchWrap}>
              <TextInput
                style={s.searchInput}
                value={contactSearch}
                onChangeText={setContactSearch}
                placeholder="Search contacts by name, email, phone, or company"
                placeholderTextColor={colors.muted}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>
            <ScrollView style={s.importList} showsVerticalScrollIndicator={false}>
              {filteredPhoneContacts.length === 0 ? (
                <View style={s.emptyState}>
                  <Text style={s.emptyStateTitle}>No matching contacts</Text>
                  <Text style={s.emptyStateText}>Try a different name, company, email, or phone number.</Text>
                </View>
              ) : filteredPhoneContacts.map((c, i) => (
                <TouchableOpacity
                  key={c.id || i}
                  style={[s.importRow, i < filteredPhoneContacts.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.line }]}
                  onPress={() => c.id && toggleContact(c.id)}
                >
                  <View style={s.importAvatar}>
                    <Text style={s.importAvatarText}>{(c.name || '?').charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.importName}>{c.name}</Text>
                    <Text style={s.importPhone}>
                      {c.phoneNumbers?.[0]?.number || c.emails?.[0]?.email || ''}
                    </Text>
                  </View>
                  <View style={[s.importCheck, c.id && checkedIds.has(c.id) ? s.importChecked : null]}>
                    {c.id && checkedIds.has(c.id) && (
                      <Text style={{ color: colors.onAccent, fontSize: 10.5, fontWeight: '800' }}>✓</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={[s.btn, s.btnPrimary]} onPress={handleImport}>
              <Text style={s.btnPrimaryText}>Import {checkedIds.size} Contact{checkedIds.size === 1 ? '' : 's'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, s.btnSubtle]} onPress={closeImportSheet}>
              <Text style={[s.btnSubtleText, { textAlign: 'center' }]}>Cancel</Text>
            </TouchableOpacity>
            </Animated.View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.panel },
    content: { paddingHorizontal: 14, paddingBottom: 120, gap: 10 },
    sectionLabel: { fontSize: 10.5, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.7, color: c.muted, paddingHorizontal: 4, marginTop: 4 },
    card: { backgroundColor: c.bg, borderRadius: 20, padding: 12, gap: 10 },
    cardRowTitle: { fontSize: 14, fontWeight: '600', color: c.ink },
    btn: { borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
    btnPrimary: { backgroundColor: c.accent },
    btnPrimaryText: { color: c.onAccent, fontSize: 14, fontWeight: '700' },
    btnSubtle: { backgroundColor: c.panel, borderWidth: 1, borderColor: c.line },
    btnSubtleText: { color: c.ink, fontSize: 14, fontWeight: '700' },
    // Appearance
    themeRow: { flexDirection: 'row', gap: 8 },
    themePill: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', backgroundColor: c.panel, borderWidth: 1, borderColor: c.line },
    themePillActive: { backgroundColor: c.accent, borderColor: c.accent },
    themePillText: { fontSize: 13, fontWeight: '600', color: c.muted },
    themePillTextActive: { color: c.onAccent, fontWeight: '700' },
    connectHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    connectIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' },
    connectTitle: { fontWeight: '700', fontSize: 15, color: c.ink },
    connectSub: { fontSize: 12.5, color: c.muted, marginTop: 2 },
    connectDetail: { fontSize: 13, color: c.muted, lineHeight: 19, borderTopWidth: 1, borderTopColor: c.line, paddingTop: 10 },
    accountRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: c.line },
    accountAvatar: { width: 48, height: 48, borderRadius: 999, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' },
    accountAvatarText: { color: c.onAccent, fontWeight: '800', fontSize: 17 },
    accountName: { fontWeight: '700', fontSize: 15, color: c.ink },
    accountEmail: { fontSize: 12.5, color: c.muted, marginTop: 2 },
    modalRoot: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(21,24,33,0.48)' },
    importSheet: {
      backgroundColor: c.panel,
      borderTopLeftRadius: 34,
      borderTopRightRadius: 34,
      borderTopWidth: 1,
      borderColor: c.line,
      paddingHorizontal: 20,
      paddingBottom: 36,
      gap: 14,
      maxHeight: '88%',
      shadowColor: '#10141c',
      shadowOffset: { width: 0, height: -8 },
      shadowOpacity: 0.12,
      shadowRadius: 18,
      elevation: 12,
      overflow: 'hidden',
    },
    importHandleHitArea: {
      alignItems: 'center',
      paddingTop: 12,
      paddingBottom: 16,
    },
    importHeaderBlock: {
      alignItems: 'center',
      paddingBottom: 2,
    },
    handle: { width: 36, height: 4, backgroundColor: c.line, borderRadius: 999, alignSelf: 'center' },
    importIcon: { width: 64, height: 64, borderRadius: 999, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
    importTitle: { fontSize: 17, fontWeight: '800', textAlign: 'center', color: c.ink },
    importDesc: { fontSize: 13, color: c.muted, textAlign: 'center', lineHeight: 19 },
    searchWrap: {
      backgroundColor: c.bg,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.line,
      paddingHorizontal: 12,
      paddingVertical: 2,
    },
    searchInput: { height: 42, fontSize: 14, color: c.ink },
    importList: { backgroundColor: c.bg, borderRadius: 18, maxHeight: 320 },
    importRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 11, paddingHorizontal: 14 },
    importAvatar: { width: 38, height: 38, borderRadius: 999, backgroundColor: c.line, alignItems: 'center', justifyContent: 'center' },
    importAvatarText: { fontWeight: '700', fontSize: 13.5, color: c.muted },
    importName: { fontWeight: '600', fontSize: 14, color: c.ink },
    importPhone: { fontSize: 12, color: c.muted },
    importCheck: {
      width: 24,
      height: 24,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: c.line,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.panel,
    },
    importChecked: { backgroundColor: c.accent, borderColor: c.accent },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 42, paddingHorizontal: 24 },
    emptyStateTitle: { fontSize: 15, fontWeight: '700', color: c.ink, marginBottom: 6 },
    emptyStateText: { fontSize: 13, color: c.muted, lineHeight: 19, textAlign: 'center' },
    confirmRow: { gap: 10 },
    confirmText: { fontSize: 13, color: c.ink, lineHeight: 18, textAlign: 'center' },
    confirmBtns: { flexDirection: 'row', gap: 8 },
    debugLabel: { fontSize: 10.5, color: c.muted, letterSpacing: 0.3 },
    toast: { backgroundColor: c.ink, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center' },
    toastText: { color: c.onAccent, fontSize: 13, fontWeight: '600' },
  });
}
