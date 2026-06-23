import { NextResponse } from 'next/server';
import { warehouse } from '../../../lib/warehouse';
import { isFeatureEnabled } from '../../../features.config';

export async function GET(request: Request) {
  // Security check: Verify module is enabled
  if (!isFeatureEnabled('telemetry')) {
    return NextResponse.json({ error: 'Feature disabled' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const timeframeDays = parseInt(searchParams.get('timeframe') || '30', 10);

    const [overview, trends, devices, pages] = await Promise.all([
      warehouse.getTelemetryOverview(timeframeDays),
      warehouse.getTelemetryTrends(timeframeDays),
      warehouse.getTelemetryDevices(timeframeDays),
      warehouse.getTelemetryPages(timeframeDays),
    ]);

    return NextResponse.json({
      overview,
      trends,
      devices,
      pages,
    });
  } catch (error: any) {
    console.error('[Telemetry API Error]:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve telemetry analytics', details: error.message },
      { status: 500 }
    );
  }
}
