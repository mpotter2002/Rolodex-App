import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking, Modal,
  TextInput, Alert,
} from 'react-native';
import { colors, radius } from '../utils/theme';
import { Contact } from '../types/contact';
import { useContacts } from '../utils/ContactsContext';
import { getCategoryLabel, CATEGORIES } from '../data/categories';
import * as Clipboard from 'expo-clipboard';

interface Props {
  contact: Contact;
  onClose: () => void;
}

export default function ContactDetailSheet({ contact, onClose }: Props) {
  const { updateContact, removeContact } = useContacts();
  const [mode, setMode] = useState<'detail' | 'edit' | 'share'>('detail');
  const [editData, setEditData] = useState(contact);
  const [copied, setCopied] = useState(false);

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

  async function handleCopy() {
    await Clipboard.setStringAsync(formatShareText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleSave() {
    updateContact(editData);
    onClose();
  }

  function handleDelete() {
    Alert.alert('Delete Contact', `Remove ${contact.name || 'this contact'}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { removeContact(contact.id); onClose(); } },
    ]);
  }

  if (mode === 'share') {
    return (
      <Modal transparent animationType="slide" onRequestClose={() => setMode('detail')}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={() => setMode('detail')} />
        <View style={s.shareSheet}>
          <View style={s.handle} />
          <Text style={s.shareTitle}>Share Contact</Text>
          <View style={s.sharePreview}><Text style={s.sharePreviewText}>{formatShareText()}</Text></View>
          <TouchableOpacity style={[s.shareBtn, s.shareCopy]} onPress={handleCopy}>
            <Text style={s.shareBtnText}>📋 Copy to Clipboard</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.shareBtn, s.shareOther]} onPress={() => {
            Linking.openURL(`sms:?body=${encodeURIComponent(formatShareText())}`);
          }}>
            <Text style={s.shareOtherText}>💬 Send via Text</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.shareBtn, s.shareOther]} onPress={() => {
            const subj = contact.name ? `Contact: ${contact.name}` : 'Shared Contact';
            Linking.openURL(`mailto:?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(formatShareText())}`);
          }}>
            <Text style={s.shareOtherText}>✉️ Send via Email</Text>
          </TouchableOpacity>
          {copied ? <Text style={s.copiedMsg}>✓ Copied to clipboard!</Text> : null}
        </View>
      </Modal>
    );
  }

  if (mode === 'edit') {
    return (
      <Modal transparent animationType="slide" onRequestClose={() => setMode('detail')}>
        <View style={s.editContainer}>
          <View style={s.editSheet}>
            <View style={s.handle} />
            <View style={s.editHeader}>
              <Text style={s.editTitle}>Edit Contact</Text>
              <TouchableOpacity onPress={() => setMode('detail')} style={s.closeBtn}><Text style={s.closeBtnText}>✕</Text></TouchableOpacity>
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
              <TouchableOpacity style={s.saveBtn} onPress={handleSave}><Text style={s.saveBtnText}>Save Changes</Text></TouchableOpacity>
              <TouchableOpacity style={s.deleteBtn} onPress={handleDelete}><Text style={s.deleteBtnText}>Delete Contact</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={s.sheet}>
        <View style={s.handle} />
        <View style={s.detailHeader}>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}><Text style={s.closeBtnText}>✕</Text></TouchableOpacity>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={[s.editBtn, { backgroundColor: colors.bg }]} onPress={() => setMode('share')}>
              <Text style={[s.editBtnText, { color: colors.ink }]}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.editBtn} onPress={() => setMode('edit')}>
              <Text style={s.editBtnText}>Edit</Text>
            </TouchableOpacity>
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
              <TouchableOpacity style={s.actionBtn} onPress={() => Linking.openURL(`tel:${contact.phone}`)}>
                <Text style={s.actionIcon}>📞</Text><Text style={s.actionLabel}>Call</Text>
              </TouchableOpacity>
            ) : null}
            {contact.email ? (
              <TouchableOpacity style={s.actionBtn} onPress={() => Linking.openURL(`mailto:${contact.email}`)}>
                <Text style={s.actionIcon}>✉️</Text><Text style={s.actionLabel}>Email</Text>
              </TouchableOpacity>
            ) : null}
            {contact.phone ? (
              <TouchableOpacity style={s.actionBtn} onPress={() => Linking.openURL(`sms:${contact.phone}`)}>
                <Text style={s.actionIcon}>💬</Text><Text style={s.actionLabel}>Message</Text>
              </TouchableOpacity>
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
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(21,24,33,0.45)' },
  sheet: { backgroundColor: colors.panel, borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '88%', paddingBottom: 36, overflow: 'hidden' },
  handle: { width: 36, height: 4, backgroundColor: '#d1d5db', borderRadius: 999, alignSelf: 'center', marginTop: 10 },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingTop: 10, paddingBottom: 4 },
  closeBtn: { width: 30, height: 30, borderRadius: 999, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 12.5, color: colors.muted },
  editBtn: { backgroundColor: colors.ink, paddingHorizontal: 18, paddingVertical: 7, borderRadius: 10 },
  editBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  detailBody: { paddingHorizontal: 20, paddingTop: 4 },
  avatar: { width: 72, height: 72, borderRadius: 999, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginTop: 10, marginBottom: 14 },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  detailName: { fontSize: 23, fontWeight: '800', letterSpacing: -0.5, textAlign: 'center', color: colors.ink, marginBottom: 4 },
  detailSubtitle: { fontSize: 14, color: colors.muted, textAlign: 'center', marginBottom: 20 },
  actions: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginBottom: 22 },
  actionBtn: { alignItems: 'center', gap: 5, backgroundColor: colors.bg, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 18, minWidth: 68 },
  actionIcon: { fontSize: 20 },
  actionLabel: { fontSize: 11, fontWeight: '700', color: colors.ink },
  rows: { backgroundColor: colors.bg, borderRadius: 14, overflow: 'hidden' },
  row: { paddingVertical: 11, paddingHorizontal: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
  rowLabel: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.7, color: colors.muted, marginBottom: 2 },
  rowValue: { fontSize: 14.5, color: colors.ink, fontWeight: '500' },
  catRow: { alignItems: 'center', marginTop: 16, marginBottom: 20 },
  catTag: { fontSize: 9.5, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', backgroundColor: colors.accentSoft, color: colors.accent, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2, overflow: 'hidden' },
  // Share
  shareSheet: { backgroundColor: colors.panel, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, gap: 12 },
  shareTitle: { fontSize: 17, fontWeight: '800', textAlign: 'center' },
  sharePreview: { backgroundColor: colors.bg, borderRadius: 12, padding: 14, maxHeight: 140 },
  sharePreviewText: { fontSize: 13, color: colors.ink, lineHeight: 20 },
  shareBtn: { padding: 12, borderRadius: 12, alignItems: 'center' },
  shareCopy: { backgroundColor: colors.accent },
  shareBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  shareOther: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line },
  shareOtherText: { color: colors.ink, fontWeight: '700', fontSize: 14 },
  copiedMsg: { textAlign: 'center', color: colors.success, fontWeight: '700', fontSize: 12.5 },
  // Edit
  editContainer: { flex: 1, justifyContent: 'flex-end' },
  editSheet: { backgroundColor: colors.panel, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '92%' },
  editHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10 },
  editTitle: { fontSize: 17, fontWeight: '700' },
  editBody: { paddingHorizontal: 20, paddingBottom: 8 },
  field: { marginBottom: 8 },
  fieldLabel: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.5, color: '#647082', marginBottom: 4 },
  fieldInput: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 10, fontSize: 14.5, color: colors.ink, backgroundColor: '#fff' },
  editFooter: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28, gap: 8, borderTopWidth: 1, borderTopColor: colors.line },
  saveBtn: { backgroundColor: colors.accent, borderRadius: 12, padding: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  deleteBtn: { backgroundColor: '#fff5f5', borderWidth: 1, borderColor: '#f1c5c5', borderRadius: 12, padding: 12, alignItems: 'center' },
  deleteBtnText: { color: colors.danger, fontWeight: '700', fontSize: 14 },
});
