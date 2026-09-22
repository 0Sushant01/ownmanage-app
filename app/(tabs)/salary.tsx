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
import type { Payroll } from '../../src/types'

export default function SalaryScreen() {
  const [payrolls, setPayrolls] = useState<Payroll[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Selected Payslip Modal
  const [selectedPayslip, setSelectedPayslip] = useState<Payroll | null>(null)

  const fetchSalaryRecords = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await apiClient.get('/salary/payrolls/')
      setPayrolls(res.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load salary records.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchSalaryRecords()
  }, [])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchSalaryRecords()
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981', border: '#10b981' }
      case 'PROCESSED':
        return { bg: 'rgba(56, 189, 248, 0.15)', text: '#38bdf8', border: '#38bdf8' }
      case 'DRAFT':
        return { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: '#fbbf24' }
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
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Compensation</Text>
          <Text style={styles.headerSubtitle}>
            Authoritative monthly compensation distribution and itemized payslips.
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#10b981" />
            <Text style={styles.loadingText}>Fetching compensation records...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : payrolls.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>💳</Text>
            <Text style={styles.emptyTitle}>No Payslips Available</Text>
            <Text style={styles.emptySubtitle}>Generated salary records will be available here.</Text>
          </View>
        ) : (
          <View style={styles.payrollList}>
            {payrolls.map((item) => {
              const colors = getStatusColor(item.status)
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.payrollCard}
                  onPress={() => setSelectedPayslip(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardTop}>
                    <Text style={styles.periodText}>
                      {item.period_start} → {item.period_end}
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

                  <View style={styles.amountsRow}>
                    <View>
                      <Text style={styles.amountLabel}>Gross</Text>
                      <Text style={styles.amountValue}>
                        {item.currency} {Number(item.gross_amount).toLocaleString()}
                      </Text>
                    </View>

                    <View>
                      <Text style={styles.amountLabel}>Deductions</Text>
                      <Text style={[styles.amountValue, { color: '#f43f5e' }]}>
                        -{item.currency} {Number(item.total_deductions).toLocaleString()}
                      </Text>
                    </View>

                    <View>
                      <Text style={styles.amountLabel}>Net Pay</Text>
                      <Text style={[styles.amountValue, { color: '#10b981', fontWeight: '800' }]}>
                        {item.currency} {Number(item.net_amount).toLocaleString()}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.viewPayslipLink}>Tap to view itemized payslip →</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        )}
      </ScrollView>

      {/* Payslip Modal */}
      {selectedPayslip && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSelectedPayslip(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.payslipPill}>OFFICIAL PAYSLIP</Text>
                  <Text style={styles.modalTitle}>{selectedPayslip.employee_name}</Text>
                  <Text style={styles.modalSubtitle}>
                    {selectedPayslip.employee_id_code} • {selectedPayslip.department_name || 'Staff'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedPayslip(null)}>
                  <Text style={styles.closeIcon}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.payslipContent}>
                <View style={styles.contentRow}>
                  <Text style={styles.contentLabel}>Pay Period</Text>
                  <Text style={styles.contentValue}>
                    {selectedPayslip.period_start} to {selectedPayslip.period_end}
                  </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.contentRow}>
                  <Text style={styles.contentLabel}>Gross Salary</Text>
                  <Text style={styles.contentValue}>
                    {selectedPayslip.currency} {Number(selectedPayslip.gross_amount).toLocaleString()}
                  </Text>
                </View>

                <View style={styles.contentRow}>
                  <Text style={styles.contentLabel}>Total Deductions</Text>
                  <Text style={[styles.contentValue, { color: '#f43f5e' }]}>
                    -{selectedPayslip.currency} {Number(selectedPayslip.total_deductions).toLocaleString()}
                  </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.netPayRow}>
                  <Text style={styles.netPayLabel}>Net Take-Home</Text>
                  <Text style={styles.netPayValue}>
                    {selectedPayslip.currency} {Number(selectedPayslip.net_amount).toLocaleString()}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSelectedPayslip(null)}
              >
                <Text style={styles.closeButtonText}>Done</Text>
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
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
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
  payrollList: {
    gap: 14,
  },
  payrollCard: {
    backgroundColor: '#0f172a',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  periodText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  amountsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 12,
    marginBottom: 10,
  },
  amountLabel: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 2,
  },
  amountValue: {
    fontSize: 14,
    color: '#ffffff',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  viewPayslipLink: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
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
    maxWidth: 380,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    paddingBottom: 14,
    marginBottom: 16,
  },
  payslipPill: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 4,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  closeIcon: {
    fontSize: 18,
    color: '#94a3b8',
    padding: 4,
  },
  payslipContent: {
    backgroundColor: '#020617',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    gap: 10,
  },
  contentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contentLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  contentValue: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  divider: {
    height: 1,
    backgroundColor: '#1e293b',
  },
  netPayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  netPayLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  netPayValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#10b981',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  closeButton: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
})
