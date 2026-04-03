import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Image, Platform, Animated, ActivityIndicator,
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
import { extractCardWithAi } from '../utils/cardExtraction';
import { StructuredScanResult } from '../types/scan';

const emptyForm = { name: '', title: '', company: '', phone: '', email: '', website: '', address: '', notes: '', category: '' };
type FormFieldKey = keyof typeof emptyForm;
type CandidateFieldKey = Exclude<keyof StructuredScanResult['candidates'], 'notes'>;
type ReviewSelectionState = Record<CandidateFieldKey, string[]>;

const candidateFieldConfig: Array<{
  candidateKey: CandidateFieldKey;
  formKey: FormFieldKey;
  label: string;
  multiSelect?: boolean;
}> = [
  { candidateKey: 'names', formKey: 'name', label: 'Names', multiSelect: true },
  { candidateKey: 'titles', formKey: 'title', label: 'Titles' },
  { candidateKey: 'companies', formKey: 'company', label: 'Companies' },
  { candidateKey: 'phones', formKey: 'phone', label: 'Phone Numbers', multiSelect: true },
  { candidateKey: 'emails', formKey: 'email', label: 'Emails', multiSelect: true },
  { candidateKey: 'websites', formKey: 'website', label: 'Websites', multiSelect: true },
  { candidateKey: 'addresses', formKey: 'address', label: 'Addresses' },
];

const emptyReviewSelections = (): ReviewSelectionState => ({
  names: [],
  titles: [],
  companies: [],
  phones: [],
  emails: [],
  websites: [],
  addresses: [],
});

