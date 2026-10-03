import { isPreviewIsolated } from "@/lib/preview-isolation";
import { Resend } from "resend";

let resendClient: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

const FROM = process.env.EMAIL_FROM || "ExpertHub <onboarding@resend.dev>";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  if (isPreviewIsolated()) return false;
  const resend = getResend();
  if (!resend) {
    console.log("[Email] Delivery disabled: missing configuration");
    return false;
  }

  try {
    const result = await resend.emails.send({
      from: FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    return !result.error;
  } catch {
    console.error("[Email] Delivery failed");
    return false;
  }
}
