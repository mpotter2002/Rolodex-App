import React, { useRef, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../utils/theme';
import DeckScreen from '../screens/DeckScreen';
import ScanScreen from '../screens/ScanScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

function TabItem({ route, isFocused, onPress }: { route: any; isFocused: boolean; onPress: () => void }) {
  const bgAnim = useRef(new Animated.Value(isFocused ? 1 : 0)).current;
  const labelAnim = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(bgAnim, {
      toValue: isFocused ? 1 : 0,
      useNativeDriver: true,
      tension: 280,
      friction: 28,
    }).start();
    Animated.timing(labelAnim, {
      toValue: isFocused ? 1 : 0,
      duration: 180,
      useNativeDriver: false, // color interpolation needs JS driver
    }).start();
  }, [isFocused]);

  const labelColor = labelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#4f5b6d', colors.ink],
  });

  return (
    <TouchableOpacity onPress={onPress} style={styles.tabBtn} activeOpacity={0.7}>
      <Animated.View style={[styles.tabBtnBg, { opacity: bgAnim }]} />
      <Animated.Text style={[styles.tabLabel, { color: labelColor }]}>
        {route.name === 'Deck' ? 'Rolo' : route.name}
      </Animated.Text>
    </TouchableOpacity>
  );
}

function PlusButton({ onPress }: { onPress: () => void }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 0.88, useNativeDriver: true, tension: 400, friction: 10 }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 300, friction: 14 }),
    ]).start();
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity onPress={handlePress} style={styles.plusBtn} activeOpacity={1}>
        <Text style={styles.plusText}>+</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function TabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const bottomOffset = Math.max(insets.bottom, 8) + 8;

  return (
    <View style={[styles.tabBar, { bottom: bottomOffset }]}>
      {state.routes.map((route: any, index: number) => {
        const isFocused = state.index === index;
        const isPlus = route.name === 'Scan';

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        if (isPlus) {
          return <PlusButton key={route.key} onPress={onPress} />;
        }

        return <TabItem key={route.key} route={route} isFocused={isFocused} onPress={onPress} />;
      })}
    </View>
  );
}

export default function AppNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
      sceneContainerStyle={{ backgroundColor: '#ffffff' }}
    >
      <Tab.Screen name="Deck" component={DeckScreen} />
      <Tab.Screen name="Scan" component={ScanScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 66,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: '#e8edf5',
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.15,
    shadowRadius: 28,
    elevation: 8,
  },
  tabBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnBg: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#e5e5ea',
    borderRadius: 14,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  plusBtn: {
    width: 72,
    height: 50,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 4,
  },
  plusText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 24,
  },
});
