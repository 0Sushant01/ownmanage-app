import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Modal,
  Platform,
  Linking,
  Pressable,
} from 'react-native'
import apiClient from '../../src/api/client'
import { useAuth } from '../../src/context/AuthContext'
import type { MeetingItem, ParticipantResponseStatus } from '../../src/types'
import { Screen } from '../../src/components/Screen'
import { useAppTheme } from '../../src/context/ThemeContext'
import { getCardShadow } from '../../src/theme'

export default function MeetingsScreen() {
  const { user, role } = useAuth()
  const { colors, isDark } = useAppTheme()

  const [meetings, setMeetings] = useState<MeetingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<'UPCOMING' | 'TODAY' | 'ALL'>('UPCOMING')
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  // Detail Modal State
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingItem | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Schedule Modal State
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [scheduling, setScheduling] = useState(false)
  const [scheduleError, setScheduleError] = useState<string | null>(null)
  const [conflictWarning, setConflictWarning] = useState<string | null>(null)
  const [conflictAcknowledged, setConflictAcknowledged] = useState(false)

  const [form, setForm] = useState({
    title: '',
    description: '',
    meeting_date: new Date().toISOString().split('T')[0],
    start_time: '10:00',
    end_time: '11:00',
    location_type: 'ONLINE' as 'ONLINE' | 'IN_PERSON' | 'OTHER',
    meeting_url: '',
    location_details: '',
  })

  const canSchedule =
    role === 'SUPERADMIN' ||
    role === 'BUSINESS_ADMIN' ||
    role === 'MANAGER'

  const fetchMeetings = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await apiClient.get('/meetings/')
      setMeetings(res.data.results || res.data || [])
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load meetings.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchMeetings()
  }, [])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchMeetings()
  }, [])

  // Filtered Meetings
  const filteredMeetings = meetings.filter((m) => {
    const todayStr = new Date().toISOString().split('T')[0]
    if (filter === 'TODAY') {
      return m.meeting_date === todayStr && m.status !== 'CANCELLED'
    }
    if (filter === 'UPCOMING') {
      return m.meeting_date >= todayStr && m.status !== 'CANCELLED'
    }
    return true
  })

  // Respond / RSVP
  const handleRsvp = async (meetingId: string, status: ParticipantResponseStatus) => {
    try {
      setActionLoading(true)
      await apiClient.post(`/meetings/${meetingId}/respond/`, {
        response_status: status,
      })
      setStatusMessage(`RSVP updated to ${status.toLowerCase()}.`)
      setTimeout(() => setStatusMessage(null), 3500)
      fetchMeetings()
      if (selectedMeeting && selectedMeeting.id === meetingId) {
        setSelectedMeeting((prev) =>
          prev ? { ...prev, my_response_status: status } : null
        )
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update RSVP.')
    } finally {
      setActionLoading(false)
    }
  }

  // Check conflicts then schedule
  const handleScheduleSubmit = async () => {
    if (!form.title.trim() || !form.meeting_date || !form.start_time || !form.end_time) {
      setScheduleError('Please enter a title, date, start time, and end time.')
      return
    }
    if (form.end_time <= form.start_time) {
      setScheduleError('End time must be after start time.')
      return
    }

    try {
      setScheduling(true)
      setScheduleError(null)

      // 1. Conflict Check (if not acknowledged yet)
      if (!conflictAcknowledged) {
        const confRes = await apiClient.post('/meetings/check-conflicts/', {
          meeting_date: form.meeting_date,
          start_time: form.start_time,
          end_time: form.end_time,
        })
        if (confRes.data?.has_conflicts) {
          const warnings = confRes.data.conflicts.map((c: any) => c.warning).join('\n')
          setConflictWarning(`Overlap detected:\n${warnings}`)
          setScheduling(false)
          return
        }
      }

      // 2. Create Meeting
      await apiClient.post('/meetings/', {
        ...form,
        location_type: form.location_type,
      })

      setScheduleModalOpen(false)
      setForm({
        title: '',
        description: '',
        meeting_date: new Date().toISOString().split('T')[0],
        start_time: '10:00',
        end_time: '11:00',
        location_type: 'ONLINE',
        meeting_url: '',
        location_details: '',
      })
      setConflictWarning(null)
      setConflictAcknowledged(false)
      setStatusMessage('Meeting scheduled successfully.')
      setTimeout(() => setStatusMessage(null), 3500)
      fetchMeetings()
    } catch (err: any) {
      setScheduleError(
        err.response?.data?.detail ||
          err.response?.data?.non_field_errors?.[0] ||
          'Failed to schedule meeting.'
      )
    } finally {
      setScheduling(false)
    }
  }

  // Stats
  const todayStr = new Date().toISOString().split('T')[0]
  const todayCount = meetings.filter((m) => m.meeting_date === todayStr && m.status !== 'CANCELLED').length
  const pendingRsvpCount = meetings.filter((m) => m.my_response_status === 'PENDING').length

  const getStatusColor = (status: ParticipantResponseStatus | undefined) => {
    switch (status) {
      case 'ACCEPTED':
        return colors.success
      case 'DECLINED':
        return colors.danger
      case 'TENTATIVE':
        return '#f59e0b'
      default:
        return colors.textMuted
    }
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {/* KPI Summary Cards */}
        <View style={styles.kpiRow}>
          <View style={[styles.kpiCard, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}>
            <Text style={[styles.kpiNumber, { color: colors.text }]}>{meetings.length}</Text>
            <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Total</Text>
          </View>
          <View style={[styles.kpiCard, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}>
            <Text style={[styles.kpiNumber, { color: colors.accent }]}>{todayCount}</Text>
            <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Today</Text>
          </View>
          <View style={[styles.kpiCard, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}>
            <Text style={[styles.kpiNumber, { color: '#f59e0b' }]}>{pendingRsvpCount}</Text>
            <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Pending RSVP</Text>
          </View>
        </View>

        {/* Action Header / Filter Row */}
        <View style={styles.filterSection}>
          <View style={styles.filterPills}>
            {(['UPCOMING', 'TODAY', 'ALL'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setFilter(tab)}
                style={[
                  styles.filterPill,
                  { borderColor: colors.border, backgroundColor: colors.bgElevated },
                  filter === tab && { backgroundColor: colors.accent, borderColor: colors.accent },
                ]}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    { color: colors.textMuted },
                    filter === tab && { color: isDark ? colors.accentDark : '#ffffff', fontWeight: '700' },
                  ]}
                >
                  {tab === 'UPCOMING' ? 'Upcoming' : tab === 'TODAY' ? "Today" : 'All'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {canSchedule && (
            <TouchableOpacity
              onPress={() => {
                setConflictWarning(null)
                setConflictAcknowledged(false)
                setScheduleError(null)
                setScheduleModalOpen(true)
              }}
              style={[styles.scheduleBtn, { backgroundColor: colors.accent }]}
            >
              <Text style={[styles.scheduleBtnText, { color: isDark ? colors.accentDark : '#ffffff' }]}>
                + Schedule
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Alert Banners */}
        {statusMessage && (
          <View style={[styles.messageBox, { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: colors.success }]}>
            <Text style={[styles.messageText, { color: colors.success }]}>{statusMessage}</Text>
          </View>
        )}

        {error && (
          <View style={[styles.messageBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: colors.danger }]}>
            <Text style={[styles.messageText, { color: colors.danger }]}>{error}</Text>
          </View>
        )}

        {/* Meeting Cards List */}
        {loading && !refreshing ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading schedules...</Text>
          </View>
        ) : filteredMeetings.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>🤝</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Meetings Found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              {filter === 'TODAY'
                ? 'No sessions scheduled for today.'
                : 'You have no scheduled meetings in this view.'}
            </Text>
          </View>
        ) : (
          <View style={styles.cardsList}>
            {filteredMeetings.map((m) => {
              const isToday = m.meeting_date === todayStr
              const isPast = m.meeting_date < todayStr
              return (
                <TouchableOpacity
                  key={m.id}
                  activeOpacity={0.85}
                  onPress={() => setSelectedMeeting(m)}
                  style={[
                    styles.meetingCard,
                    { backgroundColor: colors.bgElevated, borderColor: colors.border },
                    getCardShadow(isDark),
                    m.status === 'CANCELLED' && { opacity: 0.6 },
                  ]}
                >
                  {/* Card Header */}
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <View
                          style={[
                            styles.dateBadge,
                            {
                              backgroundColor: isToday
                                ? `${colors.accent}20`
                                : isPast
                                ? colors.bgMuted
                                : `${colors.accent}10`,
                              borderColor: isToday ? colors.accent : colors.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.dateBadgeText,
                              { color: isToday ? colors.accent : colors.textMuted },
                            ]}
                          >
                            {isToday ? 'Today' : m.meeting_date}
                          </Text>
                        </View>
                        <Text style={[styles.timeText, { color: colors.textMuted }]}>
                          ⏱️ {m.start_time.slice(0, 5)} - {m.end_time.slice(0, 5)}
                        </Text>
                      </View>
                      <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
                        {m.title}
                      </Text>
                    </View>

                    {/* Status Pill */}
                    <View
                      style={[
                        styles.statusPill,
                        {
                          borderColor: m.status === 'CANCELLED' ? colors.danger : getStatusColor(m.my_response_status),
                          backgroundColor: `${
                            m.status === 'CANCELLED' ? colors.danger : getStatusColor(m.my_response_status)
                          }15`,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          {
                            color: m.status === 'CANCELLED' ? colors.danger : getStatusColor(m.my_response_status),
                          },
                        ]}
                      >
                        {m.status === 'CANCELLED'
                          ? 'CANCELLED'
                          : m.is_organizer
                          ? 'ORGANIZER'
                          : m.my_response_status || 'PENDING'}
                      </Text>
                    </View>
                  </View>

                  {/* Location / Call link info */}
                  <View style={styles.cardMetaRow}>
                    <Text style={[styles.metaText, { color: colors.textMuted }]}>
                      {m.location_type === 'ONLINE' ? '📹 Online Video Call' : '📍 ' + (m.location_details || 'In-Person')}
                    </Text>
                    <Text style={[styles.metaText, { color: colors.textMuted }]}>
                      👥 {m.participants_count} {m.participants_count === 1 ? 'attendee' : 'attendees'}
                    </Text>
                  </View>

                  {/* Video Call Quick Join Button */}
                  {m.meeting_url && m.status !== 'CANCELLED' && (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation()
                        if (m.meeting_url) Linking.openURL(m.meeting_url)
                      }}
                      style={[styles.joinBtn, { backgroundColor: `${colors.accent}15`, borderColor: colors.accent }]}
                    >
                      <Text style={[styles.joinBtnText, { color: colors.accent }]}>
                        🎥 Join Call Link
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Interactive Quick RSVP (if attendee and not cancelled) */}
                  {!m.is_organizer && m.status !== 'CANCELLED' && (
                    <View style={styles.rsvpRow}>
                      <Text style={[styles.rsvpLabel, { color: colors.textMuted }]}>RSVP:</Text>
                      <TouchableOpacity
                        disabled={actionLoading}
                        onPress={(e) => {
                          e.stopPropagation()
                          handleRsvp(m.id, 'ACCEPTED')
                        }}
                        style={[
                          styles.rsvpBtn,
                          {
                            backgroundColor:
                              m.my_response_status === 'ACCEPTED' ? colors.success : colors.bgMuted,
                            borderColor: colors.success,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.rsvpBtnText,
                            { color: m.my_response_status === 'ACCEPTED' ? '#ffffff' : colors.success },
                          ]}
                        >
                          Accept
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        disabled={actionLoading}
                        onPress={(e) => {
                          e.stopPropagation()
                          handleRsvp(m.id, 'TENTATIVE')
                        }}
                        style={[
                          styles.rsvpBtn,
                          {
                            backgroundColor:
                              m.my_response_status === 'TENTATIVE' ? '#f59e0b' : colors.bgMuted,
                            borderColor: '#f59e0b',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.rsvpBtnText,
                            { color: m.my_response_status === 'TENTATIVE' ? '#ffffff' : '#f59e0b' },
                          ]}
                        >
                          Tentative
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        disabled={actionLoading}
                        onPress={(e) => {
                          e.stopPropagation()
                          handleRsvp(m.id, 'DECLINED')
                        }}
                        style={[
                          styles.rsvpBtn,
                          {
                            backgroundColor:
                              m.my_response_status === 'DECLINED' ? colors.danger : colors.bgMuted,
                            borderColor: colors.danger,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.rsvpBtnText,
                            { color: m.my_response_status === 'DECLINED' ? '#ffffff' : colors.danger },
                          ]}
                        >
                          Decline
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </TouchableOpacity>
              )
            })}
          </View>
        )}

        {/* MEETING DETAIL MODAL */}
        {selectedMeeting && (
          <Modal
            visible={!!selectedMeeting}
            transparent
            animationType="slide"
            onRequestClose={() => setSelectedMeeting(null)}
          >
            <Pressable
              accessibilityRole="none"
              style={styles.modalOverlay}
              onPress={() => setSelectedMeeting(null)}
            >
              <Pressable
                accessibilityRole="none"
                style={[styles.modalSheet, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}
                onPress={(e) => e.stopPropagation()}
              >
                <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />

                <View style={styles.modalHeaderRow}>
                  <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={2}>
                    {selectedMeeting.title}
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedMeeting(null)}>
                    <Text style={{ fontSize: 18, color: colors.textMuted }}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ maxHeight: 420 }}>
                  <View style={styles.detailSection}>
                    <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Schedule</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      📅 {selectedMeeting.meeting_date} · ⏱️ {selectedMeeting.start_time.slice(0, 5)} -{' '}
                      {selectedMeeting.end_time.slice(0, 5)} ({selectedMeeting.duration_minutes}m)
                    </Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Organizer</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      👤 {selectedMeeting.organizer_name} ({selectedMeeting.organizer_email})
                    </Text>
                  </View>

                  {selectedMeeting.description ? (
                    <View style={styles.detailSection}>
                      <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Agenda / Notes</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>
                        {selectedMeeting.description}
                      </Text>
                    </View>
                  ) : null}

                  {selectedMeeting.meeting_url ? (
                    <View style={styles.detailSection}>
                      <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Call Link</Text>
                      <TouchableOpacity
                        onPress={() => {
                          if (selectedMeeting.meeting_url) Linking.openURL(selectedMeeting.meeting_url)
                        }}
                      >
                        <Text style={{ color: colors.accent, fontSize: 13, textDecorationLine: 'underline' }}>
                          {selectedMeeting.meeting_url}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}

                  {selectedMeeting.location_details ? (
                    <View style={styles.detailSection}>
                      <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Location Details</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>
                        📍 {selectedMeeting.location_details}
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.detailSection}>
                    <Text style={[styles.detailLabel, { color: colors.textMuted }]}>
                      Participants ({selectedMeeting.participants_count})
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                      <Text style={{ fontSize: 12, color: colors.success }}>
                        ✓ {selectedMeeting.accepted_count} Accepted
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.danger }}>
                        ✗ {selectedMeeting.declined_count} Declined
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.textMuted }}>
                        ⏳ {selectedMeeting.pending_count} Pending
                      </Text>
                    </View>
                  </View>
                </ScrollView>

                <TouchableOpacity
                  style={[styles.closeModalBtn, { backgroundColor: colors.accent }]}
                  onPress={() => setSelectedMeeting(null)}
                >
                  <Text style={[styles.closeModalBtnText, { color: isDark ? colors.accentDark : '#ffffff' }]}>
                    Done
                  </Text>
                </TouchableOpacity>
              </Pressable>
            </Pressable>
          </Modal>
        )}

        {/* SCHEDULE MEETING MODAL */}
        <Modal
          visible={scheduleModalOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setScheduleModalOpen(false)}
        >
          <Pressable
            accessibilityRole="none"
            style={styles.modalOverlay}
            onPress={() => setScheduleModalOpen(false)}
          >
            <Pressable
              accessibilityRole="none"
              style={[styles.modalSheet, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />

              <View style={styles.modalHeaderRow}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Schedule a Meeting</Text>
                <TouchableOpacity onPress={() => setScheduleModalOpen(false)}>
                  <Text style={{ fontSize: 18, color: colors.textMuted }}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">
                {scheduleError && (
                  <View style={[styles.messageBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: colors.danger, marginBottom: 12 }]}>
                    <Text style={[styles.messageText, { color: colors.danger }]}>{scheduleError}</Text>
                  </View>
                )}

                {conflictWarning && (
                  <View style={[styles.messageBox, { backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: '#f59e0b', marginBottom: 12 }]}>
                    <Text style={[styles.messageText, { color: '#f59e0b', fontWeight: '700', marginBottom: 4 }]}>
                      ⚠️ Schedule Overlap Detected
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.text }}>{conflictWarning}</Text>
                    <TouchableOpacity
                      onPress={() => setConflictAcknowledged(!conflictAcknowledged)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}
                    >
                      <Text style={{ fontSize: 16 }}>{conflictAcknowledged ? '☑️' : '⬜'}</Text>
                      <Text style={{ fontSize: 12, color: colors.text, fontWeight: '600' }}>
                        I understand there is an overlap, proceed anyway.
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Title *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.bgMuted, borderColor: colors.border, color: colors.text }]}
                  placeholder="e.g. Weekly Operations Sync"
                  placeholderTextColor={colors.textMuted}
                  value={form.title}
                  onChangeText={(val) => setForm({ ...form, title: val })}
                />

                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Date (YYYY-MM-DD) *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.bgMuted, borderColor: colors.border, color: colors.text }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textMuted}
                  value={form.meeting_date}
                  onChangeText={(val) => setForm({ ...form, meeting_date: val })}
                />

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Start Time (HH:MM)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.bgMuted, borderColor: colors.border, color: colors.text }]}
                      placeholder="10:00"
                      placeholderTextColor={colors.textMuted}
                      value={form.start_time}
                      onChangeText={(val) => setForm({ ...form, start_time: val })}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, { color: colors.textMuted }]}>End Time (HH:MM)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.bgMuted, borderColor: colors.border, color: colors.text }]}
                      placeholder="11:00"
                      placeholderTextColor={colors.textMuted}
                      value={form.end_time}
                      onChangeText={(val) => setForm({ ...form, end_time: val })}
                    />
                  </View>
                </View>

                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Location Type</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                  {(['ONLINE', 'IN_PERSON'] as const).map((type) => (
                    <TouchableOpacity
                      key={type}
                      onPress={() => setForm({ ...form, location_type: type })}
                      style={[
                        styles.filterPill,
                        { borderColor: colors.border, backgroundColor: colors.bgMuted },
                        form.location_type === type && { backgroundColor: colors.accent, borderColor: colors.accent },
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterPillText,
                          { color: colors.textMuted },
                          form.location_type === type && { color: isDark ? colors.accentDark : '#ffffff', fontWeight: '700' },
                        ]}
                      >
                        {type === 'ONLINE' ? '📹 Online' : '📍 In-Person'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {form.location_type === 'ONLINE' ? (
                  <>
                    <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Video Meeting URL</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.bgMuted, borderColor: colors.border, color: colors.text }]}
                      placeholder="https://meet.google.com/..."
                      placeholderTextColor={colors.textMuted}
                      value={form.meeting_url}
                      onChangeText={(val) => setForm({ ...form, meeting_url: val })}
                    />
                  </>
                ) : (
                  <>
                    <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Location / Room Details</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.bgMuted, borderColor: colors.border, color: colors.text }]}
                      placeholder="e.g. Conference Room B"
                      placeholderTextColor={colors.textMuted}
                      value={form.location_details}
                      onChangeText={(val) => setForm({ ...form, location_details: val })}
                    />
                  </>
                )}

                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Description / Agenda</Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.bgMuted, borderColor: colors.border, color: colors.text, height: 70 },
                  ]}
                  placeholder="Points to discuss..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  value={form.description}
                  onChangeText={(val) => setForm({ ...form, description: val })}
                />
              </ScrollView>

              <TouchableOpacity
                disabled={scheduling}
                style={[styles.closeModalBtn, { backgroundColor: colors.accent, marginTop: 12 }]}
                onPress={handleScheduleSubmit}
              >
                {scheduling ? (
                  <ActivityIndicator color={isDark ? colors.accentDark : '#ffffff'} />
                ) : (
                  <Text style={[styles.closeModalBtnText, { color: isDark ? colors.accentDark : '#ffffff' }]}>
                    {conflictWarning && !conflictAcknowledged ? 'Check & Override' : 'Schedule Meeting'}
                  </Text>
                )}
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  kpiNumber: {
    fontSize: 20,
    fontWeight: '800',
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  filterSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterPills: {
    flexDirection: 'row',
    gap: 6,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  scheduleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
  },
  scheduleBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  messageBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  messageText: {
    fontSize: 12,
    fontWeight: '600',
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 13,
    marginTop: 10,
  },
  emptyBox: {
    padding: 32,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    marginVertical: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
  },
  cardsList: {
    gap: 12,
  },
  meetingCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  dateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  dateBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  cardMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  joinBtn: {
    marginTop: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  joinBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  rsvpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
  },
  rsvpLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginRight: 2,
  },
  rsvpBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  rsvpBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    flex: 1,
    marginRight: 8,
  },
  detailSection: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  closeModalBtn: {
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  closeModalBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    marginBottom: 10,
  },
})
