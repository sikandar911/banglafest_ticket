const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testDatabase() {
  try {
    console.log('🧪 Starting database tests...\n');

    // Test 1: Basic connection
    console.log('Test 1: Testing database connection...');
    const result = await prisma.$queryRaw`SELECT 1 as result`;
    console.log('✅ Database connection successful\n');

    // Test 2: Count tables/models
    console.log('Test 2: Checking existing data...');
    const userCount = await prisma.user.count();
    const eventCount = await prisma.event.count();
    const orderCount = await prisma.order.count();
    console.log(`✅ Users: ${userCount}`);
    console.log(`✅ Events: ${eventCount}`);
    console.log(`✅ Orders: ${orderCount}\n`);

    // Test 3: Test a simple query
    console.log('Test 3: Fetching sample data...');
    const users = await prisma.user.findMany({ take: 3 });
    console.log(`✅ Retrieved ${users.length} sample users\n`);

    // Test 4: Test transaction
    console.log('Test 4: Testing transaction support...');
    await prisma.$transaction([
      prisma.user.count(),
      prisma.event.count(),
    ]);
    console.log('✅ Transaction test successful\n');

    console.log('🎉 All database tests passed!');
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();