import { Resend } from "resend";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error("RESEND_API_KEY is not set");
  }
  return new Resend(key);
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      // Return the serialized href which is properly encoded
      // Additionally encode problematic HTML characters that could cause issues in href attributes
      return parsed.href
        .replace(/"/g, "%22")
        .replace(/'/g, "%27")
        .replace(/</g, "%3C")
        .replace(/>/g, "%3E");
    }
    return "#";
  } catch {
    return "#";
  }
}

export async function sendSalesWelcomeEmail({
  name,
  email,
  resetUrl,
  dashboardUrl,
  expiryHours = 24,
}: {
  name: string;
  email: string;
  resetUrl: string;
  dashboardUrl: string;
  expiryHours?: number;
}) {
  const resend = getResend();
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeDashboardUrl = sanitizeUrl(dashboardUrl);
  const safeResetUrl = sanitizeUrl(resetUrl);
  const expiryLabel = expiryHours === 1 ? "1 hour" : `${expiryHours} hours`;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Welcome to Frame Sales Team",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px;">
        <h2 style="color: #111827; margin-bottom: 16px;">Hello ${safeName},</h2>
        <p style="color: #4b5563; line-height: 1.6;">
          You've been added to the <strong>Frame</strong> sales team. Please set up your password to access your sales dashboard.
        </p>
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 24px 0;">
          <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">Email</p>
          <p style="margin: 0; color: #111827; font-weight: 500;">${safeEmail}</p>
        </div>
        <a href="${safeResetUrl}" style="display: inline-block; background: #2563eb; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; font-size: 14px; margin-bottom: 16px;">
          Set Your Password
        </a>
        <p style="color: #4b5563; font-size: 14px; margin-top: 16px;">
          Once you've set your password, you can access your dashboard:
        </p>
        <a href="${safeDashboardUrl}" style="display: inline-block; background: #059669; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; font-size: 14px;">
          Access Sales Dashboard
        </a>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 32px;">
          This password reset link expires in ${expiryLabel}. If you didn't expect this email, you can ignore it.
        </p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail({
  email,
  name,
  resetUrl,
}: {
  email: string;
  name: string;
  resetUrl: string;
}) {
  const resend = getResend();
  const safeName = escapeHtml(name);
  const safeResetUrl = sanitizeUrl(resetUrl);

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Reset Your Frame Password",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px;">
        <h2 style="color: #111827; margin-bottom: 16px;">Hello ${safeName},</h2>
        <p style="color: #4b5563; line-height: 1.6;">
          We received a request to reset your password for your <strong>Frame</strong> account.
        </p>
        <a href="${safeResetUrl}" style="display: inline-block; background: #2563eb; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; font-size: 14px; margin: 24px 0;">
          Reset Password
        </a>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 32px;">
          This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}
