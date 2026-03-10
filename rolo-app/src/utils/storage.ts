import AsyncStorage from '@react-native-async-storage/async-storage';
import { Contact } from '../types/contact';
import { generateDemoContacts } from '../data/demoContacts';
import { supabase } from './supabase';

// ─── local storage keys ───────────────────────────────────────────────────────

const CONTACTS_KEY = 'rolo_contacts_v1';
const ONBOARDED_KEY = 'rolo_onboarded';
const ACCOUNT_KEY = 'rolo_account';

// ─── local contact storage ────────────────────────────────────────────────────

export async function loadContacts(): Promise<Contact[]> {
  try {
    const raw = await AsyncStorage.getItem(CONTACTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
    return [];
  } catch {
    return [];
  }
}

export async function saveContacts(contacts: Contact[]): Promise<void> {
  await AsyncStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
}

export async function loadOrSeedContacts(): Promise<Contact[]> {
  const existing = await loadContacts();
  if (existing.length > 0) return existing;
  const demo = generateDemoContacts();
  await saveContacts(demo);
  return demo;
}

// ─── onboarding ───────────────────────────────────────────────────────────────

export async function isOnboarded(): Promise<boolean> {
  const val = await AsyncStorage.getItem(ONBOARDED_KEY);
  return val === '1';
}

export async function setOnboarded(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDED_KEY, '1');
}

// ─── account (profile display only — source of truth is Supabase Auth) ───────

export async function loadAccount(): Promise<{ name: string; email: string }> {
  try {
    const raw = await AsyncStorage.getItem(ACCOUNT_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { name: '', email: '' };
}

export async function saveAccount(name: string, email: string): Promise<void> {
  await AsyncStorage.setItem(ACCOUNT_KEY, JSON.stringify({ name, email }));
}

export async function clearAll(): Promise<void> {
  await AsyncStorage.removeItem(CONTACTS_KEY);
  await AsyncStorage.removeItem(ONBOARDED_KEY);
  await AsyncStorage.removeItem(ACCOUNT_KEY);
}

// ─── Supabase contact sync ────────────────────────────────────────────────────

/** Convert camelCase Contact to Supabase row shape */
function toRow(contact: Contact, userId: string) {
  return {
    id: contact.id,
    user_id: userId,
    name: contact.name,
    title: contact.title,
    company: contact.company,
    phone: contact.phone,
    email: contact.email,
    website: contact.website,
    address: contact.address,
    notes: contact.notes,
    category: contact.category,
    card_colors: contact.cardColors ?? null,
    created_at: contact.createdAt,
  };
}

/** Convert Supabase row to camelCase Contact */
function fromRow(row: Record<string, unknown>): Contact {
  return {
    id: row.id as string,
    name: (row.name as string) ?? '',
    title: (row.title as string) ?? '',
    company: (row.company as string) ?? '',
    phone: (row.phone as string) ?? '',
    email: (row.email as string) ?? '',
    website: (row.website as string) ?? '',
    address: (row.address as string) ?? '',
    notes: (row.notes as string) ?? '',
    category: (row.category as string) ?? '',
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    cardColors: row.card_colors as Contact['cardColors'] ?? undefined,
  };
}

/** Fetch all contacts for a user from Supabase */
export async function fetchContactsFromSupabase(userId: string): Promise<Contact[] | null> {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[Supabase] fetchContacts error:', error.message);
    return null;
  }
  return (data ?? []).map(fromRow);
}

/** Upsert a single contact to Supabase */
export async function upsertContactToSupabase(contact: Contact, userId: string): Promise<void> {
  const { error } = await supabase
    .from('contacts')
    .upsert(toRow(contact, userId), { onConflict: 'id' });

  if (error) {
    console.warn('[Supabase] upsertContact error:', error.message);
  }
}

/** Upsert a batch of contacts (used for initial sync / demo seed) */
export async function upsertContactsBatchToSupabase(contacts: Contact[], userId: string): Promise<void> {
  if (contacts.length === 0) return;
  const { error } = await supabase
    .from('contacts')
    .upsert(contacts.map((c) => toRow(c, userId)), { onConflict: 'id' });

  if (error) {
    console.warn('[Supabase] upsertBatch error:', error.message);
  }
}

/** Delete a contact from Supabase */
export async function deleteContactFromSupabase(id: string): Promise<void> {
  const { error } = await supabase.from('contacts').delete().eq('id', id);
  if (error) {
    console.warn('[Supabase] deleteContact error:', error.message);
  }
}
