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
} from 'react-native'
import apiClient from '../../src/api/client'
import type { LeaveRequest, LeaveType } from '../../src/types'
import { Screen } from '../../src/components/Screen'
import { useAppTheme } from '../../src/context/ThemeContext'
import { getCardShadow } from '../../src/theme'

export default function LeaveScreen() {
  const { colors, isDark } = useAppTheme()
  const [leaves, setLeaves] = useState<LeaveRequest[]>([])
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Apply Modal State
  const [applyModalOpen, setApplyModalOpen] = useState(false)
  const [applying, setApplying] = useState(false)
  const [applyError, setApplyError] = useState<string | null>(null)
  const [form, setForm] = useState({
    leave_type: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    reason: '',
  })

  const fetchLeaveTypes = async () => {
    try {
      const res = await apiClient.get('/leaves/types/')
      setLeaveTypes(res.data)
      if (res.data.length > 0 && !form.leave_type) {
        setForm((prev) => ({ ...prev, leave_type: res.data[0].id }))
      }
    } catch {
      // Non-critical if offline
    }
  }

  const fetchLeaves = async () => {
    try {
      setLoading(true)
      setError(null)
      const params: Record<string, string> = {}
      if (statusFilter) params.status = statusFilter
      const res = await apiClient.get('/leaves/requests/', { params })
      setLeaves(res.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load leave requests.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchLeaveTypes()
  }, [])

  useEffect(() => {
    fetchLeaves()
  }, [statusFilter])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchLeaves()
  }, [statusFilter])

  const handleApply = async () => {
    if (!form.leave_type || !form.start_date || !form.end_date || !form.reason) {
      setApplyError('Please fill in all leave request fields.')
      return
    }

    try {
      setApplying(true)
      setApplyError(null)
      await apiClient.post('/leaves/requests/', form)
      setApplyModalOpen(false)
      setForm((prev) => ({ ...prev, reason: '' }))
      fetchLeaves()
    } catch (err: any) {
      const msg =
        err.response?.data?.non_field_errors?.[0] ||
        err.response?.data?.detail ||
        'Failed to submit leave request.'
      setApplyError(msg)
    } finally {
      setApplying(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return {
          bg: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.12)',
          text: colors.success,
          border: colors.success,
        }
      case 'PENDING':
        return {
          bg: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.12)',
          text: colors.warning,
          border: colors.warning,
        }
      case 'REJECTED':
        return {
          bg: isDark ? 'rgba(225, 29, 72, 0.15)' : 'rgba(225, 29, 72, 0.12)',
          text: colors.danger,
          border: colors.danger,
        }
      default:
        return {
          bg: colors.bgMuted,
          text: colors.textMuted,
          border: colors.border,
        }
    }
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {/* Top Action Header */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={[styles.applyButton, { backgroundColor: colors.accent }]}
            onPress={() => setApplyModalOpen(true)}
            activeOpacity={0.8}
          >
            <Text style={[styles.applyButtonText, { color: isDark ? colors.accentDark : '#ffffff' }]}>+ Apply For Leave</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Tabs */}
        <View style={[styles.tabsRow, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}>
          {['', 'PENDING', 'APPROVED', 'REJECTED'].map((st) => {
            const isActive = statusFilter === st
            return (
              <TouchableOpacity
                key={st}
                style={[
                  styles.tabItem,
                  isActive && { backgroundColor: isDark ? colors.bgMuted : 'rgba(5, 150, 105, 0.12)' },
                ]}
                onPress={() => setStatusFilter(st)}
              >
                <Text
                  style={[
                    styles.tabItemText,
                    { color: isActive ? colors.accent : colors.textMuted },
                  ]}
                >
                  {st || 'All'}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Fetching leaves...</Text>
          </View>
        ) : error ? (
          <View style={[styles.errorBox, { backgroundColor: isDark ? 'rgba(225, 29, 72, 0.15)' : '#fee2e2', borderColor: colors.danger }]}>
            <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          </View>
        ) : leaves.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>🏖️</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Leave Applications</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>You have no submitted leave requests in this category.</Text>
          </View>
        ) : (
          <View style={styles.leaveList}>
            {leaves.map((item) => {
              const statusColors = getStatusColor(item.status)
              return (
                <View
                  key={item.id}
                  style={[
                    styles.leaveCard,
                    { backgroundColor: colors.bgElevated, borderColor: colors.border },
                    getCardShadow(isDark),
                  ]}
                >
                  <View style={styles.leaveCardHeader}>
                    <Text style={[styles.leaveTypeName, { color: colors.text }]}>
                      {item.leave_type_name} ({item.leave_type_code})
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: statusColors.bg, borderColor: statusColors.border },
                      ]}
                    >
                      <Text style={[styles.statusBadgeText, { color: statusColors.text }]}>
                        {item.status}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.leaveDates, { color: colors.accent }]}>
                    {item.start_date} → {item.end_date}
                  </Text>

                  <Text style={[styles.leaveReason, { color: colors.textMuted }]} numberOfLines={2}>
                    {item.reason}
                  </Text>

                  {item.status === 'REJECTED' && item.rejection_reason && (
                    <Text style={[styles.rejectionNotice, { color: colors.danger }]}>
                      Rejection note: {item.rejection_reason}
                    </Text>
                  )}
                </View>
              )
            })}
          </View>
        )}
      </ScrollView>

      {/* Apply Leave Modal */}
      <Modal
        visible={applyModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setApplyModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.bgElevated, borderColor: colors.border }, getCardShadow(isDark)]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Apply For Leave</Text>
              <TouchableOpacity onPress={() => setApplyModalOpen(false)}>
                <Text style={[styles.closeIcon, { color: colors.textMuted }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {applyError && (
              <View style={[styles.errorBoxModal, { backgroundColor: isDark ? 'rgba(225, 29, 72, 0.15)' : '#fee2e2', borderColor: colors.danger }]}>
                <Text style={[styles.errorTextModal, { color: colors.danger }]}>{applyError}</Text>
              </View>
            )}

            <ScrollView style={{ maxHeight: 400 }}>
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.textMuted }]}>Select Leave Type</Text>
                <View style={styles.typesRow}>
                  {leaveTypes.map((t) => {
                    const isSelected = form.leave_type === t.id
                    return (
                      <TouchableOpacity
                        key={t.id}
                        style={[
                          styles.typePill,
                          {
                            backgroundColor: isSelected
                              ? isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(5, 150, 105, 0.15)'
                              : colors.bgMuted,
                            borderColor: isSelected ? colors.accent : colors.border,
                          },
                        ]}
                        onPress={() => setForm({ ...form, leave_type: t.id })}
                      >
                        <Text
                          style={[
                            styles.typePillText,
                            { color: isSelected ? colors.accent : colors.textMuted },
                          ]}
                        >
                          {t.name}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.textMuted }]}>Start Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]}
                  value={form.start_date}
                  onChangeText={(text) => setForm({ ...form, start_date: text })}
                  placeholder="2026-09-23"
                  placeholderTextColor={colors.textFaint}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.textMuted }]}>End Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]}
                  value={form.end_date}
                  onChangeText={(text) => setForm({ ...form, end_date: text })}
                  placeholder="2026-09-24"
                  placeholderTextColor={colors.textFaint}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.textMuted }]}>Reason</Text>
                <TextInput
                  style={[
                    styles.input,
                    { height: 80, textAlignVertical: 'top', backgroundColor: colors.bg, borderColor: colors.border, color: colors.text },
                  ]}
                  value={form.reason}
                  onChangeText={(text) => setForm({ ...form, reason: text })}
                  placeholder="State the reason for leave..."
                  placeholderTextColor={colors.textFaint}
                  multiline
                />
              </View>
            </ScrollView>

            <View style={[styles.modalActions, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: colors.bgMuted }]}
                onPress={() => setApplyModalOpen(false)}
              >
                <Text style={[styles.cancelButtonText, { color: colors.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: colors.accent }, applying && styles.buttonDisabled]}
                onPress={handleApply}
                disabled={applying}
              >
                {applying ? (
                  <ActivityIndicator color={isDark ? colors.accentDark : '#ffffff'} />
                ) : (
                  <Text style={[styles.submitButtonText, { color: isDark ? colors.accentDark : '#ffffff' }]}>Submit Application</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  )
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 20,
  },
  topBar: {
    marginBottom: 20,
  },
  applyButton: {
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tabsRow: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabItemText: {
    fontSize: 12,
    fontWeight: '600',
  },
  loadingBox: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 13,
    marginTop: 12,
  },
  errorBox: {
    borderWidth: 1,
    padding: 16,
    borderRadius: 12,
  },
  errorText: {
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
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  leaveList: {
    gap: 12,
  },
  leaveCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  leaveCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  leaveTypeName: {
    fontSize: 15,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  leaveDates: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 6,
  },
  leaveReason: {
    fontSize: 13,
  },
  rejectionNotice: {
    marginTop: 8,
    fontSize: 12,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingBottom: 14,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  closeIcon: {
    fontSize: 18,
    padding: 4,
  },
  errorBoxModal: {
    borderWidth: 1,
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  errorTextModal: {
    fontSize: 12,
  },
  formGroup: {
    marginBottom: 14,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  typesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  typePillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 18,
    borderTopWidth: 1,
    paddingTop: 16,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  submitButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  submitButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
})
