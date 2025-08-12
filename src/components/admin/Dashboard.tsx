'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Department, Profile, UserRole } from '@/types'

export default function AdminDashboard() {
  const router = useRouter()
  const [users, setUsers] = useState<Profile[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [activeTab, setActiveTab] = useState<'users' | 'departments' | 'reports'>('users')
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

        // Verify user is admin
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profile?.role !== 'admin') {
          throw new Error('Unauthorized access')
        }

        // Fetch users and departments in parallel
        const [usersResult, departmentsResult] = await Promise.all([
          supabase.from('profiles').select('*').order('created_at', { ascending: false }),
          supabase.from('departments').select('*').order('name')
        ])

        if (usersResult.error) throw usersResult.error
        if (departmentsResult.error) throw departmentsResult.error

        setUsers(usersResult.data)
        setDepartments(departmentsResult.data)

      } catch (err) {
        console.error('Error fetching data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router, supabase])

  const handleRoleUpdate = async (userId: string, newRole: UserRole) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)

      if (error) throw error

      // Update local state
      setUsers(prev => 
        prev.map(user => 
          user.id === userId ? { ...user, role: newRole } : user
        )
      )
      
      setSuccess('User role updated successfully')
      setTimeout(() => setSuccess(''), 3000)

    } catch (err) {
      console.error('Error updating role:', err)
      setError('Failed to update user role')
    }
  }

  const handleAddDepartment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const name = formData.get('name') as string
    const approverEmail = formData.get('approver_email') as string
    const type = formData.get('type') as 'approval' | 'student_action'
    
    try {
      const { data, error } = await supabase
        .from('departments')
        .insert([{ 
          name, 
          approver_email: approverEmail || null,
          type,
          action_url: type === 'student_action' ? `https://your-university.com/${name.toLowerCase().replace(/\s+/g, '-')}-form` : null
        }])
        .select()

      if (error) throw error
      if (data?.[0]) {
        setDepartments(prev => [...prev, data[0]])
        setSuccess('Department added successfully')
        e.currentTarget.reset()
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (err) {
      console.error('Error adding department:', err)
      setError('Failed to add department')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg font-medium">Loading admin dashboard...</div>
      </div>
    )
  }

  return (
    <div className="container px-4 py-8 mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Manage users, departments, and view reports
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

      <div className="mb-6 border-b border-gray-200">
        <nav className="flex -mb-px space-x-8">
          <button
            onClick={() => setActiveTab('users')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'users'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab('departments')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'departments'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Departments
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'reports'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Reports
          </button>
        </nav>
      </div>

      <div className="p-6 bg-white rounded-lg shadow">
        {activeTab === 'users' && (
          <div>
            <h2 className="mb-4 text-xl font-semibold">User Management</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{user.full_name || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.role === 'admin' 
                            ? 'bg-purple-100 text-purple-800' 
                            : user.role === 'approver'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleUpdate(user.id, e.target.value as UserRole)}
                          className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                        >
                          <option value="student">Student</option>
                          <option value="approver">Approver</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'departments' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Departments</h2>
              <button
                onClick={() => {
                  const name = prompt('Enter department name:')
                  if (name) {
                    const approverEmail = prompt('Enter approver email (leave blank for none):')
                    const type = prompt('Department type (approval/student_action):') as 'approval' | 'student_action'
                    if (type && ['approval', 'student_action'].includes(type)) {
                      handleAddDepartment({
                        preventDefault: () => {},
                        currentTarget: {
                          name: { value: name },
                          approver_email: { value: approverEmail || '' },
                          type: { value: type },
                          reset: () => {}
                        }
                      } as unknown as React.FormEvent<HTMLFormElement>)
                    }
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Add Department
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approver Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action URL</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {departments.map((dept) => (
                    <tr key={dept.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {dept.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {dept.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {dept.approver_email || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {dept.action_url ? (
                          <a 
                            href={dept.action_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            View Form
                          </a>
                        ) : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div>
            <h2 className="mb-4 text-xl font-semibold">Reports & Analytics</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="p-6 bg-white border border-gray-200 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900">Total Applications</h3>
                <p className="mt-2 text-3xl font-bold text-indigo-600">
                  {users.filter(u => u.role === 'student').length}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Total students registered in the system
                </p>
              </div>
              
              <div className="p-6 bg-white border border-gray-200 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900">Departments</h3>
                <p className="mt-2 text-3xl font-bold text-green-600">
                  {departments.length}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Total departments configured
                </p>
              </div>
              
              <div className="p-6 bg-white border border-gray-200 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900">Approvers</h3>
                <p className="mt-2 text-3xl font-bold text-blue-600">
                  {users.filter(u => u.role === 'approver').length}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Department approvers registered
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
