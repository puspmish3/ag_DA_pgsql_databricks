import React from 'react';
import Link from 'next/link';
import { prisma } from '../lib/db';
import { warehouse } from '../lib/warehouse';
import { isFeatureEnabled } from '../features.config';
import GlassCard from '../components/GlassCard';
import * as Icons from 'lucide-react';

export const revalidate = 0; // Disable caching to fetch live metrics on page refresh

export default async function DashboardOverview() {
  const isSalesEnabled = isFeatureEnabled('sales');
  const isTelemetryEnabled = isFeatureEnabled('telemetry');
  const isPipelinesEnabled = isFeatureEnabled('pipelines');

  // Fetch metrics with try/catch to handle db connection errors gracefully
  let salesData = null;
  let telemetryData = null;
  let pipelineData = null;
  let dbError = false;

  try {
    if (isSalesEnabled) {
      salesData = await warehouse.getSalesSummary(30);
    }
    if (isTelemetryEnabled) {
      telemetryData = await warehouse.getTelemetryOverview(30);
    }
    if (isPipelinesEnabled) {
      pipelineData = await prisma.pipelineRun.findFirst({
        orderBy: { startedAt: 'desc' },
      });
    }
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    dbError = true;
  }

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="overview-container animate-fade-in">
      {/* 1. Header Area */}
      <header className="page-header">
        <div>
          <h1>System Overview</h1>
          <p className="subtitle">{currentDate} | Welcome back, Developer</p>
        </div>
        <div className="engine-badge">
          <span className="pulse-indicator success"></span>
          <span>Dual OLTP-OLAP Pipeline Active</span>
        </div>
      </header>

      {dbError && (
        <div className="error-alert">
          <Icons.AlertTriangle size={20} />
          <div>
            <strong>Database Connection Error:</strong> Ensure your local PostgreSQL Docker container is running (`docker compose up -d`) and that migrations are fully synced.
          </div>
        </div>
      )}

      {/* 2. Top Level KPI Metrics Grid */}
      <section className="dashboard-grid" style={{ padding: '0 24px 24px' }}>
        {/* Sales KPI */}
        <div className="col-3">
          <GlassCard className="kpi-card">
            <div className="kpi-icon sales"><Icons.DollarSign size={22} /></div>
            <div className="kpi-content">
              <span className="kpi-label">30d Total Sales</span>
              {isSalesEnabled && salesData ? (
                <h3 className="kpi-value">${salesData.totalRevenue.toLocaleString()}</h3>
              ) : !isSalesEnabled ? (
                <h3 className="kpi-value disabled">Disabled</h3>
              ) : (
                <h3 className="kpi-value loading">Error</h3>
              )}
              <span className="kpi-subtext">Store sales revenue</span>
            </div>
          </GlassCard>
        </div>

        {/* Telemetry Active Users KPI */}
        <div className="col-3">
          <GlassCard className="kpi-card">
            <div className="kpi-icon telemetry"><Icons.Users size={22} /></div>
            <div className="kpi-content">
              <span className="kpi-label">30d Active Users</span>
              {isTelemetryEnabled && telemetryData ? (
                <h3 className="kpi-value">{telemetryData.activeUsers.toLocaleString()}</h3>
              ) : !isTelemetryEnabled ? (
                <h3 className="kpi-value disabled">Disabled</h3>
              ) : (
                <h3 className="kpi-value loading">Error</h3>
              )}
              <span className="kpi-subtext">Unique clickstream visitors</span>
            </div>
          </GlassCard>
        </div>

        {/* Telemetry Engagement KPI */}
        <div className="col-3">
          <GlassCard className="kpi-card">
            <div className="kpi-icon engagement"><Icons.Clock size={22} /></div>
            <div className="kpi-content">
              <span className="kpi-label">Avg. Engagement</span>
              {isTelemetryEnabled && telemetryData ? (
                <h3 className="kpi-value">
                  {Math.round(telemetryData.avgDurationMs / 1000)}s
                </h3>
              ) : !isTelemetryEnabled ? (
                <h3 className="kpi-value disabled">Disabled</h3>
              ) : (
                <h3 className="kpi-value loading">Error</h3>
              )}
              <span className="kpi-subtext">Session duration average</span>
            </div>
          </GlassCard>
        </div>

        {/* Data Sync Status KPI */}
        <div className="col-3">
          <GlassCard className="kpi-card">
            <div className="kpi-icon sync"><Icons.Database size={22} /></div>
            <div className="kpi-content">
              <span className="kpi-label">Warehouse Sync</span>
              {isPipelinesEnabled && pipelineData ? (
                <div className="sync-status-container">
                  <h3 className="kpi-value status">
                    {pipelineData.status === 'success' ? 'Synced' : 'Failed'}
                  </h3>
                  <span className={`status-dot ${pipelineData.status}`}></span>
                </div>
              ) : !isPipelinesEnabled ? (
                <h3 className="kpi-value disabled">Disabled</h3>
              ) : (
                <h3 className="kpi-value loading">No Runs</h3>
              )}
              <span className="kpi-subtext">
                {isPipelinesEnabled && pipelineData 
                  ? `Last: ${new Date(pipelineData.startedAt).toLocaleDateString()}` 
                  : 'Warehouse sync details'}
              </span>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* 3. Feature Modules Overview */}
      <section className="modules-section">
        <h2 className="section-title">Operational Feature Modules</h2>
        
        <div className="dashboard-grid" style={{ padding: 0 }}>
          {/* Sales Card */}
          <div className="col-4">
            <GlassCard className={`module-card ${!isSalesEnabled ? 'module-disabled' : ''}`}>
              <div className="module-card-header">
                <div className="icon-wrapper sales"><Icons.DollarSign size={24} /></div>
                <span className={`status-badge ${isSalesEnabled ? 'active' : 'inactive'}`}>
                  {isSalesEnabled ? 'Active' : 'Disabled'}
                </span>
              </div>
              <h3>Sales Analytics</h3>
              <p>Provides core warehouse metrics on product category performances, payment preferences, regional transaction amounts, and revenue growth graphs.</p>
              
              {isSalesEnabled ? (
                <div className="module-details">
                  <div className="metric-row">
                    <span>Avg Ticket Size</span>
                    <strong>${salesData ? salesData.averageValue : '0'}</strong>
                  </div>
                  <Link href="/sales" className="btn btn-primary module-btn">
                    Open Sales Board <Icons.ArrowRight size={16} />
                  </Link>
                </div>
              ) : (
                <div className="module-disabled-placeholder">
                  <span>Enable `sales` in `features.config.ts` to unlock.</span>
                </div>
              )}
            </GlassCard>
          </div>

          {/* Telemetry Card */}
          <div className="col-4">
            <GlassCard className={`module-card ${!isTelemetryEnabled ? 'module-disabled' : ''}`}>
              <div className="module-card-header">
                <div className="icon-wrapper telemetry"><Icons.Activity size={24} /></div>
                <span className={`status-badge ${isTelemetryEnabled ? 'active' : 'inactive'}`}>
                  {isTelemetryEnabled ? 'Active' : 'Disabled'}
                </span>
              </div>
              <h3>User Telemetry</h3>
              <p>Analyzes page clickstreams, tracks event classifications (page views, button clicks, purchases), monitors bounce rates, and lists active devices.</p>
              
              {isTelemetryEnabled ? (
                <div className="module-details">
                  <div className="metric-row">
                    <span>Bounce Rate</span>
                    <strong>{telemetryData ? telemetryData.bounceRate : '0'}%</strong>
                  </div>
                  <Link href="/telemetry" className="btn btn-primary module-btn">
                    Open Telemetry <Icons.ArrowRight size={16} />
                  </Link>
                </div>
              ) : (
                <div className="module-disabled-placeholder">
                  <span>Enable `telemetry` in `features.config.ts` to unlock.</span>
                </div>
              )}
            </GlassCard>
          </div>

          {/* Pipelines Card */}
          <div className="col-4">
            <GlassCard className={`module-card ${!isPipelinesEnabled ? 'module-disabled' : ''}`}>
              <div className="module-card-header">
                <div className="icon-wrapper pipelines"><Icons.GitCompare size={24} /></div>
                <span className={`status-badge ${isPipelinesEnabled ? 'active' : 'inactive'}`}>
                  {isPipelinesEnabled ? 'Active' : 'Disabled'}
                </span>
              </div>
              <h3>Data Pipelines</h3>
              <p>Simulates and triggers data synchronization jobs between PostgreSQL (OLTP) and Databricks SQL Warehouse (OLAP) schemas, showing runtime logs.</p>
              
              {isPipelinesEnabled ? (
                <div className="module-details">
                  <div className="metric-row">
                    <span>Last Run Sync Count</span>
                    <strong>{pipelineData ? pipelineData.recordsSynced : '0'} recs</strong>
                  </div>
                  <Link href="/pipelines" className="btn btn-primary module-btn">
                    Manage Pipelines <Icons.ArrowRight size={16} />
                  </Link>
                </div>
              ) : (
                <div className="module-disabled-placeholder">
                  <span>Enable `pipelines` in `features.config.ts` to unlock.</span>
                </div>
              )}
            </GlassCard>
          </div>
        </div>
      </section>
    </div>
  );
}
