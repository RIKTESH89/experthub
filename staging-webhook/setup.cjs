process.env.DATABASE_URL='postgresql://webhook_local@127.0.0.1:55447/webhook_local';
process.env.DIRECT_URL=process.env.DATABASE_URL;
for(const key of ['OPENAI_API_KEY','RESEND_API_KEY','RAZORPAY_KEY_ID','RAZORPAY_KEY_SECRET','AWS_ACCESS_KEY_ID','AWS_SECRET_ACCESS_KEY'])delete process.env[key];
global.fetch=async()=>{throw new Error('External calls blocked');};
