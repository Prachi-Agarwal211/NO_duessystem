/**
 * CSV Export Utilities
 * Handles data export for admin dashboard with dynamic department fetching
 */

/**
 * Export applications to CSV with dynamic department columns
 * Fetches active departments from database to avoid hardcoding
 */
export async function exportApplicationsToCSV(applications) {
  if (applications.length === 0) {
    alert('No data to export');
    return;
  }

  try {
    // Fetch active departments dynamically from database
    const response = await fetch('/api/admin/config/departments');
    const result = await response.json();

    let departments = [];
    if (result.success && result.departments) {
      // Sort by display_order and get department names
      departments = result.departments
        .sort((a, b) => a.display_order - b.display_order)
        .map(d => d.name);
    } else {
      // Fallback to default departments if API fails (Updated: 9 departments)
      console.warn('Failed to fetch departments, using fallback list');
      departments = ['school_hod', 'library', 'it_department', 'hostel', 'accounts_department', 'registrar', 'alumni_association'];
    }

    // Build headers with country code
    const headers = [
      'Student Name',
      'Registration No',
      'School',
      'Course',
      'Branch',
      'Personal Email',
      'College Email',
      'Country Code',
      'Contact',
      'Overall Status',
      'Submitted Date'
    ];

    // Add department columns dynamically
    departments.forEach(dept => {
      headers.push(`${dept} Status`, `${dept} Response Time`, `${dept} Action By`);
    });

    const rows = applications.map(app => {
      const row = [
        app.student_name,
        app.registration_no,
        app.school || 'N/A',
        app.course || 'N/A',
        app.branch || 'N/A',
        app.personal_email || 'N/A',
        app.college_email || 'N/A',
        app.country_code || '+91',
        app.contact_no || 'N/A',
        app.status,
        new Date(app.created_at).toLocaleDateString()
      ];

      // Add department status data dynamically
      departments.forEach(deptName => {
        const deptStatus = app.no_dues_status?.find(d => d.department_name === deptName);
        if (deptStatus) {
          row.push(
            deptStatus.status || 'N/A',
            deptStatus.response_time || 'N/A',
            deptStatus.profiles?.full_name || 'N/A'
          );
        } else {
          row.push('N/A', 'N/A', 'N/A');
        }
      });

      return row;
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    downloadCSV(csvContent, `no_dues_report_${new Date().toISOString().split('T')[0]}.csv`);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    alert('Failed to export CSV. Please try again.');
  }
}

export function exportStatsToCSV(stats) {
  if (!stats) {
    alert('No stats data available');
    return;
  }

  const headers = ['Metric', 'Value'];
  const statusCounts = stats.overallStats?.[0] || {};

  const rows = [
    ['Total Requests', statusCounts.total_requests || 0],
    ['Completed Requests', statusCounts.completed_requests || 0],
    ['Pending Requests', statusCounts.pending_requests || 0],
    ['Rejected Requests', statusCounts.rejected_requests || 0],
    ['Completion Rate', `${((statusCounts.completed_requests / Math.max(statusCounts.total_requests, 1)) * 100).toFixed(1)}%`]
  ];

  if (stats.departmentStats) {
    rows.push(['', '']);
    rows.push(['Department Performance', '']);
    stats.departmentStats.forEach(dept => {
      rows.push([dept.department_name, `${dept.approval_rate}% approval rate`]);
    });
  }

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  downloadCSV(csvContent, `no_dues_stats_${new Date().toISOString().split('T')[0]}.csv`);
}

function downloadCSV(csvContent, filename) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export staff dashboard data to CSV (current page only)
 * Simplified stats for department view
 */
export function exportStaffDataToCSV(requests, departmentName) {
  if (!requests || requests.length === 0) {
    alert('No data to export');
    return;
  }

  const headers = [
    'Student Name',
    'Registration No',
    'Course',
    'Branch',
    'Submitted Date',
    'Status',
    'Rejection Reason',
    'Action Date'
  ];

  const rows = requests.map(item => {
    const form = item.no_dues_forms;
    return [
      form.student_name,
      form.registration_no,
      form.course || 'N/A',
      form.branch || 'N/A',
      new Date(form.created_at).toLocaleDateString(),
      item.status,
      item.rejection_reason || 'N/A',
      item.action_at ? new Date(item.action_at).toLocaleDateString() : 'Pending'
    ].map(cell => `"${cell}"`).join(',');
  });

  const csvContent = [
    headers.join(','),
    ...rows
  ].join('\n');

  downloadCSV(csvContent, `${departmentName || 'department'}_no_dues_${new Date().toISOString().split('T')[0]}.csv`);
}

/**
 * Export ALL staff dashboard data to CSV (fetches all records from API)
 * This function fetches ALL matching records, not just the current page
 */
export async function exportAllStaffDataToCSV(filters, departmentName, supabase) {
  try {
    // Show loading indicator
    const loadingToast = { id: 'export-loading' };

    // Build query parameters
    const params = new URLSearchParams({
      status: filters.activeTab || 'pending',
      ...(filters.course && filters.course !== 'All' && { course: filters.course }),
      ...(filters.branch && filters.branch !== 'All' && { branch: filters.branch }),
      ...(filters.search && { search: filters.search })
    });

    // Fetch ALL matching records from export API
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(`/api/staff/export?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    });

    const result = await response.json();

    if (!result.success || !result.data || result.data.length === 0) {
      alert('No data to export');
      return false;
    }

    // Generate CSV
    const headers = [
      'Student Name',
      'Registration No',
      'Course',
      'Branch',
      'Submitted Date',
      'Status',
      'Rejection Reason',
      'Action Date'
    ];

    const rows = result.data.map(item => {
      const form = item.no_dues_forms;
      return [
        form.student_name,
        form.registration_no,
        form.course || 'N/A',
        form.branch || 'N/A',
        new Date(form.created_at).toLocaleDateString(),
        item.status,
        item.rejection_reason || 'N/A',
        item.action_at ? new Date(item.action_at).toLocaleDateString() : 'Pending'
      ].map(cell => `"${cell}"`).join(',');
    });

    const csvContent = [
      headers.join(','),
      ...rows
    ].join('\n');

    // Create filename with record count and filters
    const filterSuffix = [
      filters.activeTab !== 'pending' ? filters.activeTab : '',
      filters.course !== 'All' ? filters.course : '',
      filters.branch !== 'All' ? filters.branch : ''
    ].filter(Boolean).join('_');

    const filename = `${departmentName || 'department'}_${result.count}_records${filterSuffix ? '_' + filterSuffix : ''}_${new Date().toISOString().split('T')[0]}.csv`;

    downloadCSV(csvContent, filename);
    return true;

  } catch (error) {
    console.error('Error exporting all staff data:', error);
    alert('Failed to export data. Please try again.');
    return false;
  }
}