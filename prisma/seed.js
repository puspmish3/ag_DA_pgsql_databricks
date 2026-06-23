const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting database seeding...');

  // 1. Clean up existing records to ensure clean slate
  console.log('Cleaning up existing database records...');
  await prisma.savedInsight.deleteMany();
  await prisma.user.deleteMany();
  await prisma.pipelineRun.deleteMany();
  await prisma.salesTransaction.deleteMany();
  await prisma.telemetryEvent.deleteMany();

  // 2. Create Demo User
  console.log('Creating demo user...');
  const user = await prisma.user.create({
    data: {
      email: 'demo@example.com',
      name: 'John Doe',
    },
  });

  // 3. Create historical Pipeline runs
  console.log('Seeding pipeline history...');
  await prisma.pipelineRun.createMany({
    data: [
      {
        startedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 - 30 * 60 * 1000),
        completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        status: 'success',
        recordsSynced: 124,
        triggeredBy: 'system',
      },
      {
        startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 - 45 * 60 * 1000),
        completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        status: 'success',
        recordsSynced: 89,
        triggeredBy: 'system',
      },
      {
        startedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 - 15 * 60 * 1000),
        completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        status: 'success',
        recordsSynced: 145,
        triggeredBy: 'user-interface',
      },
    ],
  });

  // 4. Create Saved Insights
  console.log('Seeding saved insights...');
  await prisma.savedInsight.createMany({
    data: [
      {
        title: 'Weekly Sales by Region',
        description: 'Comparison of North American and European revenues.',
        featureId: 'sales',
        queryConfig: JSON.stringify({ chartType: 'bar', regionFilter: 'all', timeframe: '7d' }),
        userId: user.id,
      },
      {
        title: 'Signup Clickstream Trend',
        description: 'Tracking pageview-to-signup conversion rates.',
        featureId: 'telemetry',
        queryConfig: JSON.stringify({ chartType: 'line', eventType: 'signup', timeframe: '30d' }),
        userId: user.id,
      },
    ],
  });

  // 5. Generate Mock Sales Transactions
  console.log('Generating 1000 mock sales transactions (last 30 days)...');
  const categories = ['Electronics', 'Apparel', 'Home & Kitchen', 'Sports & Outdoors', 'Books'];
  const productNames = {
    'Electronics': ['UltraWide Monitor', 'Wireless Headset', 'Smart Watch', 'Mechanical Keyboard', 'USB-C Docking Station'],
    'Apparel': ['Premium Hoodie', 'Running Shoes', 'Slim Fit Jeans', 'Sun Glasses', 'Winter Gloves'],
    'Home & Kitchen': ['Espresso Machine', 'Air Purifier', 'Cast Iron Skillet', 'Robotic Vacuum', 'Chef Knife Set'],
    'Sports & Outdoors': ['Waterproof Tent', 'Yoga Mat', 'Carbon Fiber Bicycle', 'Camping Grill', 'Hiking Backpack'],
    'Books': ['Designing Data-Intensive Applications', 'Introduction to Algorithms', 'Clean Code', 'TypeScript Cookbook', 'Zero to One'],
  };
  const regions = ['North America', 'Europe', 'Asia-Pacific', 'Latin America'];
  const paymentMethods = ['Credit Card', 'PayPal', 'Bank Transfer', 'Apple Pay'];
  
  const sales = [];
  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;

  for (let i = 0; i < 1000; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    const products = productNames[category];
    const productName = products[Math.floor(Math.random() * products.length)];
    const region = regions[Math.floor(Math.random() * regions.length)];
    const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
    
    // Distribute transactions exponentially towards recent days
    const timeOffset = Math.pow(Math.random(), 1.5) * thirtyDays;
    const timestamp = new Date(now - timeOffset);
    
    const quantity = Math.floor(Math.random() * 3) + 1;
    let basePrice = 20;
    if (category === 'Electronics') basePrice = 150;
    else if (category === 'Home & Kitchen') basePrice = 80;
    else if (category === 'Sports & Outdoors') basePrice = 60;
    else if (category === 'Apparel') basePrice = 45;
    
    const amount = parseFloat((basePrice * quantity * (0.8 + Math.random() * 0.4)).toFixed(2));
    const customerAge = Math.floor(Math.random() * 45) + 18; // Ages 18 to 63

    sales.push({
      transactionId: `TX-${100000 + i}`,
      timestamp,
      amount,
      quantity,
      productCategory: category,
      productName,
      region,
      customerAge,
      paymentMethod,
    });
  }

  // Insert sales transactions in chunks to prevent database payload limits
  const salesChunkSize = 250;
  for (let i = 0; i < sales.length; i += salesChunkSize) {
    const chunk = sales.slice(i, i + salesChunkSize);
    await prisma.salesTransaction.createMany({ data: chunk });
  }

  // 6. Generate Mock Telemetry Events
  console.log('Generating 2000 mock telemetry events (last 30 days)...');
  const eventTypes = ['page_view', 'click', 'add_to_cart', 'checkout', 'signup'];
  const pages = ['/home', '/products', '/cart', '/checkout', '/profile'];
  const deviceTypes = ['Desktop', 'Mobile', 'Tablet'];
  const referrers = ['Google', 'Direct', 'Social Media', 'Newsletter'];
  
  const telemetry = [];
  for (let i = 0; i < 2000; i++) {
    const deviceType = deviceTypes[Math.floor(Math.random() * deviceTypes.length)];
    const referrer = referrers[Math.floor(Math.random() * referrers.length)];
    const mockUserId = `USR-${1000 + Math.floor(Math.random() * 100)}`;
    
    const timeOffset = Math.pow(Math.random(), 1.3) * thirtyDays;
    const timestamp = new Date(now - timeOffset);

    // Create realistic behavior paths
    const roll = Math.random();
    let eventType = 'page_view';
    let pagePath = '/home';
    let durationMs = Math.floor(Math.random() * 15000) + 1000;

    if (roll > 0.9) {
      eventType = 'signup';
      pagePath = '/profile';
      durationMs = Math.floor(Math.random() * 40000) + 15000;
    } else if (roll > 0.75) {
      eventType = 'checkout';
      pagePath = '/checkout';
      durationMs = Math.floor(Math.random() * 30000) + 10000;
    } else if (roll > 0.55) {
      eventType = 'add_to_cart';
      pagePath = '/cart';
      durationMs = Math.floor(Math.random() * 10000) + 2000;
    } else if (roll > 0.3) {
      eventType = 'click';
      pagePath = '/products';
      durationMs = Math.floor(Math.random() * 8000) + 1000;
    }

    telemetry.push({
      eventId: `EV-${100000 + i}`,
      timestamp,
      userId: mockUserId,
      eventType,
      pagePath,
      durationMs,
      deviceType,
      referrer,
    });
  }

  // Insert telemetry events in chunks
  const telemetryChunkSize = 250;
  for (let i = 0; i < telemetry.length; i += telemetryChunkSize) {
    const chunk = telemetry.slice(i, i + telemetryChunkSize);
    await prisma.telemetryEvent.createMany({ data: chunk });
  }

  console.log('Seeding completed successfully!');
  console.log(`- Seeded 1 User`);
  console.log(`- Seeded 3 Pipeline Runs`);
  console.log(`- Seeded 2 Saved Insights`);
  console.log(`- Seeded ${sales.length} Sales Transactions`);
  console.log(`- Seeded ${telemetry.length} Telemetry Events`);
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
