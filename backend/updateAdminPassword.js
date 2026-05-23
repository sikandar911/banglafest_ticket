const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function updateAdminPassword() {
  try {
    console.log('🔄 Updating admin password...\n');

    const adminEmail = 'admin@banglafest.com';
    const newPassword = 'Ambrosian2026ticket';

    // Find existing admin
    const admin = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (!admin) {
      console.log(`❌ Admin user not found: ${adminEmail}`);
      process.exit(1);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update admin password
    const updated = await prisma.user.update({
      where: { email: adminEmail },
      data: {
        passwordHash: hashedPassword,
      },
    });

    console.log(`✅ Admin password updated successfully!`);
    console.log(`   Email: ${updated.email}`);
    console.log(`   Updated at: ${updated.createdAt}`);
    console.log(`   New password: ${newPassword}`);

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating admin password:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

updateAdminPassword();
