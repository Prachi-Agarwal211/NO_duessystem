
// FIXED VERSION - Replace loadApplications function in department/page.js
const loadApplications = async () => {
  setLoading(true);
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: profile } = await supabase
      .from('profiles')
      .select('department_name, full_name')
      .eq('email', user.email)
      .single();

    if (!profile) throw new Error('Profile not found');

    setCurrentUser({
      id: user.id,
      email: user.email,
      name: profile.full_name,
      type: 'department'
    });
    setDepartmentName(profile.department_name);

    // NEW APPROACH: Get all forms for this department
    const { data: statusRecords, error: statusError } = await supabase
      .from('no_dues_status')
      .select('form_id')
      .eq('department_name', profile.department_name);
    
    if (statusError) throw statusError;
    
    if (!statusRecords || statusRecords.length === 0) {
      setApplications([]);
      return;
    }
    
    const formIds = statusRecords.map(record => record.form_id);
    
    const { data: forms, error: formsError } = await supabase
      .from('no_dues_forms')
      .select(`
        *,
        no_dues_status!inner(
          status,
          action_at,
          action_by,
          remarks,
          rejection_reason,
          department_name
        )
      `)
      .in('id', formIds)
      .eq('no_dues_status.department_name', profile.department_name)
      .order('created_at', { ascending: false });

    if (formsError) throw formsError;
    setApplications(forms || []);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
