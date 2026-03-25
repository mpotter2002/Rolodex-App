import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Image, ScrollView, Animated, useWindowDimensions, PanResponder, Keyboard, Easing, useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ColorPalette, radius } from '../utils/theme';
import { useTheme } from '../utils/ThemeContext';
import { useContacts } from '../utils/ContactsContext';
import { CATEGORIES, getCategoryLabel } from '../data/categories';
import { Contact } from '../types/contact';
import ContactDetailSheet from '../components/ContactDetailSheet';
import BouncyPress from '../components/BouncyPress';

type SortKey = 'newest' | 'oldest' | 'name-az' | 'name-za' | 'company-az';
const CARD_FRAME_HEIGHT = 292;

export default function DeckScreen() {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const vpHeight = Math.max(160, Math.min(420, windowHeight - 370));
  const { contacts } = useContacts();
  const { colors, themeMode, setThemeMode } = useTheme();
  const systemColorScheme = useColorScheme();
  const isDark = themeMode === 'dark' || (themeMode === 'system' && systemColorScheme === 'dark');
  const logoSource = isDark
    ? require('../../assets/rolo-logo-dark.png')
    : require('../../assets/rolo-logo-light.png');
  const s = useMemo(() => makeStyles(colors), [colors]);

  const cycleTheme = useCallback(() => {
    if (themeMode === 'system') setThemeMode('light');
    else if (themeMode === 'light') setThemeMode('dark');
    else setThemeMode('system');
  }, [themeMode, setThemeMode]);

  const themeIcon = themeMode === 'dark' ? 'moon' : themeMode === 'light' ? 'sunny' : 'contrast-outline';

  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeCategory, setActiveCategory] = useState('');
  const [viewMode, setViewMode] = useState<'deck' | 'list'>('deck');
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [showSortMenu, setShowSortMenu] = useState(false);
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
    const s2 = [...filtered];
    switch (sortKey) {
      case 'oldest': s2.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()); break;
      case 'name-az': s2.sort((a, b) => (a.name || '').localeCompare(b.name || '')); break;
      case 'name-za': s2.sort((a, b) => (b.name || '').localeCompare(a.name || '')); break;
      case 'company-az': s2.sort((a, b) => (a.company || '').localeCompare(b.company || '')); break;
      default: s2.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()); break;
    }
    return s2;
  }, [filtered, viewMode, sortKey]);

  const usedCategories = useMemo(() => {
    const used = new Set(contacts.map((c) => c.category).filter(Boolean));
    return CATEGORIES.filter((c) => used.has(c.key));
  }, [contacts]);

  const contentFade = useRef(new Animated.Value(1)).current;
  const deckToggleBg = useRef(new Animated.Value(viewMode === 'deck' ? 1 : 0)).current;
  const listToggleBg = useRef(new Animated.Value(viewMode === 'list' ? 1 : 0)).current;
  const downBtnScale = useRef(new Animated.Value(1)).current;
  const upBtnScale = useRef(new Animated.Value(1)).current;
  const countY = useRef(new Animated.Value(0)).current;
  const countOpacity = useRef(new Animated.Value(1)).current;
  const transitionProgress = useRef(new Animated.Value(0)).current;
  const [displayIndex, setDisplayIndex] = useState(0);
  const prevDeckIndexRef = useRef<number | null>(null);

  const switchViewMode = useCallback((mode: 'deck' | 'list') => {
    if (mode === viewMode) return;
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

  const [animating, setAnimating] = useState(false);
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

  useEffect(() => () => transitionProgress.stopAnimation(), [transitionProgress]);

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

    setNavDir(direction);
    setIncomingIndex(nextIndex);
    setAnimating(true);
    transitionProgress.stopAnimation();
    transitionProgress.setValue(0);

    Animated.timing(transitionProgress, {
      toValue: 1,
      duration: 720,
      easing: Easing.bezier(0.2, 0.78, 0.2, 1),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setDeckIndex(nextIndex);
        setIncomingIndex(null);
        setAnimating(false);
        return;
      }
      transitionProgress.stopAnimation();
      setIncomingIndex(null);
      setAnimating(false);
      transitionProgress.setValue(0);
    });
  }, [filtered.length, deckIndex, animating, transitionProgress]);

  function renderDeckCardContent(
    contact: Contact,
    interactive: boolean,
    showTab = true,
    tabOpacity?: number | Animated.AnimatedInterpolation<number>,
  ) {
    const initial = (contact.name || '?').charAt(0).toUpperCase();
    const tabColor = contact.cardColors ? { backgroundColor: contact.cardColors.accentHex } : null;

    const body = (
      <>
        <View style={s.cardRow}>
          <View style={s.chip}><Text style={s.chipText} numberOfLines={1}>{contact.company || 'Contact'}</Text></View>
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
        {showTab && (
          <Animated.View style={[s.cardTab, tabColor, tabOpacity !== undefined ? { opacity: tabOpacity } : null]}>
            <Text style={s.cardTabText}>{initial}</Text>
          </Animated.View>
        )}
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

  function renderFloatingCardTab(
    contact: Contact,
    opacity: number | Animated.AnimatedInterpolation<number> = 1,
    style?: any,
  ) {
    return (
      <Animated.View
        pointerEvents="none"
        style={[
          s.cardTab,
          s.floatingCardTab,
          contact.cardColors ? { backgroundColor: contact.cardColors.accentHex } : null,
          { opacity },
          style,
        ]}
      >
        <Text style={s.cardTabText}>{(contact.name || '?').charAt(0).toUpperCase()}</Text>
      </Animated.View>
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
  }, [s]);

  function renderBackdropCards() {
    const baseGap = 42;
    const firstPad = 38;
    const backdropTravel = 18;
    const yFor = (d: number) => d === 1 ? -(baseGap + firstPad) : -(baseGap + firstPad + baseGap * (d - 1));
    const opFor = (d: number) => d === 1 ? 0.82 : d === 2 ? 0.50 : d === 3 ? 0.28 : 0.14;
    const blurFor = (d: number) => d === 1 ? 0.12 : d === 2 ? 0.07 : 0.03;
    const tabOpacityFor = (depth: number) => {
      const resting = depth === 1 ? 0.92 : depth === 2 ? 0.72 : 0.55;
      return animating
        ? transitionProgress.interpolate({
            inputRange: [0, 0.35, 0.75, 1],
            outputRange: [resting, resting * 0.5, resting * 0.25, resting],
            extrapolate: 'clamp',
          })
        : resting;
    };

    const makeCard = (
      contact: Contact,
      depth: number,
      translateY: number | Animated.AnimatedInterpolation<number>,
      opacity: number | Animated.AnimatedInterpolation<number>,
      key: string,
      zIndex: number,
    ) => (
      <Animated.View
        key={key}
        shouldRasterizeIOS={animating}
        renderToHardwareTextureAndroid={animating}
        style={[s.backdropCard, {
        transform: [{ translateY }, { scale: 1 - depth * 0.04 }],
        opacity, zIndex,
        backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line,
        borderRadius: 20, padding: 14,
        shadowColor: '#18212f', shadowOffset: { width: 0, height: 6 },
        shadowOpacity: animating ? blurFor(depth) * 0.45 : blurFor(depth),
        shadowRadius: 18,
        elevation: animating ? 1 : 2,
      }]}
        pointerEvents="none"
      >
        <Animated.View
          style={[
            s.cardTab,
            contact.cardColors ? { backgroundColor: contact.cardColors.accentHex } : null,
            { opacity: tabOpacityFor(depth) },
          ]}
        >
            <Text style={s.cardTabText}>{(contact.name || '?').charAt(0).toUpperCase()}</Text>
        </Animated.View>
        {depth <= 2 && (
          <View style={{ marginTop: 10, gap: 4 }}>
            <Text style={{ fontSize: depth === 1 ? 13.5 : 12, fontWeight: '800', color: colors.ink }} numberOfLines={1}>
              {contact.name || 'Unnamed'}
            </Text>
            {depth === 1 && (contact.title || contact.company) ? (
              <Text style={{ fontSize: 12, color: colors.muted }} numberOfLines={1}>
                {[contact.title, contact.company].filter(Boolean).join(' · ')}
              </Text>
            ) : null}
          </View>
        )}
      </Animated.View>
    );

    const cards: React.ReactElement[] = [];

    if (animating) {
      for (const { contact, offset } of getBackdropCards(deckIndex)) {
        const d = Math.abs(offset);
        cards.push(makeCard(
          contact,
          d,
          transitionProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [yFor(d), yFor(d) + (navDir > 0 ? backdropTravel : -backdropTravel)],
          }),
          transitionProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [opFor(d), 0],
          }),
          `bg-old-${d}`,
          8 - d,
        ));
      }
    }

    for (const { contact, offset } of getBackdropCards(animating && incomingIndex !== null ? incomingIndex : undefined)) {
      const d = Math.abs(offset);
      cards.push(makeCard(
        contact,
        d,
        animating ? transitionProgress.interpolate({
          inputRange: [0, 1],
          outputRange: navDir > 0 ? [yFor(d) - backdropTravel, yFor(d)] : [yFor(d) + backdropTravel, yFor(d)],
        }) : yFor(d),
        animating ? transitionProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, opFor(d)],
        }) : opFor(d),
        `bg-new-${d}`,
        12 - d,
      ));
    }

    return cards;
  }

  const navigateRef = useRef(navigate);
  useEffect(() => { navigateRef.current = navigate; }, [navigate]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dy) > 10 && Math.abs(g.dy) > Math.abs(g.dx) * 1.2,
      onPanResponderRelease: (_, g) => {
        if (g.dy > 40) navigateRef.current(1);
        else if (g.dy < -40) navigateRef.current(-1);
      },
    })
  ).current;

  const CARD_PIVOT_OFFSET = CARD_FRAME_HEIGHT / 2;
  const isSwipeDown = navDir > 0;
  const outgoingZIndex = isSwipeDown ? 31 : 30;
  const incomingZIndex = isSwipeDown ? 30 : 31;
  const outgoingTransform = [
    ...(isSwipeDown ? [
      {
        translateY: CARD_PIVOT_OFFSET,
      },
      {
        scaleY: transitionProgress.interpolate({
          inputRange: [0, 0.84, 1],
          outputRange: [1, 0.76, 0.32],
          extrapolate: 'clamp',
        }),
      },
      {
        translateY: -CARD_PIVOT_OFFSET,
      },
      {
        translateY: transitionProgress.interpolate({
          inputRange: [0, 0.58, 1],
          outputRange: [0, -4, 0],
          extrapolate: 'clamp',
        }),
      },
      {
        scaleX: transitionProgress.interpolate({
          inputRange: [0, 0.62, 1],
          outputRange: [1, 1.025, 1.035],
          extrapolate: 'clamp',
        }),
      },
    ] : [
      {
        translateY: transitionProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -18],
          extrapolate: 'clamp',
        }),
      },
      {
        scale: transitionProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 0.968],
          extrapolate: 'clamp',
        }),
      },
    ]),
  ];
  const outgoingCardStyle = {
    zIndex: outgoingZIndex,
    opacity: transitionProgress.interpolate({
      inputRange: isSwipeDown ? [0, 0.9, 1] : [0, 0.62, 0.84, 1],
      outputRange: isSwipeDown ? [1, 1, 0] : [1, 1, 0.24, 0],
      extrapolate: 'clamp',
    }),
    shadowOpacity: 0.08,
    shadowRadius: 28,
    elevation: 2,
    transform: outgoingTransform,
  };
  const outgoingTabOpacity = transitionProgress.interpolate({
    inputRange: isSwipeDown ? [0, 0.28, 0.65, 1] : [0, 0.04, 0.12, 1],
    outputRange: isSwipeDown ? [1, 0.45, 0.12, 0] : [1, 0.02, 0, 0],
    extrapolate: 'clamp',
  });
  const outgoingTabStyle = {
    transform: [
      {
        translateY: transitionProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, isSwipeDown ? 8 : -18],
          extrapolate: 'clamp',
        }),
      },
    ],
  };
  const incomingShellScaleY = transitionProgress.interpolate({
    inputRange: [0, 0.78, 1],
    outputRange: [0.34, 0.82, 1],
    extrapolate: 'clamp',
  });
  const incomingContentStyle = isSwipeDown ? { flex: 1 } : {
    flex: 1,
    opacity: transitionProgress.interpolate({
      inputRange: [0, 0.08, 0.22, 1],
      outputRange: [0.72, 0.9, 1, 1],
      extrapolate: 'clamp',
    }),
    transform: [
      {
        scaleY: transitionProgress.interpolate({
          inputRange: [0, 0.78, 1],
          outputRange: [1.9, 1.12, 1],
          extrapolate: 'clamp',
        }),
      },
      {
        translateY: transitionProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [18, 0],
          extrapolate: 'clamp',
        }),
      },
    ],
  };
  const incomingCardStyle = {
    zIndex: incomingZIndex,
    opacity: 1,
    shadowOpacity: 0.16,
    shadowRadius: 28,
    elevation: 3,
    transform: isSwipeDown ? undefined : [
      {
        translateY: CARD_PIVOT_OFFSET,
      },
      {
        scaleY: incomingShellScaleY,
      },
      {
        translateY: -CARD_PIVOT_OFFSET,
      },
      {
        translateY: transitionProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [18, 0],
          extrapolate: 'clamp',
        }),
      },
      {
        scaleX: transitionProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [1.04, 1],
          extrapolate: 'clamp',
        }),
      },
    ],
  };
  const incomingTabOpacity = transitionProgress.interpolate({
    inputRange: isSwipeDown ? [0, 0.35, 1] : [0, 0.88, 1],
    outputRange: isSwipeDown ? [0.35, 0.65, 1] : [0, 0, 1],
    extrapolate: 'clamp',
  });
  const incomingTabStyle = {
    transform: [
      {
        translateY: transitionProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [isSwipeDown ? -12 : 24, 0],
          extrapolate: 'clamp',
        }),
      },
    ],
  };

  return (
    <View style={[s.container, { paddingTop: insets.top + 8 }]}>
      <View style={{ zIndex: 30, backgroundColor: colors.bg }}>
        <View style={s.header}>
          <View style={s.headerSpacer} />
          <View style={s.headerCenter}>
            <Image source={logoSource} style={s.logo} />
            <Text style={s.wordmark}>Rolo</Text>
          </View>
          <TouchableOpacity style={s.themeBtn} onPress={cycleTheme} activeOpacity={0.7}>
            <Ionicons name={themeIcon as any} size={19} color={colors.muted} />
          </TouchableOpacity>
        </View>
        <Text style={s.summary}>{contacts.length} contact{contacts.length === 1 ? '' : 's'} saved</Text>

        <View style={s.searchWrap}>
          <TextInput
            style={s.search}
            placeholder="Search name, company, email..."
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={setSearch}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          {(searchFocused || search.length > 0) && (
            <TouchableOpacity style={s.searchClear} onPress={() => { setSearch(''); Keyboard.dismiss(); }} activeOpacity={0.7}>
              <Text style={s.searchClearText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

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

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterBar} contentContainerStyle={s.filterContent}>
          <BouncyPress
            style={[s.pill, !activeCategory && s.pillActive]}
            onPress={() => { setActiveCategory(''); setDeckIndex(0); }}
            scale={0.93}
          >
            <Text style={[s.pillText, !activeCategory && s.pillTextActive]}>All</Text>
          </BouncyPress>
          {usedCategories.map((cat) => (
            <BouncyPress
              key={cat.key}
              style={[s.pill, activeCategory === cat.key && s.pillActive]}
              onPress={() => { setActiveCategory(cat.key); setDeckIndex(0); }}
              scale={0.93}
            >
              <Text style={[s.pillText, activeCategory === cat.key && s.pillTextActive]}>{cat.label}</Text>
            </BouncyPress>
          ))}
        </ScrollView>
      </View>

      <Animated.View style={{ flex: 1, opacity: contentFade, backgroundColor: colors.bg, zIndex: 1 }}>
      {viewMode === 'deck' ? (
        <View style={s.deckArea}>
          {currentCard ? (
            <View style={[s.deckViewport, { height: vpHeight }]} {...panResponder.panHandlers}>
              <View style={s.cardAnchor}>
              {!animating && currentCard ? renderFloatingCardTab(currentCard, 1, { zIndex: 22 }) : null}
              {renderBackdropCards()}
              {animating && incomingCard ? (
                <>
                  {renderFloatingCardTab(currentCard, outgoingTabOpacity, [outgoingTabStyle, { zIndex: outgoingZIndex + 2 }])}
                  {renderFloatingCardTab(incomingCard, incomingTabOpacity, [incomingTabStyle, { zIndex: incomingZIndex + 2 }])}
                  <Animated.View
                    shouldRasterizeIOS
                    renderToHardwareTextureAndroid
                    style={[s.rolocard, s.mainCard, s.animatedCard, outgoingCardStyle]}
                  >
                    {renderDeckCardContent(currentCard, false, false)}
                  </Animated.View>
                  <Animated.View
                    style={[s.rolocard, s.mainCard, s.animatedCard, incomingCardStyle]}
                  >
                    <Animated.View style={incomingContentStyle}>
                      {renderDeckCardContent(incomingCard, false, false)}
                    </Animated.View>
                  </Animated.View>
                </>
              ) : (
                <View style={[s.rolocard, s.mainCard]}>
                  {renderDeckCardContent(currentCard, true, false)}
                </View>
              )}
              </View>
            </View>
          ) : (
            <View style={s.empty}>
              <Ionicons name="albums-outline" size={48} color={colors.muted} />
              <Text style={s.emptyTitle}>No contacts yet</Text>
              <Text style={s.emptyDesc}>Scan a business card to add your first contact.</Text>
            </View>
          )}

          {currentCard && (
            <>
              <View style={s.deckControls}>
                <Animated.View style={{ transform: [{ scale: downBtnScale }] }}>
                  <TouchableOpacity style={s.roundBtn} onPress={() => pressBtn(downBtnScale, () => navigate(1))}>
                    <Ionicons name="chevron-down" size={20} color={colors.onAccent} />
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
                    <Ionicons name="chevron-up" size={20} color={colors.onAccent} />
                  </TouchableOpacity>
                </Animated.View>
              </View>
              <Text style={s.swipeHint}>Swipe down for next card, swipe up for previous</Text>
            </>
          )}
        </View>
      ) : (
        <View style={s.listArea}>
          <View style={s.sortBar}>
            <Text style={s.sortLabel}>Sort by</Text>
            <View style={{ position: 'relative' }}>
              <TouchableOpacity style={s.sortSelect} onPress={() => setShowSortMenu((v) => !v)}>
                <Text style={s.sortText}>
                  {{ newest: 'Date (Newest)', oldest: 'Date (Oldest)', 'name-az': 'Name (A–Z)', 'name-za': 'Name (Z–A)', 'company-az': 'Company (A–Z)' }[sortKey]}
                </Text>
                <Text style={s.sortChevron}>{showSortMenu ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {showSortMenu && (
                <View style={s.sortDropdown}>
                  {([
                    ['newest', 'Date (Newest)'],
                    ['oldest', 'Date (Oldest)'],
                    ['name-az', 'Name (A–Z)'],
                    ['name-za', 'Name (Z–A)'],
                    ['company-az', 'Company (A–Z)'],
                  ] as [SortKey, string][]).map(([key, label], i, arr) => (
                    <TouchableOpacity
                      key={key}
                      style={[s.sortOption, i < arr.length - 1 && s.sortOptionBorder]}
                      onPress={() => { setSortKey(key); setShowSortMenu(false); }}
                    >
                      <Text style={[s.sortOptionText, sortKey === key && s.sortOptionActive]}>{label}</Text>
                      {sortKey === key && <Text style={s.sortOptionCheck}>✓</Text>}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
          <FlatList
            data={sorted}
            keyExtractor={(item) => item.id}
            renderItem={renderListItem}
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            onScrollBeginDrag={() => setShowSortMenu(false)}
          />
        </View>
      )}
      </Animated.View>

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

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg, paddingHorizontal: 14 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
    headerSpacer: { width: 36 },
    headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    themeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18 },
    logo: { width: 32, height: 32, resizeMode: 'contain' },
    wordmark: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5, color: c.ink },
    summary: { fontSize: 13.5, color: c.muted, marginTop: 2, marginBottom: 6, textAlign: 'center' },
    searchWrap: { position: 'relative' as const, marginBottom: 8 },
    search: {
      borderWidth: 1, borderColor: c.line, borderRadius: 12, paddingHorizontal: 12,
      paddingVertical: 10, fontSize: 14.5, color: c.ink, backgroundColor: c.panel,
    },
    searchClear: { position: 'absolute' as const, right: 10, top: 0, bottom: 0, justifyContent: 'center', paddingHorizontal: 4 },
    searchClearText: { fontSize: 13, color: c.muted, fontWeight: '600' },
    toggle: { flexDirection: 'row', backgroundColor: c.bgSoft, borderRadius: 12, padding: 3, gap: 2, marginBottom: 8 },
    toggleBtn: { flex: 1, paddingVertical: 7, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
    toggleBtnBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.panel, borderRadius: 10, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
    toggleText: { fontSize: 12.5, fontWeight: '700', color: c.muted },
    toggleTextActive: { color: c.ink },
    filterBar: { flexGrow: 0, marginBottom: 8 },
    filterContent: { gap: 6, paddingRight: 16 },
    pill: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5, borderColor: c.line, backgroundColor: c.bgSoft },
    pillActive: { backgroundColor: c.accent, borderColor: c.accent },
    pillText: { fontSize: 13.5, fontWeight: '600', color: c.muted },
    pillTextActive: { color: c.onAccent },
    // Deck
    deckArea: { flex: 1, justifyContent: 'center', overflow: 'visible' as const },
    deckViewport: { justifyContent: 'center' as const, position: 'relative' as const, overflow: 'visible' as const, marginTop: 8, marginBottom: 4, paddingHorizontal: 10 },
    cardAnchor: { height: 180, width: '100%' as unknown as number, position: 'relative' as const, overflow: 'visible' as const },
    rolocard: {
      backgroundColor: c.panel, borderWidth: 1, borderColor: c.line, borderRadius: 20, padding: 14,
      shadowColor: '#18212f', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.18, shadowRadius: 28, elevation: 6,
      gap: 8, height: CARD_FRAME_HEIGHT,
    },
    animatedCard: { backfaceVisibility: 'hidden' as const },
    mainCard: { position: 'absolute' as const, left: 0, right: 0, top: -30, zIndex: 20 },
    backdropCard: { position: 'absolute' as const, left: 0, right: 0, top: 0, height: CARD_FRAME_HEIGHT },
    cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    chip: { backgroundColor: c.accentSoft, borderWidth: 1, borderColor: c.line, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, maxWidth: 140 },
    chipText: { fontSize: 11, fontWeight: '600', color: c.ink },
    cardTab: {
      position: 'absolute', top: -18, right: 20,
      backgroundColor: c.accent, width: 28, height: 22,
      borderTopLeftRadius: 5, borderTopRightRadius: 5,
      borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
      alignItems: 'center', justifyContent: 'center', zIndex: 10,
    },
    floatingCardTab: { top: -48 },
    cardTabText: { color: c.onAccent, fontSize: 10.5, fontWeight: '800', textTransform: 'uppercase' },
    cardName: { fontSize: 19.5, fontWeight: '800', letterSpacing: -0.3, color: c.ink },
    cardTitle: { fontSize: 15, color: c.muted, marginTop: -2 },
    cardBody: { flex: 1, gap: 8 },
    cardMeta: { gap: 6, marginTop: 4 },
    metaLine: { fontSize: 14.5, color: c.ink },
    notesLine: { fontSize: 13.5, color: c.muted, lineHeight: 18 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
    footerDate: { fontSize: 12.5, color: c.muted },
    catTag: { fontSize: 9.5, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', backgroundColor: c.accentSoft, color: c.accent, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2, overflow: 'hidden' },
    deckControls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 14, zIndex: 10 },
    roundBtn: { width: 40, height: 40, borderRadius: 999, backgroundColor: c.ink, alignItems: 'center', justifyContent: 'center' },
    count: { textAlign: 'center', fontWeight: '700', color: c.muted, fontSize: 13.5 },
    swipeHint: { textAlign: 'center', color: c.muted, fontSize: 12.5, marginTop: 18, marginBottom: 80 },
    empty: { alignItems: 'center', paddingVertical: 40, gap: 8 },
    emptyTitle: { fontSize: 17, fontWeight: '800', color: c.ink },
    emptyDesc: { fontSize: 13.5, color: c.muted, textAlign: 'center', lineHeight: 20 },
    // List
    listArea: { flex: 1 },
    sortBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
    sortLabel: { fontSize: 12, color: c.muted, fontWeight: '600' },
    sortSelect: { borderWidth: 1, borderColor: c.line, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 6 },
    sortText: { fontSize: 12, fontWeight: '600', color: c.muted },
    sortChevron: { fontSize: 9, color: c.muted },
    sortDropdown: { position: 'absolute' as const, top: '100%', right: 0, marginTop: 4, backgroundColor: c.panel, borderRadius: 12, borderWidth: 1, borderColor: c.line, minWidth: 160, zIndex: 100, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 8 },
    sortOption: { paddingHorizontal: 14, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    sortOptionBorder: { borderBottomWidth: 1, borderBottomColor: c.line },
    sortOptionText: { fontSize: 13.5, color: c.ink, fontWeight: '500' },
    sortOptionActive: { color: c.accent, fontWeight: '700' },
    sortOptionCheck: { fontSize: 12, color: c.accent, fontWeight: '700' },
    listCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.panel,
      borderWidth: 1, borderColor: c.line, borderRadius: 16, padding: 12, marginBottom: 8,
      shadowColor: '#1e2a3b', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1,
    },
    listAvatar: { width: 44, height: 44, borderRadius: 999, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' },
    listAvatarText: { color: c.onAccent, fontWeight: '800', fontSize: 16 },
    listInfo: { flex: 1 },
    listName: { fontSize: 15, fontWeight: '700', color: c.ink },
    listSubtitle: { fontSize: 12.5, color: c.muted, marginTop: 1 },
    listDetail: { fontSize: 12, color: c.muted, marginTop: 2, opacity: 0.75 },
    listRight: { alignItems: 'flex-end', gap: 4 },
    chevron: { fontSize: 16, color: c.line },
    // Unused but kept for TS compat
    toggleActive: {},
    roundText: {},
    countWrap: {},
    emptyIcon: {},
  });
}
