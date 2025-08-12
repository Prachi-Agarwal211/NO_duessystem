export type ClearanceStatus = 'pending' | 'approved' | 'rejected'

export interface Department {
  id: string
  name: string
  type: 'approval' | 'student_action'
  approver_email?: string
  action_url?: string
  created_at: string
  updated_at: string
}

export interface ClearanceStatusWithDepartment {
  id: string
  application_id: string
  department_id: string
  status: ClearanceStatus
  notes: string | null
  approver_id: string | null
  updated_at: string
  department: Department
}

export interface Application {
  id: string
  student_id: string
  status: 'draft' | 'submitted' | 'in_review' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
  clearance_statuses: ClearanceStatusWithDepartment[]
  student_name?: string
}
