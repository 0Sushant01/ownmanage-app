import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import apiClient from '../../src/api/client'
import { useAuth } from '../../src/context/AuthContext'
import { Screen } from '../../src/components/Screen'
import { useAppTheme, type ThemeMode } from '../../src/context/ThemeContext'

interface ProfileData {
  user: {
    id: string
    email: string
    first_name: string
    last_name: string
    phone: string
    full_name: string
  }
  employee?: {
    id: string
    employee_id?: string
    first_name: string
    last_name: string
    email: string
    phone: string
    designation: string
    joining_date: string
    department?: string
    branch?: string
    manager?: string
  } | null
  role?: string
  business?: {
    id: string
    name: string
  } | null
}

export default function ProfileScreen() {
  const router = useRouter()
  const { user, role, business, employee, logout } = useAuth()
  const { themeMode, colors, setThemeMode } = useAppTheme()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const fetchProfile = async () => {
    try {
      const res = await apiClient.get('/profile/')
      if (res.data) {
        setProfile(res.data)
      }
    } catch {
      // Non-critical: falls back to user/employee from AuthContext
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchProfile()
  }, [])

  const handleLogout = async () => {
    try {
      setLoggingOut(true)
      await logout()
      router.replace('/login')
    } catch {
      router.replace('/login')
    } finally {
      setLoggingOut(false)
    }
  }

  // Synthesize profile from API or AuthContext session
  const displayProfile: ProfileData | null = useMemo(() => {
    if (profile) return profile
    if (!user) return null
    return {
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: user.phone || '',
        full_name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
      },
      employee: employee ? {
        id: employee.id,
        employee_id: employee.employee_id,
        first_name: employee.first_name || user.first_name || '',
        last_name: employee.last_name || user.last_name || '',
        email: employee.email || user.email,
        phone: employee.phone || user.phone || '',
        designation: (employee as any).designation_name || employee.designation || 'Staff',
        joining_date: employee.joining_date || '',
        department: employee.department_name,
        branch: employee.branch_name,
        manager: employee.manager_name,
      } : null,
      role: role || undefined,
      business: business ? {
        id: business.id,
        name: business.name,
      } : null,
    }
  }, [profile, user, employee, role, business])

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {loading && !displayProfile ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading profile...</Text>
          </View>
        ) : displayProfile ? (
          <View style={styles.content}>
            {/* User Avatar & Role Card */}
            <View style={[styles.userCard, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}>
              <View style={[styles.avatarCircle, { backgroundColor: colors.accent }]}>
                <Text style={styles.avatarText}>
                  {displayProfile.user.first_name?.[0] || displayProfile.user.email[0].toUpperCase()}
                </Text>
              </View>

              <Text style={[styles.userName, { color: colors.text }]}>
                {displayProfile.user.full_name || displayProfile.user.email}
              </Text>
              <Text style={[styles.userEmail, { color: colors.textMuted }]}>{displayProfile.user.email}</Text>

              <View style={[styles.roleBadge, { borderColor: colors.accent, backgroundColor: `${colors.accent}20` }]}>
                <Text style={[styles.roleBadgeText, { color: colors.accent }]}>{displayProfile.role || 'MEMBER'}</Text>
              </View>
            </View>

            {/* Appearance / Theme Selector Card */}
            <View style={[styles.sectionCard, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Theme & Appearance</Text>
              <Text style={[styles.itemLabel, { color: colors.textMuted, marginBottom: 12 }]}>
                Choose your preferred interface theme
              </Text>
              <View style={styles.themeToggleRow}>
                {(['light', 'dark', 'system'] as ThemeMode[]).map((mode) => {
                  const isActive = themeMode === mode
                  return (
                    <TouchableOpacity
                      key={mode}
                      onPress={() => setThemeMode(mode)}
                      style={[
                        styles.themeButton,
                        { borderColor: isActive ? colors.accent : colors.border },
                        isActive && { backgroundColor: `${colors.accent}15` },
                      ]}
                    >
                      <Text style={[styles.themeIcon]}>
                        {mode === 'light' ? '☀️' : mode === 'dark' ? '🌙' : '💻'}
                      </Text>
                      <Text
                        style={[
                          styles.themeButtonText,
                          { color: isActive ? colors.accent : colors.textMuted },
                          isActive && { fontWeight: '700' },
                        ]}
                      >
                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>

            {/* Employment Card */}
            <View style={[styles.sectionCard, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Institutional Credentials</Text>
                <Text style={[styles.protectedBadge, { backgroundColor: colors.bgMuted, borderColor: colors.border, color: colors.textMuted }]}>
                  🔒 Protected
                </Text>
              </View>

              <View style={styles.detailsGrid}>
                <View style={[styles.gridItem, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                  <Text style={[styles.itemLabel, { color: colors.textMuted }]}>Company</Text>
                  <Text style={[styles.itemValue, { color: colors.text }]}>
                    {displayProfile.business?.name || 'Platform Administrator'}
                  </Text>
                </View>

                <View style={[styles.gridItem, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                  <Text style={[styles.itemLabel, { color: colors.textMuted }]}>Employee Badge ID</Text>
                  <Text style={[styles.itemValue, styles.empIdHighlight, { color: colors.accent }]}>
                    {displayProfile.employee?.employee_id || 'Not Assigned'}
                  </Text>
                </View>

                <View style={[styles.gridItem, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                  <Text style={[styles.itemLabel, { color: colors.textMuted }]}>Designation</Text>
                  <Text style={[styles.itemValue, { color: colors.text }]}>
                    {displayProfile.employee?.designation || 'Staff'}
                  </Text>
                </View>

                <View style={[styles.gridItem, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                  <Text style={[styles.itemLabel, { color: colors.textMuted }]}>Department</Text>
                  <Text style={[styles.itemValue, { color: colors.text }]}>
                    {displayProfile.employee?.department || 'General'}
                  </Text>
                </View>

                <View style={[styles.gridItem, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                  <Text style={[styles.itemLabel, { color: colors.textMuted }]}>Branch / Centre</Text>
                  <Text style={[styles.itemValue, { color: colors.text }]}>
                    {displayProfile.employee?.branch || 'Headquarters'}
                  </Text>
                </View>

                <View style={[styles.gridItem, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                  <Text style={[styles.itemLabel, { color: colors.textMuted }]}>Joining Date</Text>
                  <Text style={[styles.itemValue, { color: colors.text }]}>
                    {displayProfile.employee?.joining_date || 'N/A'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Contact Details Card */}
            <View style={[styles.sectionCard, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Contact Information</Text>
              <View style={styles.detailsGrid}>
                <View style={[styles.gridItem, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                  <Text style={[styles.itemLabel, { color: colors.textMuted }]}>Phone Number</Text>
                  <Text style={[styles.itemValue, { color: colors.text }]}>
                    {displayProfile.user.phone || 'None provided'}
                  </Text>
                </View>
                <View style={[styles.gridItem, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                  <Text style={[styles.itemLabel, { color: colors.textMuted }]}>System Status</Text>
                  <Text style={[styles.itemValue, { color: colors.success }]}>Active Account</Text>
                </View>
              </View>
            </View>

            {/* Logout Button */}
            <TouchableOpacity
              style={[styles.logoutButton, { borderColor: colors.danger, backgroundColor: `${colors.danger}15` }]}
              onPress={handleLogout}
              disabled={loggingOut}
            >
              {loggingOut ? (
                <ActivityIndicator color={colors.danger} />
              ) : (
                <Text style={[styles.logoutButtonText, { color: colors.danger }]}>Sign Out of OwnManage</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptySessionBox}>
            <Text style={[styles.emptySessionTitle, { color: colors.text }]}>No Active Session</Text>
            <Text style={[styles.emptySessionDesc, { color: colors.textMuted }]}>
              Please sign in to access your profile and attendance details.
            </Text>
            <TouchableOpacity style={[styles.emptyLoginBtn, { backgroundColor: colors.accent }]} onPress={() => router.replace('/login')}>
              <Text style={styles.emptyLoginText}>Go to Login</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 20,
  },
  loadingBox: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 13,
    marginTop: 12,
  },
  content: {
    gap: 16,
  },
  userCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '900',
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
  },
  userEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  roleBadge: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 12,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  sectionCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  themeToggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  themeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  themeIcon: {
    fontSize: 14,
  },
  themeButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  protectedBadge: {
    fontSize: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  detailsGrid: {
    gap: 12,
  },
  gridItem: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  itemLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  itemValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  empIdHighlight: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '700',
  },
  logoutButton: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  logoutButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptySessionBox: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptySessionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptySessionDesc: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyLoginBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyLoginText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
})
