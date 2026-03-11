import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Image, Platform, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { ColorPalette } from '../utils/theme';
import { useTheme } from '../utils/ThemeContext';
import { useContacts } from '../utils/ContactsContext';
import { suggestCategory } from '../data/categories';
import { Contact } from '../types/contact';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { recognizeText, parseCardText } from '../utils/ocr';

const emptyForm = { name: '', title: '', company: '', phone: '', email: '', website: '', address: '', notes: '', category: '' };

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const { addContact } = useContacts();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [form, setForm] = useState(emptyForm);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [status, setStatus] = useState('Upload a card image to start.');
  const [extracting, setExtracting] = useState(false);

  const mountOpacity = useRef(new Animated.Value(0)).current;
  const mountY = useRef(new Animated.Value(28)).current;

  useFocusEffect(useCallback(() => {
    mountOpacity.setValue(0);
    mountY.setValue(28);
    Animated.parallel([
      Animated.timing(mountOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.spring(mountY, { toValue: 0, tension: 80, friction: 14, useNativeDriver: true }),
    ]).start();
  }, []));

  function updateField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function clearForm() {
    setForm(emptyForm);
    setImageUri(null);
    setStatus('Form cleared.');
  }

  async function pickImage() {
    const { status: permStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permStatus !== 'granted') {
      setStatus('Permission to access photos was denied.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setStatus('Image ready. Click "Extract From Card".');
    }
  }

  async function takePhoto() {
    const { status: permStatus } = await ImagePicker.requestCameraPermissionsAsync();
    if (permStatus !== 'granted') {
      setStatus('Permission to access camera was denied.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setStatus('Photo captured. Click "Extract From Card".');
    }
  }

  async function handleExtract() {
    if (!imageUri) {
      setStatus('Upload a business card image first.');
      return;
    }
    setExtracting(true);
    setStatus('Reading card text with AI OCR...');

    try {
      const rawText = await recognizeText(imageUri);

      if (!rawText) {
        setStatus('No text detected. Try a clearer photo or enter details manually.');
        return;
      }

      const parsed = parseCardText(rawText);
      setForm({
        name: parsed.name,
        title: parsed.title,
        company: parsed.company,
        phone: parsed.phone,
        email: parsed.email,
        website: parsed.website,
        address: parsed.address,
        notes: parsed.notes,
        category: suggestCategory(parsed.title, parsed.company),
      });
      setStatus('Details extracted. Review and tap Add To Rolo.');
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('not available') || msg.includes('native') || msg.includes('undefined')) {
        setStatus('OCR requires a native build. Run: eas build --profile development');
      } else {
        setStatus('Could not extract text. Fill in details manually.');
      }
      console.warn('OCR error:', err);
    } finally {
      setExtracting(false);
    }
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
    setImageUri(null);
    setStatus('Contact added to your Rolo.');
    navigation.navigate('Deck');
  }

  return (
    <Animated.View style={[s.container, { opacity: mountOpacity, transform: [{ translateY: mountY }] }]}>
    <ScrollView
      style={{ flex: 1, paddingTop: insets.top + 14 }}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Upload area */}
      <View style={s.card}>
        <TouchableOpacity style={s.upload} activeOpacity={0.7} onPress={pickImage}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={s.preview} />
          ) : (
            <View style={s.uploadContent}>
              <View style={s.uploadIconWrap}><Text style={s.uploadIcon}>#</Text></View>
              <Text style={s.uploadTitle}>Tap to take a card photo</Text>
              <Text style={s.uploadSub}>or upload from your gallery</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={s.photoActions}>
          <TouchableOpacity style={s.photoBtn} onPress={takePhoto}>
            <Text style={s.photoBtnText}>📷 Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.photoBtn} onPress={pickImage}>
            <Text style={s.photoBtnText}>🖼️ Gallery</Text>
          </TouchableOpacity>
        </View>

        <View style={s.actions}>
          <TouchableOpacity
            style={[s.btn, s.btnPrimary, extracting && { opacity: 0.7 }]}
            onPress={handleExtract}
            disabled={extracting}
          >
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
    </Animated.View>
  );
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.panel },
    content: { paddingHorizontal: 14, paddingBottom: 120, gap: 12 },
    card: { backgroundColor: c.bg, borderRadius: 20, padding: 12, gap: 8 },
    upload: {
      borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.line, borderRadius: 16,
      minHeight: 160, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      backgroundColor: c.panel,
    },
    uploadContent: { alignItems: 'center', padding: 16 },
    uploadIconWrap: {
      width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
      backgroundColor: c.accentSoft, marginBottom: 8,
    },
    uploadIcon: { fontSize: 16 },
    uploadTitle: { fontWeight: '700', fontSize: 14, color: c.ink, marginBottom: 4 },
    uploadSub: { fontSize: 13, color: c.muted },
    preview: { width: '100%', height: 200, resizeMode: 'cover' },
    photoActions: { flexDirection: 'row', gap: 8 },
    photoBtn: {
      flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: c.line,
      alignItems: 'center', backgroundColor: c.panel,
    },
    photoBtnText: { fontSize: 13, fontWeight: '600', color: c.ink },
    actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
    btn: { flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
    btnPrimary: { backgroundColor: c.accent },
    btnPrimaryText: { color: c.onAccent, fontSize: 14, fontWeight: '700' },
    btnSubtle: { backgroundColor: c.panel, borderWidth: 1, borderColor: c.line },
    btnSubtleText: { color: c.ink, fontSize: 14, fontWeight: '700' },
    status: { fontSize: 13, color: c.muted, minHeight: 18 },
    field: { marginBottom: 4 },
    fieldLabel: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.5, color: c.muted, marginBottom: 4 },
    fieldInput: {
      borderWidth: 1, borderColor: c.line, borderRadius: 12, paddingHorizontal: 11,
      paddingVertical: 10, fontSize: 14.5, color: c.ink, backgroundColor: c.panel,
    },
  });
}
