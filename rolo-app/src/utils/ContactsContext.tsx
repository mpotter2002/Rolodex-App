import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Contact } from '../types/contact';
import { loadOrSeedContacts, saveContacts } from './storage';
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

export function ContactsProvider({ children }: { children: React.ReactNode }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrSeedContacts().then((c) => {
      setContacts(c);
      setLoading(false);
    });
  }, []);

  const persist = useCallback((updated: Contact[]) => {
    setContacts(updated);
    saveContacts(updated);
  }, []);

  const addContact = useCallback((contact: Contact) => {
    persist([contact, ...contacts]);
  }, [contacts, persist]);

  const updateContact = useCallback((contact: Contact) => {
    persist(contacts.map((c) => (c.id === contact.id ? contact : c)));
  }, [contacts, persist]);

  const removeContact = useCallback((id: string) => {
    persist(contacts.filter((c) => c.id !== id));
  }, [contacts, persist]);

  const reloadDemo = useCallback(() => {
    const demo = generateDemoContacts();
    persist(demo);
  }, [persist]);

  const clearAll = useCallback(() => {
    persist([]);
  }, [persist]);

  const importContacts = useCallback((newContacts: Contact[]) => {
    const existingIds = new Set(contacts.map((c) => c.phone || c.name));
    const unique = newContacts.filter((c) => !existingIds.has(c.phone || c.name));
    persist([...unique, ...contacts]);
  }, [contacts, persist]);

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
