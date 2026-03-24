import prisma from "@/lib/prisma";
import { sendEmail } from "./resend";
import * as templates from "./templates";

type NotificationType = "new_subscriber" | "new_comment" | "new_chat";

interface NotificationContext {
  type: NotificationType;
  recipientUserId: string;
  data: Record<string, string>;
}

export async function sendNotificationEmail(ctx: NotificationContext): Promise<void> {
  // 1. Fetch user + their settings
  const user = await prisma.user.findUnique({
    where: { id: ctx.recipientUserId },
    include: { settings: true },
  });
  if (!user || !user.email) return;

  const settings = user.settings;

  // 2. Check if user has this email type enabled
  if (ctx.type === "new_subscriber" && settings && !settings.emailOnNewSubscriber) return;
  if (ctx.type === "new_comment" && settings && !settings.emailOnComment) return;
  if (ctx.type === "new_chat" && settings && !settings.emailOnChat) return;

  // 3. Build and send the appropriate email
  let subject: string;
  let html: string;

  switch (ctx.type) {
    case "new_subscriber":
      subject = `New subscriber: ${ctx.data.subscriberName}`;
      html = templates.newSubscriberEmail(user.name || "Expert", ctx.data.subscriberName);
      break;
    case "new_comment":
      subject = `New comment on "${ctx.data.postTitle}"`;
      html = templates.newCommentEmail(
        user.name || "Expert",
        ctx.data.commenterName,
        ctx.data.postTitle,
        ctx.data.postId
      );
      break;
    case "new_chat":
      subject = `New chat message from ${ctx.data.subscriberName}`;
      html = templates.newSubscriberEmail(user.name || "Expert", ctx.data.subscriberName);
      break;
  }

  await sendEmail({ to: user.email, subject, html });
}
