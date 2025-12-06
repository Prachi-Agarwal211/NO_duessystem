/**
 * Calculate response time between two dates
 * @param {string} created_at - Creation timestamp
 * @param {string} updated_at - Update timestamp (optional, for compatibility)
 * @param {string} action_at - Action timestamp
 * @returns {string} Formatted response time or 'Pending'
 */
export function calculateResponseTime(created_at, updated_at, action_at) {
  if (!action_at) return 'Pending';

  const created = new Date(created_at);
  const action = new Date(action_at);
  const diff = action - created;
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

/**
 * Calculate total/average response time from multiple status records
 * @param {Array} statuses - Array of status objects with created_at and action_at
 * @returns {string} Formatted average time or 'N/A'
 */
export function calculateTotalResponseTime(statuses) {
  const completed = statuses.filter(s => s.status === 'approved' && s.action_at);
  if (completed.length === 0) return 'N/A';

  const totalTime = completed.reduce((sum, status) => {
    if (status.action_at) {
      const created = new Date(status.created_at);
      const action = new Date(status.action_at);
      return sum + (action - created);
    }
    return sum;
  }, 0);

  const avgTime = totalTime / completed.length;
  const hours = Math.floor(avgTime / (1000 * 60 * 60));
  const minutes = Math.floor((avgTime % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * Format time in seconds to human-readable string
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string
 */
export function formatTime(seconds) {
  if (!seconds) return 'N/A';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${remainingSeconds}s`;
  return `${remainingSeconds}s`;
}

/**
 * Calculate response time in seconds
 * @param {string} created_at - Creation timestamp
 * @param {string} action_at - Action timestamp
 * @returns {number} Time difference in seconds
 */
export function calculateResponseTimeSeconds(created_at, action_at) {
  if (!action_at || !created_at) return 0;
  
  const created = new Date(created_at);
  const action = new Date(action_at);
  return (action - created) / 1000;
}

/**
 * Add metrics to application data
 * @param {Object} app - Application object with no_dues_status array
 * @returns {Object} Application with added metrics
 */
export function addApplicationMetrics(app) {
  const statusWithMetrics = app.no_dues_status.map(status => ({
    ...status,
    response_time: calculateResponseTime(app.created_at, status.created_at, status.action_at)
  }));

  const totalResponseTime = calculateTotalResponseTime(statusWithMetrics);

  return {
    ...app,
    no_dues_status: statusWithMetrics,
    total_response_time: totalResponseTime,
    pending_departments: statusWithMetrics.filter(s => s.status === 'pending').length,
    completed_departments: statusWithMetrics.filter(s => s.status === 'approved').length
  };
}

/**
 * Calculate department statistics from status data
 * @param {Array} departmentWorkload - Array of department workload objects
 * @param {Array} allStatuses - Array of all status records with timestamps
 * @returns {Array} Formatted department statistics
 */
export function calculateDepartmentStats(departmentWorkload, allStatuses) {
  const departmentStatsMap = new Map();

  // Initialize with department workload data
  if (departmentWorkload) {
    departmentWorkload.forEach(dept => {
      departmentStatsMap.set(dept.department_name, {
        department_name: dept.department_name,
        total_requests: Number(dept.pending_count || 0) + Number(dept.approved_count || 0) + Number(dept.rejected_count || 0),
        approved_requests: Number(dept.approved_count || 0),
        rejected_requests: Number(dept.rejected_count || 0),
        pending_requests: Number(dept.pending_count || 0),
        response_times: []
      });
    });
  }

  // Calculate response times
  if (allStatuses) {
    allStatuses.forEach(status => {
      if (status.action_at && status.created_at) {
        const responseTime = calculateResponseTimeSeconds(status.created_at, status.action_at);
        const deptStats = departmentStatsMap.get(status.department_name);
        if (deptStats) {
          deptStats.response_times.push(responseTime);
        }
      }
    });
  }

  // Format department stats with calculated metrics
  return Array.from(departmentStatsMap.values()).map(dept => {
    const avgResponseTime = dept.response_times.length > 0
      ? dept.response_times.reduce((sum, time) => sum + time, 0) / dept.response_times.length
      : 0;

    return {
      department_name: dept.department_name,
      total_requests: dept.total_requests,
      approved_requests: dept.approved_requests,
      rejected_requests: dept.rejected_requests,
      pending_requests: dept.pending_requests,
      avg_response_time: formatTime(avgResponseTime),
      avg_response_time_seconds: avgResponseTime,
      approval_rate: dept.total_requests > 0
        ? ((dept.approved_requests / dept.total_requests) * 100).toFixed(2) + '%'
        : '0%',
      rejection_rate: dept.total_requests > 0
        ? ((dept.rejected_requests / dept.total_requests) * 100).toFixed(2) + '%'
        : '0%'
    };
  }).sort((a, b) => a.department_name.localeCompare(b.department_name));
}