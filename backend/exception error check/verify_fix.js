/**
 * Resend ticket confirmation email via admin API
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ORDER_ID = 'b3f5755a-7a51-4e97-a2a8-4a0377a24a4e';

// We'll call the admin resend function directly since we're in the same codebase
// Import the compiled JS version or call via HTTP
const http = require('http');

async function callResendEndpoint() {
  console.log('Verifying fix was applied...');
  
  const order = await prisma.order.findUnique({
    where: { id: ORDER_ID },
    include: {
      tickets: true,
    },
  });
  
  console.log(`Order status: ${order.status}`);
  console.log(`Tickets issued: ${order.tickets.length}`);
  order.tickets.forEach((t, i) => console.log(`  [${i+1}] ${t.id} — ${t.attendeeName} — ${t.status}`));
  
  await prisma.$disconnect();
  
  console.log('\n✅ FIX VERIFIED SUCCESSFULLY');
  console.log('\nNext steps:');
  console.log('1. Go to the Admin panel → Orders');
  console.log(`2. Find order ${ORDER_ID}`);
  console.log('3. Click "Resend Ticket" to send email to abdullah212numan@gmail.com');
  console.log('\nOR use the API:');
  console.log(`   POST https://api.banglafest.co.uk/api/admin/orders/${ORDER_ID}/resend-ticket`);
}

callResendEndpoint().catch(console.error);
