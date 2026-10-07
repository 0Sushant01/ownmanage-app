import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Modal,
  Platform,
} from 'react-native'
import apiClient from '../../src/api/client'
import type { CalendarDayRecord, CalendarSummary } from '../../src/types'
import { AppPressable } from '../../src/components/AppPressable'
import { Screen } from '../../src/components/Screen'
import { type as typeStyle, getCardShadow } from '../../src/theme'
import { useAppTheme } from '../../src/context/ThemeContext'

interface StatusConfig {
  dot: string
  bg: string
  badgeBg: string
  badgeText: string
  label: string
  shortLabel: string
}

const getStatusConfig = (status: string, isDark: boolean): StatusConfig => {
  const configs: Record<string, StatusConfig> = {
    PRESENT:     { dot: '#10b981', bg: isDark ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.12)',  badgeBg: '#10b981', badgeText: '#ffffff', label: 'Present',    shortLabel: 'Present' },
    ABSENT:      { dot: '#f43f5e', bg: isDark ? 'rgba(244,63,94,0.1)' : 'rgba(244,63,94,0.12)',   badgeBg: '#f43f5e', badgeText: '#ffffff', label: 'Absent',     shortLabel: 'Absent' },
    HALF_DAY:    { dot: '#f59e0b', bg: isDark ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.12)',  badgeBg: '#f59e0b', badgeText: '#ffffff', label: 'Half Day',   shortLabel: 'Half Day' },
    LATE:        { dot: '#f97316', bg: isDark ? 'rgba(249,115,22,0.1)' : 'rgba(249,115,22,0.12)',  badgeBg: '#f97316', badgeText: '#ffffff', label: 'Late',       shortLabel: 'Late' },
    LEAVE_EARLY: { dot: '#f97316', bg: isDark ? 'rgba(249,115,22,0.1)' : 'rgba(249,115,22,0.12)',  badgeBg: '#f97316', badgeText: '#ffffff', label: 'Left Early', shortLabel: 'Early Off' },
    LEAVE:       { dot: '#38bdf8', bg: isDark ? 'rgba(56,189,248,0.1)' : 'rgba(56,189,248,0.12)',  badgeBg: '#38bdf8', badgeText: '#ffffff', label: 'Leave',      shortLabel: 'Leave' },
    HOLIDAY:     { dot: '#a78bfa', bg: isDark ? 'rgba(167,139,250,0.1)' : 'rgba(167,139,250,0.12)', badgeBg: '#a78bfa', badgeText: '#ffffff', label: 'Holiday',    shortLabel: 'Holiday' },
    WEEK_OFF:    { dot: isDark ? '#94a3b8' : '#64748b', bg: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(100,116,139,0.08)', badgeBg: isDark ? '#475569' : '#64748b', badgeText: '#ffffff', label: 'Weekly Off', shortLabel: 'Week Off' },
    FUTURE:      { dot: isDark ? '#334155' : '#cbd5e1', bg: 'transparent',            badgeBg: 'transparent', badgeText: isDark ? '#475569' : '#94a3b8', label: 'Upcoming', shortLabel: '' },
    NOT_MARKED:  { dot: isDark ? '#64748b' : '#94a3b8', bg: isDark ? 'rgba(100,116,139,0.1)' : 'rgba(100,116,139,0.08)', badgeBg: isDark ? '#334155' : '#e2e8f0', badgeText: isDark ? '#94a3b8' : '#64748b', label: 'Not Marked', shortLabel: 'Not Marked' },
    NO_DATA:     { dot: isDark ? '#475569' : '#cbd5e1', bg: 'transparent',            badgeBg: 'transparent', badgeText: isDark ? '#475569' : '#94a3b8', label: 'No Data',  shortLabel: '' },
  }
  return configs[status] || configs.NO_DATA
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const WEEKDAY_FULL: Record<string, string> = {
  Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday',
  Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday',
}

function formatFullDate(dateStr: string, weekday: string): string {
  try {
    const parts = dateStr.split('-')
    const y = parseInt(parts[0], 10)
    const m = parseInt(parts[1], 10)
    const d = parseInt(parts[2], 10)
    const fullDay = WEEKDAY_FULL[weekday] || weekday
    return `${fullDay}, ${d} ${MONTH_NAMES[m - 1]} ${y}`
  } catch {
    return dateStr
  }
}

export default function CalendarScreen() {
  const { colors, isDark } = useAppTheme()
  const currentDate = new Date()
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1)
  const [days, setDays] = useState<CalendarDayRecord[]>([])
  const [summary, setSummary] = useState<CalendarSummary | null>(null)
  const [firstWeekday, setFirstWeekday] = useState(0) // 0=Mon
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState<CalendarDayRecord | null>(null)

  const fetchCalendar = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await apiClient.get('/attendance/calendar/', {
        params: { year: selectedYear, month: selectedMonth },
      })
      setDays(res.data.days || [])
      setSummary(res.data.summary || null)
      setFirstWeekday(res.data.first_weekday ?? 0)
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

  const handleToday = () => {
    setSelectedYear(currentDate.getFullYear())
    setSelectedMonth(currentDate.getMonth() + 1)
  }

  // Today string: YYYY-MM-DD
  const todayStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`

  // Build grid: empty offset cells
  const emptyCells = Array.from({ length: firstWeekday }, (_, i) => ({ empty: true, key: `empty-${i}` }))

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Summary Cards (3x2 Grid) */}
        {summary && (
          <View style={styles.summaryContainer}>
            <View style={styles.summaryRow}>
              <StatCard
                count={summary.present}
                label="Present"
                color={colors.success}
                bgColor={isDark ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.12)'}
                borderColor={isDark ? 'rgba(16,185,129,0.22)' : 'rgba(16,185,129,0.28)'}
              />
              <StatCard
                count={summary.absent}
                label="Absent"
                color={colors.danger}
                bgColor={isDark ? 'rgba(244,63,94,0.08)' : 'rgba(244,63,94,0.12)'}
                borderColor={isDark ? 'rgba(244,63,94,0.22)' : 'rgba(244,63,94,0.28)'}
              />
              <StatCard
                count={summary.leave}
                label="Leave"
                color={colors.info}
                bgColor={isDark ? 'rgba(56,189,248,0.08)' : 'rgba(59,130,246,0.12)'}
                borderColor={isDark ? 'rgba(56,189,248,0.22)' : 'rgba(59,130,246,0.28)'}
              />
            </View>
            <View style={styles.summaryRow}>
              <StatCard
                count={summary.holiday}
                label="Holiday"
                color="#a78bfa"
                bgColor={isDark ? 'rgba(167,139,250,0.08)' : 'rgba(167,139,250,0.12)'}
                borderColor={isDark ? 'rgba(167,139,250,0.22)' : 'rgba(167,139,250,0.28)'}
              />
              <StatCard
                count={summary.week_off}
                label="Weekly Off"
                color={colors.textMuted}
                bgColor={isDark ? 'rgba(148,163,184,0.08)' : 'rgba(100,116,139,0.1)'}
                borderColor={isDark ? 'rgba(148,163,184,0.20)' : 'rgba(100,116,139,0.2)'}
              />
              <StatCard
                count={summary.late + summary.half_day}
                label={summary.half_day > 0 && summary.late === 0 ? 'Half Day' : summary.late > 0 && summary.half_day === 0 ? 'Late' : 'Late / Half'}
                color={colors.warning}
                bgColor={isDark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.12)'}
                borderColor={isDark ? 'rgba(245,158,11,0.22)' : 'rgba(245,158,11,0.28)'}
              />
            </View>
          </View>
        )}

        {/* Month Navigation Bar */}
        <View style={[styles.navBar, { backgroundColor: colors.bgElevated, borderColor: colors.border }, getCardShadow(isDark)]}>
          <AppPressable onPress={handlePrevMonth} style={[styles.navArrowBtn, { backgroundColor: colors.bgMuted }]} minSize>
            <Text style={[styles.navArrow, { color: colors.textMuted }]}>‹</Text>
          </AppPressable>
          <Text style={[styles.monthTitle, { color: colors.text }]}>
            {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
          </Text>
          <AppPressable onPress={handleNextMonth} style={[styles.navArrowBtn, { backgroundColor: colors.bgMuted }]} minSize>
            <Text style={[styles.navArrow, { color: colors.textMuted }]}>›</Text>
          </AppPressable>
          <AppPressable onPress={handleToday} style={[styles.todayBtn, { backgroundColor: isDark ? 'rgba(16,185,129,0.12)' : 'rgba(5,150,105,0.1)', borderColor: colors.accent }]} minSize>
            <Text style={[styles.todayBtnText, { color: colors.accent }]}>Today</Text>
          </AppPressable>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading calendar...</Text>
          </View>
        ) : error ? (
          <View style={[styles.errorBox, { backgroundColor: isDark ? 'rgba(225,29,72,0.12)' : '#fee2e2', borderColor: colors.danger }]}>
            <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          </View>
        ) : (
          <>
            {/* Calendar Card */}
            <View style={[styles.calendarCard, { backgroundColor: colors.bgElevated, borderColor: colors.border }, getCardShadow(isDark)]}>
              {/* Weekday Row */}
              <View style={[styles.weekdayRow, { borderBottomColor: colors.border }]}>
                {WEEKDAY_LABELS.map((w, idx) => (
                  <View key={w} style={styles.weekdayCell}>
                    <Text style={[styles.weekdayText, { color: (idx === 5 || idx === 6) ? colors.textFaint : colors.textMuted }]}>
                      {w}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Grid of Days */}
              <View style={styles.daysGrid}>
                {emptyCells.map((c) => (
                  <View key={c.key} style={styles.emptyCell} />
                ))}
                {days.map((day) => {
                  const config = getStatusConfig(day.status, isDark)
                  const isToday = day.date === todayStr
                  const isFuture = day.status === 'FUTURE'
                  const isNoData = day.status === 'NO_DATA'
                  const hasBadge = !isFuture && !isNoData && config.shortLabel !== ''

                  let badgeText = config.shortLabel
                  if (day.holiday_name) {
                    badgeText = day.holiday_name.length > 7 ? day.holiday_name.slice(0, 6) + '..' : day.holiday_name
                  } else if (day.leave_type) {
                    badgeText = day.leave_type.length > 7 ? day.leave_type.slice(0, 6) + '..' : day.leave_type
                  }

                  return (
                    <AppPressable
                      key={day.date}
                      style={[
                        styles.dayCell,
                        hasBadge && { backgroundColor: config.bg },
                        isToday && [styles.todayCell, { borderColor: colors.warning, backgroundColor: isDark ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.15)' }],
                      ]}
                      onPress={() => !isFuture && setSelectedDay(day)}
                      disabled={isFuture}
                    >
                      <Text
                        style={[
                          styles.dayNumber,
                          { color: isToday ? colors.warning : isFuture ? colors.textFaint : colors.text },
                        ]}
                      >
                        {day.day}
                      </Text>
                      {hasBadge ? (
                        <View style={[styles.statusBadge, { backgroundColor: config.badgeBg }]}>
                          <Text style={styles.statusBadgeText} numberOfLines={1}>
                            {badgeText}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.emptyBadgeSpace} />
                      )}
                    </AppPressable>
                  )
                })}
              </View>
            </View>

            {/* Legend */}
            <View style={[styles.legendCard, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}>
              <LegendItem color={colors.success} label="Present" textColor={colors.textMuted} />
              <LegendItem color={colors.danger} label="Absent" textColor={colors.textMuted} />
              <LegendItem color={colors.info} label="Leave" textColor={colors.textMuted} />
              <LegendItem color="#a78bfa" label="Holiday" textColor={colors.textMuted} />
              <LegendItem color={colors.textMuted} label="Weekly Off" textColor={colors.textMuted} />
              <LegendItem color="#f97316" label="Late" textColor={colors.textMuted} />
              <LegendItem color={colors.warning} label="Half Day" textColor={colors.textMuted} />
            </View>
          </>
        )}
      </ScrollView>

      {/* Day Detail Bottom Sheet / Modal */}
      {selectedDay && (
        <Modal
          visible={true}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setSelectedDay(null)}
        >
          <AppPressable
            style={styles.modalOverlay}
            onPress={() => setSelectedDay(null)}
          >
            <AppPressable
              style={[styles.modalSheet, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}
              onPress={(e) => e.stopPropagation()}
            >
              {/* Handle bar */}
              <View style={[styles.modalHandle, { backgroundColor: colors.borderStrong }]} />

              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={[styles.modalDateTitle, { color: colors.text }]}>
                  {formatFullDate(selectedDay.date, selectedDay.weekday)}
                </Text>
                <View
                  style={[
                    styles.modalStatusBadge,
                    { backgroundColor: getStatusConfig(selectedDay.status, isDark).badgeBg },
                  ]}
                >
                  <Text style={styles.modalStatusBadgeText}>
                    {getStatusConfig(selectedDay.status, isDark).label}
                  </Text>
                </View>
              </View>

              <View style={[styles.modalDivider, { backgroundColor: colors.border }]} />

              {/* Info Rows */}
              <View style={styles.modalBody}>
                {selectedDay.holiday_name ? (
                  <ModalRow icon="🎉" label="Holiday:" value={selectedDay.holiday_name} valueColor="#a78bfa" bgColor={colors.bgMuted} labelColor={colors.textMuted} textColor={colors.text} />
                ) : null}
                {selectedDay.leave_type ? (
                  <ModalRow icon="🏖️" label="Leave Type:" value={selectedDay.leave_type} valueColor={colors.info} bgColor={colors.bgMuted} labelColor={colors.textMuted} textColor={colors.text} />
                ) : null}
                <ModalRow icon="➔" label="Check In:" value={selectedDay.check_in || '—'} bgColor={colors.bgMuted} labelColor={colors.textMuted} textColor={colors.text} />
                <ModalRow icon="➔" label="Check Out:" value={selectedDay.check_out || '—'} bgColor={colors.bgMuted} labelColor={colors.textMuted} textColor={colors.text} />
                <ModalRow
                  icon="⏱️"
                  label="Working Hours:"
                  value={selectedDay.work_hours || '00h 00m'}
                  valueColor={colors.success}
                  bgColor={colors.bgMuted}
                  labelColor={colors.textMuted}
                  textColor={colors.text}
                />
                <ModalRow icon="⏰" label="Overtime:" value="—" bgColor={colors.bgMuted} labelColor={colors.textMuted} textColor={colors.text} />
              </View>

              {/* Close button */}
              <AppPressable
                style={[styles.modalCloseBtn, { backgroundColor: colors.accent }]}
                onPress={() => setSelectedDay(null)}
              >
                <Text style={[styles.modalCloseText, { color: isDark ? colors.accentDark : '#ffffff' }]}>Done</Text>
              </AppPressable>
            </AppPressable>
          </AppPressable>
        </Modal>
      )}
    </Screen>
  )
}

// --- Sub-components ---

function StatCard({
  count,
  label,
  color,
  bgColor,
  borderColor,
}: {
  count: number
  label: string
  color: string
  bgColor: string
  borderColor: string
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: bgColor, borderColor }]}>
      <Text style={[styles.statCount, { color }]}>{count}</Text>
      <Text style={[styles.statLabel, { color }]}>{label}</Text>
    </View>
  )
}

function LegendItem({ color, label, textColor }: { color: string; label: string; textColor: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[styles.legendLabel, { color: textColor }]}>{label}</Text>
    </View>
  )
}

function ModalRow({
  icon,
  label,
  value,
  valueColor,
  bgColor,
  labelColor,
  textColor,
}: {
  icon: string
  label: string
  value: string
  valueColor?: string
  bgColor: string
  labelColor: string
  textColor: string
}) {
  return (
    <View style={[styles.modalRow, { backgroundColor: bgColor }]}>
      <View style={styles.modalRowLeft}>
        <Text style={[styles.modalRowIcon, { color: labelColor }]}>{icon}</Text>
        <Text style={[styles.modalRowLabel, { color: labelColor }]}>{label}</Text>
      </View>
      <Text style={[styles.modalRowValue, { color: valueColor || textColor }]}>
        {value}
      </Text>
    </View>
  )
}

// --- Styles ---

const styles = StyleSheet.create({
  scrollContent: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 40,
  },
  summaryContainer: {
    marginBottom: 12,
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  statCount: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 0.2,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  navArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArrow: {
    fontSize: 20,
    fontWeight: '400',
    marginTop: -2,
  },
  monthTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  todayBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 6,
  },
  todayBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  loadingBox: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 13,
    marginTop: 10,
  },
  errorBox: {
    borderWidth: 1,
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    textAlign: 'center',
  },
  calendarCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 8,
    marginBottom: 12,
  },
  weekdayRow: {
    flexDirection: 'row',
    paddingBottom: 6,
    borderBottomWidth: 1,
    marginBottom: 6,
  },
  weekdayCell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    paddingVertical: 4,
  },
  weekdayText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  emptyCell: {
    width: `${100 / 7}%`,
    height: 52,
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 3,
    paddingHorizontal: 1,
    borderRadius: 8,
    marginVertical: 1,
  },
  todayCell: {
    borderWidth: 1.5,
  },
  dayNumber: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  statusBadge: {
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2,
    maxWidth: '92%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadgeText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyBadgeSpace: {
    height: 12,
    marginTop: 2,
  },
  legendCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.7)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalSheet: {
    width: '100%',
    maxWidth: 480,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalDateTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  modalStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  modalStatusBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  modalDivider: {
    height: 1,
    marginVertical: 12,
  },
  modalBody: {
    gap: 8,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modalRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalRowIcon: {
    fontSize: 13,
  },
  modalRowLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  modalRowValue: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  modalCloseBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  modalCloseText: {
    fontSize: 14,
    fontWeight: '700',
  },
})
