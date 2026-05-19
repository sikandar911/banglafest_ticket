const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seed() {
  try {
    console.log('🌱 Seeding database...');

    // Create admin user
    const adminEmail = 'admin@banglafest.com';
    const adminPassword = 'Ambrosian2026AMB'; // Change this to a secure password

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

    // Create test event
    const eventTitle = 'Banglafest 2026';
    const existingEvent = await prisma.event.findFirst({
      where: { title: eventTitle },
    });

    let testEvent;
    if (existingEvent) {
      testEvent = existingEvent;
      console.log(`✅ Event already exists: ${eventTitle}`);
    } else {
      const admin = await prisma.user.findUnique({ where: { email: 'admin@banglafest.com' } });
      testEvent = await prisma.event.create({
        data: {
          title: eventTitle,
          description: 'The Ultimate Bengali Cultural Festival',
          startTime: new Date('2026-07-15T10:00:00Z'),
          endTime: new Date('2026-07-15T22:00:00Z'),
          location: 'Central Park, NYC',
          createdBy: admin?.id,
        },
      });
      console.log(`✅ Event created: ${eventTitle}`);
    }

    // Create ticket tiers
    const tierNames = ['General Admission', 'VIP', 'Premium'];
    const tierPrices = [25, 75, 150];
    
    for (let i = 0; i < tierNames.length; i++) {
      const existingTier = await prisma.ticketTier.findFirst({
        where: {
          eventId: testEvent.id,
          name: tierNames[i],
        },
      });

      if (!existingTier) {
        await prisma.ticketTier.create({
          data: {
            eventId: testEvent.id,
            name: tierNames[i],
            description: `${tierNames[i]} access to ${eventTitle}`,
            price: tierPrices[i],
            totalCapacity: 500,
            availableQty: 500,
            maxPerPerson: 10,
            features: JSON.stringify(
              tierNames[i] === 'Premium'
                ? ['Front row seating', 'VIP lounge access', 'Meet & greet']
                : tierNames[i] === 'VIP'
                ? ['Priority entry', 'VIP lounge access']
                : ['General entry']
            ),
          },
        });
        console.log(`✅ Ticket tier created: ${tierNames[i]}`);
      }
    }

    // Create test order and tickets for the test user
    const testUser = await prisma.user.findUnique({
      where: { email: 'user@banglafest.com' },
    });

    if (testUser) {
      const gaaTier = await prisma.ticketTier.findFirst({
        where: {
          eventId: testEvent.id,
          name: 'General Admission',
        },
      });

      if (gaaTier) {
        const existingOrder = await prisma.order.findFirst({
          where: {
            userId: testUser.id,
            tierId: gaaTier.id,
          },
        });

        if (!existingOrder) {
          const order = await prisma.order.create({
            data: {
              userId: testUser.id,
              tierId: gaaTier.id,
              quantity: 2,
              totalAmount: 50,
              status: 'PAID',
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
          });

          // Create the test ticket with your specific UUID
          const testTicket = await prisma.ticket.create({
            data: {
              id: '6B9F0DAF-8396-4981-9EFD-470A01693455',
              orderId: order.id,
              ticketTierId: gaaTier.id,
              userId: testUser.id,
              status: 'VALID',
            },
          });

          console.log(`\n✅ Test ticket created successfully!`);
          console.log(`   Ticket UUID: ${testTicket.id}`);
          console.log(`   Holder: Test User (user@banglafest.com)`);
          console.log(`   Tier: General Admission`);
          console.log(`   Event: ${eventTitle}`);
          console.log(`   Status: VALID`);
        } else {
          console.log(`✅ Test order already exists for test user`);
        }
      }
    }

    console.log('\n🎉 Database seeding completed!');
    console.log('\n📝 Login Credentials Summary:');
    console.log('───────────────────────────────────');
    console.log(`Admin   | ${adminEmail} / ${adminPassword}`);
    console.log(`Scanner | ${scannerEmail} / ${scannerPassword}`);
    console.log(`User    | ${userEmail} / ${userPassword}`);
    console.log('───────────────────────────────────');
    console.log('\n🎫 Test Ticket for Scanner:');
    console.log('───────────────────────────────────');
    console.log(`UUID: 6B9F0DAF-8396-4981-9EFD-470A01693455`);
    console.log('───────────────────────────────────');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
