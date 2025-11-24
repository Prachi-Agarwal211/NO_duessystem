/**
 * CSV Export Utilities
 * Handles data export for admin dashboard
 */

export function exportApplicationsToCSV(applications) {
  if (applications.length === 0) {
    alert('No data to export');
    return;
  }

  const headers = ['Student Name', 'Registration No', 'Course', 'Overall Status', 'Submitted Date'];
  const departments = ['LIBRARY', 'HOSTEL', 'IT_DEPARTMENT'];
  
  departments.forEach(dept => {
    headers.push(`${dept} Status`, `${dept} Response Time`, `${dept} Action By`);
  });

  const rows = applications.map(app => {
    const row = [
      app.student_name,
      app.registration_no,
      app.course || 'N/A',
      app.status,
      new Date(app.created_at).toLocaleDateString()
    ];

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