import { NextResponse } from 'next/server';
import { featuresConfig } from '@/features.config';

export async function GET() {
  const provider = process.env.ANALYTICS_PROVIDER || 'local';
  
  return NextResponse.json({
    provider,
    features: featuresConfig,
  });
}
