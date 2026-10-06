import React, { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { useColorScheme } from 'react-native'
import storage from '../utils/storage'
import { lightColors, darkColors, type ColorTokens } from '../theme'

export type ThemeMode = 'light' | 'dark' | 'system'

interface ThemeContextType {
  themeMode: ThemeMode
  isDark: boolean
  colors: ColorTokens
  setThemeMode: (mode: ThemeMode) => Promise<void>
}

const THEME_STORAGE_KEY = 'ownmanage_app_theme_mode'

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme()
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system')
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    const loadStoredTheme = async () => {
      try {
        const saved = await storage.getItem(THEME_STORAGE_KEY)
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setThemeModeState(saved)
        }
      } catch (err) {
        console.warn('Failed to load theme preference:', err)
      } finally {
        setLoading(false)
      }
    }
    loadStoredTheme()
  }, [])

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode)
    try {
      await storage.setItem(THEME_STORAGE_KEY, mode)
    } catch (err) {
      console.warn('Failed to persist theme preference:', err)
    }
  }

  const isDark = useMemo(() => {
    if (themeMode === 'dark') return true
    if (themeMode === 'light') return false
    return systemColorScheme === 'dark'
  }, [themeMode, systemColorScheme])

  const colors = useMemo(() => {
    return isDark ? darkColors : lightColors
  }, [isDark])

  const value = useMemo(
    () => ({
      themeMode,
      isDark,
      colors,
      setThemeMode,
    }),
    [themeMode, isDark, colors]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useAppTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext)
  if (!context) {
    // Fallback if rendered outside ThemeProvider
    return {
      themeMode: 'system',
      isDark: true,
      colors: darkColors,
      setThemeMode: async () => {},
    }
  }
  return context
}

export default ThemeContext
