import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
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
import type { LeaveRequest, LeaveType } from '../../src/types'

export default function LeaveScreen() {
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
        return { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981', border: '#10b981' }
      case 'PENDING':
        return { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: '#fbbf24' }
      case 'REJECTED':
        return { bg: 'rgba(225, 29, 72, 0.15)', text: '#f43f5e', border: '#f43f5e' }
      default:
        return { bg: '#1e293b', text: '#94a3b8', border: '#334155' }
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
      >
        {/* Top Action Header */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.applyButton}
            onPress={() => setApplyModalOpen(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.applyButtonText}>[ Apply Leave ]</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Tabs */}
        <View style={styles.tabsRow}>
          {['', 'PENDING', 'APPROVED', 'REJECTED'].map((st) => (
            <TouchableOpacity
              key={st}
              style={[styles.tabItem, statusFilter === st && styles.tabItemActive]}
              onPress={() => setStatusFilter(st)}
            >
              <Text
                style={[
                  styles.tabItemText,
                  statusFilter === st && styles.tabItemTextActive,
                ]}
              >
                {st || 'All'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#10b981" />
            <Text style={styles.loadingText}>Fetching leaves...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : leaves.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>🏖️</Text>
            <Text style={styles.emptyTitle}>No Leave Applications</Text>
            <Text style={styles.emptySubtitle}>You have no submitted leave requests in this category.</Text>
          </View>
        ) : (
          <View style={styles.leaveList}>
            {leaves.map((item) => {
              const colors = getStatusColor(item.status)
              return (
                <View key={item.id} style={styles.leaveCard}>
                  <View style={styles.leaveCardHeader}>
                    <Text style={styles.leaveTypeName}>
                      {item.leave_type_name} ({item.leave_type_code})
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: colors.bg, borderColor: colors.border },
                      ]}
                    >
                      <Text style={[styles.statusBadgeText, { color: colors.text }]}>
                        {item.status}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.leaveDates}>
                    {item.start_date} → {item.end_date}
                  </Text>

                  <Text style={styles.leaveReason} numberOfLines={2}>
                    {item.reason}
                  </Text>

                  {item.status === 'REJECTED' && item.rejection_reason && (
                    <Text style={styles.rejectionNotice}>
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
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Apply For Leave</Text>
              <TouchableOpacity onPress={() => setApplyModalOpen(false)}>
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            {applyError && (
              <View style={styles.errorBoxModal}>
                <Text style={styles.errorTextModal}>{applyError}</Text>
              </View>
            )}

            <ScrollView style={{ maxHeight: 400 }}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Select Leave Type</Text>
                <View style={styles.typesRow}>
                  {leaveTypes.map((t) => (
                    <TouchableOpacity
                      key={t.id}
                      style={[
                        styles.typePill,
                        form.leave_type === t.id && styles.typePillActive,
                      ]}
                      onPress={() => setForm({ ...form, leave_type: t.id })}
                    >
                      <Text
                        style={[
                          styles.typePillText,
                          form.leave_type === t.id && styles.typePillTextActive,
                        ]}
                      >
                        {t.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Start Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  value={form.start_date}
                  onChangeText={(text) => setForm({ ...form, start_date: text })}
                  placeholder="2026-09-23"
                  placeholderTextColor="#64748b"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>End Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  value={form.end_date}
                  onChangeText={(text) => setForm({ ...form, end_date: text })}
                  placeholder="2026-09-24"
                  placeholderTextColor="#64748b"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Reason</Text>
                <TextInput
                  style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                  value={form.reason}
                  onChangeText={(text) => setForm({ ...form, reason: text })}
                  placeholder="State the reason for leave..."
                  placeholderTextColor="#64748b"
                  multiline
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setApplyModalOpen(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, applying && styles.buttonDisabled]}
                onPress={handleApply}
                disabled={applying}
              >
                {applying ? (
                  <ActivityIndicator color="#020617" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit Application</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  topBar: {
    marginBottom: 20,
  },
  applyButton: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0 4px 8px rgba(16, 185, 129, 0.3)' },
      default: {
        shadowColor: '#10b981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
      },
    }),
  },
  applyButtonText: {
    color: '#020617',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabItemActive: {
    backgroundColor: '#1e293b',
  },
  tabItemText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  tabItemTextActive: {
    color: '#ffffff',
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
  leaveList: {
    gap: 12,
  },
  leaveCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
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
    color: '#ffffff',
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
    color: '#10b981',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 6,
  },
  leaveReason: {
    fontSize: 13,
    color: '#94a3b8',
  },
  rejectionNotice: {
    marginTop: 8,
    fontSize: 12,
    color: '#f43f5e',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#0f172a',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
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
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  closeIcon: {
    fontSize: 18,
    color: '#94a3b8',
    padding: 4,
  },
  errorBoxModal: {
    backgroundColor: 'rgba(225, 29, 72, 0.15)',
    borderColor: '#e11d48',
    borderWidth: 1,
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  errorTextModal: {
    color: '#fda4af',
    fontSize: 12,
  },
  formGroup: {
    marginBottom: 14,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 6,
  },
  typesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typePill: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  typePillActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: '#10b981',
  },
  typePillText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  typePillTextActive: {
    color: '#10b981',
  },
  input: {
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 14,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 16,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#1e293b',
  },
  cancelButtonText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  submitButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#10b981',
  },
  submitButtonText: {
    color: '#020617',
    fontSize: 13,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
})
