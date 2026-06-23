export interface FeatureConfig {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  icon: string; // Used to select Lucide icons dynamically
  path: string;
}

export type FeatureId = 'sales' | 'telemetry' | 'pipelines';

export const featuresConfig: Record<FeatureId, FeatureConfig> = {
  sales: {
    id: 'sales',
    name: 'Sales Analytics',
    description: 'Track store sales metrics, regional distribution, payment options, and revenue growth.',
    enabled: true,
    icon: 'DollarSign',
    path: '/sales',
  },
  telemetry: {
    id: 'telemetry',
    name: 'User Telemetry',
    description: 'Monitor clickstream user event flows, device statistics, user traffic referrers, and page durations.',
    enabled: true,
    icon: 'Activity',
    path: '/telemetry',
  },
  pipelines: {
    id: 'pipelines',
    name: 'Data Pipelines',
    description: 'Monitor sync jobs between transactional PostgreSQL database and Databricks data warehouse.',
    enabled: true,
    icon: 'GitCompare',
    path: '/pipelines',
  },
};

/**
 * Check if a specific feature is enabled.
 */
export function isFeatureEnabled(id: FeatureId): boolean {
  return featuresConfig[id]?.enabled === true;
}

/**
 * Retrieve all active (enabled) features.
 */
export function getActiveFeatures(): FeatureConfig[] {
  return Object.values(featuresConfig).filter((f) => f.enabled);
}
