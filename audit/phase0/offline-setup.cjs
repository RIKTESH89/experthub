// Local checks must never reach a real model/service or production database.
process.env.DATABASE_URL = 'postgresql://synthetic:synthetic@127.0.0.1:1/phase0';
process.env.DIRECT_URL = process.env.DATABASE_URL;
for (const key of ['OPENAI_API_KEY', 'TAVILY_API_KEY', 'RESEND_API_KEY', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET']) delete process.env[key];
global.fetch = async () => { throw new Error('External fetch blocked by Phase 0 offline test setup'); };
