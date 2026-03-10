import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Image, ScrollView, Animated, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../utils/theme';
import { useContacts } from '../utils/ContactsContext';
import { CATEGORIES, getCategoryLabel } from '../data/categories';
import { Contact } from '../types/contact';
import ContactDetailSheet from '../components/ContactDetailSheet';

type SortKey = 'newest' | 'oldest' | 'name-az' | 'name-za' | 'company-az';

export default function DeckScreen() {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  // Viewport height = window minus all fixed UI overhead (header, search, toggle, categories, controls, hint, nav)
  // Clamped between 160px (min usable) and 420px (max comfortable)
  const vpHeight = Math.max(160, Math.min(420, windowHeight - 370));
  const { contacts } = useContacts();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [viewMode, setViewMode] = useState<'deck' | 'list'>('deck');
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [deckIndex, setDeckIndex] = useState(0);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contacts.filter((c) => {
      if (activeCategory && c.category !== activeCategory) return false;
      if (q) {
        return [c.name, c.title, c.company, c.email, c.phone, c.website, c.address, c.notes]
          .filter(Boolean)
          .some((v) => v.toLowerCase().includes(q));
      }
      return true;
    });
  }, [contacts, search, activeCategory]);

  const sorted = useMemo(() => {
    if (viewMode !== 'list') return filtered;
    const s = [...filtered];
    switch (sortKey) {
      case 'oldest': s.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()); break;
      case 'name-az': s.sort((a, b) => (a.name || '').localeCompare(b.name || '')); break;
      case 'name-za': s.sort((a, b) => (b.name || '').localeCompare(a.name || '')); break;
      case 'company-az': s.sort((a, b) => (a.company || '').localeCompare(b.company || '')); break;
      default: s.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()); break;
    }
    return s;
  }, [filtered, viewMode, sortKey]);

  const usedCategories = useMemo(() => {
    const used = new Set(contacts.map((c) => c.category).filter(Boolean));
    return CATEGORIES.filter((c) => used.has(c.key));
  }, [contacts]);

  // UI transition animations
  const contentFade = useRef(new Animated.Value(1)).current;
  const deckToggleBg = useRef(new Animated.Value(viewMode === 'deck' ? 1 : 0)).current;
  const listToggleBg = useRef(new Animated.Value(viewMode === 'list' ? 1 : 0)).current;
  const downBtnScale = useRef(new Animated.Value(1)).current;
  const upBtnScale = useRef(new Animated.Value(1)).current;
  // Counter animation
  const countY = useRef(new Animated.Value(0)).current;
  const countOpacity = useRef(new Animated.Value(1)).current;
  const [displayIndex, setDisplayIndex] = useState(0);
  const prevDeckIndexRef = useRef<number | null>(null);

  const switchViewMode = useCallback((mode: 'deck' | 'list') => {
    if (mode === viewMode) return;
    // Fade out, swap content, fade back in
    Animated.timing(contentFade, { toValue: 0, duration: 100, useNativeDriver: true }).start(() => {
      setViewMode(mode);
      Animated.timing(contentFade, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    });
    Animated.spring(deckToggleBg, { toValue: mode === 'deck' ? 1 : 0, useNativeDriver: true, tension: 280, friction: 26 }).start();
    Animated.spring(listToggleBg, { toValue: mode === 'list' ? 1 : 0, useNativeDriver: true, tension: 280, friction: 26 }).start();
  }, [viewMode]);

  const pressBtn = useCallback((scaleAnim: Animated.Value, action: () => void) => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 0.85, useNativeDriver: true, tension: 400, friction: 10 }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 300, friction: 14 }),
    ]).start();
    action();
  }, []);

  const animationFrameRef = useRef<number | null>(null);
  const [animating, setAnimating] = useState(false);
  const [flipProgress, setFlipProgress] = useState(0);
  const [incomingIndex, setIncomingIndex] = useState<number | null>(null);
  const [navDir, setNavDir] = useState<1 | -1>(1);
  const currentCard = filtered[deckIndex] || null;
  const incomingCard = incomingIndex !== null ? filtered[incomingIndex] || null : null;

  useEffect(() => {
    if (filtered.length === 0) {
      if (deckIndex !== 0) setDeckIndex(0);
      if (incomingIndex !== null) setIncomingIndex(null);
      return;
    }
    if (deckIndex >= filtered.length) setDeckIndex(0);
    if (incomingIndex !== null && incomingIndex >= filtered.length) setIncomingIndex(null);
  }, [filtered.length, deckIndex, incomingIndex]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Counter slide animation when deck index changes
  useEffect(() => {
    if (prevDeckIndexRef.current === null) {
      prevDeckIndexRef.current = deckIndex;
      setDisplayIndex(deckIndex);
      return;
    }
    prevDeckIndexRef.current = deckIndex;
    const slideOut = navDir * -14;
    const slideIn = navDir * 14;
    Animated.parallel([
      Animated.timing(countY, { toValue: slideOut, duration: 100, useNativeDriver: true }),
      Animated.timing(countOpacity, { toValue: 0, duration: 80, useNativeDriver: true }),
    ]).start(() => {
      setDisplayIndex(deckIndex);
      countY.setValue(slideIn);
      Animated.parallel([
        Animated.timing(countY, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(countOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    });
  }, [deckIndex]);

  const navigate = useCallback((dir: number) => {
    if (!filtered.length || animating) return;
    const direction: 1 | -1 = dir > 0 ? 1 : -1;
    const nextIndex = (deckIndex + direction + filtered.length) % filtered.length;

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    setNavDir(direction);
    setIncomingIndex(nextIndex);
    setAnimating(true);
    setFlipProgress(0);

    const durationMs = 600;
    let startFrame: number | null = null;

    const step = (frameTime: number) => {
      if (startFrame === null) startFrame = frameTime;
      const linear = Math.min(1, (frameTime - startFrame) / durationMs);
      setFlipProgress(linear);

      if (linear < 1) {
        animationFrameRef.current = requestAnimationFrame(step);
        return;
      }

      animationFrameRef.current = null;
      setDeckIndex(nextIndex);
      setIncomingIndex(null);
      setAnimating(false);
      setFlipProgress(0);
    };

    animationFrameRef.current = requestAnimationFrame(step);
  }, [filtered.length, deckIndex, animating]);

  function renderDeckCardContent(contact: Contact, interactive: boolean) {
    const initial = (contact.name || '?').charAt(0).toUpperCase();
    const tabColor = contact.cardColors ? { backgroundColor: contact.cardColors.accentHex } : null;

    const body = (
      <>
        <View style={s.cardRow}>
          <View style={s.chip}><Text style={s.chipText} numberOfLines={1}>{contact.company || 'Contact'}</Text></View>
          {/* spacer keeps chip from running under the absolute tab */}
          <View style={{ width: 36 }} />
        </View>
        <Text style={s.cardName}>{contact.name || 'Unnamed'}</Text>
        <Text style={s.cardTitle}>{contact.title || 'No title added'}</Text>
        <View style={s.cardMeta}>
          {contact.email ? <Text style={s.metaLine} numberOfLines={1}>{contact.email}</Text> : null}
          {contact.phone ? <Text style={s.metaLine} numberOfLines={1}>{contact.phone}</Text> : null}
          {contact.website ? <Text style={s.metaLine} numberOfLines={1}>{contact.website}</Text> : null}
          {contact.address ? <Text style={s.metaLine} numberOfLines={1}>{contact.address}</Text> : null}
          {contact.notes ? <Text style={s.notesLine} numberOfLines={2}>{contact.notes}</Text> : null}
        </View>
        <View style={s.cardFooter}>
          <Text style={s.footerDate}>{formatDate(contact.createdAt)}</Text>
          {contact.category ? <Text style={s.catTag}>{getCategoryLabel(contact.category)}</Text> : null}
        </View>
      </>
    );

    return (
      <>
        {/* Tab sticks above the card's top-right corner, flips with the card */}
        <View style={[s.cardTab, tabColor]}>
          <Text style={s.cardTabText}>{initial}</Text>
        </View>
        {interactive ? (
          <TouchableOpacity activeOpacity={0.85} onPress={() => setSelectedContact(contact)} style={s.cardBody}>
            {body}
          </TouchableOpacity>
        ) : (
          <View style={s.cardBody}>{body}</View>
        )}
      </>
    );
  }

  function getBackdropCards(useIndex?: number) {
    const baseIdx = useIndex ?? deckIndex;
    const total = filtered.length;
    if (total <= 1) return [];
    const maxDepth = Math.min(4, total - 1);
    const cards: { contact: Contact; offset: number }[] = [];
    for (let d = 2; d <= maxDepth + 1; d++) {
      const idx = (baseIdx - d + total) % total;
      cards.push({ contact: filtered[idx], offset: -(d - 1) });
    }
    return cards;
  }

  const renderListItem = useCallback(({ item }: { item: Contact }) => {
    const initial = (item.name || item.company || '?').charAt(0).toUpperCase();
    const subtitle = [item.title, item.company].filter(Boolean).join(' · ');
    const catLabel = getCategoryLabel(item.category);
    return (
      <TouchableOpacity style={s.listCard} activeOpacity={0.7} onPress={() => setSelectedContact(item)}>
        <View style={[s.listAvatar, item.cardColors ? { backgroundColor: item.cardColors.accentHex } : null]}>
          <Text style={s.listAvatarText}>{initial}</Text>
        </View>
        <View style={s.listInfo}>
          <Text style={s.listName} numberOfLines={1}>{item.name || 'Unnamed'}</Text>
          {subtitle ? <Text style={s.listSubtitle} numberOfLines={1}>{subtitle}</Text> : null}
          {item.phone || item.email ? (
            <Text style={s.listDetail} numberOfLines={1}>{item.phone || item.email}</Text>
          ) : null}
        </View>
        <View style={s.listRight}>
          {catLabel ? <Text style={s.catTag}>{catLabel}</Text> : null}
          <Text style={s.chevron}>›</Text>
        </View>
      </TouchableOpacity>
    );
  }, []);

  // Renders backdrop card stack. During animation: crossfades between old and new
  // states so there's no flash at the start or snap at the end.
  function renderBackdropCards() {
    const baseGap = 42;
    const firstPad = 38;
    const easeOut = animating ? 1 - Math.pow(1 - flipProgress, 2) : 0;
    const yFor = (d: number) => d === 1 ? -(baseGap + firstPad) : -(baseGap + firstPad + baseGap * (d - 1));
    const opFor = (d: number) => d === 1 ? 0.82 : d === 2 ? 0.50 : d === 3 ? 0.28 : 0.14;
    const blurFor = (d: number) => d === 1 ? 0.12 : d === 2 ? 0.07 : 0.03;

    const makeCard = (contact: Contact, depth: number, translateY: number, opacity: number, key: string) => (
      <View key={key} style={[s.backdropCard, {
        transform: [{ translateY }, { scale: 1 - depth * 0.04 }],
        opacity, zIndex: 4 - depth,
        backgroundColor: '#fff', borderWidth: 1, borderColor: '#edf1f6',
        borderRadius: 20, padding: 14,
        shadowColor: '#18212f', shadowOffset: { width: 0, height: 6 },
        shadowOpacity: blurFor(depth), shadowRadius: 18, elevation: 2,
      }]} pointerEvents="none">
        <View style={[s.cardTab, contact.cardColors ? { backgroundColor: contact.cardColors.accentHex } : null]}>
          <Text style={s.cardTabText}>{(contact.name || '?').charAt(0).toUpperCase()}</Text>
        </View>
        {depth <= 2 && (
          <View style={{ marginTop: 10, gap: 4 }}>
            <Text style={{ fontSize: depth === 1 ? 13.5 : 12, fontWeight: '800', color: '#1f2a39' }} numberOfLines={1}>
              {contact.name || 'Unnamed'}
            </Text>
            {depth === 1 && (contact.title || contact.company) ? (
              <Text style={{ fontSize: 12, color: '#5a6a7a' }} numberOfLines={1}>
                {[contact.title, contact.company].filter(Boolean).join(' · ')}
              </Text>
            ) : null}
          </View>
        )}
      </View>
    );

    const cards: JSX.Element[] = [];

    // OLD backdrop: starts at its current positions, departs in navDir direction, fades out
    if (animating) {
      for (const { contact, offset } of getBackdropCards(deckIndex)) {
        const d = Math.abs(offset);
        cards.push(makeCard(contact, d, yFor(d) + navDir * baseGap * easeOut, opFor(d) * (1 - easeOut), `bg-old-${d}`));
      }
    }

    // NEW backdrop: arrives from displaced position, fades in
    for (const { contact, offset } of getBackdropCards(animating && incomingIndex !== null ? incomingIndex : undefined)) {
      const d = Math.abs(offset);
      const arriveShift = animating ? -navDir * baseGap * (1 - easeOut) : 0;
      cards.push(makeCard(contact, d, yFor(d) + arriveShift, animating ? opFor(d) * easeOut : opFor(d), `bg-new-${d}`));
    }

    return cards;
  }

  // Prototype-matched Rolodex flip animation
  // Exit (380ms) and enter (550ms) both start simultaneously at t=0, no translateY/scale/opacity
  const FLIP_TOTAL_MS = 600; // total window — enter finishes at 550ms
  const EXIT_MS = 380;
  const ENTER_MS = 550;

  const exitRaw = Math.min(1, (flipProgress * FLIP_TOTAL_MS) / EXIT_MS);
  const enterRaw = Math.min(1, (flipProgress * FLIP_TOTAL_MS) / ENTER_MS);

  // Exit: cubic ease-in — matches prototype cubic-bezier(0.4, 0, 0.8, 0.7)
  const easeInCubic = (t: number) => t * t * t;
  // Enter: ease-out with subtle spring overshoot (prototype has 3deg overshoot at 88%)
  const easeOutSpring = (t: number) => {
    const c1 = 1.1;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };

  const exitT = easeInCubic(exitRaw);
  const enterT = easeOutSpring(enterRaw);

  // Always pivot at the bottom edge — top of card moves, bottom stays fixed
  // navDir=1 (swipe up): top goes UP and BACK into screen (rotateX negative)
  // navDir=-1 (swipe down): top comes DOWN and FORWARD toward viewer (rotateX positive)
  const pivotOrigin = 'center bottom';
  const exitAngle = navDir > 0 ? -90 * exitT : 90 * exitT;
  const enterStartAngle = navDir > 0 ? 90 : -90;
  const enterAngle = enterStartAngle * (1 - enterT);

  // Down (navDir=1): old card stays on top, new card comes in from behind
  // Up (navDir=-1): new card comes in front of the old one
  const outgoingZ = navDir > 0 ? 6 : 5;
  const incomingZ = navDir > 0 ? 5 : 6;

  const outgoingCardStyle = {
    zIndex: outgoingZ,
    transformOrigin: pivotOrigin,
    transform: [
      { perspective: 900 },
      { rotateX: `${exitAngle}deg` },
    ],
  };
  const incomingCardStyle = {
    zIndex: incomingZ,
    transformOrigin: pivotOrigin,
    transform: [
      { perspective: 900 },
      { rotateX: `${enterAngle}deg` },
    ],
  };

  return (
    <View style={[s.container, { paddingTop: insets.top + 8 }]}>
      {/* All header UI — high zIndex so deck cards never bleed over it */}
      <View style={{ zIndex: 30, backgroundColor: colors.panel }}>
        {/* Header */}
        <View style={s.header}>
          <Image source={require('../../assets/rolo-logo.png')} style={s.logo} />
          <Text style={s.wordmark}>Rolo</Text>
        </View>
        <Text style={s.summary}>{contacts.length} contact{contacts.length === 1 ? '' : 's'} saved</Text>

        {/* Search */}
        <TextInput
          style={s.search}
          placeholder="Search name, company, email..."
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={setSearch}
        />

        {/* View Toggle */}
        <View style={s.toggle}>
          <TouchableOpacity style={s.toggleBtn} onPress={() => switchViewMode('deck')} activeOpacity={0.7}>
            <Animated.View style={[s.toggleBtnBg, { opacity: deckToggleBg }]} />
            <Ionicons name="albums-outline" size={13} color={viewMode === 'deck' ? colors.ink : colors.muted} style={{ marginRight: 4 }} />
            <Text style={[s.toggleText, viewMode === 'deck' && s.toggleTextActive]}>Deck</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.toggleBtn} onPress={() => switchViewMode('list')} activeOpacity={0.7}>
            <Animated.View style={[s.toggleBtnBg, { opacity: listToggleBg }]} />
            <Ionicons name="list-outline" size={13} color={viewMode === 'list' ? colors.ink : colors.muted} style={{ marginRight: 4 }} />
            <Text style={[s.toggleText, viewMode === 'list' && s.toggleTextActive]}>List</Text>
          </TouchableOpacity>
        </View>

        {/* Category Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterBar} contentContainerStyle={s.filterContent}>
          <TouchableOpacity
            style={[s.pill, !activeCategory && s.pillActive]}
            onPress={() => { setActiveCategory(''); setDeckIndex(0); }}
          >
            <Text style={[s.pillText, !activeCategory && s.pillTextActive]}>All</Text>
          </TouchableOpacity>
          {usedCategories.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={[s.pill, activeCategory === cat.key && s.pillActive]}
              onPress={() => { setActiveCategory(cat.key); setDeckIndex(0); }}
            >
              <Text style={[s.pillText, activeCategory === cat.key && s.pillTextActive]}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Deck or List — fades when switching modes, zIndex below header */}
      <Animated.View style={{ flex: 1, opacity: contentFade, backgroundColor: colors.panel, zIndex: 1 }}>
      {viewMode === 'deck' ? (
        <View style={s.deckArea}>
          {currentCard ? (
            <View style={[s.deckViewport, { height: vpHeight }]}>
              {/* Anchor: a non-absolute box that flexbox can centre; all cards
                  are absolute children pinned to top:0 inside it so their
                  position never shifts regardless of content height. */}
              <View style={s.cardAnchor}>
              {/* Background cards (stacked behind) */}
              {renderBackdropCards()}

              {/* Main card */}
              {animating && incomingCard ? (
                <>
                  <View style={[
                    s.rolocard, s.mainCard, outgoingCardStyle,
                  ]}>
                    {renderDeckCardContent(currentCard, false)}
                  </View>
                  <View style={[
                    s.rolocard, s.mainCard, incomingCardStyle,
                  ]}>
                    {renderDeckCardContent(incomingCard, false)}
                  </View>
                </>
              ) : (
                <View style={[s.rolocard, s.mainCard, {
                  zIndex: 5,
                  transformOrigin: 'center bottom',
                  transform: [{ perspective: 900 }, { rotateX: '0deg' }],
                }]}>
                  {renderDeckCardContent(currentCard, true)}
                </View>
              )}
              </View>{/* end cardAnchor */}
            </View>
          ) : (
            <View style={s.empty}>
              <Ionicons name="albums-outline" size={48} color={colors.muted} />
              <Text style={s.emptyTitle}>No contacts yet</Text>
              <Text style={s.emptyDesc}>Scan a business card to add your first contact.</Text>
            </View>
          )}

          {/* Deck Controls */}
          <View style={s.deckControls}>
            <Animated.View style={{ transform: [{ scale: downBtnScale }] }}>
              <TouchableOpacity style={s.roundBtn} onPress={() => pressBtn(downBtnScale, () => navigate(1))}>
                <Ionicons name="chevron-down" size={20} color="#fff" />
              </TouchableOpacity>
            </Animated.View>
            <View style={{ flexDirection: 'row', alignItems: 'center', minWidth: 84, justifyContent: 'center' }}>
              <View style={{ height: 18, overflow: 'hidden' as const, justifyContent: 'center' }}>
                <Animated.Text style={[s.count, { lineHeight: 18, transform: [{ translateY: countY }], opacity: countOpacity }]}>
                  {filtered.length ? `${displayIndex + 1}` : '0'}
                </Animated.Text>
              </View>
              <Text style={[s.count, { lineHeight: 18 }]}>{filtered.length ? ` / ${filtered.length}` : ' / 0'}</Text>
            </View>
            <Animated.View style={{ transform: [{ scale: upBtnScale }] }}>
              <TouchableOpacity style={s.roundBtn} onPress={() => pressBtn(upBtnScale, () => navigate(-1))}>
                <Ionicons name="chevron-up" size={20} color="#fff" />
              </TouchableOpacity>
            </Animated.View>
          </View>
          <Text style={s.swipeHint}>Swipe down for next card, swipe up for previous</Text>
        </View>
      ) : (
        <View style={s.listArea}>
          <View style={s.sortBar}>
            <Text style={s.sortLabel}>Sort by</Text>
            <TouchableOpacity
              style={s.sortSelect}
              onPress={() => {
                const keys: SortKey[] = ['newest', 'oldest', 'name-az', 'name-za', 'company-az'];
                const idx = keys.indexOf(sortKey);
                setSortKey(keys[(idx + 1) % keys.length]);
              }}
            >
              <Text style={s.sortText}>
                {{ newest: 'Date (Newest)', oldest: 'Date (Oldest)', 'name-az': 'Name (A–Z)', 'name-za': 'Name (Z–A)', 'company-az': 'Company (A–Z)' }[sortKey]}
              </Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={sorted}
            keyExtractor={(item) => item.id}
            renderItem={renderListItem}
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}
      </Animated.View>

      {/* Contact Detail Sheet */}
      {selectedContact && (
        <ContactDetailSheet
          contact={selectedContact}
          onClose={() => setSelectedContact(null)}
        />
      )}
    </View>
  );
}

function formatDate(iso: string): string {
  if (!iso) return 'Saved';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'Saved';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.panel, paddingHorizontal: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  logo: { width: 32, height: 32, resizeMode: 'contain' },
  wordmark: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5, color: colors.ink },
  summary: { fontSize: 13.5, color: colors.muted, marginTop: 2, marginBottom: 6 },
  search: {
    borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 12,
    paddingVertical: 10, fontSize: 14.5, color: colors.ink, backgroundColor: '#fff', marginBottom: 8,
  },
  toggle: {
    flexDirection: 'row', backgroundColor: colors.bg, borderRadius: 12, padding: 3, gap: 2, marginBottom: 8,
  },
  toggleBtn: { flex: 1, paddingVertical: 7, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  toggleBtnBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.panel, borderRadius: 10, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  toggleActive: { backgroundColor: colors.panel, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  toggleText: { fontSize: 12.5, fontWeight: '700', color: colors.muted },
  toggleTextActive: { color: colors.ink },
  filterBar: { flexGrow: 0, marginBottom: 8 },
  filterContent: { gap: 6, paddingRight: 16 },
  pill: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.panel },
  pillActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  pillText: { fontSize: 13.5, fontWeight: '600', color: colors.muted },
  pillTextActive: { color: '#fff' },
  // Deck
  deckArea: { flex: 1, justifyContent: 'center', overflow: 'visible' as const },
  deckViewport: { justifyContent: 'center' as const, position: 'relative' as const, overflow: 'visible' as const, marginTop: 8, marginBottom: 4, paddingHorizontal: 10 },
  cardAnchor: { height: 180, width: '100%' as unknown as number, position: 'relative' as const, overflow: 'visible' as const },
  rolocard: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#edf1f6', borderRadius: 20, padding: 14,
    shadowColor: '#18212f', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.18, shadowRadius: 28, elevation: 6,
    gap: 8, minHeight: 180,
  },
  mainCard: { position: 'absolute' as const, left: 0, right: 0, top: -30, zIndex: 5 },
  backdropCard: { position: 'absolute' as const, left: 0, right: 0, top: 0, minHeight: 180 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chip: { backgroundColor: '#f0f0f2', borderWidth: 1, borderColor: '#d2d2d7', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, maxWidth: 140 },
  chipText: { fontSize: 11, fontWeight: '600', color: '#3a3a3c' },
  cardTab: {
    position: 'absolute', top: -18, right: 20,
    backgroundColor: colors.accent, width: 28, height: 22,
    borderTopLeftRadius: 5, borderTopRightRadius: 5,
    borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
    alignItems: 'center', justifyContent: 'center', zIndex: 10,
  },
  cardTabText: { color: '#fff', fontSize: 10.5, fontWeight: '800', textTransform: 'uppercase' },
  cardName: { fontSize: 19.5, fontWeight: '800', letterSpacing: -0.3, color: colors.ink },
  cardTitle: { fontSize: 15, color: colors.muted, marginTop: -2 },
  cardBody: { flex: 1, gap: 8 },
  cardMeta: { gap: 6, marginTop: 4 },
  metaLine: { fontSize: 14.5, color: '#1f2a39' },
  notesLine: { fontSize: 13.5, color: '#4f5b6a', lineHeight: 18 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  footerDate: { fontSize: 12.5, color: '#5d6a7d' },
  catTag: { fontSize: 9.5, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', backgroundColor: colors.accentSoft, color: colors.accent, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2, overflow: 'hidden' },
  deckControls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 14, zIndex: 10 },
  roundBtn: { width: 40, height: 40, borderRadius: 999, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  roundText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  countWrap: { minWidth: 84, alignItems: 'center', overflow: 'hidden' as const, height: 20 },
  count: { textAlign: 'center', fontWeight: '700', color: '#485568', fontSize: 13.5 },
  swipeHint: { textAlign: 'center', color: '#5e6a7c', fontSize: 12.5, marginTop: 18, marginBottom: 80 },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: colors.ink },
  emptyDesc: { fontSize: 13.5, color: colors.muted, textAlign: 'center', lineHeight: 20 },
  // List
  listArea: { flex: 1 },
  sortBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  sortLabel: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  sortSelect: { borderWidth: 1, borderColor: colors.line, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  sortText: { fontSize: 12, fontWeight: '600', color: colors.muted },
  listCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.panel,
    borderWidth: 1, borderColor: '#e7edf5', borderRadius: 16, padding: 12, marginBottom: 8,
    shadowColor: '#1e2a3b', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1,
  },
  listAvatar: { width: 44, height: 44, borderRadius: 999, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  listAvatarText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  listInfo: { flex: 1 },
  listName: { fontSize: 15, fontWeight: '700', color: colors.ink },
  listSubtitle: { fontSize: 12.5, color: colors.muted, marginTop: 1 },
  listDetail: { fontSize: 12, color: colors.muted, marginTop: 2, opacity: 0.75 },
  listRight: { alignItems: 'flex-end', gap: 4 },
  chevron: { fontSize: 16, color: colors.line },
});
