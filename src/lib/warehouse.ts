import { prisma } from './db';
import { DBSQLClient } from '@databricks/sql';

// Structure of analytics query results
export interface SalesSummary {
  totalRevenue: number;
  transactionsCount: number;
  averageValue: number;
  conversionRate: number; // Simulated OLTP to OLAP metric
}

export interface SalesTrend {
  date: string;
  revenue: number;
  count: number;
}

export interface CategoryShare {
  category: string;
  revenue: number;
}

export interface RegionShare {
  region: string;
  revenue: number;
}

export interface TelemetryOverview {
  totalEvents: number;
  activeUsers: number;
  avgDurationMs: number;
  bounceRate: number;
}

export interface TelemetryTrend {
  date: string;
  page_views: number;
  clicks: number;
  add_to_cart: number;
  checkouts: number;
  signups: number;
}

export interface DeviceShare {
  device: string;
  count: number;
}

export interface PageShare {
  page: string;
  count: number;
}

export interface AnalyticsWarehouse {
  getSalesSummary(timeframeDays: number): Promise<SalesSummary>;
  getSalesTrends(timeframeDays: number): Promise<SalesTrend[]>;
  getSalesByCategory(timeframeDays: number): Promise<CategoryShare[]>;
  getSalesByRegion(timeframeDays: number): Promise<RegionShare[]>;
  
  getTelemetryOverview(timeframeDays: number): Promise<TelemetryOverview>;
  getTelemetryTrends(timeframeDays: number): Promise<TelemetryTrend[]>;
  getTelemetryDevices(timeframeDays: number): Promise<DeviceShare[]>;
  getTelemetryPages(timeframeDays: number): Promise<PageShare[]>;
}

// ============================================================================
// Implementation 1: Local PostgreSQL (OLAP emulation via Prisma)
// ============================================================================
class PostgresLocalWarehouse implements AnalyticsWarehouse {
  async getSalesSummary(timeframeDays: number): Promise<SalesSummary> {
    const startDate = new Date(Date.now() - timeframeDays * 24 * 60 * 60 * 1000);
    
    const aggregations = await prisma.salesTransaction.aggregate({
      where: { timestamp: { gte: startDate } },
      _sum: { amount: true },
      _count: { id: true },
      _avg: { amount: true },
    });

    const totalRevenue = aggregations._sum.amount ?? 0;
    const transactionsCount = aggregations._count.id ?? 0;
    const averageValue = aggregations._avg.amount ?? 0;

    // Simulate conversion rate from transactions and telemetry page_views in same period
    const totalPageViews = await prisma.telemetryEvent.count({
      where: {
        timestamp: { gte: startDate },
        eventType: 'page_view'
      }
    });
    
    const conversionRate = totalPageViews > 0 
      ? parseFloat(((transactionsCount / totalPageViews) * 100).toFixed(2)) 
      : 3.5; // fallback average

    return {
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      transactionsCount,
      averageValue: parseFloat(averageValue.toFixed(2)),
      conversionRate,
    };
  }

  async getSalesTrends(timeframeDays: number): Promise<SalesTrend[]> {
    const startDate = new Date(Date.now() - timeframeDays * 24 * 60 * 60 * 1000);
    
    // Group transactions by date using Raw SQL for flexible PostgreSQL group formatting
    const rawTrends = await prisma.$queryRaw<Array<{ day: Date; revenue: number; count: bigint }>>`
      SELECT 
        DATE_TRUNC('day', "timestamp") as "day",
        SUM("amount") as "revenue",
        COUNT("id") as "count"
      FROM "SalesTransaction"
      WHERE "timestamp" >= ${startDate}
      GROUP BY DATE_TRUNC('day', "timestamp")
      ORDER BY DATE_TRUNC('day', "timestamp") ASC
    `;

    return rawTrends.map((t) => ({
      date: t.day.toISOString().split('T')[0],
      revenue: parseFloat((Number(t.revenue) || 0).toFixed(2)),
      count: Number(t.count),
    }));
  }

