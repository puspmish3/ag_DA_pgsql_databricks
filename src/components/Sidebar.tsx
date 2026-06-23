'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as Icons from 'lucide-react';
import { getActiveFeatures, FeatureConfig } from '../features.config';

// Dynamic Icon Renderer
const DynamicIcon = ({ name, className = '', size = 18 }: { name: string; className?: string; size?: number }) => {
  const IconComponent = (Icons as any)[name];
  if (!IconComponent) return <Icons.HelpCircle className={className} size={size} />;
  return <IconComponent className={className} size={size} />;
};

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const [activeFeatures, setActiveFeatures] = useState<FeatureConfig[]>([]);
  const [mode, setMode] = useState<{ provider: string; loading: boolean }>({
    provider: 'local',
    loading: true,
  });

  useEffect(() => {
    // Read features on mount
    setActiveFeatures(getActiveFeatures());

    // Fetch system mode/status
    fetch('/api/features')
      .then((res) => res.json())
      .then((data) => {
        setMode({
          provider: data.provider || 'local',
          loading: false,
        });
      })
      .catch(() => {
        setMode({ provider: 'local', loading: false });
      });
  }, []);

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Icons.Layers className="brand-logo" size={28} />
        <div className="brand-text">
          <h2>NexusInsight</h2>
          <span>Enterprise Data Portal</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-title">Core Portal</div>
        
        <Link 
          href="/" 
          className={`nav-link ${pathname === '/' ? 'active' : ''}`}
        >
          <Icons.LayoutDashboard size={18} />
          <span>Overview</span>
        </Link>

        {activeFeatures.length > 0 && (
          <>
            <div className="nav-section-title">Enabled Modules</div>
            {activeFeatures.map((feature) => (
              <Link
                key={feature.id}
                href={feature.path}
                className={`nav-link ${pathname.startsWith(feature.path) ? 'active' : ''}`}
              >
                <DynamicIcon name={feature.icon} />
                <span>{feature.name}</span>
              </Link>
            ))}
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="status-card">
          <div className="status-header">
            <span className="status-label">Engine Status</span>
            <span className={`pulse-indicator ${mode.provider === 'databricks' ? 'secondary' : 'success'}`}></span>
          </div>
          <div className="status-body">
            {mode.loading ? (
              <span className="status-text loading">Connecting...</span>
            ) : mode.provider === 'databricks' ? (
              <div>
                <span className="status-text cloud">Cloud Analytics</span>
                <span className="status-subtext">Databricks SQL</span>
              </div>
            ) : (
              <div>
                <span className="status-text local">Local Emulation</span>
                <span className="status-subtext">PostgreSQL OLAP</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .sidebar {
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          width: var(--sidebar-width);
          background: var(--bg-sidebar);
          border-right: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          z-index: 100;
        }

        .sidebar-brand {
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 12px;
          border-bottom: 1px solid var(--border-color);
        }

        .brand-logo {
          color: var(--primary);
          filter: drop-shadow(0 0 8px var(--primary-glow));
        }

        .brand-text h2 {
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1.2;
        }

        .brand-text span {
          font-size: 0.7rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .sidebar-nav {
          padding: 24px 16px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex-grow: 1;
          overflow-y: auto;
        }

        .nav-section-title {
          font-family: 'Outfit', sans-serif;
          font-size: 0.65rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin: 16px 8px 8px;
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          font-size: 0.9rem;
          font-weight: 500;
          transition: all var(--transition-fast);
        }

        .nav-link:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.03);
          transform: translateX(2px);
        }

        .nav-link.active {
          color: var(--text-primary);
          background: var(--primary-glow);
          border: 1px solid rgba(139, 92, 246, 0.15);
          font-weight: 600;
        }

        .nav-link.active :global(svg) {
          color: var(--primary);
        }

        .sidebar-footer {
          padding: 20px;
          border-top: 1px solid var(--border-color);
        }

        .status-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 12px;
        }

        .status-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .status-label {
          font-size: 0.65rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 600;
        }

        .status-body {
          font-family: 'Outfit', sans-serif;
        }

        .status-text {
          font-size: 0.85rem;
          font-weight: 600;
          display: block;
        }

        .status-text.local {
          color: var(--success);
        }

        .status-text.cloud {
          color: var(--secondary);
        }

        .status-text.loading {
          color: var(--text-muted);
        }

        .status-subtext {
          font-size: 0.7rem;
          color: var(--text-muted);
          display: block;
          margin-top: 2px;
        }
      `}</style>
    </aside>
  );
};

export default Sidebar;
