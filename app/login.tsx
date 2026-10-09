import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '../src/context/AuthContext'
import { AppPressable } from '../src/components/AppPressable'
import { Screen } from '../src/components/Screen'
import { fonts, getCardShadow } from '../src/theme'
import { useAppTheme } from '../src/context/ThemeContext'

export default function LoginScreen() {
  const router = useRouter()
  const { user, login, loading: authLoading } = useAuth()
  const { colors, isDark } = useAppTheme()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/(tabs)')
    }
  }, [user, authLoading])

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMessage('Please enter your email and password.')
      return
    }

    try {
      setSubmitting(true)
      setErrorMessage(null)
      await login(email.trim(), password)
      router.replace('/(tabs)')
    } catch (err: any) {
      const msg =
        err.response?.data?.non_field_errors?.[0] ||
        err.response?.data?.detail ||
        (err.message === 'Network Error'
          ? 'Network error: Cannot reach the backend API at http://localhost:8000. Ensure Django is running.'
          : err.message || 'Authentication failed. Please verify your credentials.')
      setErrorMessage(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const fillQuickCredentials = (devEmail: string) => {
    setEmail(devEmail)
    setPassword('123456')
    setErrorMessage(null)
  }

  if (authLoading) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Initializing OwnManage...</Text>
        </View>
      </Screen>
    )
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={[styles.logoBadge, { backgroundColor: colors.accent }]}>
              <Text style={[styles.logoText, { color: isDark ? colors.accentDark : '#ffffff' }]}>OM</Text>
            </View>
            <Text style={[styles.brandTitle, { color: colors.text }]}>OwnManage</Text>
            <Text style={[styles.brandSubtitle, { color: colors.textMuted }]}>
              Multi-Tenant Attendance & Workforce Management
            </Text>
          </View>

          <View style={[styles.formCard, { backgroundColor: colors.bgElevated, borderColor: colors.border }, getCardShadow(isDark)]}>
            <Text style={[styles.formTitle, { color: colors.text }]}>Sign In</Text>

            {errorMessage && (
              <View style={[styles.errorBox, { backgroundColor: isDark ? 'rgba(225, 29, 72, 0.15)' : '#fee2e2', borderColor: colors.danger }]}>
                <Text style={[styles.errorText, { color: colors.danger }]}>{errorMessage}</Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Work Email</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]}
                placeholder="name@company.com"
                placeholderTextColor={colors.textFaint}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, { flex: 1, paddingRight: 52, backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textFaint}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <AppPressable
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text style={[styles.eyeButtonText, { color: colors.accent }]}>{showPassword ? 'HIDE' : 'SHOW'}</Text>
                </AppPressable>
              </View>
            </View>

            <AppPressable
              style={[styles.primaryButton, { backgroundColor: colors.accent }, submitting && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={isDark ? colors.accentDark : '#ffffff'} />
              ) : (
                <Text style={[styles.primaryButtonText, { color: isDark ? colors.accentDark : '#ffffff' }]}>Sign In to App</Text>
              )}
            </AppPressable>
          </View>

          <View style={styles.devSection}>
            <Text style={[styles.devSectionTitle, { color: colors.textFaint }]}>DEV QUICK LOGIN</Text>
            <View style={styles.quickButtonsRow}>
              <AppPressable
                style={[styles.quickButton, { backgroundColor: colors.bgMuted, borderColor: colors.border }]}
                onPress={() => fillQuickCredentials('staff1@acme.com')}
              >
                <Text style={[styles.quickButtonText, { color: colors.textMuted }]}>Staff 1</Text>
              </AppPressable>
              <AppPressable
                style={[styles.quickButton, { backgroundColor: colors.bgMuted, borderColor: colors.border }]}
                onPress={() => fillQuickCredentials('manager1@acme.com')}
              >
                <Text style={[styles.quickButtonText, { color: colors.textMuted }]}>Manager</Text>
              </AppPressable>
              <AppPressable
                style={[styles.quickButton, { backgroundColor: colors.bgMuted, borderColor: colors.border }]}
                onPress={() => fillQuickCredentials('admin@acme.com')}
              >
                <Text style={[styles.quickButtonText, { color: colors.textMuted }]}>Admin</Text>
              </AppPressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: fonts.sans,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 26,
    fontWeight: '800',
    fontFamily: fonts.sans,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    fontFamily: fonts.sans,
  },
  brandSubtitle: {
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
    fontFamily: fonts.sans,
  },
  formCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    fontFamily: fonts.sans,
  },
  errorBox: {
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    fontFamily: fonts.sans,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: fonts.sans,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 48,
    fontSize: 16,
    fontFamily: fonts.sans,
  },
  passwordContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  eyeButton: {
    position: 'absolute',
    right: 4,
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  eyeButtonText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontFamily: fonts.sans,
  },
  primaryButton: {
    borderRadius: 12,
    minHeight: 52,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: fonts.sans,
    textAlign: 'center',
  },
  devSection: {
    marginTop: 32,
    alignItems: 'center',
  },
  devSectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 10,
    fontFamily: fonts.sans,
  },
  quickButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickButton: {
    borderWidth: 1,
    paddingHorizontal: 16,
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
  },
  quickButtonText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: fonts.sans,
  },
})
