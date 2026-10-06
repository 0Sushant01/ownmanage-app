import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Platform,
} from 'react-native'
import apiClient from '../../src/api/client'
import { useAuth } from '../../src/context/AuthContext'
import type { TodayAttendanceState } from '../../src/types'
import { AppPressable } from '../../src/components/AppPressable'
import { Screen } from '../../src/components/Screen'
import { type as typeStyle, getCardShadow } from '../../src/theme'
import { useAppTheme } from '../../src/context/ThemeContext'

export default function HomeScreen() {
  const { user, employee, business } = useAuth()
  const { colors, isDark } = useAppTheme()
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
    <Screen>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {/* Header Greeting */}
        <View style={styles.header}>
          <Text style={[styles.greetingText, { color: colors.text }]}>{getGreeting()}</Text>
          <Text style={[styles.dateText, { color: colors.textMuted }]}>{currentDateDisplay}</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.businessBadge, { backgroundColor: colors.bgMuted, borderColor: colors.border }]}>
              <Text style={[styles.businessBadgeText, { color: colors.textMuted }]}>{business?.name || 'OwnManage'}</Text>
            </View>
            {employee?.employee_id && (
              <View style={[styles.empIdBadge, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(5, 150, 105, 0.1)', borderColor: colors.accent }]}>
                <Text style={[styles.empIdBadgeText, { color: colors.accent }]}>{employee.employee_id}</Text>
              </View>
            )}
          </View>
        </View>

        {statusMessage && (
          <View style={[styles.messageBox, { backgroundColor: colors.bgMuted, borderColor: colors.border }]}>
            <Text style={[styles.messageText, { color: colors.info }]}>{statusMessage}</Text>
          </View>
        )}

        {/* Attendance Card */}
        <View style={[styles.attendanceCard, { backgroundColor: colors.bgElevated, borderColor: colors.border }, getCardShadow(isDark)]}>
          <Text style={[styles.cardHeaderTitle, { color: colors.textMuted }]}>Today's attendance</Text>

          {loading ? (
            <View style={styles.innerLoading}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={[styles.innerLoadingText, { color: colors.textMuted }]}>Syncing attendance...</Text>
            </View>
          ) : !todayState ? (
            <View style={styles.notLinkedBox}>
              <Text style={[styles.notLinkedText, { color: colors.textMuted }]}>
                No linked employee attendance profile found.
              </Text>
            </View>
          ) : (
            <View style={styles.cardBody}>
              {/* STATE 1: Checked In and Active */}
              {todayState.is_checked_in && (
                <View style={styles.activeStateContainer}>
                  <Text style={[styles.primaryTime, { color: colors.text }]}>
                    {todayState.first_check_in_time || '--:--'}
                  </Text>
                  <View style={[styles.checkedInBadge, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.12)', borderColor: colors.accent }]}>
                    <Text style={[styles.checkedInBadgeText, { color: colors.accent }]}>CHECKED IN</Text>
                  </View>

                  <View style={styles.timerContainer}>
                    <Text style={[styles.timerLabel, { color: colors.textMuted }]}>Working:</Text>
                    <Text style={[styles.timerValue, { color: colors.info }]}>{formatLiveDuration(liveSeconds)}</Text>
                  </View>

                  <AppPressable
                    style={[styles.checkOutButton, { backgroundColor: colors.danger }, punching && styles.buttonDisabled]}
                    onPress={() => handlePunch('check_out')}
                    disabled={punching}
                  >
                    {punching ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text style={styles.checkOutButtonText}>Check out</Text>
                    )}
                  </AppPressable>
                </View>
              )}

              {/* STATE 2: After Check-Out (Completed Day) */}
              {!todayState.is_checked_in && todayState.last_check_out_time && (
                <View style={styles.completedStateContainer}>
                  <View style={styles.completedRow}>
                    <Text style={[styles.completedLabel, { color: colors.textMuted }]}>Check-in:</Text>
                    <Text style={[styles.completedValue, { color: colors.text }]}>{todayState.first_check_in_time || '--:--'}</Text>
                  </View>
                  <View style={styles.completedRow}>
                    <Text style={[styles.completedLabel, { color: colors.textMuted }]}>Check-out:</Text>
                    <Text style={[styles.completedValue, { color: colors.text }]}>{todayState.last_check_out_time}</Text>
                  </View>

                  <View style={[styles.completedBadge, { backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(59, 130, 246, 0.1)', borderColor: colors.info }]}>
                    <Text style={[styles.completedBadgeText, { color: colors.info }]}>Completed</Text>
                  </View>

                  <View style={styles.totalHoursRow}>
                    <Text style={[styles.timerLabel, { color: colors.textMuted }]}>Total Logged:</Text>
                    <Text style={[styles.totalHoursValue, { color: colors.accent }]}>
                      {Math.floor(todayState.total_work_seconds / 3600)}h{' '}
                      {Math.floor((todayState.total_work_seconds % 3600) / 60)}m
                    </Text>
                  </View>

                  {/* Allow punch-in again if multiple check-ins are permitted in the workday */}
                  <AppPressable
                    style={[styles.checkInButton, { backgroundColor: colors.accent, marginTop: 20 }, punching && styles.buttonDisabled]}
                    onPress={() => handlePunch('check_in')}
                    disabled={punching}
                  >
                    {punching ? (
                      <ActivityIndicator color={isDark ? colors.accentDark : '#ffffff'} />
                    ) : (
                      <Text style={[styles.checkInButtonText, { color: isDark ? colors.accentDark : '#ffffff' }]}>Check in again</Text>
                    )}
                  </AppPressable>
                </View>
              )}

              {/* STATE 3: Before Check-In */}
              {!todayState.is_checked_in && !todayState.last_check_out_time && (
                <View style={styles.notStartedContainer}>
                  <Text style={[styles.notStartedPrompt, { color: colors.textMuted }]}>
                    You haven't checked in for today yet.
                  </Text>

                  <AppPressable
                    style={[styles.checkInButton, { backgroundColor: colors.accent }, punching && styles.buttonDisabled]}
                    onPress={() => handlePunch('check_in')}
                    disabled={punching}
                  >
                    {punching ? (
                      <ActivityIndicator color={isDark ? colors.accentDark : '#ffffff'} />
                    ) : (
                      <Text style={[styles.checkInButtonText, { color: isDark ? colors.accentDark : '#ffffff' }]}>Check in</Text>
                    )}
                  </AppPressable>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Quick Shift Summary */}
        <View style={[styles.summaryCard, { backgroundColor: colors.bgElevated, borderColor: colors.border }, getCardShadow(isDark)]}>
          <Text style={[styles.summaryTitle, { color: colors.text }]}>Shift Highlights</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Expected Hours</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>08h 00m</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Attendance Date</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{todayState?.attendance_date || '--'}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 20,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 24,
  },
  greetingText: {
    fontSize: 26,
    letterSpacing: -0.6,
    ...typeStyle.extrabold,
  },
  dateText: {
    fontSize: 13,
    marginTop: 6,
    ...typeStyle.medium,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  businessBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  businessBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  empIdBadge: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  empIdBadgeText: {
    fontSize: 11,
    letterSpacing: 0.3,
    ...typeStyle.monoBold,
  },
  messageBox: {
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  messageText: {
    fontSize: 12,
    textAlign: 'center',
  },
  attendanceCard: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    marginBottom: 20,
  },
  cardHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
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
    fontSize: 12,
    marginTop: 12,
  },
  notLinkedBox: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  notLinkedText: {
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
    letterSpacing: -1,
    ...typeStyle.monoBold,
  },
  checkedInBadge: {
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
    marginBottom: 20,
  },
  checkedInBadgeText: {
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
    marginBottom: 4,
  },
  timerValue: {
    fontSize: 26,
    ...typeStyle.monoBold,
  },
  checkOutButton: {
    borderRadius: 16,
    width: '100%',
    minHeight: 52,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOutButtonText: {
    color: '#ffffff',
    fontSize: 16,
    letterSpacing: 0.2,
    ...typeStyle.extrabold,
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
  },
  completedValue: {
    fontSize: 15,
    ...typeStyle.monoBold,
  },
  completedBadge: {
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginVertical: 16,
  },
  completedBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  totalHoursRow: {
    alignItems: 'center',
    marginBottom: 10,
  },
  totalHoursValue: {
    fontSize: 22,
    ...typeStyle.monoBold,
  },
  notStartedContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 10,
  },
  notStartedPrompt: {
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  checkInButton: {
    borderRadius: 16,
    width: '100%',
    minHeight: 52,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkInButtonText: {
    fontSize: 16,
    letterSpacing: 0.2,
    ...typeStyle.extrabold,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  summaryCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '700',
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
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
  },
})
