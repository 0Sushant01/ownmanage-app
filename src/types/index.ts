export type UserRole = 'SUPERADMIN' | 'BUSINESS_ADMIN' | 'MANAGER' | 'STAFF' | 'BROKER'

export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string
  full_name: string
}

export interface BusinessSummary {
  id: string
  name: string
}

export interface EmployeeSummary {
  id: string
  employee_id?: string
  first_name?: string
  last_name?: string
  full_name?: string
  email?: string
  phone?: string
  designation?: string
  employment_status?: string
  joining_date?: string
  department?: string
  department_name?: string
  department_id?: string
  branch?: string
  branch_name?: string
  branch_id?: string
  manager_name?: string
}

export interface AttendanceAllowedMethods {
  normal_punch: boolean
  qr: boolean
  face_recognition: boolean
  location_required: boolean
  geofence_radius?: number
  centre_latitude?: number | null
  centre_longitude?: number | null
}

export interface TodayAttendanceState {
  attendance_day_id?: string
  attendance_date: string
  day_status: string
  is_checked_in: boolean
  total_work_seconds: number
  accumulated_seconds?: number
  first_check_in_time?: string | null
  last_check_out_time?: string | null
  last_event_type?: string | null
  allowed_methods?: AttendanceAllowedMethods
  centre_id?: string | null
  centre_name?: string | null
  events?: {
    id: string
    event_type: 'CHECK_IN' | 'CHECK_OUT'
    event_time: string
    source: string
    attendance_method?: string
    location_verified?: boolean
  }[]
}

export interface CalendarDayRecord {
  date: string
  day: number
  weekday: string
  status: string
  total_work_seconds: number
  work_hours: string
  check_in?: string | null
  check_out?: string | null
  holiday_name?: string | null
  leave_type?: string | null
}

export interface CalendarSummary {
  present: number
  absent: number
  leave: number
  holiday: number
  week_off: number
  half_day: number
  late: number
  total_days: number
}

export interface LeaveType {
  id: string
  name: string
  code: string
  description?: string
  is_paid: boolean
}

export interface LeaveRequest {
  id: string
  employee: string
  employee_name: string
  employee_id_code?: string
  leave_type: string
  leave_type_name: string
  leave_type_code: string
  start_date: string
  end_date: string
  reason: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  approved_by_name?: string
  approved_at?: string
  rejected_at?: string
  rejection_reason?: string
  created_at: string
}

export interface Payroll {
  id: string
  employee: string
  employee_name: string
  employee_id_code?: string
  department_name?: string
  period_start: string
  period_end: string
  gross_amount: string
  total_deductions: string
  net_amount: string
  currency: string
  status: string
  generated_at: string
}

export type MeetingStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'
export type ParticipantResponseStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'TENTATIVE'
export type ParticipantRole = 'HOST' | 'CO_HOST' | 'ATTENDEE' | 'OPTIONAL'

export interface MeetingParticipant {
  id: string
  user_id: string
  employee_id?: string
  full_name: string
  email: string
  role: ParticipantRole
  response_status: ParticipantResponseStatus
  response_note?: string
  responded_at?: string
}

export interface MeetingExternalGuest {
  id: string
  email: string
  name?: string
  response_status: ParticipantResponseStatus
}

export interface MeetingItem {
  id: string
  business_id: string
  branch_id?: string
  branch_name?: string
  title: string
  description?: string
  meeting_date: string
  start_time: string
  end_time: string
  duration_minutes: number
  timezone: string
  location_type: 'ONLINE' | 'IN_PERSON' | 'OTHER'
  location_details?: string
  meeting_url?: string
  status: MeetingStatus
  cancellation_reason?: string
  organizer_id: string
  organizer_name: string
  organizer_email: string
  is_organizer: boolean
  my_response_status?: ParticipantResponseStatus
  participants_count: number
  accepted_count: number
  declined_count: number
  pending_count: number
  participants?: MeetingParticipant[]
  external_guests?: MeetingExternalGuest[]
  can_edit?: boolean
  can_cancel?: boolean
  can_respond?: boolean
  created_at: string
}
