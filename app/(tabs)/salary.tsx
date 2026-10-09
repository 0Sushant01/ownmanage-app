import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Modal,
  Platform,
} from 'react-native'
import apiClient from '../../src/api/client'
import type { Payroll } from '../../src/types'
import { Screen } from '../../src/components/Screen'
import { useAppTheme } from '../../src/context/ThemeContext'
import { getCardShadow } from '../../src/theme'

export default function SalaryScreen() {
  const { colors, isDark } = useAppTheme()
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
        return {
          bg: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.12)',
          text: colors.success,
          border: colors.success,
        }
      case 'PROCESSED':
        return {
          bg: isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(59, 130, 246, 0.12)',
          text: colors.info,
          border: colors.info,
        }
      case 'DRAFT':
        return {
          bg: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.12)',
          text: colors.warning,
          border: colors.warning,
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
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>My Compensation</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            Authoritative monthly compensation distribution and itemized payslips.
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Fetching compensation records...</Text>
          </View>
        ) : error ? (
          <View style={[styles.errorBox, { backgroundColor: isDark ? 'rgba(225, 29, 72, 0.15)' : '#fee2e2', borderColor: colors.danger }]}>
            <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          </View>
        ) : payrolls.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>💳</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Payslips Available</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>Generated salary records will be available here.</Text>
          </View>
        ) : (
          <View style={styles.payrollList}>
            {payrolls.map((item) => {
              const statusColors = getStatusColor(item.status)
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.payrollCard,
                    { backgroundColor: colors.bgElevated, borderColor: colors.border },
                    getCardShadow(isDark),
                  ]}
                  onPress={() => setSelectedPayslip(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardTop}>
                    <Text style={[styles.periodText, { color: colors.text }]}>
                      {item.period_start} → {item.period_end}
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

                  <View style={[styles.amountsRow, { borderTopColor: colors.border }]}>
                    <View>
                      <Text style={[styles.amountLabel, { color: colors.textMuted }]}>Gross</Text>
                      <Text style={[styles.amountValue, { color: colors.text }]}>
                        {item.currency} {Number(item.gross_amount).toLocaleString()}
                      </Text>
                    </View>

                    <View>
                      <Text style={[styles.amountLabel, { color: colors.textMuted }]}>Deductions</Text>
                      <Text style={[styles.amountValue, { color: colors.danger }]}>
                        -{item.currency} {Number(item.total_deductions).toLocaleString()}
                      </Text>
                    </View>

                    <View>
                      <Text style={[styles.amountLabel, { color: colors.textMuted }]}>Net Pay</Text>
                      <Text style={[styles.amountValue, { color: colors.accent, fontWeight: '800' }]}>
                        {item.currency} {Number(item.net_amount).toLocaleString()}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.viewPayslipLink, { color: colors.accent }]}>Tap to view itemized payslip →</Text>
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
            <View style={[styles.modalCard, { backgroundColor: colors.bgElevated, borderColor: colors.border }, getCardShadow(isDark)]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <View>
                  <Text style={[styles.payslipPill, { color: colors.accent }]}>OFFICIAL PAYSLIP</Text>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>{selectedPayslip.employee_name}</Text>
                  <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                    {selectedPayslip.employee_id_code} • {selectedPayslip.department_name || 'Staff'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedPayslip(null)}>
                  <Text style={[styles.closeIcon, { color: colors.textMuted }]}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.payslipContent, { backgroundColor: colors.bgMuted, borderColor: colors.border }]}>
                <View style={styles.contentRow}>
                  <Text style={[styles.contentLabel, { color: colors.textMuted }]}>Pay Period</Text>
                  <Text style={[styles.contentValue, { color: colors.text }]}>
                    {selectedPayslip.period_start} to {selectedPayslip.period_end}
                  </Text>
                </View>

                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                <View style={styles.contentRow}>
                  <Text style={[styles.contentLabel, { color: colors.textMuted }]}>Gross Salary</Text>
                  <Text style={[styles.contentValue, { color: colors.text }]}>
                    {selectedPayslip.currency} {Number(selectedPayslip.gross_amount).toLocaleString()}
                  </Text>
                </View>

                <View style={styles.contentRow}>
                  <Text style={[styles.contentLabel, { color: colors.textMuted }]}>Total Deductions</Text>
                  <Text style={[styles.contentValue, { color: colors.danger }]}>
                    -{selectedPayslip.currency} {Number(selectedPayslip.total_deductions).toLocaleString()}
                  </Text>
                </View>

                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                <View style={styles.netPayRow}>
                  <Text style={[styles.netPayLabel, { color: colors.text }]}>Net Take-Home</Text>
                  <Text style={[styles.netPayValue, { color: colors.accent }]}>
                    {selectedPayslip.currency} {Number(selectedPayslip.net_amount).toLocaleString()}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: colors.accent }]}
                onPress={() => setSelectedPayslip(null)}
              >
                <Text style={[styles.closeButtonText, { color: isDark ? colors.accentDark : '#ffffff' }]}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 20,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 4,
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
  payrollList: {
    gap: 14,
  },
  payrollCard: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  periodText: {
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
    paddingTop: 12,
    marginBottom: 10,
  },
  amountLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  amountValue: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  viewPayslipLink: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
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
    maxWidth: 380,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    paddingBottom: 14,
    marginBottom: 16,
  },
  payslipPill: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeIcon: {
    fontSize: 18,
    padding: 4,
  },
  payslipContent: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 10,
  },
  contentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contentLabel: {
    fontSize: 12,
  },
  contentValue: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  divider: {
    height: 1,
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
    textTransform: 'uppercase',
  },
  netPayValue: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  closeButton: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
})
