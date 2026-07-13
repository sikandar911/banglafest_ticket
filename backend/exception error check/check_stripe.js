require('dotenv').config();
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' });

async function checkStripe() {
  const piId = 'pi_3TsO6c2Moz7hPtBR1HDbI9NB';
  
  console.log('=== STRIPE PAYMENT INTENT STATUS ===');
  try {
    const pi = await stripe.paymentIntents.retrieve(piId);
    console.log(JSON.stringify({
      id: pi.id,
      status: pi.status,
      amount: pi.amount,
      currency: pi.currency,
      created: new Date(pi.created * 1000).toISOString(),
      metadata: pi.metadata,
      last_payment_error: pi.last_payment_error,
      charges: pi.charges?.data?.map(c => ({
        id: c.id,
        status: c.status,
        amount: c.amount,
        paid: c.paid,
        created: new Date(c.created * 1000).toISOString(),
      })),
    }, null, 2));

    console.log('\n=== STRIPE WEBHOOK SECRET ===');
    console.log('Webhook secret configured:', process.env.STRIPE_WEBHOOK_SECRET);
    console.log('Is placeholder:', process.env.STRIPE_WEBHOOK_SECRET === 'whsec_your_webhook_signing_secret_here');
  } catch (e) {
    console.error('Stripe error:', e.message);
  }
}

checkStripe();
