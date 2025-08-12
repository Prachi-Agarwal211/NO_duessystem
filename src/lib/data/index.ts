import { createClient } from '../supabase/server'
import { Department, Profile, Application, ClearanceStatus } from '@/types'

// Get the current user's profile
export async function getCurrentUserProfile() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
    
  return profile as Profile | null
}

// Get all departments
export async function getDepartments() {
  const supabase = createClient()
  const { data: departments } = await supabase
    .from('departments')
    .select('*')
    .order('name')
    
  return departments as Department[] | null
}

// Get or create a student's application
export async function getOrCreateStudentApplication(studentId: string) {
  const supabase = createClient()
  
  // Try to find an existing application
  const { data: existingApp } = await supabase
    .from('applications')
    .select('*, clearance_statuses(*, department:departments(name, type, action_url))')
    .eq('student_id', studentId)
    .single()
    
  if (existingApp) return existingApp as unknown as Application
  
  // If no application exists, create a new one
  const { data: newApp, error } = await supabase
    .from('applications')
    .insert({ student_id: studentId })
    .select('*')
    .single()
    
  if (error) throw error
  
  // Initialize clearance statuses for all departments
  const departments = await getDepartments()
  if (departments && departments.length > 0) {
    await supabase
      .from('clearance_statuses')
      .insert(
        departments.map((dept: Department) => ({
          application_id: newApp.id,
          department_id: dept.id,
          status: 'pending' as const,
        }))
      )
  }
  
  // Return the new application with its statuses
  const { data: application } = await supabase
    .from('applications')
    .select('*, clearance_statuses(*, department:departments(name, type, action_url))')
    .eq('id', newApp.id)
    .single()
    
  return application as unknown as Application
}

// Update clearance status
export async function updateClearanceStatus(
  statusId: string,
  status: 'pending' | 'approved' | 'rejected',
  notes?: string
) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('clearance_statuses')
    .update({ 
      status,
      notes: notes || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', statusId)
    .select('*')
    .single()
    
  if (error) throw error
  return data as ClearanceStatus
}
