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

interface TelemetryData {
  overview: {
    totalEvents: number;
    activeUsers: number;
    avgDurationMs: number;
    bounceRate: number;
  };
  trends: Array<{
    date: string;
    page_views: number;
    clicks: number;
    add_to_cart: number;
    checkouts: number;
    signups: number;
  }>;
  devices: Array<{ device: string; count: number }>;
  pages: Array<{ page: string; count: number }>;
}

export default function TelemetryDashboard() {
  const [enabled, setEnabled] = useState<boolean>(true);
  const [timeframe, setTimeframe] = useState<number>(30);
  const [data, setData] = useState<TelemetryData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFeatureEnabled('telemetry')) {
      setEnabled(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    fetch(`/api/telemetry?timeframe=${timeframe}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load telemetry records');
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
        <h2>User Telemetry Module Disabled</h2>
        <p>This module has been deactivated. You can reactivate it by editing `src/features.config.ts` and toggling {"telemetry: { enabled: true }"}.</p>
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

  // Chart configuration
  const trendsChartData = {
    labels: data?.trends.map((t) => t.date) || [],
    datasets: [
      {
        label: 'Page Views',
        data: data?.trends.map((t) => t.page_views) || [],
        borderColor: '#3b82f6',
        backgroundColor: 'transparent',
        tension: 0.2,
        pointRadius: 0,
        borderWidth: 2,
      },
      {
        label: 'Clicks',
        data: data?.trends.map((t) => t.clicks) || [],
        borderColor: '#10b981',
        backgroundColor: 'transparent',
        tension: 0.2,
        pointRadius: 0,
        borderWidth: 2,
      },
      {
        label: 'Add to Cart',
        data: data?.trends.map((t) => t.add_to_cart) || [],
        borderColor: '#eab308',
        backgroundColor: 'transparent',
        tension: 0.2,
        pointRadius: 0,
        borderWidth: 2,
      },
      {
        label: 'Signups',
        data: data?.trends.map((t) => t.signups) || [],
        borderColor: '#8b5cf6',
        backgroundColor: 'transparent',
        tension: 0.2,
        pointRadius: 0,
        borderWidth: 2.5,
      },
    ],
  };

  const trendsChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { color: '#e2e8f0', boxWidth: 12, font: { family: 'Outfit', size: 11 } },
      },
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

  const deviceChartData = {
    labels: data?.devices.map((d) => d.device) || [],
    datasets: [
      {
        data: data?.devices.map((d) => d.count) || [],
        backgroundColor: ['#8b5cf6', '#14b8a6', '#3b82f6'],
        borderWidth: 1,
        borderColor: 'rgba(15,23,42,0.5)',
      },
    ],
  };

  const deviceChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: { color: '#e2e8f0', font: { family: 'Outfit', size: 11 } },
      },
    },
  };

  const pagesChartData = {
    labels: data?.pages.map((p) => p.page) || [],
    datasets: [
      {
        label: 'Hits',
        data: data?.pages.map((p) => p.count) || [],
        backgroundColor: 'rgba(139, 92, 246, 0.75)',
        borderColor: '#8b5cf6',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const pagesChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const, // Horizontal bars
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: '#94a3b8', font: { size: 10 } },
      },
      y: {
        grid: { display: false },
        ticks: { color: '#e2e8f0', font: { size: 11 } },
      },
    },
  };

  return (
    <div className="telemetry-container animate-fade-in">
      {/* Header */}
      <header className="page-header">
        <div>
          <div className="back-link">
            <Link href="/"><Icons.ChevronLeft size={16} /> Overview</Link>
          </div>
          <h1>User Telemetry</h1>
          <p className="subtitle">Clickstream tracking and behavioral analysis</p>
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
          <p>Fetching clickstream telemetry logs...</p>
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
                  <span className="kpi-label">Clickstream Events</span>
                  <h3 className="kpi-value">{data?.overview.totalEvents.toLocaleString()}</h3>
                  <span className="kpi-subtext">Total interactions logged</span>
                </div>
              </GlassCard>
            </div>
            
            <div className="col-3">
              <GlassCard className="kpi-card">
                <div className="kpi-content">
                  <span className="kpi-label">Active Users</span>
                  <h3 className="kpi-value">{data?.overview.activeUsers.toLocaleString()}</h3>
                  <span className="kpi-subtext">Unique user sessions</span>
                </div>
              </GlassCard>
            </div>

            <div className="col-3">
              <GlassCard className="kpi-card">
                <div className="kpi-content">
                  <span className="kpi-label">Avg. Engagement</span>
                  <h3 className="kpi-value">
                    {data?.overview.avgDurationMs ? Math.round(data.overview.avgDurationMs / 1000) : 0}s
                  </h3>
                  <span className="kpi-subtext">Session duration average</span>
                </div>
              </GlassCard>
            </div>

            <div className="col-3">
              <GlassCard className="kpi-card">
                <div className="kpi-content">
                  <span className="kpi-label">Bounce Rate</span>
                  <h3 className="kpi-value">{data?.overview.bounceRate}%</h3>
                  <span className="kpi-subtext">Single event session ratio</span>
                </div>
              </GlassCard>
            </div>
          </section>

          {/* Charts Row 1 */}
          <section className="dashboard-grid" style={{ padding: 0 }}>
            <div className="col-8">
              <GlassCard className="chart-card">
                <h3>Behavioral Events Overlay</h3>
                <div className="chart-wrapper">
                  <Line data={trendsChartData} options={trendsChartOptions} />
                </div>
              </GlassCard>
            </div>

            <div className="col-4">
              <GlassCard className="chart-card">
                <h3>Device Breakdown</h3>
                <div className="chart-wrapper">
                  <Doughnut data={deviceChartData} options={deviceChartOptions} />
                </div>
              </GlassCard>
            </div>
          </section>

          {/* Charts Row 2 */}
          <section className="dashboard-grid" style={{ padding: '24px 0 0' }}>
            <div className="col-12">
              <GlassCard className="chart-card">
                <h3>Most Visited Page Paths</h3>
                <div className="chart-wrapper horizontal-bar">
                  <Bar data={pagesChartData} options={pagesChartOptions} />
                </div>
              </GlassCard>
            </div>
          </section>
        </>
      )}

      <style jsx>{`
        .telemetry-container {
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

        /* KPI Card Styling */
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

        .chart-wrapper.horizontal-bar {
          height: 240px;
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
