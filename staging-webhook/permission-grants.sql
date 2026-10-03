-- REVIEW SPEC ONLY. Not a migration; never run without separate hosted approval.
-- Roles must already exist and pass permission-audit.sql. No CREATE ROLE / PUBLIC revokes.
-- psql identifiers: -v receiver_role=staging_webhook_receiver -v worker_role=staging_webhook_worker -v database_name=neondb
GRANT CONNECT ON DATABASE :"database_name" TO :"receiver_role", :"worker_role";
GRANT USAGE ON SCHEMA public TO :"receiver_role", :"worker_role";
GRANT INSERT(digest,raw_body), SELECT(digest) ON public.staging_webhook_inbox TO :"receiver_role";
GRANT SELECT(digest,raw_body,state,attempts,next_attempt,lease_token,lease_until,last_error,received_at),
 UPDATE(state,attempts,next_attempt,lease_token,lease_until,last_error)
 ON public.staging_webhook_inbox TO :"worker_role";
-- Full current scalar SELECT projection is required by Prisma findUnique/update RETURNING;
-- list explicitly so newly added columns remain inaccessible without reviewed expansion.
GRANT SELECT("billingVersion",id,"subscriberId","expertProfileId",status,"startDate","endDate",price,tier,"razorpaySubscriptionId","razorpayPaymentId","paidPeriodStart","renewalCancelledAt","lastPaymentEventAt","lastPaymentEventRank","currentPeriodEnd","createdAt","updatedAt"),
 UPDATE(status,"endDate","razorpayPaymentId","paidPeriodStart","renewalCancelledAt","lastPaymentEventAt","lastPaymentEventRank","currentPeriodEnd","updatedAt","billingVersion")
 ON public."ExpertSubscription" TO :"worker_role";
GRANT SELECT(id,"userId","displayName",specialty,"socialLinks","monthlyPrice","isVerified","totalSubscribers","vectorNamespace","ragEnabled","twinPersonality","twinGreeting","twinOpinions","twinFramework","twinBoundaries","freeTrialQuestions","createdAt","updatedAt","personalityProfile"),
 UPDATE("totalSubscribers","updatedAt") ON public."ExpertProfile" TO :"worker_role";
GRANT SELECT(id,name) ON public."User" TO :"worker_role";
GRANT SELECT(id,"providerSubscriptionId","paymentId","periodStart","periodEnd","payloadHash","eventType","occurredAt",outcome,"createdAt"),
 INSERT(id,"providerSubscriptionId","paymentId","periodStart","periodEnd","payloadHash","eventType","occurredAt",outcome,"createdAt")
 ON public."PaymentEvent" TO :"worker_role";
GRANT SELECT(id,"userId",title,message,link,"isRead","createdAt"),
 INSERT(id,"userId",title,message,link,"isRead","createdAt") ON public."Notification" TO :"worker_role";
GRANT INSERT(id,payload), SELECT(id) ON public."BillingOutbox" TO :"worker_role";
