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
  Alert,
} from 'react-native'
import apiClient from '../../src/api/client'
import type { Payroll } from '../../src/types'
import { Screen } from '../../src/components/Screen'
import { useAppTheme } from '../../src/context/ThemeContext'
import { getCardShadow } from '../../src/theme'
import { Ionicons } from '@expo/vector-icons'

export default function SalaryScreen() {
  const { colors, isDark } = useAppTheme()
  const [payrolls, setPayrolls] = useState<Payroll[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

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

  const handleDownloadPdf = async (payroll: Payroll) => {
    try {
      setDownloadingId(payroll.id)
      setError(null)
      setDownloadSuccess(null)

      const res = await apiClient.get(`/salary/payrolls/${payroll.id}/pdf/`, {
        responseType: 'blob',
      })

      const empCode = payroll.employee_id_code || 'EMP'
      const startStr = payroll.period_start || 'current'
      const fileName = `payslip_${empCode}_${startStr}.pdf`

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const blob = new Blob([res.data], { type: 'application/pdf' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        a.remove()
        window.URL.revokeObjectURL(url)
        setDownloadSuccess(`Payslip (${payroll.period_start}) downloaded successfully!`)
      } else {
        Alert.alert('Download Complete', `Payslip saved as ${fileName}`)
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Failed to download payslip PDF.'
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setDownloadingId(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return {
          bg: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.12)',
          text: colors.success,
          border: colors.success,
        }
      case 'PARTIALLY_PAID':
        return {
          bg: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.12)',
          text: colors.warning,
          border: colors.warning,
        }
      case 'RELEASED':
        return {
          bg: isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.12)',
          text: '#6366f1',
          border: '#6366f1',
        }
      case 'PROCESSED':
      case 'FINALIZED':
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

        {downloadSuccess && (
          <View style={[styles.successBanner, { backgroundColor: `${colors.success}15`, borderColor: colors.success }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={[styles.successBannerText, { color: colors.success }]}>{downloadSuccess}</Text>
            </View>
            <TouchableOpacity onPress={() => setDownloadSuccess(null)}>
              <Ionicons name="close" size={16} color={colors.success} />
            </TouchableOpacity>
          </View>
        )}

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
            <Ionicons name="wallet-outline" size={36} color={colors.textFaint} style={{ marginBottom: 8 }} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Payslips Available</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>Generated salary records will be available here.</Text>
          </View>
        ) : (
          <View style={styles.payrollList}>
            {payrolls.map((item) => {
              const statusColors = getStatusColor(item.status)
              const isDownloading = downloadingId === item.id
              return (
                <View
                  key={item.id}
                  style={[
                    styles.payrollCard,
                    { backgroundColor: colors.bgElevated, borderColor: colors.border },
                    getCardShadow(isDark),
                  ]}
                >
                  <TouchableOpacity
                    onPress={() => setSelectedPayslip(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.cardTop}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={[styles.periodText, { color: colors.text }]}>
                          {item.period_start} → {item.period_end}
                        </Text>
                        {item.employee_name ? (
                          <Text style={[styles.empNameText, { color: colors.textMuted }]} numberOfLines={1}>
                            {item.employee_name} ({item.employee_id_code || 'Staff'})
                          </Text>
                        ) : null}
                      </View>
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
                  </TouchableOpacity>

                  {/* Card Actions Row: View Details & Download Payslip */}
                  <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setSelectedPayslip(item)}
                      style={styles.viewDetailsBtn}
                    >
                      <Text style={[styles.viewDetailsText, { color: colors.accent }]}>
                        Tap to view itemized payslip →
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={[
                        styles.downloadCardBtn,
                        { backgroundColor: colors.accent, borderColor: colors.accent },
                        isDownloading && { opacity: 0.7 },
                      ]}
                      onPress={() => handleDownloadPdf(item)}
                      disabled={isDownloading}
                    >
                      {isDownloading ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <View style={styles.downloadBtnContent}>
                          <Ionicons name="download-outline" size={15} color="#ffffff" style={{ marginRight: 6 }} />
                          <Text style={styles.downloadBtnText}>Download PDF</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
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
                <View style={{ flex: 1, marginRight: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <Text style={[styles.payslipPill, { color: colors.accent }]}>OFFICIAL PAYSLIP</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: getStatusColor(selectedPayslip.status).bg,
                          borderColor: getStatusColor(selectedPayslip.status).border,
                        },
                      ]}
                    >
                      <Text style={[styles.statusBadgeText, { color: getStatusColor(selectedPayslip.status).text }]}>
                        {selectedPayslip.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>{selectedPayslip.employee_name}</Text>
                  <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                    {selectedPayslip.employee_id_code || 'EMP'} • {selectedPayslip.department_name || 'Staff'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedPayslip(null)} style={styles.modalCloseCircle}>
                  <Ionicons name="close" size={18} color={colors.textMuted} />
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

              {/* Action Buttons: Download PDF and Close */}
              <View style={styles.modalActionsStack}>
                <TouchableOpacity
                  style={[
                    styles.modalDownloadButton,
                    { backgroundColor: colors.accent },
                    downloadingId === selectedPayslip.id && { opacity: 0.7 },
                  ]}
                  onPress={() => handleDownloadPdf(selectedPayslip)}
                  disabled={downloadingId === selectedPayslip.id}
                >
                  {downloadingId === selectedPayslip.id ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                      <Ionicons name="download-outline" size={17} color="#ffffff" />
                      <Text style={styles.modalDownloadButtonText}>Download Official PDF Payslip</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.closeButton, { borderColor: colors.border, backgroundColor: colors.bgElevated }]}
                  onPress={() => setSelectedPayslip(null)}
                >
                  <Text style={[styles.closeButtonText, { color: colors.textMuted }]}>Close</Text>
                </TouchableOpacity>
              </View>
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
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  successBannerText: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
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
    marginBottom: 16,
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
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  periodText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  empNameText: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
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
    marginBottom: 12,
  },
  amountLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  amountValue: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 4,
  },
  viewDetailsBtn: {
    flex: 1,
    paddingVertical: 4,
  },
  viewDetailsText: {
    fontSize: 11,
    fontWeight: '600',
  },
  downloadCardBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  downloadBtnIcon: {
    fontSize: 13,
  },
  downloadBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
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
    maxWidth: 420,
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
  modalCloseCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 16,
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
  modalActionsStack: {
    gap: 10,
    marginTop: 20,
  },
  modalDownloadButton: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDownloadButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  closeButton: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
})
