'use client';

import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { useTheme } from '@/contexts/ThemeContext';
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

export default function RequestTrendChart({ userId, lastUpdate }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const [data, setData] = useState({
    labels: [],
    datasets: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: isDark ? '#FFFFFF' : '#000000',
        },
      },
      title: {
        display: true,
        text: 'Request Trends Over Time',
        color: isDark ? '#FFFFFF' : '#000000',
      },
    },
    scales: {
      x: {
        ticks: {
          color: isDark ? '#CCCCCC' : '#333333',
        },
        grid: {
          color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        },
      },
      y: {
        ticks: {
          color: isDark ? '#CCCCCC' : '#333333',
        },
        grid: {
          color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        },
      },
    },
  };

  // Fetch REAL trend data from API - refresh when lastUpdate changes
  useEffect(() => {
    const fetchTrendData = async () => {
      if (!userId) {
        setError('User ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Add cache-busting timestamp
        const response = await fetch(`/api/admin/trends?userId=${userId}&months=12&_t=${Date.now()}`, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to fetch trend data');
        }

        setData(result.data);
        console.log('📈 Trend chart refreshed');
      } catch (err) {
        console.error('Error fetching trend data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTrendData();
  }, [userId, lastUpdate]); // Re-fetch when lastUpdate changes

  const containerClasses = `rounded-xl border p-6 transition-all duration-700 ${
    isDark ? 'bg-white/5 border-white/10 backdrop-blur-sm' : 'bg-white border-gray-200 shadow-sm'
  }`;

  if (loading) {
    return (
      <div className={`${containerClasses} flex items-center justify-center min-h-[300px]`}>
        <div className={`flex items-center gap-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          <div className={`w-5 h-5 border-2 border-t-transparent rounded-full animate-spin ${
            isDark ? 'border-gray-400' : 'border-gray-600'
          }`}></div>
          <span>Loading trend data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${containerClasses} flex items-center justify-center min-h-[300px]`}>
        <div className="text-center">
          <p className={`mb-2 ${isDark ? 'text-red-400' : 'text-jecrc-red'}`}>Failed to load trend data</p>
          <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>{error}</p>
        </div>
      </div>
    );
  }

  if (!data.labels || data.labels.length === 0) {
    return (
      <div className={`${containerClasses} flex items-center justify-center min-h-[300px]`}>
        <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>No trend data available yet</p>
      </div>
    );
  }

  return (
    <div className={containerClasses}>
      <Line data={data} options={options} />
    </div>
  );
}