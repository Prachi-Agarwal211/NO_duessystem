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
      // Fallback to default departments if API fails
      console.warn('Failed to fetch departments, using fallback list');
      departments = ['school_hod', 'library', 'it_department', 'hostel', 'mess', 'canteen', 'tpo', 'alumni_association', 'accounts_department'];
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