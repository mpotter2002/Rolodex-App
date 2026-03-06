import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../utils/theme';
import { useContacts } from '../utils/ContactsContext';
import { CATEGORIES, suggestCategory } from '../data/categories';
import { Contact } from '../types/contact';
import { useNavigation } from '@react-navigation/native';

const emptyForm = { name: '', title: '', company: '', phone: '', email: '', website: '', address: '', notes: '', category: '' };

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const { addContact } = useContacts();
  const navigation = useNavigation<any>();
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState('Upload a card image to start.');

  function updateField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function clearForm() {
    setForm(emptyForm);
    setStatus('Form cleared.');
  }

  function handleSubmit() {
    if (!form.name && !form.company && !form.email && !form.phone) {
      setStatus('Add at least a name, company, email, or phone.');
      return;
    }
    const cat = form.category || suggestCategory(form.title, form.company);
    const contact: Contact = {
      ...form,
      category: cat,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      createdAt: new Date().toISOString(),
    };
    addContact(contact);
    setForm(emptyForm);
    setStatus('Contact added to your Rolo.');
    navigation.navigate('Deck');
  }

  return (
    <ScrollView
      style={[s.container, { paddingTop: insets.top + 14 }]}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Upload area */}
      <View style={s.card}>
        <View style={s.upload}>
          <Text style={s.uploadIcon}>#</Text>
          <Text style={s.uploadTitle}>Tap to take a card photo</Text>
          <Text style={s.uploadSub}>or upload from your gallery</Text>
        </View>
        <View style={s.actions}>
          <TouchableOpacity style={[s.btn, s.btnPrimary]}>
            <Text style={s.btnPrimaryText}>Extract From Card</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btn, s.btnSubtle]} onPress={clearForm}>
            <Text style={s.btnSubtleText}>Clear Form</Text>
          </TouchableOpacity>
        </View>
        <Text style={s.status}>{status}</Text>
      </View>

      {/* Contact form */}
      <View style={s.card}>
        {[
          { key: 'name', label: 'Name', placeholder: 'Alex Johnson' },
          { key: 'title', label: 'Title', placeholder: 'Head of Partnerships' },
          { key: 'company', label: 'Company', placeholder: 'Northline Studio' },
          { key: 'phone', label: 'Phone', placeholder: '(555) 555-1212' },
          { key: 'email', label: 'Email', placeholder: 'alex@northline.com' },
          { key: 'website', label: 'Website', placeholder: 'northline.com' },
          { key: 'address', label: 'Address', placeholder: '123 Main St, Austin, TX' },
        ].map((f) => (
          <View key={f.key} style={s.field}>
            <Text style={s.fieldLabel}>{f.label.toUpperCase()}</Text>
            <TextInput
              style={s.fieldInput}
              value={(form as any)[f.key]}
              onChangeText={(t) => updateField(f.key, t)}
              placeholder={f.placeholder}
              placeholderTextColor={colors.muted}
              autoCapitalize={f.key === 'email' || f.key === 'website' ? 'none' : 'words'}
              keyboardType={f.key === 'email' ? 'email-address' : f.key === 'phone' ? 'phone-pad' : 'default'}
            />
          </View>
        ))}
        <View style={s.field}>
          <Text style={s.fieldLabel}>NOTES</Text>
          <TextInput
            style={[s.fieldInput, { minHeight: 72, textAlignVertical: 'top' }]}
            value={form.notes}
            onChangeText={(t) => updateField('notes', t)}
            placeholder="Optional notes from meeting, project, etc."
            placeholderTextColor={colors.muted}
            multiline
          />
        </View>
        <TouchableOpacity style={[s.btn, s.btnPrimary, { marginTop: 8 }]} onPress={handleSubmit}>
          <Text style={s.btnPrimaryText}>Add To Rolo</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.panel },
  content: { paddingHorizontal: 14, paddingBottom: 120, gap: 12 },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e7edf5', borderRadius: 20, padding: 12, gap: 8 },
  upload: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#b8c6d8', borderRadius: 16, minHeight: 140, alignItems: 'center', justifyContent: 'center', padding: 16 },
  uploadIcon: { fontSize: 18, marginBottom: 8, opacity: 0.5 },
  uploadTitle: { fontWeight: '700', fontSize: 14, color: colors.ink, marginBottom: 4 },
  uploadSub: { fontSize: 13, color: colors.muted },
  actions: { flexDirection: 'row', gap: 8, marginTop: 6 },
  btn: { flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  btnPrimary: { backgroundColor: colors.accent },
  btnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  btnSubtle: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line },
  btnSubtleText: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  status: { fontSize: 13, color: colors.muted, minHeight: 18 },
  field: { marginBottom: 4 },
  fieldLabel: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.5, color: '#647082', marginBottom: 4 },
  fieldInput: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 10, fontSize: 14.5, color: colors.ink, backgroundColor: '#fff' },
});
