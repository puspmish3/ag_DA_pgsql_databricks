'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { isFeatureEnabled } from '../../features.config';
import GlassCard from '../../components/GlassCard';
import * as Icons from 'lucide-react';

interface PipelineRun {
  id: string;
  startedAt: string;
  completedAt: string | null;
  status: string; // "running" | "success" | "failed"
  recordsSynced: number;
  errorMessage: string | null;
  triggeredBy: string;
}

export default function PipelinesDashboard() {
  const [enabled, setEnabled] = useState<boolean>(true);
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [runningSync, setRunningSync] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<any | null>(null);

  const fetchRuns = () => {
    setError(null);
    fetch('/api/pipelines')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load database pipeline runs');
        return res.json();
      })
      .then((json) => {
        setRuns(json.runs || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!isFeatureEnabled('pipelines')) {
      setEnabled(false);
      setLoading(false);
      return;
    }
    fetchRuns();
  }, []);

  const triggerSync = async () => {
    if (runningSync) return;
    setRunningSync(true);
    setSyncResult(null);
    
    // Add temporary optimistic running run to UI list
    const tempRun: PipelineRun = {
      id: 'temp-running-id',
      startedAt: new Date().toISOString(),
      completedAt: null,
      status: 'running',
      recordsSynced: 0,
      errorMessage: null,
      triggeredBy: 'user-interface',
    };
    setRuns((prev) => [tempRun, ...prev]);

    try {
      const response = await fetch('/api/pipelines/run', { method: 'POST' });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Sync pipeline failed');
      }

      setSyncResult(data.details);
      
      // Refresh real logs
      fetchRuns();
    } catch (err: any) {
      console.error(err);
      alert(`Pipeline error: ${err.message}`);
      fetchRuns();
    } finally {
      setRunningSync(false);
    }
  };

  if (!enabled) {
    return (
      <div className="disabled-module-screen animate-fade-in">
        <Icons.Lock size={48} className="lock-icon" />
        <h2>Data Pipelines Module Disabled</h2>
        <p>This module has been deactivated. You can reactivate it by editing `src/features.config.ts` and toggling {"pipelines: { enabled: true }"}.</p>
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

  const latestRun = runs[0];

  return (
    <div className="pipelines-container animate-fade-in">
      {/* Page Header */}
      <header className="page-header">
        <div>
          <div className="back-link">
            <Link href="/"><Icons.ChevronLeft size={16} /> Overview</Link>
          </div>
          <h1>Data Pipelines</h1>
          <p className="subtitle">Synchronize OLTP records to the OLAP data warehouse</p>
        </div>

        {/* Sync Trigger Button */}
        <button 
          className={`btn btn-secondary trigger-btn ${runningSync ? 'loading-btn' : ''}`}
          onClick={triggerSync}
          disabled={runningSync}
        >
          {runningSync ? (
            <>
              <div className="btn-spinner"></div> Running Sync ETL...
            </>
          ) : (
            <>
              <Icons.Play size={16} fill="currentColor" /> Run Sync Job
            </>
          )}
        </button>
      </header>

      {/* Sync Success Alert */}
      {syncResult && (
        <div className="sync-success-alert">
          <Icons.CheckCircle size={20} />
          <div>
            <strong>Sync Run Success:</strong> Synced <strong>{syncResult.totalSynced} records</strong> from OLTP database to warehouse ({syncResult.salesSynced} Sales, {syncResult.telemetrySynced} Telemetry).
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading sync logs...</p>
        </div>
      ) : error ? (
        <div className="error-container">
          <Icons.XCircle size={40} className="error-icon" />
          <h3>Failed to Query Pipeline Logs</h3>
          <p>{error}</p>
        </div>
      ) : (
        <>
          {/* Status Overview Cards */}
          <section className="dashboard-grid" style={{ padding: '0 0 24px' }}>
            <div className="col-4">
              <GlassCard className="status-kpi-card">
                <div className="status-kpi-header">
                  <span className="status-kpi-label">Pipeline Status</span>
                  <span className={`pulse-indicator ${latestRun?.status === 'running' ? 'warning' : 'success'}`}></span>
                </div>
                <h3 className="status-kpi-value text-capitalize">
                  {runningSync ? 'Executing Sync' : latestRun?.status || 'No Runs'}
                </h3>
                <span className="status-kpi-subtext">Active monitoring</span>
              </GlassCard>
            </div>

            <div className="col-4">
              <GlassCard className="status-kpi-card">
                <div className="status-kpi-header">
                  <span className="status-kpi-label">Last Sync Completed</span>
                  <Icons.Clock size={16} className="text-secondary" />
                </div>
                <h3 className="status-kpi-value">
                  {latestRun && latestRun.completedAt 
                    ? new Date(latestRun.completedAt).toLocaleTimeString() 
                    : 'Never'}
                </h3>
                <span className="status-kpi-subtext">
                  {latestRun && latestRun.completedAt 
                    ? new Date(latestRun.completedAt).toLocaleDateString() 
                    : 'No sync runs recorded'}
                </span>
              </GlassCard>
            </div>

            <div className="col-4">
              <GlassCard className="status-kpi-card">
                <div className="status-kpi-header">
                  <span className="status-kpi-label">Records Synced (Last Run)</span>
                  <Icons.Database size={16} className="text-primary" />
                </div>
                <h3 className="status-kpi-value">
                  {latestRun ? latestRun.recordsSynced.toLocaleString() : 0}
                </h3>
                <span className="status-kpi-subtext">Sales and telemetry lines</span>
              </GlassCard>
            </div>
          </section>

          {/* Execution History Table */}
          <section className="history-section">
            <GlassCard className="history-card">
              <div className="history-header">
                <h3>Execution Run History</h3>
                <button className="btn btn-icon" onClick={fetchRuns} title="Refresh Logs">
                  <Icons.RefreshCw size={14} />
                </button>
              </div>
              
              <div className="table-responsive">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Job ID</th>
                      <th>Started At</th>
                      <th>Duration</th>
                      <th>Status</th>
                      <th>Synced Count</th>
                      <th>Triggered By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="no-data">No pipeline executions found</td>
                      </tr>
                    ) : (
                      runs.map((run) => {
                        const duration = run.completedAt 
                          ? `${((new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000).toFixed(1)}s`
                          : '-';

                        return (
                          <tr key={run.id}>
                            <td className="run-id-col" title={run.id}>
                              {run.id === 'temp-running-id' ? 'Job ID pending...' : `job_${run.id.slice(0, 8)}`}
                            </td>
                            <td>{new Date(run.startedAt).toLocaleString()}</td>
                            <td>{duration}</td>
                            <td>
                              <span className={`badge ${
                                run.status === 'success' 
                                  ? 'badge-success' 
                                  : run.status === 'running' 
                                    ? 'badge-warning' 
                                    : 'badge-danger'
                              }`}>
                                {run.status === 'running' && <span className="btn-spinner inline"></span>}
                                {run.status}
                              </span>
                            </td>
                            <td>{run.recordsSynced.toLocaleString()} records</td>
                            <td>{run.triggeredBy}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </section>
        </>
      )}

      <style jsx>{`
        .pipelines-container {
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

        .trigger-btn {
          height: 42px;
          min-width: 150px;
        }

        .loading-btn {
          opacity: 0.85;
          cursor: not-allowed;
        }

        .btn-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(0, 0, 0, 0.2);
          border-top-color: currentColor;
          border-radius: 50%;
          animation: spin 0.8s infinite linear;
          display: inline-block;
        }

        .btn-spinner.inline {
          margin-right: 4px;
          vertical-align: middle;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .sync-success-alert {
          padding: 16px;
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.2);
          color: var(--success);
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 0.9rem;
          margin-bottom: 24px;
          animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        /* KPI styling */
        .status-kpi-card {
          padding: 20px;
        }

        .status-kpi-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .status-kpi-label {
          font-size: 0.7rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 600;
        }

        .status-kpi-value {
          font-size: 1.45rem;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1.2;
        }

        .status-kpi-value.text-capitalize {
          text-transform: capitalize;
        }

        .status-kpi-subtext {
          font-size: 0.7rem;
          color: var(--text-muted);
          display: block;
          margin-top: 4px;
        }

        /* History Table styling */
        .history-card {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .history-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .history-header h3 {
          font-size: 1.1rem;
          font-weight: 600;
        }

        .table-responsive {
          overflow-x: auto;
        }

        .history-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 0.85rem;
        }

        .history-table th {
          font-family: 'Outfit', sans-serif;
          color: var(--text-muted);
          text-transform: uppercase;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border-color);
        }

        .history-table td {
          padding: 16px;
          border-bottom: 1px solid var(--border-color);
          color: var(--text-secondary);
        }

        .history-table tr:hover td {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.01);
        }

        .run-id-col {
          font-family: monospace;
          color: var(--text-primary);
        }

        .no-data {
          text-align: center;
          color: var(--text-muted);
          padding: 24px !important;
        }

        /* Loader & Error styling */
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
