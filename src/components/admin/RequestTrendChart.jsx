import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function RequestTrendChart() {
  const [data, setData] = useState({
    labels: [],
    datasets: [
      {
        label: 'Pending',
        data: [],
        borderColor: 'rgba(245, 158, 11, 0.8)',
        backgroundColor: 'rgba(245, 158, 11, 0.2)',
        tension: 0.4,
      },
      {
        label: 'Completed',
        data: [],
        borderColor: 'rgba(72, 187, 120, 0.8)',
        backgroundColor: 'rgba(72, 187, 120, 0.2)',
        tension: 0.4,
      },
      {
        label: 'Rejected',
        data: [],
        borderColor: 'rgba(239, 68, 68, 0.8)',
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        tension: 0.4,
      },
    ],
  });

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
        text: 'Request Trends Over Time',
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

  // Simulated data - in production, fetch from API
  useEffect(() => {
    const mockLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mockData = {
      labels: mockLabels,
      datasets: [
        {
          label: 'Pending',
          data: [12, 19, 3, 5, 2, 3, 8, 6, 4, 7, 10, 15],
          borderColor: 'rgba(245, 158, 11, 0.8)',
          backgroundColor: 'rgba(245, 158, 11, 0.2)',
          tension: 0.4,
        },
        {
          label: 'Completed',
          data: [2, 3, 20, 12, 17, 19, 10, 15, 18, 14, 12, 10],
          borderColor: 'rgba(72, 187, 120, 0.8)',
          backgroundColor: 'rgba(72, 187, 120, 0.2)',
          tension: 0.4,
        },
        {
          label: 'Rejected',
          data: [1, 2, 1, 3, 1, 2, 1, 2, 1, 1, 2, 1],
          borderColor: 'rgba(239, 68, 68, 0.8)',
          backgroundColor: 'rgba(239, 68, 68, 0.2)',
          tension: 0.4,
        },
      ],
    };
    setData(mockData);
  }, []);

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
      <Line data={data} options={options} />
    </div>
  );
};