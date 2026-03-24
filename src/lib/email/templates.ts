export function passwordResetEmail(resetUrl: string, userName: string): string {
  return baseTemplate(`
    <h1 style="font-size: 24px; font-weight: 600; color: #111827; margin: 0 0 8px;">Reset Your Password</h1>
    <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
      Hi ${userName}, we received a request to reset your password. Click the button below to choose a new one.
    </p>
    ${button("Reset Password", resetUrl)}
    <p style="color: #9ca3af; font-size: 13px; line-height: 1.5; margin: 24px 0 0;">
      This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
    </p>
  `);
}

export function passwordChangedEmail(userName: string): string {
  return baseTemplate(`
    <h1 style="font-size: 24px; font-weight: 600; color: #111827; margin: 0 0 8px;">Password Changed</h1>
    <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
      Hi ${userName}, your password has been successfully changed.
    </p>
    <p style="color: #9ca3af; font-size: 13px; line-height: 1.5; margin: 0;">
      If you did not make this change, please contact support immediately.
    </p>
  `);
}

export function welcomeEmail(userName: string, role: string): string {
  const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/${role.toLowerCase()}`;
  const tip = role === "EXPERT"
    ? "Start by setting up your Digital Twin and uploading your knowledge base."
    : "Explore our expert marketplace and find experts to learn from.";
  return baseTemplate(`
    <h1 style="font-size: 24px; font-weight: 600; color: #111827; margin: 0 0 8px;">Welcome to ExpertHub!</h1>
    <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 8px;">
      Hi ${userName}, thanks for joining ExpertHub as a <strong>${role.toLowerCase()}</strong>.
    </p>
    <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">${tip}</p>
    ${button("Go to Dashboard", dashboardUrl)}
  `);
}

export function newSubscriberEmail(expertName: string, subscriberName: string): string {
  const url = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/expert/subscribers`;
  return baseTemplate(`
    <h1 style="font-size: 24px; font-weight: 600; color: #111827; margin: 0 0 8px;">New Subscriber!</h1>
    <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
      Hi ${expertName}, <strong>${subscriberName}</strong> just subscribed to your Digital Twin.
    </p>
    ${button("View Subscribers", url)}
  `);
}

export function newCommentEmail(expertName: string, commenterName: string, postTitle: string, postId: string): string {
  const url = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/expert/posts/${postId}`;
  return baseTemplate(`
    <h1 style="font-size: 24px; font-weight: 600; color: #111827; margin: 0 0 8px;">New Comment</h1>
    <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
      Hi ${expertName}, <strong>${commenterName}</strong> commented on your post &ldquo;${postTitle}&rdquo;.
    </p>
    ${button("View Post", url)}
  `);
}

export function digestEmail(userName: string, stats: { newSubscribers: number; newComments: number; twinChats: number; period: string }): string {
  const url = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/expert`;
  return baseTemplate(`
    <h1 style="font-size: 24px; font-weight: 600; color: #111827; margin: 0 0 8px;">Your ${stats.period} Digest</h1>
    <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">Hi ${userName}, here's what happened:</p>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
      <tr>
        <td style="padding: 12px; text-align: center; background: #f5f3ff; border-radius: 8px 0 0 8px;">
          <div style="font-size: 28px; font-weight: 700; color: #4f46e5;">${stats.newSubscribers}</div>
          <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">New Subscribers</div>
        </td>
        <td style="padding: 12px; text-align: center; background: #f5f3ff;">
          <div style="font-size: 28px; font-weight: 700; color: #4f46e5;">${stats.newComments}</div>
          <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Comments</div>
        </td>
        <td style="padding: 12px; text-align: center; background: #f5f3ff; border-radius: 0 8px 8px 0;">
          <div style="font-size: 28px; font-weight: 700; color: #4f46e5;">${stats.twinChats}</div>
          <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Twin Chats</div>
        </td>
      </tr>
    </table>
    ${button("View Dashboard", url)}
  `);
}

// ---- Shared helpers ----

function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb; padding: 40px 20px;">
  <div style="max-width: 480px; margin: 0 auto;">
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="font-size: 20px; font-weight: 700; color: #111827;">ExpertHub</span>
    </div>
    <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      ${content}
    </div>
    <p style="text-align: center; color: #9ca3af; font-size: 11px; margin-top: 24px;">
      &copy; ${new Date().getFullYear()} ExpertHub. All rights reserved.<br>
      <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/subscriber/settings" style="color: #9ca3af;">Manage email preferences</a>
    </p>
  </div>
</body>
</html>`;
}

function button(text: string, url: string): string {
  return `<a href="${url}" style="display: inline-block; background-color: #4f46e5; color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 500; font-size: 15px;">${text}</a>`;
}
