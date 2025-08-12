import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StudentDashboard from '@/components/student/Dashboard'
import { UserRole } from '@/types'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get the user's profile to determine their role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, department_id')
    .eq('id', user.id)
    .single()

  // If no profile exists, create one with student role
  if (!profile) {
    const { error } = await supabase
      .from('profiles')
      .insert([
        { 
          id: user.id, 
          email: user.email,
          role: 'student',
          created_at: new Date().toISOString()
        }
      ])
    
    if (error) {
      console.error('Error creating profile:', error)
      throw error
    }
    
    // Return the student dashboard for new users
    return <StudentDashboard />
  }

  // Route based on user role
  switch (profile.role as UserRole) {
    case 'admin':
      // Will be implemented later
      return <div>Admin Dashboard - Coming Soon</div>
    case 'approver':
      // Will be implemented later
      return <div>Approver Dashboard - Coming Soon</div>
    case 'student':
    default:
      return <StudentDashboard />
  }
}

// This tells Next.js to never cache this page
export const dynamic = 'force-dynamic'
