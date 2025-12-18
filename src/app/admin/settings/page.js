'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import PageWrapper from '@/components/landing/PageWrapper';
import GlassCard from '@/components/ui/GlassCard';
import { 
  Settings, Save, Plus, Trash2, Edit, 
  Building2, School, Mail, Users, 
  CheckCircle, XCircle, Loader2 
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminSettings() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('departments');
  const [loading, setLoading] = useState(false);

  // Data States
  const [departments, setDepartments] = useState([]);
  const [schools, setSchools] = useState([]);
  const [emailConfig, setEmailConfig] = useState([]);
  const [staffList, setStaffList] = useState([]);

  // Edit States
  const [editingDept, setEditingDept] = useState(null);
  const [editingSchool, setEditingSchool] = useState(null);
  const [editingEmail, setEditingEmail] = useState(null);
  const [newStaff, setNewStaff] = useState({
    email: '', password: '', full_name: '', department_name: ''
  });

  // Fetch Functions
  const fetchDepartments = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/config/departments?include_inactive=true', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const json = await res.json();
      if (json.success) setDepartments(json.departments || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSchools = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/config/schools?include_inactive=true', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const json = await res.json();
      if (json.success) setSchools(json.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchEmailConfig = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/config/emails', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const json = await res.json();
      if (json.success) setEmailConfig(json.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchStaff = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/staff', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const json = await res.json();
      if (json.success) setStaffList(json.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  // Update Functions
  const updateDepartment = async (dept) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/config/departments', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dept)
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Department updated');
        fetchDepartments();
        setEditingDept(null);
      } else {
        toast.error(json.error);
      }
    } catch (e) {
      toast.error('Update failed');
    } finally {
      setLoading(false);
    }
  };

  const updateSchool = async (school) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/config/schools', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(school)
      });
      const json = await res.json();
      if (json.success) {
        toast.success('School updated');
        fetchSchools();
        setEditingSchool(null);
      } else {
        toast.error(json.error);
      }
    } catch (e) {
      toast.error('Update failed');
    } finally {
      setLoading(false);
    }
  };

  const updateEmailConfig = async (config) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/config/emails', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Email config updated');
        fetchEmailConfig();
        setEditingEmail(null);
      } else {
        toast.error(json.error);
      }
    } catch (e) {
      toast.error('Update failed');
    } finally {
      setLoading(false);
    }
  };

  const createStaff = async () => {
    if (!newStaff.email || !newStaff.password || !newStaff.full_name || !newStaff.department_name) {
      toast.error('All fields required');
      return;
    }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newStaff)
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Staff account created');
        fetchStaff();
        setNewStaff({ email: '', password: '', full_name: '', department_name: '' });
      } else {
        toast.error(json.error);
      }
    } catch (e) {
      toast.error('Creation failed');
    } finally {
      setLoading(false);
    }
  };

  const deleteStaff = async (staffId) => {
    if (!confirm('Delete this staff account?')) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/admin/staff?id=${staffId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Staff deleted');
        fetchStaff();
      } else {
        toast.error(json.error);
      }
    } catch (e) {
      toast.error('Deletion failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) router.push('/staff/login');
    };
    checkAuth();
    fetchDepartments();
    fetchSchools();
    fetchEmailConfig();
    fetchStaff();
  }, []);

  const tabs = [
    { id: 'departments', label: 'Departments', icon: Building2 },
    { id: 'schools', label: 'Schools', icon: School },
    { id: 'emails', label: 'Email Config', icon: Mail },
    { id: 'staff', label: 'Staff Accounts', icon: Users }
  ];

  return (
    <PageWrapper>
      <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen">
        
        {/* HEADER */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-purple-100 dark:bg-purple-500/20 rounded-xl">
            <Settings className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">System Settings</h1>
            <p className="text-gray-500 dark:text-gray-400">Manage departments, schools, and staff</p>
          </div>
        </div>

        {/* TABS */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all whitespace-nowrap border ${
                activeTab === tab.id
                  ? 'bg-jecrc-red text-white shadow-lg shadow-jecrc-red/20 dark:shadow-neon-red border-jecrc-red'
                  : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* DEPARTMENTS TAB */}
        {activeTab === 'departments' && (
          <GlassCard className="p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Department Management</h3>
            <div className="space-y-3">
              {departments.map(dept => (
                <div key={dept.name} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10">
                  {editingDept?.name === dept.name ? (
                    <div className="flex-1 flex gap-3">
                      <input
                       type="text"
                       className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                       value={editingDept.display_name}
                       onChange={(e) => setEditingDept({ ...editingDept, display_name: e.target.value })}
                     />
                     <input
                       type="email"
                       className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                       value={editingDept.email || ''}
                       onChange={(e) => setEditingDept({ ...editingDept, email: e.target.value })}
                       placeholder="Email (optional)"
                     />
                     <button
                       onClick={() => updateDepartment(editingDept)}
                       disabled={loading}
                       className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-green-600/20"
                     >
                       {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                     </button>
                     <button
                       onClick={() => setEditingDept(null)}
                       className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-xl"
                     >
                       Cancel
                     </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-gray-900 dark:text-white">{dept.display_name}</span>
                          {dept.is_active ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {dept.email || 'No email set'} • Order: {dept.display_order}
                        </span>
                      </div>
                      <button
                        onClick={() => setEditingDept({ ...dept })}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded-lg transition-colors border border-transparent hover:border-blue-200 dark:hover:border-blue-500/30"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* SCHOOLS TAB */}
        {activeTab === 'schools' && (
          <GlassCard className="p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">School Management</h3>
            <div className="space-y-3">
              {schools.map(school => (
                <div key={school.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10">
                  {editingSchool?.id === school.id ? (
                    <div className="flex-1 flex gap-3">
                      <input
                       type="text"
                       className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                       value={editingSchool.name}
                       onChange={(e) => setEditingSchool({ ...editingSchool, name: e.target.value })}
                     />
                     <button
                       onClick={() => updateSchool(editingSchool)}
                       disabled={loading}
                       className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-green-600/20"
                     >
                       {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                     </button>
                     <button
                       onClick={() => setEditingSchool(null)}
                       className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-xl"
                     >
                       Cancel
                     </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-gray-900 dark:text-white">{school.name}</span>
                          {school.is_active ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">Order: {school.display_order}</span>
                      </div>
                      <button
                        onClick={() => setEditingSchool({ ...school })}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded-lg transition-colors border border-transparent hover:border-blue-200 dark:hover:border-blue-500/30"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* EMAIL CONFIG TAB */}
        {activeTab === 'emails' && (
          <GlassCard className="p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Email Configuration</h3>
            <div className="space-y-3">
              {emailConfig.map(config => (
                <div key={config.key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10">
                  {editingEmail?.key === config.key ? (
                    <div className="flex-1 flex gap-3">
                      <input
                       type="text"
                       className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                       value={editingEmail.value}
                       onChange={(e) => setEditingEmail({ ...editingEmail, value: e.target.value })}
                     />
                     <button
                       onClick={() => updateEmailConfig(editingEmail)}
                       disabled={loading}
                       className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-green-600/20"
                     >
                       {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                     </button>
                     <button
                       onClick={() => setEditingEmail(null)}
                       className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-xl"
                     >
                       Cancel
                     </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1">
                        <span className="font-bold text-gray-900 dark:text-white block">{config.key}</span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">{config.value}</span>
                        {config.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{config.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => setEditingEmail({ ...config })}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded-lg transition-colors border border-transparent hover:border-blue-200 dark:hover:border-blue-500/30"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* STAFF TAB */}
        {activeTab === 'staff' && (
          <div className="space-y-6">
            {/* Create New Staff */}
            <GlassCard className="p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Create New Staff Account</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="email"
                  placeholder="Email"
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={newStaff.email}
                  onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                />
                <input
                  type="password"
                  placeholder="Password (min 6 chars)"
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={newStaff.password}
                  onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Full Name"
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={newStaff.full_name}
                  onChange={(e) => setNewStaff({ ...newStaff, full_name: e.target.value })}
                />
                <select
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={newStaff.department_name}
                  onChange={(e) => setNewStaff({ ...newStaff, department_name: e.target.value })}
                >
                  <option value="">Select Department</option>
                  {departments.filter(d => d.is_active).map(dept => (
                    <option key={dept.name} value={dept.name}>{dept.display_name}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={createStaff}
                disabled={loading}
                className="mt-4 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center gap-2 disabled:opacity-50 font-medium shadow-lg shadow-blue-600/20"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create Staff Account
              </button>
            </GlassCard>

            {/* Staff List */}
            <GlassCard className="p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Existing Staff ({staffList.length})</h3>
              <div className="space-y-3">
                {staffList.map(staff => (
                  <div key={staff.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10">
                    <div className="flex-1">
                      <span className="font-bold text-gray-900 dark:text-white block">{staff.full_name}</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">{staff.email}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-500 block mt-1">
                        {staff.department_name} • Created: {new Date(staff.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <button
                      onClick={() => deleteStaff(staff.id)}
                      disabled={loading}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50 border border-transparent hover:border-red-200 dark:hover:border-red-500/30"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}