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
  designation?: string
  department?: string
  branch?: string
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
  events?: {
    id: string
    event_type: 'CHECK_IN' | 'CHECK_OUT'
    event_time: string
    source: string
  }[]
}

export interface CalendarDayRecord {
  date: string
  status: string
  total_work_seconds: number
  work_hours: string
  check_in?: string | null
  check_out?: string | null
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
