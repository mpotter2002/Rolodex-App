import AsyncStorage from '@react-native-async-storage/async-storage';
import { Contact } from '../types/contact';
import { generateDemoContacts } from '../data/demoContacts';

const CONTACTS_KEY = 'rolo_contacts_v1';
const ONBOARDED_KEY = 'rolo_onboarded';
const ACCOUNT_KEY = 'rolo_account';

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

export async function isOnboarded(): Promise<boolean> {
  const val = await AsyncStorage.getItem(ONBOARDED_KEY);
  return val === '1';
}

export async function setOnboarded(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDED_KEY, '1');
}

export async function loadAccount(): Promise<{ name: string; email: string }> {
  try {
    const raw = await AsyncStorage.getItem(ACCOUNT_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { name: 'Michael', email: 'mpotter2002@gmail.com' };
}

export async function saveAccount(name: string, email: string): Promise<void> {
  await AsyncStorage.setItem(ACCOUNT_KEY, JSON.stringify({ name, email }));
}

export async function clearAll(): Promise<void> {
  await AsyncStorage.multiRemove([CONTACTS_KEY, ONBOARDED_KEY, ACCOUNT_KEY]);
}
