const Stripe = require('stripe');

exports.handler = async (event) => {
  const { session_id } = event.queryStringParameters || {};

  if (!session_id) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing session_id' }) };
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status === 'paid') {
      // Set a long-lived cookie to mark user as pro
      const expires = new Date();
      expires.setFullYear(expires.getFullYear() + 10);

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': `shopcopy_pro=${session.id}; Path=/; Expires=${expires.toUTCString()}; SameSite=Lax; Secure`,
        },
        body: JSON.stringify({ pro: true }),
      };
    } else {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pro: false }),
      };
    }
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
