import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';
import { isFeatureEnabled } from '../../../features.config';

export async function GET() {
  if (!isFeatureEnabled('pipelines')) {
    return NextResponse.json({ error: 'Feature disabled' }, { status: 403 });
  }

  try {
    const runs = await prisma.pipelineRun.findMany({
      orderBy: { startedAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({ runs });
  } catch (error: any) {
    console.error('[Pipelines API Error]:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve pipeline runs', details: error.message },
      { status: 500 }
    );
  }
}
