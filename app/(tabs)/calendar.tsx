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
  Modal,
  Platform,
} from 'react-native'
import apiClient from '../../src/api/client'
import type { CalendarDayRecord } from '../../src/types'

export default function CalendarScreen() {
  const currentDate = new Date()
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1)
  const [days, setDays] = useState<CalendarDayRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Modal for Tapped Date
  const [selectedDay, setSelectedDay] = useState<CalendarDayRecord | null>(null)

  const fetchCalendar = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await apiClient.get('/attendance/calendar/', {
        params: { year: selectedYear, month: selectedMonth },
      })
      setDays(res.data.days || [])
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load attendance calendar.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchCalendar()
  }, [selectedYear, selectedMonth])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchCalendar()
  }, [selectedYear, selectedMonth])

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12)
      setSelectedYear((y) => y - 1)
    } else {
      setSelectedMonth((m) => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1)
      setSelectedYear((y) => y + 1)
    } else {
      setSelectedMonth((m) => m + 1)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981', border: '#10b981' }
      case 'ABSENT':
        return { bg: 'rgba(225, 29, 72, 0.15)', text: '#f43f5e', border: '#f43f5e' }
      case 'HALF_DAY':
      case 'LATE':
        return { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: '#fbbf24' }
      case 'LEAVE':
        return { bg: 'rgba(56, 189, 248, 0.15)', text: '#38bdf8', border: '#38bdf8' }
      case 'WEEK_OFF':
      case 'HOLIDAY':
      default:
        return { bg: '#1e293b', text: '#94a3b8', border: '#334155' }
    }
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
      >
        {/* Month Navigation */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={handlePrevMonth} style={styles.navButton}>
            <Text style={styles.navButtonText}>◀</Text>
          </TouchableOpacity>
          <Text style={styles.monthTitle}>
            {monthNames[selectedMonth - 1]} {selectedYear}
          </Text>
          <TouchableOpacity onPress={handleNextMonth} style={styles.navButton}>
            <Text style={styles.navButtonText}>▶</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#10b981" />
            <Text style={styles.loadingText}>Loading calendar data...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : days.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyTitle}>No Records Found</Text>
            <Text style={styles.emptySubtitle}>No attendance logs for this month yet.</Text>
          </View>
        ) : (
          <View style={styles.daysList}>
            {days.map((day) => {
              const colors = getStatusColor(day.status)
              return (
                <TouchableOpacity
                  key={day.date}
                  style={styles.dayCard}
                  onPress={() => setSelectedDay(day)}
                  activeOpacity={0.7}
                >
                  <View style={styles.dayLeft}>
                    <Text style={styles.dayDateText}>{day.date}</Text>
                    <View style={styles.hoursRow}>
                      <Text style={styles.hoursLabel}>Working:</Text>
                      <Text style={styles.hoursText}>{day.work_hours}</Text>
                    </View>
                  </View>

                  <View style={styles.dayRight}>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: colors.bg, borderColor: colors.border },
                      ]}
                    >
                      <Text style={[styles.statusBadgeText, { color: colors.text }]}>
                        {day.status}
                      </Text>
                    </View>
                    <Text style={styles.tapPrompt}>Tap for details →</Text>
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        )}
      </ScrollView>

      {/* Date Detail Modal */}
      {selectedDay && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSelectedDay(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Attendance Details</Text>
                <TouchableOpacity onPress={() => setSelectedDay(null)}>
                  <Text style={styles.closeIcon}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date</Text>
                  <Text style={styles.detailValue}>{selectedDay.date}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: getStatusColor(selectedDay.status).bg,
                        borderColor: getStatusColor(selectedDay.status).border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        { color: getStatusColor(selectedDay.status).text },
                      ]}
                    >
                      {selectedDay.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Check-In Time</Text>
                  <Text style={styles.detailValue}>{selectedDay.check_in || 'None'}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Check-Out Time</Text>
                  <Text style={styles.detailValue}>{selectedDay.check_out || 'None'}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Working Hours</Text>
                  <Text style={[styles.detailValue, { color: '#10b981', fontWeight: '800' }]}>
                    {selectedDay.work_hours}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setSelectedDay(null)}
              >
                <Text style={styles.modalCloseButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
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
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f172a',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 20,
  },
  navButton: {
    padding: 8,
  },
  navButtonText: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '700',
  },
  monthTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
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
  errorBox: {
    backgroundColor: 'rgba(225, 29, 72, 0.15)',
    borderColor: '#e11d48',
    borderWidth: 1,
    padding: 16,
    borderRadius: 12,
  },
  errorText: {
    color: '#fda4af',
    fontSize: 13,
    textAlign: 'center',
  },
  emptyBox: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 10,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 4,
  },
  daysList: {
    gap: 12,
  },
  dayCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayLeft: {
    flex: 1,
  },
  dayDateText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  hoursLabel: {
    color: '#64748b',
    fontSize: 12,
  },
  hoursText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  dayRight: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  tapPrompt: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#0f172a',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    paddingBottom: 14,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#ffffff',
  },
  closeIcon: {
    fontSize: 18,
    color: '#94a3b8',
    padding: 4,
  },
  modalDetails: {
    gap: 14,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    color: '#94a3b8',
    fontSize: 13,
  },
  detailValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  modalCloseButton: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  modalCloseButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
})