interface SelectedImage {
  uri: string;
  mimeType?: string | null;
  base64?: string | null;
}

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const { addContact, importContacts } = useContacts();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [form, setForm] = useState(emptyForm);
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [status, setStatus] = useState('Upload a card image to start.');
  const [extracting, setExtracting] = useState(false);
  const [reviewResult, setReviewResult] = useState<StructuredScanResult | null>(null);
  const [reviewSelections, setReviewSelections] = useState<ReviewSelectionState>(emptyReviewSelections);

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
    setSelectedImage(null);
    setReviewResult(null);
    setReviewSelections(emptyReviewSelections());
    setStatus('Form cleared.');
  }

  function buildInitialReviewSelections(result: StructuredScanResult): ReviewSelectionState {
    const selections = emptyReviewSelections();

    for (const field of candidateFieldConfig) {
      const candidates = result.candidates[field.candidateKey];
      const primaryValue = result.primary[field.formKey as keyof typeof result.primary];
      const preferred = [primaryValue, ...candidates].find((value) => Boolean(value?.trim()));
      if (preferred) {
        selections[field.candidateKey] = [preferred];
      }
    }

    return selections;
  }

  function applyReviewSelections(nextSelections: ReviewSelectionState, result: StructuredScanResult) {
    const nextForm = {
      ...emptyForm,
      notes: result.primary.notes || '',
      category: '',
    };

    const extraNoteLines: string[] = [];

    for (const field of candidateFieldConfig) {
      const selectedValues = nextSelections[field.candidateKey].filter(Boolean);
      nextForm[field.formKey] = selectedValues[0] || '';

      if (field.multiSelect && selectedValues.length > 1) {
        extraNoteLines.push(`${field.label}: ${selectedValues.slice(1).join(' • ')}`);
      }
    }

    const noteCandidates = result.candidates.notes.filter(Boolean);
    const noteParts = [nextForm.notes, ...noteCandidates, ...extraNoteLines]
      .map((value) => value.trim())
      .filter(Boolean);
    const uniqueNotes = Array.from(new Set(noteParts));

    nextForm.notes = uniqueNotes.join('\n');
    nextForm.category = suggestCategory(nextForm.title, nextForm.company);

    setForm(nextForm);
  }

  function setReviewState(result: StructuredScanResult) {
    const nextSelections = buildInitialReviewSelections(result);
    setReviewResult(result);
    setReviewSelections(nextSelections);
    applyReviewSelections(nextSelections, result);
  }

  function toggleReviewValue(field: CandidateFieldKey, value: string, multiSelect = false) {
    if (!reviewResult) return;

    setReviewSelections((prev) => {
      const currentValues = prev[field];
      const exists = currentValues.includes(value);
      const nextValues = multiSelect
        ? (exists ? currentValues.filter((item) => item !== value) : [...currentValues, value])
        : (exists ? currentValues : [value]);

      const normalizedNext = multiSelect && nextValues.length === 0
        ? currentValues
        : nextValues;

      const nextSelections = {
        ...prev,
        [field]: normalizedNext,
      };
      applyReviewSelections(nextSelections, reviewResult);
      return nextSelections;
    });
  }

  function buildContactsFromReviewSelections(): Contact[] {
    const names = reviewSelections.names.filter(Boolean);
    if (!reviewResult || names.length <= 1) {
      return [];
    }

    const titles = reviewSelections.titles.filter(Boolean);
    const companies = reviewSelections.companies.filter(Boolean);
    const addresses = reviewSelections.addresses.filter(Boolean);
    const phones = reviewSelections.phones.filter(Boolean);
    const emails = reviewSelections.emails.filter(Boolean);
    const websites = reviewSelections.websites.filter(Boolean);

    const pickSharedOrIndexed = (values: string[], index: number) => {
      if (values.length === names.length) return values[index] || '';
      if (values.length === 1) return values[0];
      return values[0] || '';
    };

    return names.map((name, index) => {
      const title = pickSharedOrIndexed(titles, index) || form.title;
      const company = pickSharedOrIndexed(companies, index) || form.company;
      const address = pickSharedOrIndexed(addresses, index) || form.address;
      const phone = pickSharedOrIndexed(phones, index) || '';
      const email = pickSharedOrIndexed(emails, index) || '';
      const website = pickSharedOrIndexed(websites, index) || '';
      const sharedValueNotes = [
        phones.length === 1 && phone ? `Shared phone on card: ${phone}` : '',
        emails.length === 1 && email ? `Shared email on card: ${email}` : '',
        websites.length === 1 && website ? `Shared website on card: ${website}` : '',
      ].filter(Boolean);

      const notes = [
        form.notes,
        `Imported from a shared business card with: ${names.filter((entry) => entry !== name).join(', ')}`,
        ...sharedValueNotes,
      ]
        .map((value) => value.trim())
        .filter(Boolean)
        .filter((value, noteIndex, all) => all.indexOf(value) === noteIndex)
        .join('\n');

      return {
        id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`,
        name,
        title,
        company,
        phone,
        email,
        website,
        address,
        notes,
        category: suggestCategory(title, company),
        createdAt: new Date().toISOString(),
      };
    });
  }

  function setImageFromAsset(asset: ImagePicker.ImagePickerAsset) {
    setSelectedImage({
      uri: asset.uri,
      mimeType: asset.mimeType,
      base64: asset.base64 ?? null,
    });
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
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setImageFromAsset(result.assets[0]);
      setStatus('Image ready. Click "Extract From Card".');
    }
  }

  async function takePhoto() {
    const { status: permStatus } = await ImagePicker.requestCameraPermissionsAsync();
    if (permStatus !== 'granted') {
      setStatus('Permission to access camera was denied.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({ quality: 0.8, base64: true });

    if (!result.canceled && result.assets[0]) {
      setImageFromAsset(result.assets[0]);
      setStatus('Photo captured. Click "Extract From Card".');
    }
  }

  async function handleExtract() {
    if (!selectedImage?.uri) {
      setStatus('Upload a business card image first.');
      return;
    }
    setExtracting(true);
    setStatus('Reading card text and organizing contact fields...');

    try {
      const rawText = await recognizeText(selectedImage.uri);

      if (!rawText) {
        setStatus('No text detected. Try a clearer photo or enter details manually.');
        return;
      }

      const fallback = parseCardText(rawText);
      let parsed = {
        name: fallback.name,
        title: fallback.title,
        company: fallback.company,
        phone: fallback.phone,
        email: fallback.email,
        website: fallback.website,
        address: fallback.address,
        notes: fallback.notes,
      };
      let ambiguityMessage = '';

      try {
        const mimeType = selectedImage.mimeType || 'image/jpeg';
        const imageDataUrl = selectedImage.base64
          ? `data:${mimeType};base64,${selectedImage.base64}`
          : null;

        const aiResult = await extractCardWithAi({
          rawText,
          imageDataUrl,
        });

        parsed = {
          name: aiResult.primary.name || fallback.name,
          title: aiResult.primary.title || fallback.title,
          company: aiResult.primary.company || fallback.company,
          phone: aiResult.primary.phone || fallback.phone,
          email: aiResult.primary.email || fallback.email,
          website: aiResult.primary.website || fallback.website,
          address: aiResult.primary.address || fallback.address,
          notes: aiResult.primary.notes || fallback.notes,
        };

        if (aiResult.multipleDetected) {
          ambiguityMessage = ' Multiple values detected on the card. Review carefully before saving.';
        } else if (aiResult.needsReview) {
          ambiguityMessage = ' A few fields may need a quick review.';
        }

        if (aiResult.multipleDetected || aiResult.needsReview) {
          setReviewState(aiResult);
        } else {
          setReviewResult(null);
          setReviewSelections(emptyReviewSelections());
        }
      } catch (aiError) {
        console.warn('AI extraction fallback:', aiError);
        setReviewResult(null);
        setReviewSelections(emptyReviewSelections());
      }

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
      setStatus(`Details extracted.${ambiguityMessage} Review and tap Add To Rolo.`);
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

    const reviewContacts = buildContactsFromReviewSelections();
    if (reviewContacts.length > 1) {
      importContacts(reviewContacts);
      setForm(emptyForm);
      setSelectedImage(null);
      setReviewResult(null);
      setReviewSelections(emptyReviewSelections());
      setStatus(`${reviewContacts.length} contacts added to your Rolo.`);
      navigation.navigate('Deck');
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
    setSelectedImage(null);
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
        <TouchableOpacity style={s.upload} activeOpacity={0.7} onPress={takePhoto}>
          {selectedImage?.uri ? (
            <Image source={{ uri: selectedImage.uri }} style={s.preview} />
          ) : (
            <View style={s.uploadContent}>
              <View style={s.uploadIconWrap}><Text style={s.uploadIcon}>📷</Text></View>
              <Text style={s.uploadTitle}>Tap to take a card photo</Text>
              <Text style={s.uploadSub}>or use the buttons below</Text>
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
      {reviewResult && (
        <View style={s.card}>
          <View style={s.reviewHeader}>
            <View>
              <Text style={s.reviewTitle}>Review extracted choices</Text>
              <Text style={s.reviewSub}>
                Pick the values you want to keep before saving. If you select multiple names, Rolo will create one contact per name and preserve shared values in notes.
              </Text>
            </View>
            <TouchableOpacity style={s.reviewDismiss} onPress={() => setReviewResult(null)}>
              <Text style={s.reviewDismissText}>Hide</Text>
            </TouchableOpacity>
          </View>

          {candidateFieldConfig.map((field) => {
            const candidates = Array.from(new Set([
              ...reviewResult.candidates[field.candidateKey],
              reviewResult.primary[field.formKey as keyof typeof reviewResult.primary],
            ].filter(Boolean)));

            if (candidates.length <= 1 && !reviewResult.multipleDetected) {
              return null;
            }

            return (
              <View key={field.candidateKey} style={s.reviewGroup}>
                <Text style={s.reviewGroupLabel}>
                  {field.label.toUpperCase()}
                  {field.multiSelect ? ' · MULTI-SELECT' : ''}
                </Text>
                <View style={s.reviewChipWrap}>
                  {candidates.map((candidate) => {
                    const selected = reviewSelections[field.candidateKey].includes(candidate);
                    return (
                      <TouchableOpacity
                        key={`${field.candidateKey}-${candidate}`}
                        style={[s.reviewChip, selected && s.reviewChipSelected]}
                        onPress={() => toggleReviewValue(field.candidateKey, candidate, field.multiSelect)}
                        activeOpacity={0.8}
                      >
                        <Text style={[s.reviewChipText, selected && s.reviewChipTextSelected]}>
                          {candidate}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
      )}

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
          <Text style={s.btnPrimaryText}>
            {reviewSelections.names.filter(Boolean).length > 1 ? 'Add Contacts To Rolo' : 'Add To Rolo'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
    {extracting && (
      <View style={s.loadingOverlay}>
        <View style={s.loadingCard}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={s.loadingTitle}>Extracting card details</Text>
          <Text style={s.loadingText}>
            Reading the card and organizing the contact info. This can take a few seconds.
          </Text>
        </View>
      </View>
    )}
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
    reviewHeader: { flexDirection: 'row', gap: 12, justifyContent: 'space-between', alignItems: 'flex-start' },
    reviewTitle: { fontSize: 15, fontWeight: '800', color: c.ink, marginBottom: 4 },
    reviewSub: { fontSize: 12.5, lineHeight: 18, color: c.muted, maxWidth: '92%' },
    reviewDismiss: {
      paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: c.line,
      backgroundColor: c.panel,
    },
    reviewDismissText: { fontSize: 12, fontWeight: '700', color: c.ink },
    reviewGroup: { gap: 8, marginTop: 4 },
    reviewGroupLabel: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.5, color: c.muted },
    reviewChipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    reviewChip: {
      paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: c.line,
      backgroundColor: c.panel,
    },
    reviewChipSelected: { backgroundColor: c.accentSoft, borderColor: c.accent },
    reviewChipText: { fontSize: 13, fontWeight: '600', color: c.ink },
    reviewChipTextSelected: { color: c.accent },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.38)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    loadingCard: {
      width: '100%',
      maxWidth: 320,
      borderRadius: 20,
      paddingHorizontal: 20,
      paddingVertical: 18,
      backgroundColor: c.bg,
      borderWidth: 1,
      borderColor: c.line,
      alignItems: 'center',
      gap: 10,
    },
    loadingTitle: { fontSize: 15, fontWeight: '800', color: c.ink },
    loadingText: { fontSize: 13, lineHeight: 19, color: c.muted, textAlign: 'center' },
    field: { marginBottom: 4 },
    fieldLabel: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.5, color: c.muted, marginBottom: 4 },
    fieldInput: {
      borderWidth: 1, borderColor: c.line, borderRadius: 12, paddingHorizontal: 11,
      paddingVertical: 10, fontSize: 14.5, color: c.ink, backgroundColor: c.panel,
    },
  });
}
