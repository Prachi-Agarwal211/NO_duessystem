import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function DepartmentPerformanceChart({ data }) {
  const chartData = {
    labels: data ? data.map(item => item.department_name) : [],
    datasets: [
      {
        label: 'Approved',
        data: data ? data.map(item => item.approved_requests || 0) : [],
        backgroundColor: 'rgba(72, 187, 120, 0.8)',
      },
      {
        label: 'Rejected',
        data: data ? data.map(item => item.rejected_requests || 0) : [],
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
      },
      {
        label: 'Pending',
        data: data ? data.map(item => item.pending_requests || 0) : [],
        backgroundColor: 'rgba(245, 158, 11, 0.8)',
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#e5e7eb',
        },
      },
      title: {
        display: true,
        text: 'Department Performance Overview',
        color: '#e5e7eb',
      },
    },
    scales: {
      x: {
        ticks: {
          color: '#9ca3af',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
      y: {
        ticks: {
          color: '#9ca3af',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
    },
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
      <Bar data={chartData} options={options} />
    </div>
  );
}

// Memoize to prevent unnecessary re-renders when data doesn't change
export default React.memo(DepartmentPerformanceChart);