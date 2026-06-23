import { NextResponse } from 'next/server';
import { warehouse } from '../../../lib/warehouse';
import { isFeatureEnabled } from '../../../features.config';

export async function GET(request: Request) {
  // Security check: Verify module is enabled
  if (!isFeatureEnabled('sales')) {
    return NextResponse.json({ error: 'Feature disabled' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const timeframeDays = parseInt(searchParams.get('timeframe') || '30', 10);

    const [summary, trends, categories, regions] = await Promise.all([
      warehouse.getSalesSummary(timeframeDays),
      warehouse.getSalesTrends(timeframeDays),
      warehouse.getSalesByCategory(timeframeDays),
      warehouse.getSalesByRegion(timeframeDays),
    ]);

    return NextResponse.json({
      summary,
      trends,
      categories,
      regions,
    });
  } catch (error: any) {
    console.error('[Sales API Error]:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve sales analytics', details: error.message },
      { status: 500 }
    );
  }
}
