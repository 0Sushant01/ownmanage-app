import { Platform, type TextStyle, type ViewStyle } from 'react-native'

export interface ColorTokens {
  bg: string
  bgElevated: string
  bgMuted: string
  border: string
  borderStrong: string
  text: string
  textMuted: string
  textFaint: string
  accent: string
  accentDark: string
  danger: string
  warning: string
  info: string
  success: string
}

export const lightColors: ColorTokens = {
  bg: '#f8fafc',
  bgElevated: '#ffffff',
  bgMuted: '#f1f5f9',
  border: '#e2e8f0',
  borderStrong: '#cbd5e1',
  text: '#0f172a',
  textMuted: '#64748b',
  textFaint: '#94a3b8',
  accent: '#059669',
  accentDark: '#047857',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  success: '#10b981',
}

export const darkColors: ColorTokens = {
  bg: '#090d16',
  bgElevated: '#0f172a',
  bgMuted: '#1e293b',
  border: '#1e293b',
  borderStrong: '#334155',
  text: '#f8fafc',
  textMuted: '#94a3b8',
  textFaint: '#64748b',
  accent: '#10b981',
  accentDark: '#020617',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#38bdf8',
  success: '#10b981',
}

// Default export is dark colors for backwards compatibility
export const colors = darkColors

export const fonts = {
  sans: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
  sansMedium: 'PlusJakartaSans_500Medium',
  mono: 'IBMPlexMono_500Medium',
  monoBold: 'IBMPlexMono_700Bold',
}

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
}

export const hitSlop = { top: 10, right: 10, bottom: 10, left: 10 }

export const minTouch = 44

export const webCursor = Platform.select({
  web: { cursor: 'pointer' as const },
  default: {},
})

export const type = {
  regular: { fontFamily: fonts.sans } as TextStyle,
  medium: { fontFamily: fonts.medium } as TextStyle,
  semibold: { fontFamily: fonts.semibold } as TextStyle,
  bold: { fontFamily: fonts.bold } as TextStyle,
  extrabold: { fontFamily: fonts.extrabold } as TextStyle,
  mono: { fontFamily: fonts.mono } as TextStyle,
  monoBold: { fontFamily: fonts.monoBold } as TextStyle,
}

export const getCardShadow = (isDark: boolean): ViewStyle => {
  if (Platform.OS === 'web') {
    return {
      boxShadow: isDark
        ? '0 10px 30px rgba(2, 6, 23, 0.45)'
        : '0 4px 20px rgba(0, 0, 0, 0.06)',
    } as any
  }
  return {
    shadowColor: isDark ? '#000000' : '#0f172a',
    shadowOffset: { width: 0, height: isDark ? 8 : 4 },
    shadowOpacity: isDark ? 0.28 : 0.08,
    shadowRadius: isDark ? 16 : 10,
    elevation: isDark ? 8 : 3,
  }
}

export const cardShadow: ViewStyle = getCardShadow(true)
