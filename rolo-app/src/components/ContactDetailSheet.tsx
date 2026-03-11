import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking, Modal,
  TextInput, Alert, Share, PanResponder, Animated,
} from 'react-native';
import { ColorPalette } from '../utils/theme';
import { useTheme } from '../utils/ThemeContext';
import { Contact } from '../types/contact';
import { useContacts } from '../utils/ContactsContext';
import { getCategoryLabel, CATEGORIES } from '../data/categories';
import BouncyPress from './BouncyPress';

interface Props {
  contact: Contact;
  onClose: () => void;
}

export default function ContactDetailSheet({ contact, onClose }: Props) {
  const { updateContact, removeContact } = useContacts();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [mode, setMode] = useState<'detail' | 'edit'>('detail');
  const [editData, setEditData] = useState(contact);

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetY = useRef(new Animated.Value(600)).current;
  const dragY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(backdropOpacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    Animated.spring(sheetY, { toValue: 0, tension: 68, friction: 14, useNativeDriver: true }).start();
  }, []);

  function animateClose() {
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(sheetY, { toValue: 600, duration: 260, useNativeDriver: true }),
    ]).start(onClose);
  }

  const dismissPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
      onPanResponderMove: (_, g) => {
        const dy = g.dy > 0 ? g.dy : g.dy * 0.2;
        dragY.setValue(dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 80 || g.vy > 0.8) {
          animateClose();
        } else {
          Animated.spring(dragY, { toValue: 0, tension: 180, friction: 18, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const editBackdropOpacity = useRef(new Animated.Value(0)).current;
  const editSheetY = useRef(new Animated.Value(600)).current;
  const editDragY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (mode === 'edit') {
      editBackdropOpacity.setValue(0);
      editSheetY.setValue(600);
      editDragY.setValue(0);
      Animated.timing(editBackdropOpacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();
      Animated.spring(editSheetY, { toValue: 0, tension: 68, friction: 14, useNativeDriver: true }).start();
    }
  }, [mode]);

  function animateEditClose() {
    Animated.parallel([
      Animated.timing(editBackdropOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(editSheetY, { toValue: 600, duration: 260, useNativeDriver: true }),
    ]).start(() => {
      backdropOpacity.setValue(0);
      sheetY.setValue(600);
      dragY.setValue(0);
      setMode('detail');
      Animated.timing(backdropOpacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();
      Animated.spring(sheetY, { toValue: 0, tension: 68, friction: 14, useNativeDriver: true }).start();
    });
  }

  const editDismissPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
      onPanResponderMove: (_, g) => {
        const dy = g.dy > 0 ? g.dy : g.dy * 0.2;
        editDragY.setValue(dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 80 || g.vy > 0.8) {
          animateEditClose();
        } else {
          Animated.spring(editDragY, { toValue: 0, tension: 180, friction: 18, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const initial = (contact.name || contact.company || '?').charAt(0).toUpperCase();
  const subtitle = [contact.title, contact.company].filter(Boolean).join(' · ');
  const catLabel = getCategoryLabel(contact.category);
  const avatarBg = contact.cardColors?.accentHex || colors.accent;

  const fields = [
    { label: 'Phone', value: contact.phone, href: contact.phone ? `tel:${contact.phone}` : null },
    { label: 'Email', value: contact.email, href: contact.email ? `mailto:${contact.email}` : null },
    { label: 'Website', value: contact.website, href: contact.website ? (contact.website.startsWith('http') ? contact.website : `https://${contact.website}`) : null },
    { label: 'Address', value: contact.address, href: null },
    { label: 'Notes', value: contact.notes, href: null },
  ].filter((f) => f.value);

  function formatShareText(): string {
    const lines = [];
    if (contact.name) lines.push(contact.name);
    if (contact.title) lines.push(contact.title);
    if (contact.company) lines.push(contact.company);
    if (contact.phone) lines.push('📞 ' + contact.phone);
    if (contact.email) lines.push('✉️ ' + contact.email);
    if (contact.website) lines.push('🌐 ' + contact.website);
    if (contact.address) lines.push('📍 ' + contact.address);
    return lines.join('\n');
  }

  async function handleShare() {
    const title = contact.name ? `Contact: ${contact.name}` : 'Shared Contact';
    await Share.share({ message: formatShareText(), title });
  }

  function handleSave() {
    updateContact(editData);
    animateEditClose();
  }

  function handleDelete() {
    Alert.alert('Delete Contact', `Remove ${contact.name || 'this contact'}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { removeContact(contact.id); animateClose(); } },
    ]);
  }

  if (mode === 'edit') {
    return (
      <Modal transparent animationType="none" onRequestClose={animateEditClose}>
        <Animated.View style={[s.modalBackdrop, { opacity: editBackdropOpacity }]}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={animateEditClose} />
        </Animated.View>
        <Animated.View style={[s.editSheet, { transform: [{ translateY: Animated.add(editSheetY, editDragY) }] }]}>
          <View style={s.handleHitArea} {...editDismissPan.panHandlers}>
            <View style={s.handle} />
          </View>
          <View style={s.editHeader}>
            <Text style={s.editTitle}>Edit Contact</Text>
            <TouchableOpacity onPress={animateEditClose} style={s.closeBtn}><Text style={s.closeBtnText}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView style={s.editBody} showsVerticalScrollIndicator={false}>
            {(['name', 'title', 'company', 'phone', 'email', 'website', 'address'] as const).map((key) => (
              <View key={key} style={s.field}>
                <Text style={s.fieldLabel}>{key.toUpperCase()}</Text>
                <TextInput
                  style={s.fieldInput}
                  value={editData[key]}
                  onChangeText={(t) => setEditData({ ...editData, [key]: t })}
                  placeholder={key}
                  placeholderTextColor={colors.muted}
                />
              </View>
            ))}
            <View style={s.field}>
              <Text style={s.fieldLabel}>NOTES</Text>
              <TextInput
                style={[s.fieldInput, { minHeight: 72 }]}
                value={editData.notes}
                onChangeText={(t) => setEditData({ ...editData, notes: t })}
                placeholder="Notes"
                placeholderTextColor={colors.muted}
                multiline
              />
            </View>
          </ScrollView>
          <View style={s.editFooter}>
            <BouncyPress style={s.saveBtn} onPress={handleSave}><Text style={s.saveBtnText}>Save Changes</Text></BouncyPress>
            <BouncyPress style={s.deleteBtn} onPress={handleDelete}><Text style={s.deleteBtnText}>Delete Contact</Text></BouncyPress>
          </View>
        </Animated.View>
      </Modal>
    );
  }

  return (
    <Modal transparent animationType="none" onRequestClose={animateClose}>
      <Animated.View style={[s.modalBackdrop, { opacity: backdropOpacity }]}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={animateClose} />
      </Animated.View>
      <Animated.View style={[s.sheet, { transform: [{ translateY: Animated.add(sheetY, dragY) }] }]}>
        <View style={s.handleHitArea} {...dismissPan.panHandlers}>
          <View style={s.handle} />
        </View>
        <View style={s.detailHeader}>
          <TouchableOpacity onPress={animateClose} style={s.closeBtn}><Text style={s.closeBtnText}>✕</Text></TouchableOpacity>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <BouncyPress style={[s.editBtn, s.editBtnShare]} onPress={handleShare}>
              <Text style={[s.editBtnText, { color: colors.ink }]}>Share</Text>
            </BouncyPress>
            <BouncyPress style={s.editBtn} onPress={() => setMode('edit')}>
              <Text style={s.editBtnText}>Edit</Text>
            </BouncyPress>
          </View>
        </View>
        <ScrollView style={s.detailBody} showsVerticalScrollIndicator={false}>
          <View style={[s.avatar, { backgroundColor: avatarBg }]}>
            <Text style={s.avatarText}>{initial}</Text>
          </View>
          <Text style={s.detailName}>{contact.name || 'Unnamed'}</Text>
          {subtitle ? <Text style={s.detailSubtitle}>{subtitle}</Text> : null}
          <View style={s.actions}>
            {contact.phone ? (
              <BouncyPress style={s.actionBtn} onPress={() => Linking.openURL(`tel:${contact.phone}`)}>
                <Text style={s.actionIcon}>📞</Text><Text style={s.actionLabel}>Call</Text>
              </BouncyPress>
            ) : null}
            {contact.email ? (
              <BouncyPress style={s.actionBtn} onPress={() => Linking.openURL(`mailto:${contact.email}`)}>
                <Text style={s.actionIcon}>✉️</Text><Text style={s.actionLabel}>Email</Text>
              </BouncyPress>
            ) : null}
            {contact.phone ? (
              <BouncyPress style={s.actionBtn} onPress={() => Linking.openURL(`sms:${contact.phone}`)}>
                <Text style={s.actionIcon}>💬</Text><Text style={s.actionLabel}>Message</Text>
              </BouncyPress>
            ) : null}
          </View>
          {fields.length > 0 && (
            <View style={s.rows}>
              {fields.map((f, i) => (
                <View key={i} style={[s.row, i < fields.length - 1 && s.rowBorder]}>
                  <Text style={s.rowLabel}>{f.label.toUpperCase()}</Text>
                  {f.href ? (
                    <Text style={[s.rowValue, { color: colors.link }]} onPress={() => Linking.openURL(f.href!)}>{f.value}</Text>
                  ) : (
                    <Text style={s.rowValue}>{f.value}</Text>
                  )}
                </View>
              ))}
            </View>
          )}
          {catLabel ? <View style={s.catRow}><Text style={s.catTag}>{catLabel}</Text></View> : null}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(21,24,33,0.55)' },
    sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: c.panel, borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '88%', paddingBottom: 36 },
    handleHitArea: { paddingVertical: 12, alignItems: 'center' },
    handle: { width: 36, height: 4, backgroundColor: c.line, borderRadius: 999 },
    detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingTop: 10, paddingBottom: 4 },
    closeBtn: { width: 30, height: 30, borderRadius: 999, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' },
    closeBtnText: { fontSize: 12.5, color: c.muted },
    editBtn: { backgroundColor: c.accent, paddingHorizontal: 18, paddingVertical: 7, borderRadius: 10 },
    editBtnShare: { backgroundColor: c.bg },
    editBtnText: { color: c.onAccent, fontSize: 13, fontWeight: '700' },
    detailBody: { paddingHorizontal: 20, paddingTop: 4 },
    avatar: { width: 72, height: 72, borderRadius: 999, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginTop: 10, marginBottom: 14 },
    avatarText: { color: c.onAccent, fontSize: 28, fontWeight: '800' },
    detailName: { fontSize: 23, fontWeight: '800', letterSpacing: -0.5, textAlign: 'center', color: c.ink, marginBottom: 4 },
    detailSubtitle: { fontSize: 14, color: c.muted, textAlign: 'center', marginBottom: 20 },
    actions: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginBottom: 22 },
    actionBtn: { alignItems: 'center', gap: 5, backgroundColor: c.bg, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 18, minWidth: 68 },
    actionIcon: { fontSize: 20 },
    actionLabel: { fontSize: 11, fontWeight: '700', color: c.ink },
    rows: { backgroundColor: c.bg, borderRadius: 14, overflow: 'hidden' },
    row: { paddingVertical: 11, paddingHorizontal: 14 },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: c.line },
    rowLabel: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.7, color: c.muted, marginBottom: 2 },
    rowValue: { fontSize: 14.5, color: c.ink, fontWeight: '500' },
    catRow: { alignItems: 'center', marginTop: 16, marginBottom: 20 },
    catTag: { fontSize: 9.5, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', backgroundColor: c.accentSoft, color: c.accent, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2, overflow: 'hidden' },
    // Edit
    editSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: c.panel, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '92%' },
    editHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10 },
    editTitle: { fontSize: 17, fontWeight: '700', color: c.ink },
    editBody: { paddingHorizontal: 20, paddingBottom: 8 },
    field: { marginBottom: 8 },
    fieldLabel: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.5, color: c.muted, marginBottom: 4 },
    fieldInput: { borderWidth: 1, borderColor: c.line, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 10, fontSize: 14.5, color: c.ink, backgroundColor: c.panel },
    editFooter: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28, gap: 8, borderTopWidth: 1, borderTopColor: c.line },
    saveBtn: { backgroundColor: c.accent, borderRadius: 12, padding: 12, alignItems: 'center' },
    saveBtnText: { color: c.onAccent, fontWeight: '700', fontSize: 14 },
    deleteBtn: { backgroundColor: c.bg, borderWidth: 1, borderColor: c.danger, borderRadius: 12, padding: 12, alignItems: 'center' },
    deleteBtnText: { color: c.danger, fontWeight: '700', fontSize: 14 },
  });
}
