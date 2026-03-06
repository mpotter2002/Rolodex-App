import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../utils/theme';
import DeckScreen from '../screens/DeckScreen';
import ScanScreen from '../screens/ScanScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

function TabBar({ state, descriptors, navigation }: any) {
  return (
    <View style={styles.tabBar}>
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
          return (
            <TouchableOpacity key={route.key} onPress={onPress} style={styles.plusBtn} activeOpacity={0.8}>
              <Text style={styles.plusText}>+</Text>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={[styles.tabBtn, isFocused && styles.tabBtnActive]}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
              {route.name === 'Deck' ? 'Rolo' : route.name}
            </Text>
          </TouchableOpacity>
        );
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
    left: 10,
    right: 10,
    bottom: 10,
    height: 66,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: '#e8edf5',
    borderRadius: 20,
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
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabBtnActive: {
    backgroundColor: '#e5e5ea',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4f5b6d',
  },
  tabLabelActive: {
    color: colors.ink,
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
