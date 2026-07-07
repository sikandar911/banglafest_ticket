const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Load .env variables
require('dotenv').config();

const prisma = new PrismaClient();

async function run() {
  const mode = process.argv[2];

  if (!mode || (mode !== 'export' && mode !== 'import')) {
    console.error('❌ Invalid or missing mode. Usage:');
    console.error('   node copyEvent.js export [eventId] [outputFile]');
    console.error('   node copyEvent.js import <inputFile>');
    process.exit(1);
  }

  if (mode === 'export') {
    const eventId = process.argv[3] || '67efaed9-61b0-4be6-bf3c-27f4b6551e5c';
    const outputFile = process.argv[4] || `event-${eventId}.json`;
    await exportEvent(eventId, outputFile);
  } else if (mode === 'import') {
    const inputFile = process.argv[3];
    if (!inputFile) {
      console.error('❌ Please specify the input JSON file path to import.');
      console.error('   Usage: node copyEvent.js import <inputFile>');
      process.exit(1);
    }
    await importEvent(inputFile);
  }
}

async function exportEvent(eventId, outputFile) {
  try {
    console.log(`🌐 Connecting to database to export event: ${eventId}...`);
    
    // Fetch Event along with Tiers and Promo Codes relation
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        ticketTiers: true,
        promoCodes: {
          include: {
            promoCode: true
          }
        }
      }
    });

    if (!event) {
      console.error(`❌ Event with ID ${eventId} not found in the database.`);
      process.exit(1);
    }

    console.log(`✅ Found event: "${event.title}"`);

    // Fetch creator user if exists
    let creator = null;
    if (event.createdBy) {
      console.log(`👤 Fetching creator user with ID: ${event.createdBy}...`);
      creator = await prisma.user.findUnique({
        where: { id: event.createdBy }
      });
      if (creator) {
        console.log(`✅ Found creator: ${creator.name} (${creator.email})`);
      } else {
        console.log(`⚠️ Creator user reference exists but user record was not found.`);
      }
    }

    // Extract promo code definitions separately for clean JSON structuring
    const promoCodesList = event.promoCodes.map(pcRelation => pcRelation.promoCode);
    const promoCodeEventLinks = event.promoCodes.map(pcRelation => ({
      promoCodeId: pcRelation.promoCodeId,
      eventId: pcRelation.eventId
    }));

    // Build the payload
    const payload = {
      exportedAt: new Date().toISOString(),
      databaseUrl: process.env.DATABASE_URL ? process.env.DATABASE_URL.split('@')[1] || 'hidden' : 'not-found',
      creator,
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        startTime: event.startTime,
        endTime: event.endTime,
        location: event.location,
        createdBy: event.createdBy,
        createdAt: event.createdAt,
        imageUrl: event.imageUrl,
        performers: event.performers,
        specialAdditions: event.specialAdditions
      },
      ticketTiers: event.ticketTiers.map(tier => ({
        id: tier.id,
        name: tier.name,
        price: tier.price.toString(), // Prisma Decimal is serialized to string
        totalCapacity: tier.totalCapacity,
        availableQty: tier.availableQty,
        description: tier.description,
        features: tier.features,
        maxPerPerson: tier.maxPerPerson,
        promoDiscountAmount: tier.promoDiscountAmount ? tier.promoDiscountAmount.toString() : null
      })),
      promoCodes: promoCodesList.map(pc => ({
        id: pc.id,
        code: pc.code,
        influencerName: pc.influencerName,
        socialMedia: pc.socialMedia,
        discountAmount: pc.discountAmount ? pc.discountAmount.toString() : null,
        isActive: pc.isActive,
        usageCount: pc.usageCount,
        startDate: pc.startDate,
        endDate: pc.endDate,
        createdAt: pc.createdAt
      })),
      promoCodeEventLinks
    };

    const filePath = path.resolve(outputFile);
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
    console.log(`\n🎉 Event successfully exported to: ${filePath}`);
    console.log(`   Includes: 1 Event, ${payload.ticketTiers.length} Ticket Tiers, ${payload.promoCodes.length} Promo Codes.`);
  } catch (error) {
    console.error('❌ Export failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function importEvent(inputFile) {
  try {
    const filePath = path.resolve(inputFile);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Input file not found: ${filePath}`);
      process.exit(1);
    }

    console.log(`📄 Reading event data from ${filePath}...`);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    const { event, ticketTiers, promoCodes, promoCodeEventLinks, creator } = data;

    if (!event || !event.id || !event.title) {
      console.error('❌ Invalid event data in JSON file.');
      process.exit(1);
    }

    console.log(`🔮 Preparing to import event: "${event.title}" (${event.id})...`);
    console.log(`🌐 Target Database URL: ${process.env.DATABASE_URL ? process.env.DATABASE_URL.split('@')[1] || 'hidden' : 'not-found'}`);

    // Map to keep track of promo code IDs if they need mapping due to collision
    const promoCodeIdMap = {};

    await prisma.$transaction(async (tx) => {
      // 1. Check and resolve creator user
      let resolvedCreatedBy = null;
      if (creator) {
        console.log(`👤 Resolving event creator: ${creator.name} (${creator.email})...`);
        
        // Try finding creator by email
        let targetUser = await tx.user.findUnique({
          where: { email: creator.email }
        });

        if (targetUser) {
          console.log(`   Found matching user in target DB: ID = ${targetUser.id}`);
          resolvedCreatedBy = targetUser.id;
        } else {
          // Check if ID is available to use
          const userById = await tx.user.findUnique({
            where: { id: creator.id }
          });

          if (userById) {
            console.log(`   Found matching user by ID in target DB (different email?): ID = ${userById.id}`);
            resolvedCreatedBy = userById.id;
          } else {
            // Create user
            console.log(`   User not found. Creating user in target DB...`);
            const createdUser = await tx.user.create({
              data: {
                id: creator.id,
                name: creator.name,
                email: creator.email,
                passwordHash: creator.passwordHash,
                isVerified: creator.isVerified,
                role: creator.role,
                createdAt: creator.createdAt ? new Date(creator.createdAt) : undefined
              }
            });
            console.log(`   Created user: ID = ${createdUser.id}`);
            resolvedCreatedBy = createdUser.id;
          }
        }
      }

      // Update event's creator ID
      event.createdBy = resolvedCreatedBy;

      // 2. Check if event already exists
      const existingEvent = await tx.event.findUnique({
        where: { id: event.id }
      });

      if (existingEvent) {
        console.log(`⚠️ Event with ID ${event.id} already exists in target DB.`);
        console.log(`   Attempting to delete existing event and its dependencies (cascades)...`);
        
        try {
          await tx.event.delete({
            where: { id: event.id }
          });
          console.log(`   Deleted existing event successfully.`);
        } catch (delError) {
          console.warn(`   ⚠️ Warning: Direct deletion failed (might have related orders/tickets).`);
          console.warn(`   Error message: ${delError.message}`);
          console.warn(`   Will try to merge/overwrite. If this fails, delete manual transaction data first.`);
        }
      }

      // 3. Resolve and create PromoCodes
      if (promoCodes && promoCodes.length > 0) {
        console.log(`🎟️ Resolving promo codes...`);
        for (const pc of promoCodes) {
          // Check if promo code exists by code
          let targetPromo = await tx.promoCode.findUnique({
            where: { code: pc.code }
          });

          if (targetPromo) {
            console.log(`   Promo code "${pc.code}" already exists in target DB. Mapping ID ${pc.id} -> ${targetPromo.id}`);
            promoCodeIdMap[pc.id] = targetPromo.id;
          } else {
            // Create promo code
            const createdPromo = await tx.promoCode.create({
              data: {
                id: pc.id,
                code: pc.code,
                influencerName: pc.influencerName,
                socialMedia: pc.socialMedia,
                discountAmount: pc.discountAmount,
                isActive: pc.isActive,
                usageCount: pc.usageCount,
                startDate: pc.startDate ? new Date(pc.startDate) : null,
                endDate: pc.endDate ? new Date(pc.endDate) : null,
                createdAt: pc.createdAt ? new Date(pc.createdAt) : undefined
              }
            });
            console.log(`   Created promo code: "${pc.code}"`);
            promoCodeIdMap[pc.id] = createdPromo.id;
          }
        }
      }

      // 4. Create Event
      console.log(`📅 Recreating event...`);
      // Double check if it wasn't deleted or needs upsert
      const eventRecord = await tx.event.upsert({
        where: { id: event.id },
        update: {
          title: event.title,
          description: event.description,
          startTime: new Date(event.startTime),
          endTime: new Date(event.endTime),
          location: event.location,
          createdBy: event.createdBy,
          imageUrl: event.imageUrl,
          performers: event.performers,
          specialAdditions: event.specialAdditions
        },
        create: {
          id: event.id,
          title: event.title,
          description: event.description,
          startTime: new Date(event.startTime),
          endTime: new Date(event.endTime),
          location: event.location,
          createdBy: event.createdBy,
          createdAt: event.createdAt ? new Date(event.createdAt) : undefined,
          imageUrl: event.imageUrl,
          performers: event.performers,
          specialAdditions: event.specialAdditions
        }
      });
      console.log(`   Event created/updated: "${eventRecord.title}"`);

      // 5. Recreate TicketTiers
      if (ticketTiers && ticketTiers.length > 0) {
        console.log(`🎫 Creating ticket tiers...`);
        for (const tier of ticketTiers) {
          await tx.ticketTier.upsert({
            where: { id: tier.id },
            update: {
              name: tier.name,
              price: tier.price,
              totalCapacity: tier.totalCapacity,
              availableQty: tier.availableQty,
              description: tier.description,
              features: tier.features,
              maxPerPerson: tier.maxPerPerson,
              promoDiscountAmount: tier.promoDiscountAmount
            },
            create: {
              id: tier.id,
              eventId: event.id,
              name: tier.name,
              price: tier.price,
              totalCapacity: tier.totalCapacity,
              availableQty: tier.availableQty,
              description: tier.description,
              features: tier.features,
              maxPerPerson: tier.maxPerPerson,
              promoDiscountAmount: tier.promoDiscountAmount
            }
          });
          console.log(`   Ticket tier: "${tier.name}" - £${tier.price}`);
        }
      }

      // 6. Recreate PromoCodeEvent link table
      if (promoCodeEventLinks && promoCodeEventLinks.length > 0) {
        console.log(`🔗 Creating promo code to event relationships...`);
        for (const link of promoCodeEventLinks) {
          const targetPromoId = promoCodeIdMap[link.promoCodeId] || link.promoCodeId;
          
          // Verify relationship doesn't already exist
          const existingLink = await tx.promoCodeEvent.findUnique({
            where: {
              promoCodeId_eventId: {
                promoCodeId: targetPromoId,
                eventId: event.id
              }
            }
          });

          if (!existingLink) {
            await tx.promoCodeEvent.create({
              data: {
                promoCodeId: targetPromoId,
                eventId: event.id
              }
            });
            console.log(`   Linked promo code ID ${targetPromoId} with event ID ${event.id}`);
          } else {
            console.log(`   Relationship between promo code ID ${targetPromoId} and event ID ${event.id} already exists`);
          }
        }
      }
    });

    console.log(`\n🎉 Success! Event "${event.title}" has been successfully imported into the target database.`);
  } catch (error) {
    console.error('\n❌ Import failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
