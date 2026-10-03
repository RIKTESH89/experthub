process.env.DATABASE_URL='postgresql://exp14synthetic@127.0.0.1:55438/experthub_exp14_test';
process.env.DIRECT_URL=process.env.DATABASE_URL;
process.env.AUTH_SECRET='synthetic-exp14-only';
for(const key of ['OPENAI_API_KEY','LOCAL_TEST_GROQ_API_KEY','TAVILY_API_KEY','RESEND_API_KEY','AWS_ACCESS_KEY_ID','AWS_SECRET_ACCESS_KEY','GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET'])delete process.env[key];
global.fetch=async()=>{throw new Error('External calls forbidden');};
