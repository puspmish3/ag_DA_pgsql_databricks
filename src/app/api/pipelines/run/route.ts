import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { isFeatureEnabled } from '../../../../features.config';

export async function POST() {
  if (!isFeatureEnabled('pipelines')) {
    return NextResponse.json({ error: 'Feature disabled' }, { status: 403 });
  }

  try {
    // 1. Create a running log entry in the OLTP database
    const run = await prisma.pipelineRun.create({
      data: {
        status: 'running',
        triggeredBy: 'user-interface',
      },
    });

    // 2. Simulate pipeline running latency (2 seconds)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 3. Generate and insert new mock transactional and analytics records (simulating new data sync)
    const newSalesCount = Math.floor(Math.random() * 15) + 5; // 5 to 19 sales
    const newTelemetryCount = Math.floor(Math.random() * 25) + 10; // 10 to 34 events
    const now = new Date();

    // Generate Sales
    const categories = ['Electronics', 'Apparel', 'Home & Kitchen', 'Sports & Outdoors', 'Books'];
    const productNames = {
      'Electronics': ['Wireless Headset', 'Smart Watch', 'USB-C Docking Station'],
      'Apparel': ['Premium Hoodie', 'Running Shoes'],
      'Home & Kitchen': ['Espresso Machine', 'Air Purifier'],
      'Sports & Outdoors': ['Waterproof Tent', 'Yoga Mat'],
      'Books': ['Clean Code', 'TypeScript Cookbook'],
    };
    const regions = ['North America', 'Europe', 'Asia-Pacific', 'Latin America'];
    const paymentMethods = ['Credit Card', 'PayPal', 'Apple Pay'];

    const newSales = [];
    for (let i = 0; i < newSalesCount; i++) {
      const category = categories[Math.floor(Math.random() * categories.length)];
      const products = productNames[category as keyof typeof productNames];
      const productName = products[Math.floor(Math.random() * products.length)];
      const region = regions[Math.floor(Math.random() * regions.length)];
      const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
      const quantity = Math.floor(Math.random() * 2) + 1;
      const amount = parseFloat((30 * quantity * (0.9 + Math.random() * 0.3)).toFixed(2));

      newSales.push({
        transactionId: `TX-SYNC-${Date.now().toString().slice(-6)}-${i}`,
        timestamp: now,
        amount,
        quantity,
        productCategory: category,
        productName,
        region,
        customerAge: Math.floor(Math.random() * 30) + 20,
        paymentMethod,
      });
    }

    // Generate Telemetry
    const eventTypes = ['page_view', 'click', 'add_to_cart'];
    const pages = ['/products', '/cart', '/home'];
    const deviceTypes = ['Desktop', 'Mobile'];

    const newEvents = [];
    for (let i = 0; i < newTelemetryCount; i++) {
      const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      const pagePath = pages[Math.floor(Math.random() * pages.length)];
      const deviceType = deviceTypes[Math.floor(Math.random() * deviceTypes.length)];

      newEvents.push({
        eventId: `EV-SYNC-${Date.now().toString().slice(-6)}-${i}`,
        timestamp: now,
        userId: `USR-${1000 + Math.floor(Math.random() * 20)}`,
        eventType,
        pagePath,
        durationMs: Math.floor(Math.random() * 10000) + 1000,
        deviceType,
        referrer: 'Direct',
      });
    }

    // Perform database injection
    await prisma.$transaction([
      prisma.salesTransaction.createMany({ data: newSales }),
      prisma.telemetryEvent.createMany({ data: newEvents }),
    ]);

    const totalRecords = newSalesCount + newTelemetryCount;

    // 4. Update the PipelineRun to success status
    const updatedRun = await prisma.pipelineRun.update({
      where: { id: run.id },
      data: {
        status: 'success',
        completedAt: now,
        recordsSynced: totalRecords,
      },
    });

    return NextResponse.json({
      success: true,
      run: updatedRun,
      details: {
        salesSynced: newSalesCount,
        telemetrySynced: newTelemetryCount,
        totalSynced: totalRecords,
      },
    });
  } catch (error: any) {
    console.error('[Pipelines Trigger Error]:', error);
    return NextResponse.json(
      { error: 'Pipeline execution failed', details: error.message },
      { status: 500 }
    );
  }
}
