import React, { useRef } from 'react';
import { Animated, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';

interface Props {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  activeOpacity?: number;
  children: React.ReactNode;
  scale?: number;
}

export default function BouncyPress({ onPress, style, activeOpacity = 0.9, children, scale = 0.92 }: Props) {
  const anim = useRef(new Animated.Value(1)).current;

  function handlePressIn() {
    Animated.spring(anim, {
      toValue: scale,
      useNativeDriver: true,
      tension: 400,
      friction: 12,
    }).start();
  }

  function handlePressOut() {
    Animated.spring(anim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 14,
    }).start();
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      style={style}
    >
      <Animated.View style={{ transform: [{ scale: anim }] }}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}
