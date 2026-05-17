const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearAdvisoryLock() {
  try {
    console.log('Attempting to clear advisory locks...');
    
    // Query to unlock all advisory locks
    const result = await prisma.$executeRaw`SELECT pg_advisory_unlock_all()`;
    console.log('✅ Advisory locks cleared');
    
    // Now try the migration
    console.log('\nAttempting migration...');
    const { execSync } = require('child_process');
    try {
      const output = execSync('npx prisma migrate deploy', { encoding: 'utf-8' });
      console.log('✅ Migration successful!');
      console.log(output);
    } catch (err) {
      console.log('❌ Migration still failed:');
      console.log(err.message);
    }
  } catch (err) {
    console.error('❌ Error clearing locks:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

clearAdvisoryLock();
