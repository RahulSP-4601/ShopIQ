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

export async function sendTrialInviteEmail({
  name,
  email,
  trialLink,
}: {
  name: string;
  email: string;
  trialLink: string;
}) {
  const resend = getResend();
  const safeName = escapeHtml(name);
  const safeTrialLink = sanitizeUrl(trialLink);

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Free 1 Month Access — Set Up Your Frame Account",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #111827; font-size: 24px; margin: 0;">Free 1 Month Access</h1>
          <p style="color: #6b7280; font-size: 15px; margin-top: 8px;">Your free trial of Frame is ready</p>
        </div>

        <p style="color: #374151; line-height: 1.6; font-size: 15px;">
          Hi ${safeName},
        </p>
        <p style="color: #374151; line-height: 1.6; font-size: 15px;">
          You've been invited to try <strong>Frame</strong> — an AI-powered platform that brings all your marketplace analytics into one place. Enjoy <strong>1 month of free access</strong> to explore everything Frame has to offer.
        </p>

        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <p style="color: #166534; font-weight: 600; font-size: 15px; margin: 0 0 12px;">How to get started:</p>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 12px 6px 0; vertical-align: top; color: #166534; font-weight: 700; font-size: 15px;">1.</td>
              <td style="padding: 6px 0; color: #374151; font-size: 14px; line-height: 1.5;">Click the button below to open your free trial form</td>
            </tr>
            <tr>
              <td style="padding: 6px 12px 6px 0; vertical-align: top; color: #166534; font-weight: 700; font-size: 15px;">2.</td>
              <td style="padding: 6px 0; color: #374151; font-size: 14px; line-height: 1.5;">Set your password and choose 2 marketplaces to connect</td>
            </tr>
            <tr>
              <td style="padding: 6px 12px 6px 0; vertical-align: top; color: #166534; font-weight: 700; font-size: 15px;">3.</td>
              <td style="padding: 6px 0; color: #374151; font-size: 14px; line-height: 1.5;">Connect your stores and start asking questions to your AI analyst</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${safeTrialLink}" style="display: inline-block; background: linear-gradient(135deg, #14b8a6, #059669); color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 15px;">
            Set Up Your Account
          </a>
        </div>

        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 16px; margin: 20px 0;">
          <p style="margin: 0; color: #6b7280; font-size: 12px;">Or copy and paste this link into your browser:</p>
          <p style="margin: 4px 0 0; color: #2563eb; font-size: 12px; word-break: break-all;">${escapeHtml(safeTrialLink)}</p>
        </div>

        <p style="color: #9ca3af; font-size: 12px; margin-top: 28px; text-align: center;">
          This trial link is valid for 30 days. If you didn't expect this email, you can safely ignore it.
        </p>
      </div>
    `,
  });
}

export async function sendTrialAccountReadyEmail({
  name,
  email,
  dashboardUrl,
}: {
  name: string;
  email: string;
  dashboardUrl: string;
}) {
  const resend = getResend();
  const safeName = escapeHtml(name);
  const safeDashboardUrl = sanitizeUrl(dashboardUrl);

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Your Frame Account Is Ready",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #111827; font-size: 24px; margin: 0;">Welcome to Frame!</h1>
          <p style="color: #6b7280; font-size: 15px; margin-top: 8px;">Your account has been set up successfully</p>
        </div>

        <p style="color: #374151; line-height: 1.6; font-size: 15px;">
          Hi ${safeName},
        </p>
        <p style="color: #374151; line-height: 1.6; font-size: 15px;">
          Your Frame account is ready. You now have <strong>30 days of free access</strong> to connect your marketplaces and get AI-powered insights for your business.
        </p>

        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <p style="color: #1e40af; font-weight: 600; font-size: 15px; margin: 0 0 12px;">What you can do now:</p>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 12px 6px 0; vertical-align: top; color: #1e40af; font-size: 15px;">&#10003;</td>
              <td style="padding: 6px 0; color: #374151; font-size: 14px; line-height: 1.5;">Connect your Shopify, eBay, Etsy, Flipkart &amp; other stores</td>
            </tr>
            <tr>
              <td style="padding: 6px 12px 6px 0; vertical-align: top; color: #1e40af; font-size: 15px;">&#10003;</td>
              <td style="padding: 6px 0; color: #374151; font-size: 14px; line-height: 1.5;">Ask your AI analyst anything about your sales and inventory</td>
            </tr>
            <tr>
              <td style="padding: 6px 12px 6px 0; vertical-align: top; color: #1e40af; font-size: 15px;">&#10003;</td>
              <td style="padding: 6px 0; color: #374151; font-size: 14px; line-height: 1.5;">Get automated reports, alerts, and demand forecasts</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${safeDashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 15px;">
            Go to Dashboard
          </a>
        </div>

        <p style="color: #9ca3af; font-size: 12px; margin-top: 28px; text-align: center;">
          Need help? Just reply to this email and our team will assist you.
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