  async getSalesByCategory(timeframeDays: number): Promise<CategoryShare[]> {
    const startDate = new Date(Date.now() - timeframeDays * 24 * 60 * 60 * 1000);

    const categories = await prisma.salesTransaction.groupBy({
      by: ['productCategory'],
      where: { timestamp: { gte: startDate } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
    });

    return categories.map((c) => ({
      category: c.productCategory,
      revenue: parseFloat((c._sum.amount ?? 0).toFixed(2)),
    }));
  }

  async getSalesByRegion(timeframeDays: number): Promise<RegionShare[]> {
    const startDate = new Date(Date.now() - timeframeDays * 24 * 60 * 60 * 1000);

    const regions = await prisma.salesTransaction.groupBy({
      by: ['region'],
      where: { timestamp: { gte: startDate } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
    });

    return regions.map((r) => ({
      region: r.region,
      revenue: parseFloat((r._sum.amount ?? 0).toFixed(2)),
    }));
  }

  async getTelemetryOverview(timeframeDays: number): Promise<TelemetryOverview> {
    const startDate = new Date(Date.now() - timeframeDays * 24 * 60 * 60 * 1000);

    const totalEvents = await prisma.telemetryEvent.count({
      where: { timestamp: { gte: startDate } },
    });

    const activeUsersGroup = await prisma.telemetryEvent.groupBy({
      by: ['userId'],
      where: { timestamp: { gte: startDate } },
    });
    const activeUsers = activeUsersGroup.length;

    const avgDurationAgg = await prisma.telemetryEvent.aggregate({
      where: { timestamp: { gte: startDate } },
      _avg: { durationMs: true },
    });
    const avgDurationMs = avgDurationAgg._avg.durationMs ?? 0;

    // Bounce rate: % of sessions/users that have only 1 event
    const userEventCounts = await prisma.$queryRaw<Array<{ userId: string; cnt: bigint }>>`
      SELECT "userId", COUNT("id") as "cnt"
      FROM "TelemetryEvent"
      WHERE "timestamp" >= ${startDate}
      GROUP BY "userId"
    `;
    const singleEventUsers = userEventCounts.filter((u) => Number(u.cnt) === 1).length;
    const bounceRate = userEventCounts.length > 0 
      ? parseFloat(((singleEventUsers / userEventCounts.length) * 100).toFixed(2))
      : 25.0;

    return {
      totalEvents,
      activeUsers,
      avgDurationMs: Math.round(avgDurationMs),
      bounceRate,
    };
  }

  async getTelemetryTrends(timeframeDays: number): Promise<TelemetryTrend[]> {
    const startDate = new Date(Date.now() - timeframeDays * 24 * 60 * 60 * 1000);

    const rawTrends = await prisma.$queryRaw<Array<{
      day: Date;
      views: bigint;
      clicks: bigint;
      carts: bigint;
      checkouts: bigint;
      signups: bigint;
    }>>`
      SELECT 
        DATE_TRUNC('day', "timestamp") as "day",
        COUNT(CASE WHEN "eventType" = 'page_view' THEN 1 END) as "views",
        COUNT(CASE WHEN "eventType" = 'click' THEN 1 END) as "clicks",
        COUNT(CASE WHEN "eventType" = 'add_to_cart' THEN 1 END) as "carts",
        COUNT(CASE WHEN "eventType" = 'checkout' THEN 1 END) as "checkouts",
        COUNT(CASE WHEN "eventType" = 'signup' THEN 1 END) as "signups"
      FROM "TelemetryEvent"
      WHERE "timestamp" >= ${startDate}
      GROUP BY DATE_TRUNC('day', "timestamp")
      ORDER BY DATE_TRUNC('day', "timestamp") ASC
    `;

    return rawTrends.map((t) => ({
      date: t.day.toISOString().split('T')[0],
      page_views: Number(t.views),
      clicks: Number(t.clicks),
      add_to_cart: Number(t.carts),
      checkouts: Number(t.checkouts),
      signups: Number(t.signups),
    }));
  }

  async getTelemetryDevices(timeframeDays: number): Promise<DeviceShare[]> {
    const startDate = new Date(Date.now() - timeframeDays * 24 * 60 * 60 * 1000);

    const devices = await prisma.telemetryEvent.groupBy({
      by: ['deviceType'],
      where: { timestamp: { gte: startDate } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    return devices.map((d) => ({
      device: d.deviceType,
      count: d._count.id,
    }));
  }

  async getTelemetryPages(timeframeDays: number): Promise<PageShare[]> {
    const startDate = new Date(Date.now() - timeframeDays * 24 * 60 * 60 * 1000);

    const pages = await prisma.telemetryEvent.groupBy({
      by: ['pagePath'],
      where: { timestamp: { gte: startDate } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    return pages.map((p) => ({
      page: p.pagePath,
      count: p._count.id,
    }));
  }
}

// ============================================================================
// Implementation 2: Cloud Databricks (OLAP queries via SQL Warehouse SDK)
// ============================================================================
class DatabricksWarehouse implements AnalyticsWarehouse {
  private async executeQuery<T>(sql: string): Promise<T[]> {
    const host = process.env.DATABRICKS_HOST;
    const path = process.env.DATABRICKS_PATH;
    const token = process.env.DATABRICKS_TOKEN;

    if (!host || !path || !token) {
      throw new Error('Databricks configuration is missing in environment variables (.env)');
    }

    console.log(`[Databricks SQL] Executing query: ${sql.slice(0, 100)}...`);

    const client = new DBSQLClient();
    try {
      await client.connect({ host, path, token });
      const session = await client.openSession();
      const queryOperation = await session.executeStatement(sql, { runAsync: true });
      const result = await queryOperation.fetchAll();
      await queryOperation.close();
      await session.close();
      return result as T[];
    } catch (error) {
      console.error('[Databricks SQL Error]:', error);
      throw error;
    } finally {
      await client.close();
    }
  }

  async getSalesSummary(timeframeDays: number): Promise<SalesSummary> {
    const query = `
      SELECT 
        CAST(SUM(amount) AS DOUBLE) as totalRevenue,
        COUNT(id) as transactionsCount,
        CAST(AVG(amount) AS DOUBLE) as averageValue
      FROM sales_transactions
      WHERE timestamp >= date_sub(current_date(), ${timeframeDays})
    `;
    const results = await this.executeQuery<{ totalRevenue: number; transactionsCount: number; averageValue: number }>(query);
    
    // Fallback conversion rate or query clickstream if table exists
    const telemetryQuery = `
      SELECT COUNT(id) as pageViews 
      FROM telemetry_events 
      WHERE timestamp >= date_sub(current_date(), ${timeframeDays}) AND eventType = 'page_view'
    `;
    let conversionRate = 3.5;
    try {
      const telResult = await this.executeQuery<{ pageViews: number }>(telemetryQuery);
      const pageViews = telResult[0]?.pageViews ?? 0;
      const txCount = results[0]?.transactionsCount ?? 0;
      if (pageViews > 0) {
        conversionRate = parseFloat(((txCount / pageViews) * 100).toFixed(2));
      }
    } catch {
      // Ignore fallback issues if telemetry table doesn't exist
    }

    return {
      totalRevenue: results[0]?.totalRevenue ? parseFloat(results[0].totalRevenue.toFixed(2)) : 0,
      transactionsCount: Number(results[0]?.transactionsCount || 0),
      averageValue: results[0]?.averageValue ? parseFloat(results[0].averageValue.toFixed(2)) : 0,
      conversionRate,
    };
  }

  async getSalesTrends(timeframeDays: number): Promise<SalesTrend[]> {
    const query = `
      SELECT 
        date_format(timestamp, 'yyyy-MM-dd') as date,
        CAST(SUM(amount) AS DOUBLE) as revenue,
        COUNT(id) as count
      FROM sales_transactions
      WHERE timestamp >= date_sub(current_date(), ${timeframeDays})
      GROUP BY date_format(timestamp, 'yyyy-MM-dd')
      ORDER BY date ASC
    `;
    const results = await this.executeQuery<{ date: string; revenue: number; count: number }>(query);
    return results.map(r => ({
      date: r.date,
      revenue: parseFloat((r.revenue || 0).toFixed(2)),
      count: Number(r.count || 0)
    }));
  }

  async getSalesByCategory(timeframeDays: number): Promise<CategoryShare[]> {
    const query = `
      SELECT 
        productCategory as category,
        CAST(SUM(amount) AS DOUBLE) as revenue
      FROM sales_transactions
      WHERE timestamp >= date_sub(current_date(), ${timeframeDays})
      GROUP BY productCategory
      ORDER BY revenue DESC
    `;
    return this.executeQuery<CategoryShare>(query);
  }

  async getSalesByRegion(timeframeDays: number): Promise<RegionShare[]> {
    const query = `
      SELECT 
        region,
        CAST(SUM(amount) AS DOUBLE) as revenue
      FROM sales_transactions
      WHERE timestamp >= date_sub(current_date(), ${timeframeDays})
      GROUP BY region
      ORDER BY revenue DESC
    `;
    return this.executeQuery<RegionShare>(query);
  }

  async getTelemetryOverview(timeframeDays: number): Promise<TelemetryOverview> {
    const query = `
      SELECT 
        COUNT(id) as totalEvents,
        COUNT(DISTINCT userId) as activeUsers,
        CAST(AVG(durationMs) AS DOUBLE) as avgDurationMs
      FROM telemetry_events
      WHERE timestamp >= date_sub(current_date(), ${timeframeDays})
    `;
    const results = await this.executeQuery<{ totalEvents: number; activeUsers: number; avgDurationMs: number }>(query);

    // Calculate bounce rate (users with exactly 1 event)
    const bounceQuery = `
      WITH UserCounts AS (
        SELECT userId, COUNT(id) as cnt
        FROM telemetry_events
        WHERE timestamp >= date_sub(current_date(), ${timeframeDays})
        GROUP BY userId
      )
      SELECT 
        COUNT(userId) as totalUsers,
        SUM(CASE WHEN cnt = 1 THEN 1 ELSE 0 END) as singleEventUsers
      FROM UserCounts
    `;
    let bounceRate = 25.0;
    try {
      const bounceResult = await this.executeQuery<{ totalUsers: number; singleEventUsers: number }>(bounceQuery);
      const totalUsers = bounceResult[0]?.totalUsers ?? 0;
      const singleEventUsers = bounceResult[0]?.singleEventUsers ?? 0;
      if (totalUsers > 0) {
        bounceRate = parseFloat(((singleEventUsers / totalUsers) * 100).toFixed(2));
      }
    } catch {}

    return {
      totalEvents: Number(results[0]?.totalEvents || 0),
      activeUsers: Number(results[0]?.activeUsers || 0),
      avgDurationMs: Math.round(results[0]?.avgDurationMs || 0),
      bounceRate,
    };
  }

  async getTelemetryTrends(timeframeDays: number): Promise<TelemetryTrend[]> {
    const query = `
      SELECT 
        date_format(timestamp, 'yyyy-MM-dd') as date,
        COUNT(CASE WHEN eventType = 'page_view' THEN 1 END) as page_views,
        COUNT(CASE WHEN eventType = 'click' THEN 1 END) as clicks,
        COUNT(CASE WHEN eventType = 'add_to_cart' THEN 1 END) as add_to_cart,
        COUNT(CASE WHEN eventType = 'checkout' THEN 1 END) as checkouts,
        COUNT(CASE WHEN eventType = 'signup' THEN 1 END) as signups
      FROM telemetry_events
      WHERE timestamp >= date_sub(current_date(), ${timeframeDays})
      GROUP BY date_format(timestamp, 'yyyy-MM-dd')
      ORDER BY date ASC
    `;
    const results = await this.executeQuery<{
      date: string;
      page_views: number;
      clicks: number;
      add_to_cart: number;
      checkouts: number;
      signups: number;
    }>(query);

    return results.map(r => ({
      date: r.date,
      page_views: Number(r.page_views || 0),
      clicks: Number(r.clicks || 0),
      add_to_cart: Number(r.add_to_cart || 0),
      checkouts: Number(r.checkouts || 0),
      signups: Number(r.signups || 0),
    }));
  }

  async getTelemetryDevices(timeframeDays: number): Promise<DeviceShare[]> {
    const query = `
      SELECT 
        deviceType as device,
        COUNT(id) as count
      FROM telemetry_events
      WHERE timestamp >= date_sub(current_date(), ${timeframeDays})
      GROUP BY deviceType
      ORDER BY count DESC
    `;
    const results = await this.executeQuery<{ device: string; count: number }>(query);
    return results.map(r => ({
      device: r.device,
      count: Number(r.count || 0)
    }));
  }

  async getTelemetryPages(timeframeDays: number): Promise<PageShare[]> {
    const query = `
      SELECT 
        pagePath as page,
        COUNT(id) as count
      FROM telemetry_events
      WHERE timestamp >= date_sub(current_date(), ${timeframeDays})
      GROUP BY pagePath
      ORDER BY count DESC
    `;
    const results = await this.executeQuery<{ page: string; count: number }>(query);
    return results.map(r => ({
      page: r.page,
      count: Number(r.count || 0)
    }));
  }
}

// Instantiation factory
export function getWarehouse(): AnalyticsWarehouse {
  const provider = process.env.ANALYTICS_PROVIDER || 'local';
  if (provider === 'databricks') {
    return new DatabricksWarehouse();
  }
  return new PostgresLocalWarehouse();
}

export const warehouse = getWarehouse();
