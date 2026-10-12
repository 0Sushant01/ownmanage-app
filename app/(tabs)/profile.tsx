import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Platform,
  Modal,
  TextInput,
  Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import * as DocumentPicker from 'expo-document-picker'
import apiClient from '../../src/api/client'
import { useAuth } from '../../src/context/AuthContext'
import { Screen } from '../../src/components/Screen'
import { useAppTheme, type ThemeMode } from '../../src/context/ThemeContext'
import { Ionicons } from '@expo/vector-icons'
import type { EmployeeDocumentItem } from '../../src/types'

interface ProfileData {
  user: {
    id: string
    email: string
    first_name: string
    last_name: string
    phone: string
    full_name: string
  }
  employee?: {
    id: string
    employee_id?: string
    first_name: string
    last_name: string
    email: string
    phone: string
    designation: string
    joining_date: string
    department?: string
    branch?: string
    manager?: string
  } | null
  role?: string
  business?: {
    id: string
    name: string
  } | null
}

const CATEGORY_OPTIONS: { value: string; label: string; iconName: any }[] = [
  { value: 'IDENTITY_PROOF', label: 'Identity Proof', iconName: 'id-card-outline' },
  { value: 'ADDRESS_PROOF', label: 'Address Proof', iconName: 'home-outline' },
  { value: 'EDUCATION', label: 'Education Certificate', iconName: 'school-outline' },
  { value: 'CONTRACT', label: 'Employment Contract', iconName: 'document-text-outline' },
  { value: 'OFFER_LETTER', label: 'Offer Letter', iconName: 'mail-outline' },
  { value: 'EXPERIENCE', label: 'Experience Certificate', iconName: 'ribbon-outline' },
  { value: 'BANK', label: 'Bank Document', iconName: 'business-outline' },
  { value: 'TAX', label: 'Tax Document', iconName: 'receipt-outline' },
  { value: 'OTHER', label: 'Other Document', iconName: 'folder-outline' },
]

