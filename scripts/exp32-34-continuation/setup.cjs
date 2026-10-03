process.env.DATABASE_URL='postgresql://billing_continuation@127.0.0.1:55439/billing_continuation';
process.env.DIRECT_URL=process.env.DATABASE_URL;
for(const key of ['OPENAI_API_KEY','RESEND_API_KEY','RAZORPAY_KEY_ID','RAZORPAY_KEY_SECRET','AWS_ACCESS_KEY_ID','AWS_SECRET_ACCESS_KEY'])delete process.env[key];
global.fetch=async()=>{throw new Error('External calls blocked');};

for(const key of ["BILLING_WORKER_ENABLED","BILLING_EMAIL_DELIVERY_ENABLED","BILLING_PROVIDER_LOOKUP_ENABLED","BILLING_REVIEW_ENABLED","BILLING_WORKER_SECRET","BILLING_REVIEW_SECRET"])delete process.env[key];
