exports.handler = async (event) => {
  const action = event.queryStringParameters?.action || 'increment';
  const cookies = event.headers.cookie || '';
  const isPro = cookies.includes('shopcopy_pro=');

  if (isPro) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ allowed: true, pro: true, remaining: 999 }),
    };
  }

  const ip = event.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  const today = new Date().toISOString().split('T')[0];
  const key = `usage_${ip.replace(/[^a-zA-Z0-9]/g, '_')}_${today}`;
  const DAILY_LIMIT = 3;

  try {
    const { getStore } = require('@netlify/blobs');
    const store = getStore('shopcopy-usage');

    let count = 0;
    try {
      const existing = await store.get(key);
      if (existing) count = parseInt(existing) || 0;
    } catch (e) {
      count = 0;
    }

    if (action === 'check') {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowed: count < DAILY_LIMIT, pro: false, remaining: Math.max(0, DAILY_LIMIT - count) }),
      };
    }

    if (count >= DAILY_LIMIT) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowed: false, pro: false, remaining: 0 }),
      };
    }

    await store.set(key, String(count + 1));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ allowed: true, pro: false, remaining: DAILY_LIMIT - count - 1 }),
    };
  } catch (err) {
    console.error('Usage error:', err);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ allowed: true, pro: false, remaining: 2 }),
    };
  }
};
