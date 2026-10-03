// Host bundler maps @/lib/prisma here. Shared reducer MUST use provided TransactionClient.
export const prisma=new Proxy({}, {get(){throw new Error('Ambient application Prisma forbidden in webhook host');}});
export default prisma;
