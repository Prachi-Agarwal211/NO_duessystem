'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { ClearanceStatus, Profile } from '@/types'

export default function ApproverDashboard() {
  const router = useRouter()
  const [pendingClearances, setPendingClearances] = useState<Array<{
    id: string
    student: Pick<Profile, 'full_name' | 'email'>
    status: string
    notes: string | null
    updated_at: string
  }>>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const supabase = createClient()

  useEffect(() => {
    const fetchPendingClearances = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        // Get the approver's department
        const { data: profile } = await supabase
          .from('profiles')
          .select('department_id')
          .eq('id', user.id)
          .single()

        if (!profile?.department_id) {
          throw new Error('You are not assigned to any department')
        }

        // Get all pending clearances for this department
        const { data: clearances } = await supabase
          .from('clearance_statuses')
          .select(`
            id,
            status,
            notes,
            updated_at,
            application:applications!inner(
              student:profiles!applications_student_id_fkey(
                full_name,
                email
              )
            )
          `)
          .eq('department_id', profile.department_id)
          .eq('status', 'pending')
          .order('updated_at', { ascending: true })

        setPendingClearances(clearances?.map(c => ({
          id: c.id,
          student: c.application.student,
          status: c.status,
          notes: c.notes,
          updated_at: c.updated_at
        })) || [])

      } catch (err) {
        console.error('Error fetching pending clearances:', err)
        setError('Failed to load pending clearances')
      } finally {
        setLoading(false)
      }
    }

    fetchPendingClearances()
  }, [router, supabase])

  const handleStatusUpdate = async (clearanceId: string, status: 'approved' | 'rejected', notes: string = '') => {
    try {
      setUpdating(true)
      setError('')
      setSuccess('')

      const { error } = await supabase
        .from('clearance_statuses')
        .update({ 
          status,
          notes: notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', clearanceId)

      if (error) throw error

      // Update local state
      setPendingClearances(prev => 
        prev.map(clearance => 
          clearance.id === clearanceId 
            ? { ...clearance, status, notes: notes || null } 
            : clearance
        )
      )
      
      setSuccess('Status updated successfully')
      
      // Refresh the list after a short delay
      setTimeout(() => {
        setSuccess('')
        router.refresh()
      }, 2000)

    } catch (err) {
      console.error('Error updating status:', err)
      setError('Failed to update status')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg font-medium">Loading pending clearances...</div>
      </div>
    )
  }

  return (
    <div className="container px-4 py-8 mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Approver Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Review and approve pending clearance requests
        </p>
      </div>

      {error && (
        <div className="p-4 mb-6 text-red-700 bg-red-100 rounded-md">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 mb-6 text-green-700 bg-green-100 rounded-md">
          {success}
        </div>
      )}

      <div className="overflow-hidden bg-white rounded-lg shadow">
        <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
          <h2 className="text-lg font-medium leading-6 text-gray-900">
            Pending Clearance Requests
          </h2>
          <p className="max-w-2xl mt-1 text-sm text-gray-500">
            These students are waiting for your approval
          </p>
        </div>

        {pendingClearances.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No pending clearance requests at this time.
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {pendingClearances.map((clearance) => (
              <li key={clearance.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-indigo-600 truncate">
                      {clearance.student.full_name || 'Unknown Student'}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {clearance.student.email}
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => handleStatusUpdate(clearance.id, 'approved')}
                      disabled={updating}
                      className="px-3 py-1 text-sm font-medium text-green-700 bg-green-100 border border-transparent rounded-md hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        const notes = prompt('Please provide a reason for rejection:')
                        if (notes !== null) {
                          handleStatusUpdate(clearance.id, 'rejected', notes)
                        }
                      }}
                      disabled={updating}
                      className="px-3 py-1 text-sm font-medium text-red-700 bg-red-100 border border-transparent rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
