import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../utils/ThemeContext';
import { ColorPalette } from '../utils/theme';

const PAGES = [
  {
    emoji: '🗂️',
    title: 'Welcome to Rolo',
    desc: 'Your personal Rolodex — the smartest way to collect, organize, and stay in touch with your network.',
  },
  {
    emoji: '📇',
    title: 'Scan Business Cards',
    desc: 'Point your camera at any business card and Rolo instantly extracts the contact info. No more typing.',
  },
  {
    emoji: '📬',
    title: 'Never Lose a Contact',
    desc: 'Every card is saved to your personal deck. Search, browse, and reach out with a single tap.',
  },
  {
    emoji: '✨',
    title: "You're All Set",
    desc: 'Start building your deck. Tap the + button anytime to scan a card or add a contact manually.',
  },
];

interface Props {
  onDone: () => void;
}

export default function OnboardingScreen({ onDone }: Props) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const { width } = Dimensions.get('window');
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const dotAnims = useRef(PAGES.map((_, i) => new Animated.Value(i === 0 ? 1 : 0))).current;

  useEffect(() => {
    PAGES.forEach((_, i) => {
      Animated.spring(dotAnims[i], {
        toValue: i === page ? 1 : 0,
        useNativeDriver: false,
        tension: 280,
        friction: 22,
      }).start();
    });
  }, [page]);

  function goNext() {
    if (page < PAGES.length - 1) {
      const next = page + 1;
      scrollRef.current?.scrollTo({ x: next * width, animated: true });
      setPage(next);
    } else {
      onDone();
    }
  }

  function handleScroll(e: any) {
    const newPage = Math.round(e.nativeEvent.contentOffset.x / width);
    if (newPage !== page) setPage(newPage);
  }

  const isLast = page === PAGES.length - 1;

  return (
    <View style={[s.container, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 24) }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {PAGES.map((p, i) => (
          <View key={i} style={[s.page, { width }]}>
            <View style={s.emojiWrap}>
              <Text style={s.emoji}>{p.emoji}</Text>
            </View>
            <Text style={s.title}>{p.title}</Text>
            <Text style={s.desc}>{p.desc}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Animated dots */}
      <View style={s.dots}>
        {PAGES.map((_, i) => {
          const dotWidth = dotAnims[i].interpolate({ inputRange: [0, 1], outputRange: [7, 20] });
          const dotColor = dotAnims[i].interpolate({ inputRange: [0, 1], outputRange: [colors.line, colors.accent] });
          return (
            <Animated.View key={i} style={[s.dot, { width: dotWidth, backgroundColor: dotColor }]} />
          );
        })}
      </View>

      {/* CTA */}
      <View style={s.footer}>
        <TouchableOpacity style={s.btn} onPress={goNext} activeOpacity={0.88}>
          <Text style={s.btnText}>{isLast ? 'Get Started' : 'Next'}</Text>
        </TouchableOpacity>
        {!isLast && (
          <TouchableOpacity onPress={onDone} style={s.skipBtn}>
            <Text style={s.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.bg,
    },
    page: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 40,
      gap: 20,
    },
    emojiWrap: {
      width: 100,
      height: 100,
      borderRadius: 32,
      backgroundColor: c.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    emoji: {
      fontSize: 46,
    },
    title: {
      fontSize: 26,
      fontWeight: '800',
      color: c.ink,
      textAlign: 'center',
      letterSpacing: -0.5,
    },
    desc: {
      fontSize: 15,
      color: c.muted,
      textAlign: 'center',
      lineHeight: 22,
    },
    dots: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 16,
    },
    dot: {
      height: 7,
      borderRadius: 999,
    },
    footer: {
      paddingHorizontal: 24,
      gap: 10,
      paddingBottom: 8,
    },
    btn: {
      backgroundColor: c.accent,
      borderRadius: 16,
      paddingVertical: 15,
      alignItems: 'center',
    },
    btnText: {
      color: c.onAccent,
      fontSize: 16,
      fontWeight: '700',
    },
    skipBtn: {
      alignItems: 'center',
      paddingVertical: 10,
    },
    skipText: {
      fontSize: 14,
      color: c.muted,
      fontWeight: '600',
    },
  });
}
