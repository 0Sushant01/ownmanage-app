import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import apiClient from '../../src/api/client'
import { useAuth } from '../../src/context/AuthContext'

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
  const { logout } = useAuth()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const res = await apiClient.get('/profile/')
      setProfile(res.data)
    } catch {
      // Non-critical
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
      >
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#10b981" />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        ) : profile ? (
          <View style={styles.content}>
            {/* User Avatar & Role Card */}
            <View style={styles.userCard}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                  {profile.user.first_name?.[0] || profile.user.email[0].toUpperCase()}
                </Text>
              </View>

              <Text style={styles.userName}>
                {profile.user.full_name || profile.user.email}
              </Text>
              <Text style={styles.userEmail}>{profile.user.email}</Text>

              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{profile.role}</Text>
              </View>
            </View>

            {/* Employment Card */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Institutional Credentials</Text>
                <Text style={styles.protectedBadge}>🔒 Protected</Text>
              </View>

              <View style={styles.detailsGrid}>
                <View style={styles.gridItem}>
                  <Text style={styles.itemLabel}>Company</Text>
                  <Text style={styles.itemValue}>
                    {profile.business?.name || 'Platform Administrator'}
                  </Text>
                </View>

                <View style={styles.gridItem}>
                  <Text style={styles.itemLabel}>Employee Badge ID</Text>
                  <Text style={[styles.itemValue, styles.empIdHighlight]}>
                    {profile.employee?.employee_id || 'Not Assigned'}
                  </Text>
                </View>

                <View style={styles.gridItem}>
                  <Text style={styles.itemLabel}>Designation</Text>
                  <Text style={styles.itemValue}>
                    {profile.employee?.designation || 'Staff'}
                  </Text>
                </View>

                <View style={styles.gridItem}>
                  <Text style={styles.itemLabel}>Department</Text>
                  <Text style={styles.itemValue}>
                    {profile.employee?.department || 'General'}
                  </Text>
                </View>

                <View style={styles.gridItem}>
                  <Text style={styles.itemLabel}>Branch</Text>
                  <Text style={styles.itemValue}>
                    {profile.employee?.branch || 'Headquarters'}
                  </Text>
                </View>

                <View style={styles.gridItem}>
                  <Text style={styles.itemLabel}>Joining Date</Text>
                  <Text style={styles.itemValue}>
                    {profile.employee?.joining_date || 'N/A'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Contact Details Card */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Contact Information</Text>
              <View style={styles.detailsGrid}>
                <View style={styles.gridItem}>
                  <Text style={styles.itemLabel}>Phone Number</Text>
                  <Text style={styles.itemValue}>
                    {profile.user.phone || 'None provided'}
                  </Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.itemLabel}>System Status</Text>
                  <Text style={[styles.itemValue, { color: '#10b981' }]}>Active Account</Text>
                </View>
              </View>
            </View>

            {/* Logout Button */}
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              disabled={loggingOut}
            >
              {loggingOut ? (
                <ActivityIndicator color="#e11d48" />
              ) : (
                <Text style={styles.logoutButtonText}>Sign Out of OwnManage</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  scrollContent: {
    padding: 20,
  },
  loadingBox: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 12,
  },
  content: {
    gap: 16,
  },
  userCard: {
    backgroundColor: '#0f172a',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#020617',
    fontSize: 28,
    fontWeight: '900',
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  userEmail: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10b981',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 12,
  },
  roleBadgeText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  sectionCard: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
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
    color: '#ffffff',
    marginBottom: 12,
  },
  protectedBadge: {
    fontSize: 10,
    color: '#64748b',
    backgroundColor: '#020617',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  detailsGrid: {
    gap: 12,
  },
  gridItem: {
    backgroundColor: '#020617',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  itemLabel: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 4,
  },
  itemValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  empIdHighlight: {
    color: '#10b981',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '700',
  },
  logoutButton: {
    backgroundColor: 'rgba(225, 29, 72, 0.1)',
    borderColor: '#e11d48',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  logoutButtonText: {
    color: '#f43f5e',
    fontSize: 14,
    fontWeight: '700',
  },
})
