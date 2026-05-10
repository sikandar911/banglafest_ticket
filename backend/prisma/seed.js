const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seed() {
  try {
    console.log('🌱 Seeding database...');

    // Create admin user
    const adminEmail = 'admin@banglafest.com';
    const adminPassword = 'Admin@12345'; // Change this to a secure password

    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (existingAdmin) {
      console.log(`✅ Admin user already exists: ${adminEmail}`);
    } else {
      // Hash password
      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      // Create admin user
      const admin = await prisma.user.create({
        data: {
          name: 'Admin User',
          email: adminEmail,
          passwordHash: hashedPassword,
          isVerified: true,
          role: 'ADMIN',
        },
      });

      console.log(`✅ Admin user created successfully!`);
      console.log(`   Email: ${adminEmail}`);
      console.log(`   Password: ${adminPassword}`);
      console.log(`   ID: ${admin.id}`);
    }

    // Create a test scanner user (optional)
    const scannerEmail = 'scanner@banglafest.com';
    const scannerPassword = 'Scanner@12345';

    const existingScanner = await prisma.user.findUnique({
      where: { email: scannerEmail },
    });

    if (existingScanner) {
      console.log(`✅ Scanner user already exists: ${scannerEmail}`);
    } else {
      const hashedScannerPassword = await bcrypt.hash(scannerPassword, 10);

      const scanner = await prisma.user.create({
        data: {
          name: 'Scanner User',
          email: scannerEmail,
          passwordHash: hashedScannerPassword,
          isVerified: true,
          role: 'SCANNER',
        },
      });

      console.log(`✅ Scanner user created successfully!`);
      console.log(`   Email: ${scannerEmail}`);
      console.log(`   Password: ${scannerPassword}`);
      console.log(`   ID: ${scanner.id}`);
    }

    // Create a test regular user (optional)
    const userEmail = 'user@banglafest.com';
    const userPassword = 'User@12345';

    const existingUser = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (existingUser) {
      console.log(`✅ Regular user already exists: ${userEmail}`);
    } else {
      const hashedUserPassword = await bcrypt.hash(userPassword, 10);

      const user = await prisma.user.create({
        data: {
          name: 'Test User',
          email: userEmail,
          passwordHash: hashedUserPassword,
          isVerified: true,
          role: 'USER',
        },
      });

      console.log(`✅ Regular user created successfully!`);
      console.log(`   Email: ${userEmail}`);
      console.log(`   Password: ${userPassword}`);
      console.log(`   ID: ${user.id}`);
    }

    console.log('\n🎉 Database seeding completed!');
    console.log('\n📝 Login Credentials Summary:');
    console.log('───────────────────────────────────');
    console.log(`Admin   | ${adminEmail} / ${adminPassword}`);
    console.log(`Scanner | ${scannerEmail} / ${scannerPassword}`);
    console.log(`User    | ${userEmail} / ${userPassword}`);
    console.log('───────────────────────────────────');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
