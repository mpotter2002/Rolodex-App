import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Contact } from '../types/contact';
import {
  loadOrSeedContacts,
  saveContacts,
  fetchContactsFromSupabase,
  upsertContactToSupabase,
  upsertContactsBatchToSupabase,
  deleteContactFromSupabase,
} from './storage';
import { generateDemoContacts } from '../data/demoContacts';

interface ContactsState {
  contacts: Contact[];
  loading: boolean;
  addContact: (contact: Contact) => void;
  updateContact: (contact: Contact) => void;
  removeContact: (id: string) => void;
  reloadDemo: () => void;
  clearAll: () => void;
  importContacts: (newContacts: Contact[]) => void;
}

const ContactsContext = createContext<ContactsState>({
  contacts: [],
  loading: true,
  addContact: () => {},
  updateContact: () => {},
  removeContact: () => {},
  reloadDemo: () => {},
  clearAll: () => {},
  importContacts: () => {},
});

interface Props {
  children: React.ReactNode;
  userId?: string | null; // pass the Supabase user id when logged in
}

export function ContactsProvider({ children, userId }: Props) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  // ─── load on mount / user change ─────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      if (userId) {
        // Try Supabase first; fall back to local cache if offline
        const remote = await fetchContactsFromSupabase(userId);
        if (!cancelled) {
          if (remote !== null) {
            // Got remote data — seed local cache and use it
            if (remote.length === 0) {
              // First time user: seed with demo contacts and push to Supabase
              const demo = generateDemoContacts();
              await saveContacts(demo);
              await upsertContactsBatchToSupabase(demo, userId);
              setContacts(demo);
            } else {
              await saveContacts(remote);
              setContacts(remote);
            }
          } else {
            // Offline — use local cache
            const local = await loadOrSeedContacts();
            setContacts(local);
          }
        }
      } else {
        // Not signed in — use local storage only
        const local = await loadOrSeedContacts();
        if (!cancelled) setContacts(local);
      }

      if (!cancelled) setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [userId]);

  // ─── write helpers ────────────────────────────────────────────────────────

  /** Write to local cache immediately; push to Supabase in the background */
  const persist = useCallback((updated: Contact[]) => {
    setContacts(updated);
    saveContacts(updated); // fire and forget
  }, []);

  // ─── public API ───────────────────────────────────────────────────────────

  const addContact = useCallback((contact: Contact) => {
    const updated = [contact, ...contacts];
    persist(updated);
    if (userId) upsertContactToSupabase(contact, userId);
  }, [contacts, persist, userId]);

  const updateContact = useCallback((contact: Contact) => {
    const updated = contacts.map((c) => (c.id === contact.id ? contact : c));
    persist(updated);
    if (userId) upsertContactToSupabase(contact, userId);
  }, [contacts, persist, userId]);

  const removeContact = useCallback((id: string) => {
    const updated = contacts.filter((c) => c.id !== id);
    persist(updated);
    if (userId) deleteContactFromSupabase(id);
  }, [contacts, persist, userId]);

  const reloadDemo = useCallback(() => {
    const demo = generateDemoContacts();
    persist(demo);
    if (userId) upsertContactsBatchToSupabase(demo, userId);
  }, [persist, userId]);

  const clearAll = useCallback(() => {
    persist([]);
    // Note: we do NOT delete from Supabase on clearAll (destructive, only local)
  }, [persist]);

  const importContacts = useCallback((newContacts: Contact[]) => {
    const existingIds = new Set(contacts.map((c) => c.phone || c.name));
    const unique = newContacts.filter((c) => !existingIds.has(c.phone || c.name));
    const updated = [...unique, ...contacts];
    persist(updated);
    if (userId) upsertContactsBatchToSupabase(unique, userId);
  }, [contacts, persist, userId]);

  return (
    <ContactsContext.Provider
      value={{ contacts, loading, addContact, updateContact, removeContact, reloadDemo, clearAll, importContacts }}
    >
      {children}
    </ContactsContext.Provider>
  );
}

export function useContacts() {
  return useContext(ContactsContext);
}
