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
import apiClient from '../../src/api/client'
import { useAuth } from '../../src/context/AuthContext'
import type { TodayAttendanceState } from '../../src/types'

export default function HomeScreen() {
  const { user, employee, business } = useAuth()
  const [todayState, setTodayState] = useState<TodayAttendanceState | null>(null)
  const [loading, setLoading] = useState(true)
  const [punching, setPunching] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [liveSeconds, setLiveSeconds] = useState(0)

  // Fetch authoritative state from backend API
  const fetchTodayState = async () => {
    try {
      const res = await apiClient.get('/attendance/today/')
      setTodayState(res.data)
      setLiveSeconds(res.data.total_work_seconds || 0)
      setStatusMessage(null)
    } catch (err: any) {
      // If user has no employee profile, show message
      setStatusMessage(err.response?.data?.detail || 'Could not retrieve today attendance.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchTodayState()
  }, [])

  // Live timer interval: when checked in, increment working seconds every second
  useEffect(() => {
    if (!todayState?.is_checked_in) return
    const interval = setInterval(() => {
      setLiveSeconds((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [todayState?.is_checked_in])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchTodayState()
  }, [])

  const handlePunch = async (type: 'check_in' | 'check_out') => {
    try {
      setPunching(true)
      setStatusMessage(null)
      const endpoint = type === 'check_in' ? '/attendance/check-in/' : '/attendance/check-out/'
      const res = await apiClient.post(endpoint, { source: 'MOBILE' })
      setTodayState(res.data)
      setLiveSeconds(res.data.total_work_seconds || 0)
    } catch (err: any) {
      setStatusMessage(err.response?.data?.detail || `Failed to record punch ${type}.`)
    } finally {
      setPunching(false)
    }
  }

  // Format seconds into "03h 42m" or "03h 42m 15s"
  const formatLiveDuration = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600)
    const minutes = Math.floor((totalSec % 3600) / 60)
    const seconds = totalSec % 60
    return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`
  }

  // Dynamic greeting based on current local hour
  const getGreeting = () => {
    const hour = new Date().getHours()
    const name = employee?.first_name || user?.first_name || 'Rahul'
    if (hour < 12) return `Good morning, ${name}`
    if (hour < 17) return `Good afternoon, ${name}`
    return `Good evening, ${name}`
  }

  const currentDateDisplay = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
      >
        {/* Header Greeting */}
        <View style={styles.header}>
          <Text style={styles.greetingText}>{getGreeting()}</Text>
          <Text style={styles.dateText}>{currentDateDisplay}</Text>
          <View style={styles.badgeRow}>
            <View style={styles.businessBadge}>
              <Text style={styles.businessBadgeText}>{business?.name || 'OwnManage'}</Text>
            </View>
            {employee?.employee_id && (
              <View style={styles.empIdBadge}>
                <Text style={styles.empIdBadgeText}>{employee.employee_id}</Text>
              </View>
            )}
          </View>
        </View>

        {statusMessage && (
          <View style={styles.messageBox}>
            <Text style={styles.messageText}>{statusMessage}</Text>
          </View>
        )}

        {/* Attendance Card */}
        <View style={styles.attendanceCard}>
          <Text style={styles.cardHeaderTitle}>Today's attendance</Text>

          {loading ? (
            <View style={styles.innerLoading}>
              <ActivityIndicator size="large" color="#10b981" />
              <Text style={styles.innerLoadingText}>Syncing attendance...</Text>
            </View>
          ) : !todayState ? (
            <View style={styles.notLinkedBox}>
              <Text style={styles.notLinkedText}>
                No linked employee attendance profile found.
              </Text>
            </View>
          ) : (
            <View style={styles.cardBody}>
              {/* STATE 1: Checked In and Active */}
              {todayState.is_checked_in && (
                <View style={styles.activeStateContainer}>
                  <Text style={styles.primaryTime}>
                    {todayState.first_check_in_time || '--:--'}
                  </Text>
                  <View style={styles.checkedInBadge}>
                    <Text style={styles.checkedInBadgeText}>CHECKED IN</Text>
                  </View>

                  <View style={styles.timerContainer}>
                    <Text style={styles.timerLabel}>Working:</Text>
                    <Text style={styles.timerValue}>{formatLiveDuration(liveSeconds)}</Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.checkOutButton, punching && styles.buttonDisabled]}
                    onPress={() => handlePunch('check_out')}
                    disabled={punching}
                  >
                    {punching ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text style={styles.checkOutButtonText}>[ CHECK OUT ]</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* STATE 2: After Check-Out (Completed Day) */}
              {!todayState.is_checked_in && todayState.last_check_out_time && (
                <View style={styles.completedStateContainer}>
                  <View style={styles.completedRow}>
                    <Text style={styles.completedLabel}>Check-in:</Text>
                    <Text style={styles.completedValue}>{todayState.first_check_in_time || '--:--'}</Text>
                  </View>
                  <View style={styles.completedRow}>
                    <Text style={styles.completedLabel}>Check-out:</Text>
                    <Text style={styles.completedValue}>{todayState.last_check_out_time}</Text>
                  </View>

                  <View style={styles.completedBadge}>
                    <Text style={styles.completedBadgeText}>Completed</Text>
                  </View>

                  <View style={styles.totalHoursRow}>
                    <Text style={styles.timerLabel}>Total Logged:</Text>
                    <Text style={styles.totalHoursValue}>
                      {Math.floor(todayState.total_work_seconds / 3600)}h{' '}
                      {Math.floor((todayState.total_work_seconds % 3600) / 60)}m
                    </Text>
                  </View>

                  {/* Allow punch-in again if multiple check-ins are permitted in the workday */}
                  <TouchableOpacity
                    style={[styles.checkInButton, punching && styles.buttonDisabled, { marginTop: 20 }]}
                    onPress={() => handlePunch('check_in')}
                    disabled={punching}
                  >
                    {punching ? (
                      <ActivityIndicator color="#020617" />
                    ) : (
                      <Text style={styles.checkInButtonText}>[ CHECK IN AGAIN ]</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* STATE 3: Before Check-In */}
              {!todayState.is_checked_in && !todayState.last_check_out_time && (
                <View style={styles.notStartedContainer}>
                  <Text style={styles.notStartedPrompt}>
                    You haven't checked in for today yet.
                  </Text>

                  <TouchableOpacity
                    style={[styles.checkInButton, punching && styles.buttonDisabled]}
                    onPress={() => handlePunch('check_in')}
                    disabled={punching}
                  >
                    {punching ? (
                      <ActivityIndicator color="#020617" />
                    ) : (
                      <Text style={styles.checkInButtonText}>[ CHECK IN ]</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Quick Shift Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Shift Highlights</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Expected Hours</Text>
              <Text style={styles.summaryValue}>08h 00m</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Attendance Date</Text>
              <Text style={styles.summaryValue}>{todayState?.attendance_date || '--'}</Text>
            </View>
          </View>
        </View>
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
  header: {
    marginBottom: 24,
  },
  greetingText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  dateText: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  businessBadge: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  businessBadgeText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '600',
  },
  empIdBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10b981',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  empIdBadgeText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  messageBox: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  messageText: {
    color: '#38bdf8',
    fontSize: 12,
    textAlign: 'center',
  },
  attendanceCard: {
    backgroundColor: '#0f172a',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
    marginBottom: 20,
  },
  cardHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 20,
    textAlign: 'center',
  },
  innerLoading: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  innerLoadingText: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 12,
  },
  notLinkedBox: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  notLinkedText: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
  },
  cardBody: {
    alignItems: 'center',
  },
  activeStateContainer: {
    width: '100%',
    alignItems: 'center',
  },
  primaryTime: {
    fontSize: 42,
    fontWeight: '900',
    color: '#ffffff',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  checkedInBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: '#10b981',
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
    marginBottom: 20,
  },
  checkedInBadgeText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  timerLabel: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 4,
  },
  timerValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#38bdf8',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  checkOutButton: {
    backgroundColor: '#e11d48',
    borderRadius: 16,
    width: '100%',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#e11d48',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  checkOutButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  completedStateContainer: {
    width: '100%',
    alignItems: 'center',
  },
  completedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '80%',
    paddingVertical: 6,
  },
  completedLabel: {
    fontSize: 14,
    color: '#94a3b8',
  },
  completedValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  completedBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: '#38bdf8',
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginVertical: 16,
  },
  completedBadgeText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
  },
  totalHoursRow: {
    alignItems: 'center',
    marginBottom: 10,
  },
  totalHoursValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#10b981',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  notStartedContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 10,
  },
  notStartedPrompt: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  checkInButton: {
    backgroundColor: '#10b981',
    borderRadius: 16,
    width: '100%',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  checkInButtonText: {
    color: '#020617',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  summaryCard: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#cbd5e1',
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
})
