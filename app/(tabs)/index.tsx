import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Modal,
  TextInput,
  Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import apiClient from '../../src/api/client'
import { useAuth } from '../../src/context/AuthContext'
import type { TodayAttendanceState } from '../../src/types'
import { AppPressable } from '../../src/components/AppPressable'
import { Screen } from '../../src/components/Screen'
import { type as typeStyle, getCardShadow } from '../../src/theme'
import { useAppTheme } from '../../src/context/ThemeContext'
import { BiometricEngine } from '../../src/features/biometrics'

type AttendanceMethodType = 'NORMAL' | 'QR' | 'FACE'

export default function HomeScreen() {
  const router = useRouter()
  const { user, employee, business } = useAuth()
  const { colors, isDark } = useAppTheme()
  const [todayState, setTodayState] = useState<TodayAttendanceState | null>(null)
  const [loading, setLoading] = useState(true)
  const [punching, setPunching] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [liveSeconds, setLiveSeconds] = useState(0)

  // Method selection: NORMAL, QR, FACE
  const [selectedMethod, setSelectedMethod] = useState<AttendanceMethodType>('NORMAL')

  // QR Modal State
  const [qrModalVisible, setQrModalVisible] = useState(false)
  const [qrInputToken, setQrInputToken] = useState('')
  const [pendingPunchType, setPendingPunchType] = useState<'check_in' | 'check_out'>('check_in')

  // Face Modal State
  const [faceModalVisible, setFaceModalVisible] = useState(false)
  const [faceSimulating, setFaceSimulating] = useState(false)

  // GPS coordinates state
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [gpsDetecting, setGpsDetecting] = useState(false)

  // Geolocation detection helper
  const detectLocation = useCallback((): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        setGpsDetecting(true)
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setGpsDetecting(false)
            const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
            setCurrentCoords(coords)
            resolve(coords)
          },
          () => {
            setGpsDetecting(false)
            // Fallback to existing or centre coordinates if in web dev sandbox
            resolve(currentCoords)
          },
          { timeout: 8000, enableHighAccuracy: true }
        )
      } else {
        resolve(currentCoords)
      }
    })
  }, [currentCoords])

  // Fetch authoritative state from backend API
  const fetchTodayState = async () => {
    try {
      const res = await apiClient.get('/attendance/today/')
      setTodayState(res.data)
      setLiveSeconds(res.data.total_work_seconds || 0)
      setErrorMessage(null)

      // Set default selected method based on allowed methods
      const allowed = res.data.allowed_methods
      if (allowed) {
        if (allowed.normal_punch) {
          setSelectedMethod('NORMAL')
        } else if (allowed.qr) {
          setSelectedMethod('QR')
        } else if (allowed.face_recognition) {
          setSelectedMethod('FACE')
        }
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Could not retrieve today attendance.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchTodayState()
    detectLocation()
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

  // Execute punch
  const executePunch = async (
    type: 'check_in' | 'check_out',
    method: AttendanceMethodType,
    extra: { qr_token?: string; face_data?: any } = {}
  ) => {
    try {
      setPunching(true)
      setStatusMessage(null)
      setErrorMessage(null)

      let lat = currentCoords?.lat
      let lng = currentCoords?.lng

      // If location is required and coords not yet obtained, attempt to detect
      if (todayState?.allowed_methods?.location_required && (!lat || !lng)) {
        const detected = await detectLocation()
        if (detected) {
          lat = detected.lat
          lng = detected.lng
        }
      }

      const endpoint = type === 'check_in' ? '/attendance/check-in/' : '/attendance/check-out/'
      const payload: any = {
        source: 'MOBILE',
        attendance_method: method,
        latitude: lat,
        longitude: lng,
        ...extra,
      }

      const res = await apiClient.post(endpoint, payload)
      setTodayState(res.data)
      setLiveSeconds(res.data.total_work_seconds || 0)
      setStatusMessage(
        `${type === 'check_in' ? 'Check-in' : 'Check-out'} recorded successfully via ${method} method.`
      )
    } catch (err: any) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        `Failed to record punch ${type}.`
      setErrorMessage(msg)
    } finally {
      setPunching(false)
    }
  }

  // Handle punch button press
  const handlePunchPress = (type: 'check_in' | 'check_out') => {
    if (selectedMethod === 'QR') {
      setPendingPunchType(type)
      setQrInputToken('')
      setQrModalVisible(true)
    } else if (selectedMethod === 'FACE') {
      setPendingPunchType(type)
      setFaceModalVisible(true)
    } else {
      executePunch(type, 'NORMAL')
    }
  }

  // Handle QR Submit
  const handleQrSubmit = () => {
    if (!qrInputToken.trim()) {
      setErrorMessage('Please enter or scan the QR token from the kiosk screen.')
      return
    }
    setQrModalVisible(false)
    executePunch(pendingPunchType, 'QR', { qr_token: qrInputToken.trim() })
  }

  // Handle Face ID Confirm with BiometricEngine
  const handleFaceAuthenticate = async () => {
    try {
      setFaceSimulating(true)
      setErrorMessage(null)

      const res = await BiometricEngine.verifyLiveFace()

      setFaceSimulating(false)
      setFaceModalVisible(false)

      if (!res.success) {
        setErrorMessage(res.errorMessage || 'Face verification failed.')
        return
      }

      // Execute punch with cryptographic assertion payload
      await executePunch(pendingPunchType, 'FACE', {
        face_data: {
          verification_assertion: res.assertion,
        },
      })
    } catch (err: any) {
      setFaceSimulating(false)
      setFaceModalVisible(false)
      setErrorMessage(err.message || 'Face verification encountered an error.')
    }
  }

  // Format seconds into "03h 42m 15s"
  const formatLiveDuration = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600)
    const minutes = Math.floor((totalSec % 3600) / 60)
    const seconds = totalSec % 60
    return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`
  }

  // Dynamic greeting based on current local hour
  const getGreeting = () => {
    const hour = new Date().getHours()
    const name = employee?.first_name || user?.first_name || 'Team Member'
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

  const allowed = todayState?.allowed_methods || {
    normal_punch: true,
    qr: false,
    face_recognition: false,
    location_required: false,
  }

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
              <Text style={[styles.businessBadgeText, { color: colors.textMuted }]}>{todayState?.centre_name || business?.name || 'OwnManage'}</Text>
            </View>
            {employee?.employee_id && (
              <View style={[styles.empIdBadge, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(5, 150, 105, 0.1)', borderColor: colors.accent }]}>
                <Text style={[styles.empIdBadgeText, { color: colors.accent }]}>{employee.employee_id}</Text>
              </View>
            )}
          </View>
        </View>

        {statusMessage && (
          <View style={[styles.messageBox, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.08)', borderColor: colors.accent }]}>
            <Text style={[styles.messageText, { color: colors.accent }]}>{statusMessage}</Text>
          </View>
        )}

        {errorMessage && (
          <View style={[styles.messageBox, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.08)', borderColor: colors.danger }]}>
            <Text style={[styles.messageText, { color: colors.danger }]}>{errorMessage}</Text>
          </View>
        )}

        {/* Method Selector Chips (Only show enabled methods) */}
        {!loading && todayState && (
          <View style={styles.methodSelectorSection}>
            <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>Attendance Method</Text>
            <View style={styles.methodChipsRow}>
              {allowed.normal_punch && (
                <AppPressable
                  style={[
                    styles.methodChip,
                    { backgroundColor: colors.bgElevated, borderColor: selectedMethod === 'NORMAL' ? colors.accent : colors.border },
                    selectedMethod === 'NORMAL' && { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)' },
                  ]}
                  onPress={() => setSelectedMethod('NORMAL')}
                >
                  <Text style={[styles.methodChipText, { color: selectedMethod === 'NORMAL' ? colors.accent : colors.text }]}>
                    Normal Punch
                  </Text>
                </AppPressable>
              )}

              {allowed.qr && (
                <AppPressable
                  style={[
                    styles.methodChip,
                    { backgroundColor: colors.bgElevated, borderColor: selectedMethod === 'QR' ? colors.accent : colors.border },
                    selectedMethod === 'QR' && { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)' },
                  ]}
                  onPress={() => setSelectedMethod('QR')}
                >
                  <Text style={[styles.methodChipText, { color: selectedMethod === 'QR' ? colors.accent : colors.text }]}>
                    QR Scan
                  </Text>
                </AppPressable>
              )}

              {allowed.face_recognition && (
                <AppPressable
                  style={[
                    styles.methodChip,
                    { backgroundColor: colors.bgElevated, borderColor: selectedMethod === 'FACE' ? colors.accent : colors.border },
                    selectedMethod === 'FACE' && { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)' },
                  ]}
                  onPress={() => setSelectedMethod('FACE')}
                >
                  <Text style={[styles.methodChipText, { color: selectedMethod === 'FACE' ? colors.accent : colors.text }]}>
                    Face ID
                  </Text>
                </AppPressable>
              )}
            </View>

            {/* GPS verification requirement indicator */}
            {allowed.location_required && (
              <View style={[styles.gpsNoticeBox, { backgroundColor: isDark ? 'rgba(56, 189, 248, 0.1)' : 'rgba(59, 130, 246, 0.08)', borderColor: colors.info }]}>
                <Text style={[styles.gpsNoticeText, { color: colors.info }]}>
                  Location Verification Active ({allowed.geofence_radius || 100}m geofence required)
                  {gpsDetecting ? ' · Detecting GPS...' : currentCoords ? ' · GPS Acquired' : ''}
                </Text>
              </View>
            )}
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
                    <Text style={[styles.checkedInBadgeText, { color: colors.accent }]}>CHECKED IN ({todayState.day_status})</Text>
                  </View>

                  <View style={styles.timerContainer}>
                    <Text style={[styles.timerLabel, { color: colors.textMuted }]}>Working duration:</Text>
                    <Text style={[styles.timerValue, { color: colors.info }]}>{formatLiveDuration(liveSeconds)}</Text>
                  </View>

                  <AppPressable
                    style={[styles.checkOutButton, { backgroundColor: colors.danger }, punching && styles.buttonDisabled]}
                    onPress={() => handlePunchPress('check_out')}
                    disabled={punching}
                  >
                    {punching ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text style={styles.checkOutButtonText}>
                        Check out via {selectedMethod}
                      </Text>
                    )}
                  </AppPressable>
                </View>
              )}

              {/* STATE 2: After Check-Out (Completed Day or between punches) */}
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
                    <Text style={[styles.completedBadgeText, { color: colors.info }]}>Status: {todayState.day_status}</Text>
                  </View>

                  <View style={styles.totalHoursRow}>
                    <Text style={[styles.timerLabel, { color: colors.textMuted }]}>Total Logged:</Text>
                    <Text style={[styles.totalHoursValue, { color: colors.accent }]}>
                      {Math.floor(todayState.total_work_seconds / 3600)}h{' '}
                      {Math.floor((todayState.total_work_seconds % 3600) / 60)}m
                    </Text>
                  </View>

                  <AppPressable
                    style={[styles.checkInButton, { backgroundColor: colors.accent, marginTop: 20 }, punching && styles.buttonDisabled]}
                    onPress={() => handlePunchPress('check_in')}
                    disabled={punching}
                  >
                    {punching ? (
                      <ActivityIndicator color={isDark ? colors.accentDark : '#ffffff'} />
                    ) : (
                      <Text style={[styles.checkInButtonText, { color: isDark ? colors.accentDark : '#ffffff' }]}>
                        Check in again via {selectedMethod}
                      </Text>
                    )}
                  </AppPressable>
                </View>
              )}

              {/* STATE 3: Before Check-In */}
              {!todayState.is_checked_in && !todayState.last_check_out_time && (
                <View style={styles.notStartedContainer}>
                  <Text style={[styles.notStartedPrompt, { color: colors.textMuted }]}>
                    You haven't checked in for today yet. Status: {todayState.day_status || 'NOT MARKED'}
                  </Text>

                  <AppPressable
                    style={[styles.checkInButton, { backgroundColor: colors.accent }, punching && styles.buttonDisabled]}
                    onPress={() => handlePunchPress('check_in')}
                    disabled={punching}
                  >
                    {punching ? (
                      <ActivityIndicator color={isDark ? colors.accentDark : '#ffffff'} />
                    ) : (
                      <Text style={[styles.checkInButtonText, { color: isDark ? colors.accentDark : '#ffffff' }]}>
                        Check in via {selectedMethod}
                      </Text>
                    )}
                  </AppPressable>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Today's Punches Chronicle */}
        {todayState?.events && todayState.events.length > 0 && (
          <View style={[styles.summaryCard, { backgroundColor: colors.bgElevated, borderColor: colors.border }, getCardShadow(isDark)]}>
            <Text style={[styles.summaryTitle, { color: colors.text }]}>Today's Activity Log</Text>
            {todayState.events.map((ev, idx) => (
              <View key={ev.id || idx} style={[styles.eventRow, { borderBottomColor: colors.border }]}>
                <View>
                  <Text style={[styles.eventType, { color: ev.event_type === 'CHECK_IN' ? colors.accent : colors.danger }]}>
                    {ev.event_type === 'CHECK_IN' ? 'Check In' : 'Check Out'}
                  </Text>
                  <Text style={[styles.eventTime, { color: colors.textMuted }]}>
                    {new Date(ev.event_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {ev.attendance_method || 'NORMAL'}
                  </Text>
                </View>
                {ev.location_verified && (
                  <View style={[styles.locationBadge, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)' }]}>
                    <Text style={[styles.locationBadgeText, { color: colors.accent }]}>GPS Verified</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Quick Shift Summary */}
        <View style={[styles.summaryCard, { backgroundColor: colors.bgElevated, borderColor: colors.border, marginTop: 16 }, getCardShadow(isDark)]}>
          <Text style={[styles.summaryTitle, { color: colors.text }]}>Shift Highlights</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Centre</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{todayState?.centre_name || 'Main'}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Date</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{todayState?.attendance_date || '--'}</Text>
            </View>
          </View>
        </View>

        {/* Quick Navigation Shortcuts */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
          <AppPressable
            accessibilityRole="button"
            onPress={() => router.push('/salary')}
            style={[
              styles.summaryCard,
              {
                flex: 1,
                marginTop: 0,
                backgroundColor: colors.bgElevated,
                borderColor: colors.border,
                paddingVertical: 12,
                paddingHorizontal: 14,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              },
              getCardShadow(isDark),
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 18 }}>💳</Text>
              <View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
                  My Payslips
                </Text>
                <Text style={{ fontSize: 11, color: colors.textMuted }}>
                  Salary details
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 16, color: colors.textMuted }}>›</Text>
          </AppPressable>

          <AppPressable
            accessibilityRole="button"
            onPress={() => router.push('/meetings')}
            style={[
              styles.summaryCard,
              {
                flex: 1,
                marginTop: 0,
                backgroundColor: colors.bgElevated,
                borderColor: colors.border,
                paddingVertical: 12,
                paddingHorizontal: 14,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              },
              getCardShadow(isDark),
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 18 }}>🤝</Text>
              <View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
                  Meetings
                </Text>
                <Text style={{ fontSize: 11, color: colors.textMuted }}>
                  Schedules & RSVP
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 16, color: colors.textMuted }}>›</Text>
          </AppPressable>
        </View>

        {/* QR Code Input / Scan Modal */}
        <Modal visible={qrModalVisible} transparent animationType="slide" onRequestClose={() => setQrModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>QR Code Attendance</Text>
              <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                Scan or enter the current kiosk token displayed at your centre.
              </Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.bgMuted, borderColor: colors.border, color: colors.text }]}
                placeholder="Enter QR token"
                placeholderTextColor={colors.textMuted}
                value={qrInputToken}
                onChangeText={setQrInputToken}
                autoCapitalize="characters"
              />
              <View style={styles.modalActionRow}>
                <AppPressable style={[styles.modalBtn, { backgroundColor: colors.bgMuted }]} onPress={() => setQrModalVisible(false)}>
                  <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancel</Text>
                </AppPressable>
                <AppPressable style={[styles.modalBtn, { backgroundColor: colors.accent }]} onPress={handleQrSubmit}>
                  <Text style={[styles.modalBtnText, { color: isDark ? colors.accentDark : '#ffffff' }]}>Confirm Punch</Text>
                </AppPressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* Face Recognition Modal */}
        <Modal visible={faceModalVisible} transparent animationType="fade" onRequestClose={() => setFaceModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>ARC Face Verification</Text>
              <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                Align your face within the frame to authenticate with the ARC engine.
              </Text>
              <View style={[styles.faceScannerBox, { borderColor: colors.accent, backgroundColor: colors.bgMuted }]}>
                {faceSimulating ? (
                  <ActivityIndicator size="large" color={colors.accent} />
                ) : (
                  <Text style={[styles.faceScannerText, { color: colors.accent }]}>[ Face In Frame ]</Text>
                )}
              </View>
              <View style={styles.modalActionRow}>
                <AppPressable style={[styles.modalBtn, { backgroundColor: colors.bgMuted }]} onPress={() => setFaceModalVisible(false)}>
                  <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancel</Text>
                </AppPressable>
                <AppPressable
                  style={[styles.modalBtn, { backgroundColor: colors.accent }, faceSimulating && styles.buttonDisabled]}
                  onPress={handleFaceAuthenticate}
                  disabled={faceSimulating}
                >
                  <Text style={[styles.modalBtnText, { color: isDark ? colors.accentDark : '#ffffff' }]}>
                    {faceSimulating ? 'Verifying...' : 'Authenticate'}
                  </Text>
                </AppPressable>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 20,
    paddingBottom: 32,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
  },
  header: {
    marginBottom: 20,
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
    fontWeight: '600',
  },
  methodSelectorSection: {
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  methodChipsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  methodChip: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  methodChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  gpsNoticeBox: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  gpsNoticeText: {
    fontSize: 11,
    fontWeight: '600',
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
  eventRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  eventType: {
    fontSize: 13,
    fontWeight: '700',
  },
  eventTime: {
    fontSize: 11,
    marginTop: 2,
  },
  locationBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  locationBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    marginBottom: 20,
  },
  modalActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  faceScannerBox: {
    height: 140,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  faceScannerText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
})