const CATEGORY_MAP: Record<string, { label: string; iconName: any }> = {
  IDENTITY_PROOF: { label: 'Identity Proof', iconName: 'id-card-outline' },
  ADDRESS_PROOF: { label: 'Address Proof', iconName: 'home-outline' },
  EDUCATION: { label: 'Education Certificate', iconName: 'school-outline' },
  CONTRACT: { label: 'Employment Contract', iconName: 'document-text-outline' },
  OFFER_LETTER: { label: 'Offer Letter', iconName: 'mail-outline' },
  EXPERIENCE: { label: 'Experience Certificate', iconName: 'ribbon-outline' },
  BANK: { label: 'Bank Document', iconName: 'business-outline' },
  TAX: { label: 'Tax Document', iconName: 'receipt-outline' },
  OTHER: { label: 'Other Document', iconName: 'folder-outline' },
}

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export default function ProfileScreen() {
  const router = useRouter()
  const { user, role, business, employee, logout } = useAuth()
  const { themeMode, colors, setThemeMode } = useAppTheme()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  // Document management state
  const [documents, setDocuments] = useState<EmployeeDocumentItem[]>([])
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [uploadModalVisible, setUploadModalVisible] = useState(false)
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadCategory, setUploadCategory] = useState('IDENTITY_PROOF')
  const [uploadIssueDate, setUploadIssueDate] = useState('')
  const [uploadExpiryDate, setUploadExpiryDate] = useState('')
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null)
  const [uploading, setUploading] = useState(false)
  const [docActionError, setDocActionError] = useState<string | null>(null)
  const [docActionSuccess, setDocActionSuccess] = useState<string | null>(null)
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null)

  // Synthesize profile from API or AuthContext session
  const displayProfile: ProfileData | null = useMemo(() => {
    if (profile) return profile
    if (!user) return null
    return {
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: user.phone || '',
        full_name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
      },
      employee: employee ? {
        id: employee.id,
        employee_id: employee.employee_id,
        first_name: employee.first_name || user.first_name || '',
        last_name: employee.last_name || user.last_name || '',
        email: employee.email || user.email,
        phone: employee.phone || user.phone || '',
        designation: (employee as any).designation_name || employee.designation || 'Staff',
        joining_date: employee.joining_date || '',
        department: employee.department_name,
        branch: employee.branch_name,
        manager: employee.manager_name,
      } : null,
      role: role || undefined,
      business: business ? {
        id: business.id,
        name: business.name,
      } : null,
    }
  }, [profile, user, employee, role, business])

  const targetEmpId = displayProfile?.employee?.id || employee?.id

  const fetchDocuments = useCallback(async (empId?: string) => {
    const id = empId || targetEmpId
    if (!id) return
    try {
      setLoadingDocs(true)
      const res = await apiClient.get(`/employees/${id}/documents/`)
      if (Array.isArray(res.data)) {
        setDocuments(res.data)
      }
    } catch {
      // Non-critical: fail quietly
    } finally {
      setLoadingDocs(false)
    }
  }, [targetEmpId])

  const fetchProfile = async () => {
    try {
      const res = await apiClient.get('/profile/')
      if (res.data) {
        setProfile(res.data)
        if (res.data.employee?.id) {
          fetchDocuments(res.data.employee.id)
        }
      }
    } catch {
      // Non-critical: falls back to user/employee from AuthContext
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchProfile()
    if (targetEmpId) {
      fetchDocuments(targetEmpId)
    }
  }, [targetEmpId])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchProfile()
    if (targetEmpId) {
      fetchDocuments(targetEmpId)
    }
  }, [targetEmpId])

  const handleLogout = async () => {
    try {
      setLoggingOut(true)
      await logout()
      router.replace('/login')
    } catch {
      router.replace('/login')
    } finally {
      setLoggingOut(false)
    }
  }

  const handlePickDocument = async () => {
    try {
      setDocActionError(null)
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        base64: false,
      })
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0]
        setSelectedFile(asset)
        if (!uploadTitle.trim()) {
          const cleanName = asset.name.replace(/\.[^/.]+$/, '')
          setUploadTitle(cleanName || asset.name)
        }
      }
    } catch (err: any) {
      setDocActionError('Failed to select file: ' + (err.message || 'Unknown error'))
    }
  }

  const handleUploadDocument = async () => {
    if (!targetEmpId) {
      setDocActionError('No active employee record linked with your account to attach documents.')
      return
    }
    if (!selectedFile) {
      setDocActionError('Please select a file to upload.')
      return
    }
    if (!uploadTitle.trim()) {
      setDocActionError('Please provide a document title.')
      return
    }

    setUploading(true)
    setDocActionError(null)
    setDocActionSuccess(null)

    try {
      const formData = new FormData()

      if (Platform.OS === 'web') {
        if ((selectedFile as any).file) {
          formData.append('file', (selectedFile as any).file, selectedFile.name)
        } else if (selectedFile.uri) {
          const res = await fetch(selectedFile.uri)
          const blob = await res.blob()
          formData.append('file', blob, selectedFile.name)
        }
      } else {
        formData.append('file', {
          uri: selectedFile.uri,
          name: selectedFile.name,
          type: selectedFile.mimeType || 'application/octet-stream',
        } as any)
      }

      formData.append('title', uploadTitle.trim())
      formData.append('category', uploadCategory)
      if (uploadIssueDate.trim()) formData.append('issue_date', uploadIssueDate.trim())
      if (uploadExpiryDate.trim()) formData.append('expiry_date', uploadExpiryDate.trim())

      await apiClient.post(`/employees/${targetEmpId}/documents/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      setDocActionSuccess('Document uploaded successfully! It is now pending verification.')
      setUploadModalVisible(false)
      setSelectedFile(null)
      setUploadTitle('')
      setUploadCategory('IDENTITY_PROOF')
      setUploadIssueDate('')
      setUploadExpiryDate('')
      await fetchDocuments(targetEmpId)
    } catch (err: any) {
      const detail = err.response?.data?.detail || err.response?.data?.message || err.message || 'Failed to upload document.'
      setDocActionError(typeof detail === 'string' ? detail : JSON.stringify(detail))
    } finally {
      setUploading(false)
    }
  }

  const handleDownloadDoc = async (doc: EmployeeDocumentItem) => {
    try {
      setDocActionError(null)
      const res = await apiClient.get(`/documents/${doc.id}/download/`, {
        responseType: 'blob',
      })
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const blob = new Blob([res.data], {
          type: (res.headers['content-type'] as string) || 'application/octet-stream',
        })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = doc.file_name || `${doc.title}.pdf`
        document.body.appendChild(a)
        a.click()
        a.remove()
        window.URL.revokeObjectURL(url)
      } else {
        Alert.alert('Download Started', `Downloading ${doc.file_name || doc.title}`)
      }
    } catch (err: any) {
      setDocActionError(err.response?.data?.detail || 'Failed to download document file.')
    }
  }

  const handleDeleteDoc = async (doc: EmployeeDocumentItem) => {
    const proceed = async () => {
      try {
        setDeletingDocId(doc.id)
        setDocActionError(null)
        setDocActionSuccess(null)
        await apiClient.delete(`/documents/${doc.id}/`)
        setDocActionSuccess(`Document "${doc.title}" retracted successfully.`)
        if (targetEmpId) await fetchDocuments(targetEmpId)
      } catch (err: any) {
        setDocActionError(err.response?.data?.detail || 'Failed to retract document.')
      } finally {
        setDeletingDocId(null)
      }
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(`Are you sure you want to retract pending document "${doc.title}"?`)) {
        await proceed()
      }
    } else {
      Alert.alert(
        'Retract Document',
        `Are you sure you want to retract pending document "${doc.title}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retract', style: 'destructive', onPress: proceed },
        ]
      )
    }
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {loading && !displayProfile ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading profile...</Text>
          </View>
        ) : displayProfile ? (
          <View style={styles.content}>
            {/* User Avatar & Role Card */}
            <View style={[styles.userCard, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}>
              <View style={[styles.avatarCircle, { backgroundColor: colors.accent }]}>
                <Text style={styles.avatarText}>
                  {displayProfile.user.first_name?.[0] || displayProfile.user.email[0].toUpperCase()}
                </Text>
              </View>

              <Text style={[styles.userName, { color: colors.text }]}>
                {displayProfile.user.full_name || displayProfile.user.email}
              </Text>
              <Text style={[styles.userEmail, { color: colors.textMuted }]}>{displayProfile.user.email}</Text>

              <View style={[styles.roleBadge, { borderColor: colors.accent, backgroundColor: `${colors.accent}20` }]}>
                <Text style={[styles.roleBadgeText, { color: colors.accent }]}>{displayProfile.role || 'MEMBER'}</Text>
              </View>
            </View>

            {/* Appearance / Theme Selector Card */}
            <View style={[styles.sectionCard, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Theme & Appearance</Text>
              <Text style={[styles.itemLabel, { color: colors.textMuted, marginBottom: 12 }]}>
                Choose your preferred interface theme
              </Text>
              <View style={styles.themeToggleRow}>
                {(['light', 'dark', 'system'] as ThemeMode[]).map((mode) => {
                  const isActive = themeMode === mode
                  return (
                    <TouchableOpacity
                      key={mode}
                      onPress={() => setThemeMode(mode)}
                      style={[
                        styles.themeButton,
                        { borderColor: isActive ? colors.accent : colors.border },
                        isActive && { backgroundColor: `${colors.accent}15` },
                      ]}
                    >
                      <Ionicons
                        name={mode === 'light' ? 'sunny-outline' : mode === 'dark' ? 'moon-outline' : 'laptop-outline'}
                        size={16}
                        color={isActive ? colors.accent : colors.textMuted}
                        style={{ marginBottom: 4 }}
                      />
                      <Text
                        style={[
                          styles.themeButtonText,
                          { color: isActive ? colors.accent : colors.textMuted },
                          isActive && { fontWeight: '700' },
                        ]}
                      >
                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>

            {/* Employment Card */}
            <View style={[styles.sectionCard, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Institutional Credentials</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="lock-closed-outline" size={12} color={colors.textMuted} />
                  <Text style={[styles.protectedBadge, { backgroundColor: colors.bgMuted, borderColor: colors.border, color: colors.textMuted }]}>
                    Protected
                  </Text>
                </View>
              </View>

              <View style={styles.detailsGrid}>
                <View style={[styles.gridItem, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                  <Text style={[styles.itemLabel, { color: colors.textMuted }]}>Company</Text>
                  <Text style={[styles.itemValue, { color: colors.text }]}>
                    {displayProfile.business?.name || 'Platform Administrator'}
                  </Text>
                </View>

                <View style={[styles.gridItem, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                  <Text style={[styles.itemLabel, { color: colors.textMuted }]}>Employee Badge ID</Text>
                  <Text style={[styles.itemValue, styles.empIdHighlight, { color: colors.accent }]}>
                    {displayProfile.employee?.employee_id || 'Not Assigned'}
                  </Text>
                </View>

                <View style={[styles.gridItem, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                  <Text style={[styles.itemLabel, { color: colors.textMuted }]}>Designation</Text>
                  <Text style={[styles.itemValue, { color: colors.text }]}>
                    {displayProfile.employee?.designation || 'Staff'}
                  </Text>
                </View>

                <View style={[styles.gridItem, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                  <Text style={[styles.itemLabel, { color: colors.textMuted }]}>Department</Text>
                  <Text style={[styles.itemValue, { color: colors.text }]}>
                    {displayProfile.employee?.department || 'General'}
                  </Text>
                </View>

                <View style={[styles.gridItem, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                  <Text style={[styles.itemLabel, { color: colors.textMuted }]}>Branch / Centre</Text>
                  <Text style={[styles.itemValue, { color: colors.text }]}>
                    {displayProfile.employee?.branch || 'Headquarters'}
                  </Text>
                </View>

                <View style={[styles.gridItem, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                  <Text style={[styles.itemLabel, { color: colors.textMuted }]}>Joining Date</Text>
                  <Text style={[styles.itemValue, { color: colors.text }]}>
                    {displayProfile.employee?.joining_date || 'N/A'}
                  </Text>
                </View>
              </View>
            </View>

            {/* My Salary & Payslips Navigation Card */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push('/salary')}
              style={[
                styles.sectionCard,
                {
                  backgroundColor: colors.bgElevated,
                  borderColor: colors.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 16,
                },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: `${colors.accent}15`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="wallet-outline" size={22} color={colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 2 }]}>
                    My Salary & Payslips
                  </Text>
                  <Text style={[styles.itemLabel, { color: colors.textMuted, marginBottom: 0 }]}>
                    View earnings, deductions, overtime, and monthly slips
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 20, color: colors.textMuted, marginLeft: 8 }}>›</Text>
            </TouchableOpacity>

            {/* Official Documents & Credentials Card */}
            <View style={[styles.sectionCard, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}>
              <View style={styles.sectionHeaderRow}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>
                      Official Documents & Records
                    </Text>
                    <View style={[styles.countBadge, { backgroundColor: `${colors.accent}20` }]}>
                      <Text style={[styles.countBadgeText, { color: colors.accent }]}>
                        {documents.length}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.itemLabel, { color: colors.textMuted, marginTop: 4, marginBottom: 0 }]}>
                    Upload identity proofs, certificates, and credentials for administrative verification
                  </Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.7}
                  style={[styles.uploadTriggerBtn, { backgroundColor: colors.accent }]}
                  onPress={() => {
                    setDocActionError(null)
                    setDocActionSuccess(null)
                    setSelectedFile(null)
                    setUploadTitle('')
                    setUploadCategory('IDENTITY_PROOF')
                    setUploadIssueDate('')
                    setUploadExpiryDate('')
                    setUploadModalVisible(true)
                  }}
                >
                  <Text style={styles.uploadTriggerBtnText}>+ Upload</Text>
                </TouchableOpacity>
              </View>

              {/* Status messages */}
              {docActionSuccess && (
                <View style={[styles.alertBanner, { backgroundColor: `${colors.success}15`, borderColor: colors.success }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    <Text style={[styles.alertBannerText, { color: colors.success }]}>{docActionSuccess}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setDocActionSuccess(null)}>
                    <Ionicons name="close" size={16} color={colors.success} />
                  </TouchableOpacity>
                </View>
              )}

              {docActionError && (
                <View style={[styles.alertBanner, { backgroundColor: `${colors.danger}15`, borderColor: colors.danger }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                    <Ionicons name="alert-circle" size={16} color={colors.danger} />
                    <Text style={[styles.alertBannerText, { color: colors.danger }]}>{docActionError}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setDocActionError(null)}>
                    <Ionicons name="close" size={16} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              )}

              {loadingDocs ? (
                <View style={styles.docLoadingBox}>
                  <ActivityIndicator size="small" color={colors.accent} />
                  <Text style={[styles.docLoadingText, { color: colors.textMuted }]}>Loading documents...</Text>
                </View>
              ) : documents.length === 0 ? (
                <View style={[styles.emptyDocsBox, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                  <Ionicons name="folder-open-outline" size={36} color={colors.textFaint} style={{ marginBottom: 6 }} />
                  <Text style={[styles.emptyDocsTitle, { color: colors.text }]}>No Documents Uploaded</Text>
                  <Text style={[styles.emptyDocsSub, { color: colors.textMuted }]}>
                    You haven't uploaded any documents yet. Tap "+ Upload" to add your Aadhaar, PAN, degree certificate, or bank proofs.
                  </Text>
                </View>
              ) : (
                <View style={styles.docsList}>
                  {documents.map((doc) => {
                    const catInfo = CATEGORY_MAP[doc.category] || { label: doc.category_display || doc.category, iconName: 'document-outline' }
                    const isPending = doc.verification_status === 'PENDING'
                    const isVerified = doc.verification_status === 'VERIFIED'
                    const isRejected = doc.verification_status === 'REJECTED'

                    const statusBg = isVerified ? `${colors.success}15` : isRejected ? `${colors.danger}15` : `${colors.warning}15`
                    const statusColor = isVerified ? colors.success : isRejected ? colors.danger : colors.warning
                    const statusText = isVerified ? 'Verified' : isRejected ? 'Rejected' : 'Pending Review'

                    return (
                      <View
                        key={doc.id}
                        style={[styles.docItemCard, { backgroundColor: colors.bg, borderColor: colors.border }]}
                      >
                        <View style={styles.docItemTopRow}>
                          <View style={styles.docItemHeaderLeft}>
                            <View style={[styles.docCategoryIconBox, { backgroundColor: `${colors.accent}15` }]}>
                              <Ionicons name={catInfo.iconName || 'document-outline'} size={18} color={colors.accent} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.docItemTitle, { color: colors.text }]} numberOfLines={1}>
                                {doc.title}
                              </Text>
                              <Text style={[styles.docItemSub, { color: colors.textMuted }]}>
                                {catInfo.label} • {formatFileSize(doc.file_size_bytes)}
                              </Text>
                            </View>
                          </View>

                          <View style={[styles.statusBadge, { backgroundColor: statusBg, borderColor: statusColor }]}>
                            <Text style={[styles.statusBadgeText, { color: statusColor }]}>{statusText}</Text>
                          </View>
                        </View>

                        {/* Admin remarks / rejection notes */}
                        {doc.remarks ? (
                          <View style={[styles.remarksBox, { backgroundColor: `${colors.border}40`, borderColor: colors.border }]}>
                            <Text style={[styles.remarksLabel, { color: isRejected ? colors.danger : colors.textMuted }]}>
                              {isRejected ? 'Reviewer Feedback / Reason:' : 'Reviewer Note:'}
                            </Text>
                            <Text style={[styles.remarksText, { color: colors.text }]}>{doc.remarks}</Text>
                          </View>
                        ) : null}

                        {/* Metadata & Actions */}
                        <View style={[styles.docItemFooter, { borderTopColor: colors.border }]}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.docMetaDate, { color: colors.textFaint }]}>
                              Uploaded: {doc.created_at ? new Date(doc.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                              {doc.verified_by_name && isVerified ? ` • Verified by: ${doc.verified_by_name}` : ''}
                            </Text>
                          </View>

                          <View style={styles.docActionsRow}>
                            <TouchableOpacity
                              activeOpacity={0.7}
                              style={[styles.docActionBtn, { borderColor: colors.border, backgroundColor: colors.bgElevated }]}
                              onPress={() => handleDownloadDoc(doc)}
                            >
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Ionicons name="download-outline" size={13} color={colors.text} />
                                <Text style={[styles.docActionBtnText, { color: colors.text }]}>Download</Text>
                              </View>
                            </TouchableOpacity>

                            {isPending && (
                              <TouchableOpacity
                                activeOpacity={0.7}
                                style={[styles.docActionBtn, { borderColor: `${colors.danger}60`, backgroundColor: `${colors.danger}10` }]}
                                onPress={() => handleDeleteDoc(doc)}
                                disabled={deletingDocId === doc.id}
                              >
                                {deletingDocId === doc.id ? (
                                  <ActivityIndicator size="small" color={colors.danger} />
                                ) : (
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Ionicons name="trash-outline" size={13} color={colors.danger} />
                                    <Text style={[styles.docActionBtnText, { color: colors.danger }]}>Retract</Text>
                                  </View>
                                )}
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      </View>
                    )
                  })}
                </View>
              )}
            </View>

            {/* Contact Details Card */}
            <View style={[styles.sectionCard, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Contact Information</Text>
              <View style={styles.detailsGrid}>
                <View style={[styles.gridItem, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                  <Text style={[styles.itemLabel, { color: colors.textMuted }]}>Phone Number</Text>
                  <Text style={[styles.itemValue, { color: colors.text }]}>
                    {displayProfile.user.phone || 'None provided'}
                  </Text>
                </View>
                <View style={[styles.gridItem, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                  <Text style={[styles.itemLabel, { color: colors.textMuted }]}>System Status</Text>
                  <Text style={[styles.itemValue, { color: colors.success }]}>Active Account</Text>
                </View>
              </View>
            </View>

            {/* Logout Button */}
            <TouchableOpacity
              style={[styles.logoutButton, { borderColor: colors.danger, backgroundColor: `${colors.danger}15` }]}
              onPress={handleLogout}
              disabled={loggingOut}
            >
              {loggingOut ? (
                <ActivityIndicator color={colors.danger} />
              ) : (
                <Text style={[styles.logoutButtonText, { color: colors.danger }]}>Sign Out of OwnManage</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptySessionBox}>
            <Text style={[styles.emptySessionTitle, { color: colors.text }]}>No Active Session</Text>
            <Text style={[styles.emptySessionDesc, { color: colors.textMuted }]}>
              Please sign in to access your profile and attendance details.
            </Text>
            <TouchableOpacity style={[styles.emptyLoginBtn, { backgroundColor: colors.accent }]} onPress={() => router.replace('/login')}>
              <Text style={styles.emptyLoginText}>Go to Login</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Upload Document Modal */}
      <Modal
        visible={uploadModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => !uploading && setUploadModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Upload Official Document</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                  Document will be submitted for administrative verification
                </Text>
              </View>
              <TouchableOpacity
                disabled={uploading}
                onPress={() => setUploadModalVisible(false)}
                style={[styles.modalCloseBtn, { backgroundColor: colors.bgMuted }]}
              >
                <Ionicons name="close" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalFormContent} showsVerticalScrollIndicator={false}>
              {/* Error Banner inside modal */}
              {docActionError && (
                <View style={[styles.alertBanner, { backgroundColor: `${colors.danger}15`, borderColor: colors.danger, marginBottom: 12 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                    <Ionicons name="alert-circle" size={16} color={colors.danger} />
                    <Text style={[styles.alertBannerText, { color: colors.danger }]}>{docActionError}</Text>
                  </View>
                </View>
              )}

              {/* Document Category Selection */}
              <Text style={[styles.inputLabel, { color: colors.text }]}>Document Category *</Text>
              <View style={styles.categoryChipsContainer}>
                {CATEGORY_OPTIONS.map((cat) => {
                  const isSelected = uploadCategory === cat.value
                  return (
                    <TouchableOpacity
                      key={cat.value}
                      activeOpacity={0.7}
                      style={[
                        styles.categoryChip,
                        { borderColor: isSelected ? colors.accent : colors.border },
                        isSelected && { backgroundColor: `${colors.accent}15` },
                      ]}
                      onPress={() => setUploadCategory(cat.value)}
                    >
                      <Ionicons
                        name={cat.iconName}
                        size={14}
                        color={isSelected ? colors.accent : colors.textMuted}
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={[
                          styles.categoryChipLabel,
                          { color: isSelected ? colors.accent : colors.textMuted },
                          isSelected && { fontWeight: '700' },
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>

              {/* File Attachment Area */}
              <Text style={[styles.inputLabel, { color: colors.text, marginTop: 14 }]}>File Attachment *</Text>
              {selectedFile ? (
                <View style={[styles.selectedFileBox, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <Ionicons name="document-text-outline" size={24} color={colors.accent} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.selectedFileName, { color: colors.text }]} numberOfLines={1}>
                        {selectedFile.name}
                      </Text>
                      <Text style={[styles.selectedFileSize, { color: colors.textMuted }]}>
                        {formatFileSize(selectedFile.size)}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={handlePickDocument}
                    style={[styles.changeFileBtn, { borderColor: colors.border, backgroundColor: colors.bgElevated }]}
                  >
                    <Text style={[styles.changeFileBtnText, { color: colors.text }]}>Change</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={[styles.dropZoneBox, { backgroundColor: colors.bg, borderColor: colors.borderStrong }]}
                  onPress={handlePickDocument}
                >
                  <Ionicons name="cloud-upload-outline" size={30} color={colors.accent} style={{ marginBottom: 6 }} />
                  <Text style={[styles.dropZoneTitle, { color: colors.text }]}>Choose Document File</Text>
                  <Text style={[styles.dropZoneHint, { color: colors.textMuted }]}>
                    PDF, PNG, JPG, JPEG, DOCX (Up to 25 MB)
                  </Text>
                </TouchableOpacity>
              )}

              {/* Document Title Input */}
              <Text style={[styles.inputLabel, { color: colors.text, marginTop: 14 }]}>Document Title *</Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="e.g. Aadhaar Card - Front & Back"
                placeholderTextColor={colors.textFaint}
                value={uploadTitle}
                onChangeText={setUploadTitle}
              />

              {/* Optional Dates */}
              <View style={styles.dateRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: colors.text, marginTop: 12 }]}>Issue Date (Optional)</Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: colors.bg,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textFaint}
                    value={uploadIssueDate}
                    onChangeText={setUploadIssueDate}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: colors.text, marginTop: 12 }]}>Expiry Date (Optional)</Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: colors.bg,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textFaint}
                    value={uploadExpiryDate}
                    onChangeText={setUploadExpiryDate}
                  />
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.modalActionRow}>
                <TouchableOpacity
                  style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                  onPress={() => setUploadModalVisible(false)}
                  disabled={uploading}
                >
                  <Text style={[styles.modalCancelBtnText, { color: colors.textMuted }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modalSubmitBtn,
                    { backgroundColor: colors.accent },
                    (!selectedFile || !uploadTitle.trim() || uploading) && { opacity: 0.6 },
                  ]}
                  onPress={handleUploadDocument}
                  disabled={!selectedFile || !uploadTitle.trim() || uploading}
                >
                  {uploading ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.modalSubmitBtnText}>Submit Document</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  loadingBox: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 13,
    marginTop: 12,
  },
  content: {
    gap: 16,
  },
  userCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '900',
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
  },
  userEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  roleBadge: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 12,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  sectionCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  uploadTriggerBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadTriggerBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  themeToggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  themeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  themeIcon: {
    fontSize: 14,
  },
  themeButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  protectedBadge: {
    fontSize: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  detailsGrid: {
    gap: 12,
  },
  gridItem: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  itemLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  itemValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  empIdHighlight: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '700',
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginVertical: 6,
  },
  alertBannerText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  docLoadingBox: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docLoadingText: {
    fontSize: 12,
    marginTop: 8,
  },
  emptyDocsBox: {
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    marginTop: 8,
  },
  emptyDocsIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyDocsTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptyDocsSub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  docsList: {
    gap: 10,
    marginTop: 10,
  },
  docItemCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  docItemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  docItemHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  docCategoryIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docItemTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  docItemSub: {
    fontSize: 11,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  remarksBox: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 8,
    marginTop: 8,
  },
  remarksLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  remarksText: {
    fontSize: 12,
  },
  docItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  docMetaDate: {
    fontSize: 10,
  },
  docActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  docActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  docActionBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 540,
    borderRadius: 20,
    borderWidth: 1,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalFormContent: {
    padding: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  categoryChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  categoryChipIcon: {
    fontSize: 13,
  },
  categoryChipLabel: {
    fontSize: 12,
  },
  selectedFileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  selectedFileName: {
    fontSize: 13,
    fontWeight: '600',
  },
  selectedFileSize: {
    fontSize: 11,
    marginTop: 2,
  },
  changeFileBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  changeFileBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  dropZoneBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  dropZoneTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  dropZoneHint: {
    fontSize: 11,
  },
  textInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
    marginBottom: 10,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalSubmitBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalSubmitBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  logoutButton: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  logoutButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptySessionBox: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptySessionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptySessionDesc: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyLoginBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyLoginText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
})
