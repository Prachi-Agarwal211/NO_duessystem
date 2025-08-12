'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getOrCreateStudentApplication, updateClearanceStatus } from '@/lib/data'
import { emailService } from '@/lib/services/emailService'
import type { Application, ClearanceStatus, ClearanceStatus as Status } from '@/types/clearance'
import NewApplicationForm from './NewApplicationForm'
import { toast } from 'react-hot-toast'

declare module '@/types/clearance' {
  interface ClearanceStatus {
    department: {
      name: string
      type: string
      approver_email?: string
      action_url?: string
    }
  }
}

export default function StudentDashboard() {
  const router = useRouter()
  const [application, setApplication] = useState<Application | null>(null)
  const [showNewApplicationForm, setShowNewApplicationForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          router.push('/login')
          return
        }
        
        const app = await getOrCreateStudentApplication(user.id)
        setApplication(app)
      } catch (err) {
        console.error('Error:', err)
        setError('Failed to load your application. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
    
    // Set up real-time subscription
    const channel = supabase
      .channel('clearance_status_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'clearance_statuses',
          filter: application ? `application_id=eq.${application.id}` : ''
        }, 
        (payload) => {
          if (application && payload.new) {
            const updatedStatuses = application.clearance_statuses.map((status: any) => 
              status.id === (payload.new as any).id ? { ...status, ...(payload.new as any) } : status
            )
            setApplication({
              ...application,
              clearance_statuses: updatedStatuses
            })
          }
        }
      )
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [router, supabase, application?.id])

  const handleCompleteAction = async (statusId: string, departmentName: string) => {
    try {
      setLoading(true)
      setError('')
      
      const { error } = await updateClearanceStatus(statusId, 'pending')
      
      if (error) throw error
      
      // Update local state
      setApplication(prev => {
        if (!prev) return null
        
        const updatedStatuses = prev.clearance_statuses.map(status => 
          status.id === statusId 
            ? { ...status, status: 'pending' as Status } 
            : status
        )
        
        return { ...prev, clearance_statuses: updatedStatuses }
      })
      
      // Send email notification to the department approver
      if (application) {
        const status = application.clearance_statuses.find(s => s.id === statusId)
        const department = status?.department
        
        if (department?.approver_email) {
          await emailService.sendStatusUpdate(
            department.approver_email,
            application.student_name || 'Student',
            departmentName,
            'pending',
            'A student has completed the required action and is waiting for your approval.'
          )
        }
      }
      
      toast.success('Action completed successfully. Waiting for approval.')
    } catch (err) {
      console.error('Error completing action:', err)
      toast.error('Failed to complete action. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg font-medium">Loading your application...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-red-600 bg-red-100 rounded-md">
        {error}
      </div>
    )
  }

  if (!application) {
    return (
      <div className="p-4 text-yellow-600 bg-yellow-100 rounded-md">
        No application found. Please contact support.
      </div>
    )
  }

  // Show new application form if there's no application or user wants to create a new one
  if (showNewApplicationForm) {
    return (
      <div className="container max-w-3xl px-4 py-8 mx-auto">
        <NewApplicationForm onSuccess={() => setShowNewApplicationForm(false)} />
      </div>
    )
  }

  return (
    <div className="container px-4 py-8 mx-auto">
      <div className="flex flex-col justify-between mb-8 sm:flex-row sm:items-center">
        <h1 className="text-3xl font-bold">No-Dues Clearance Status</h1>
        {(!application || application.status === 'rejected') && (
          <button
            onClick={() => setShowNewApplicationForm(true)}
            className="px-4 py-2 mt-4 text-sm font-medium text-white bg-indigo-600 rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0"
          >
            {application ? 'Re-submit Application' : 'Start New Application'}
          </button>
        )}
      </div>
      
      {success && (
        <div className="p-4 mb-6 text-green-700 bg-green-100 rounded-md">
          {success}
        </div>
      )}
      
      <div className="overflow-hidden bg-white rounded-lg shadow">
        <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
          <h2 className="text-lg font-medium leading-6 text-gray-900">
            Your Clearance Status
          </h2>
          <p className="max-w-2xl mt-1 text-sm text-gray-500">
            Track the status of your no-dues clearance across all departments.
          </p>
        </div>
        
        <div className="divide-y divide-gray-200">
          {application?.clearance_statuses?.map((status) => (
            <div key={status.id} className="px-4 py-5 sm:px-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {status.department.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {status.notes && `Note: ${status.notes}`}
                  </p>
                </div>
                
                <div className="flex items-center mt-4 sm:mt-0">
                  <span 
                    className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full ${
                      status.status === 'approved' 
                        ? 'bg-green-100 text-green-800' 
                        : status.status === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {status.status.charAt(0).toUpperCase() + status.status.slice(1)}
                  </span>
                  
                  {status.department.type === 'student_action' && status.status === 'pending' && (
                    <button
                      onClick={() => handleCompleteAction(status.id, status.department?.name || 'Department')}
                      disabled={loading}
                      className="ml-3 inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      {loading ? 'Processing...' : 'Complete Action'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
