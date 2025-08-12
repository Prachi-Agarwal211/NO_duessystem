export type UserRole = 'student' | 'approver' | 'admin'

export interface Department {
  id: string
  name: string
  approver_email: string | null
  action_url: string | null
  type: 'approval' | 'student_action'
}

export interface Profile {
  id: string
  full_name: string | null
  role: UserRole
  department_id: string | null
}

export interface ClearanceStatus {
  id: string
  application_id: string
  department_id: string
  status: 'pending' | 'approved' | 'rejected'
  notes: string | null
  approver_id: string | null
  updated_at: string
  department: Pick<Department, 'name' | 'type' | 'action_url'>
}

export interface Application {
  id: string
  student_id: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  clearance_statuses: ClearanceStatus[]
}
