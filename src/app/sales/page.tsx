'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { isFeatureEnabled } from '../../features.config';
import GlassCard from '../../components/GlassCard';
import * as Icons from 'lucide-react';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

// Register Chart.js modules
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface SalesData {
  summary: {
    totalRevenue: number;
    transactionsCount: number;
    averageValue: number;
    conversionRate: number;
  };
  trends: Array<{ date: string; revenue: number; count: number }>;
  categories: Array<{ category: string; revenue: number }>;
  regions: Array<{ region: string; revenue: number }>;
}

export default function SalesAnalytics() {
  const [enabled, setEnabled] = useState<boolean>(true);
  const [timeframe, setTimeframe] = useState<number>(30);
  const [data, setData] = useState<SalesData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if feature is enabled
    if (!isFeatureEnabled('sales')) {
      setEnabled(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    fetch(`/api/sales?timeframe=${timeframe}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load sales database records');
        return res.json();
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [timeframe]);

  if (!enabled) {
    return (
      <div className="disabled-module-screen animate-fade-in">
        <Icons.Lock size={48} className="lock-icon" />
        <h2>Sales Analytics Module Disabled</h2>
        <p>This module has been deactivated. You can reactivate it by editing `src/features.config.ts` and toggling {"sales: { enabled: true }"}.</p>
        <Link href="/" className="btn btn-primary">
          Return to Overview
        </Link>
        <style jsx>{`
          .disabled-module-screen {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 80vh;
            text-align: center;
            gap: 16px;
            padding: 24px;
          }
          .lock-icon { color: var(--text-muted); }
          h2 { font-size: 1.8rem; color: var(--text-primary); }
          p { max-width: 500px; color: var(--text-secondary); line-height: 1.6; }
        `}</style>
      </div>
    );
  }

  // Define Chart configurations
  const lineChartData = {
    labels: data?.trends.map((t) => t.date) || [],
    datasets: [
      {
        label: 'Daily Revenue ($)',
        data: data?.trends.map((t) => t.revenue) || [],
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.05)',
        tension: 0.3,
        fill: true,
        pointRadius: timeframe > 30 ? 0 : 3,
        pointHoverRadius: 6,
      },
    ],
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        titleColor: '#f8fafc',
        bodyColor: '#e2e8f0',
        borderColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#94a3b8', font: { size: 10 } },
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: '#94a3b8', font: { size: 10 } },
      },
    },
  };

  const doughnutChartData = {
    labels: data?.categories.map((c) => c.category) || [],
    datasets: [
      {
        data: data?.categories.map((c) => c.revenue) || [],
        backgroundColor: [
          '#8b5cf6', // Violet
          '#14b8a6', // Teal
          '#f43f5e', // Rose
          '#3b82f6', // Blue
          '#eab308', // Amber
        ],
        borderWidth: 1,
        borderColor: 'rgba(15,23,42,0.5)',
      },
    ],
  };

  const doughnutChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: { color: '#e2e8f0', font: { family: 'Outfit', size: 11 } },
      },
    },
  };

  const barChartData = {
    labels: data?.regions.map((r) => r.region) || [],
    datasets: [
      {
        label: 'Revenue by Region',
        data: data?.regions.map((r) => r.revenue) || [],
        backgroundColor: 'rgba(20, 184, 166, 0.75)',
        borderColor: '#14b8a6',
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#94a3b8', font: { size: 11 } },
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: '#94a3b8', font: { size: 10 } },
      },
    },
  };

  return (
    <div className="sales-container animate-fade-in">
      {/* Page Header */}
      <header className="page-header">
        <div>
          <div className="back-link">
            <Link href="/"><Icons.ChevronLeft size={16} /> Overview</Link>
          </div>
          <h1>Sales Analytics</h1>
          <p className="subtitle">Operational statistics and growth metrics</p>
        </div>

        {/* Timeframe Selector */}
        <div className="timeframe-selector glass-card">
          {[7, 30, 90].map((t) => (
            <button
              key={t}
              className={`time-btn ${timeframe === t ? 'active' : ''}`}
              onClick={() => setTimeframe(t)}
            >
              {t} Days
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Fetching warehouse transactional metrics...</p>
        </div>
      ) : error ? (
        <div className="error-container">
          <Icons.XCircle size={40} className="error-icon" />
          <h3>Failed to Query Warehouse</h3>
          <p>{error}</p>
        </div>
      ) : (
        <>
          {/* KPI Dashboard */}
          <section className="dashboard-grid" style={{ padding: '0 0 24px' }}>
            <div className="col-3">
              <GlassCard className="kpi-card">
                <div className="kpi-content">
                  <span className="kpi-label">Sales Revenue</span>
                  <h3 className="kpi-value">${data?.summary.totalRevenue.toLocaleString()}</h3>
                  <span className="kpi-subtext growth"><Icons.TrendingUp size={12} /> Live stream data</span>
                </div>
              </GlassCard>
            </div>
            
            <div className="col-3">
              <GlassCard className="kpi-card">
                <div className="kpi-content">
                  <span className="kpi-label">Transactions</span>
                  <h3 className="kpi-value">{data?.summary.transactionsCount.toLocaleString()}</h3>
                  <span className="kpi-subtext">Completed invoices</span>
                </div>
              </GlassCard>
            </div>

            <div className="col-3">
              <GlassCard className="kpi-card">
                <div className="kpi-content">
                  <span className="kpi-label">Avg Ticket Size</span>
                  <h3 className="kpi-value">${data?.summary.averageValue}</h3>
                  <span className="kpi-subtext">Average spend per basket</span>
                </div>
              </GlassCard>
            </div>

            <div className="col-3">
              <GlassCard className="kpi-card">
                <div className="kpi-content">
                  <span className="kpi-label">Conversion Rate</span>
                  <h3 className="kpi-value">{data?.summary.conversionRate}%</h3>
                  <span className="kpi-subtext">Unique user buy ratio</span>
                </div>
              </GlassCard>
            </div>
          </section>

          {/* Charts Row 1 */}
          <section className="dashboard-grid" style={{ padding: 0 }}>
            <div className="col-8">
              <GlassCard className="chart-card">
                <h3>Revenue Growth Trend</h3>
                <div className="chart-wrapper">
                  <Line data={lineChartData} options={lineChartOptions} />
                </div>
              </GlassCard>
            </div>

            <div className="col-4">
              <GlassCard className="chart-card">
                <h3>Category Share</h3>
                <div className="chart-wrapper">
                  <Doughnut data={doughnutChartData} options={doughnutChartOptions} />
                </div>
              </GlassCard>
            </div>
          </section>

          {/* Charts Row 2 */}
          <section className="dashboard-grid" style={{ padding: '24px 0 0' }}>
            <div className="col-12">
              <GlassCard className="chart-card">
                <h3>Regional Sales Breakdown</h3>
                <div className="chart-wrapper bar">
                  <Bar data={barChartData} options={barChartOptions} />
                </div>
              </GlassCard>
            </div>
          </section>
        </>
      )}

      <style jsx>{`
        .sales-container {
          padding: 30px;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 30px;
        }

        .back-link {
          margin-bottom: 8px;
        }

        .back-link :global(a) {
          font-size: 0.8rem;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          gap: 4px;
          transition: color var(--transition-fast);
        }

        .back-link :global(a):hover {
          color: var(--text-primary);
        }

        .page-header h1 {
          font-size: 2rem;
          color: var(--text-primary);
        }

        .subtitle {
          font-size: 0.9rem;
          color: var(--text-secondary);
          margin-top: 4px;
        }

        .timeframe-selector {
          display: flex;
          padding: 4px;
          border-radius: var(--radius-md);
        }

        .time-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          padding: 8px 16px;
          border-radius: var(--radius-sm);
          cursor: pointer;
          font-family: 'Outfit', sans-serif;
          font-weight: 500;
          font-size: 0.85rem;
          transition: all var(--transition-fast);
        }

        .time-btn:hover {
          color: var(--text-primary);
        }

        .time-btn.active {
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-primary);
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
        }

        /* KPI styling */
        .kpi-card {
          padding: 24px;
        }

        .kpi-content {
          display: flex;
          flex-direction: column;
        }

        .kpi-label {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          font-weight: 600;
        }

        .kpi-value {
          font-size: 1.8rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 6px 0;
          line-height: 1;
        }

        .kpi-subtext {
          font-size: 0.7rem;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .kpi-subtext.growth {
          color: var(--secondary);
        }

        /* Chart Styling */
        .chart-card {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .chart-card h3 {
          font-size: 1.1rem;
          font-weight: 600;
        }

        .chart-wrapper {
          position: relative;
          height: 280px;
          width: 100%;
        }

        .chart-wrapper.bar {
          height: 260px;
        }

        /* Loader and Error States */
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 40vh;
          gap: 16px;
          color: var(--text-secondary);
        }

        .spinner {
          width: 36px;
          height: 36px;
          border: 3px solid rgba(255,255,255,0.05);
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: spin 1s infinite linear;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .error-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 40vh;
          gap: 12px;
          color: var(--danger);
          text-align: center;
        }

        .error-icon {
          color: var(--danger);
        }

        .error-container h3 {
          font-size: 1.3rem;
          color: var(--text-primary);
        }

        .error-container p {
          color: var(--text-secondary);
          max-width: 400px;
          font-size: 0.9rem;
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
}
