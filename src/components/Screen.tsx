import React, { type ReactNode } from 'react'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAppTheme } from '../context/ThemeContext'

type ScreenProps = {
  children: ReactNode
  style?: StyleProp<ViewStyle>
  edges?: ('top' | 'right' | 'bottom' | 'left')[]
}

export function Screen({ children, style, edges = ['left', 'right'] }: ScreenProps) {
  const { colors } = useAppTheme()

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={edges}>
      <View style={[styles.inner, { backgroundColor: colors.bg }, style]}>{children}</View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  inner: {
    flex: 1,
  },
})
