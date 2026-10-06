import React, { useRef } from 'react'
import {
  Pressable,
  Animated,
  Platform,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { hitSlop as defaultHitSlop, minTouch, webCursor } from '../theme'

type AppPressableProps = PressableProps & {
  style?: StyleProp<ViewStyle>
  pressedScale?: number
  minSize?: boolean
}

export function AppPressable({
  children,
  style,
  pressedScale = 0.98,
  hitSlop,
  disabled,
  onPressIn,
  onPressOut,
  minSize = false,
  accessibilityRole,
  ...rest
}: AppPressableProps) {
  const scale = useRef(new Animated.Value(1)).current

  const animateTo = (value: number) => {
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      friction: 8,
      tension: 160,
    }).start()
  }

  const handlePressIn = (event: GestureResponderEvent) => {
    if (!disabled && pressedScale !== 1) animateTo(pressedScale)
    onPressIn?.(event)
  }

  const handlePressOut = (event: GestureResponderEvent) => {
    if (pressedScale !== 1) animateTo(1)
    onPressOut?.(event)
  }

  return (
    <Pressable
      disabled={disabled}
      hitSlop={hitSlop ?? defaultHitSlop}
      accessibilityRole={accessibilityRole ?? 'button'}
      style={[
        webCursor,
        minSize ? { minHeight: minTouch, minWidth: minTouch } : null,
        disabled ? { opacity: 0.6 } : null,
        style,
      ]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      {...rest}
    >
      {({ pressed }) => (
        <Animated.View style={{ transform: [{ scale }] }}>
          {typeof children === 'function' ? children({ pressed }) : children}
        </Animated.View>
      )}
    </Pressable>
  )
}
