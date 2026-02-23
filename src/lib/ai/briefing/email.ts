import { Resend } from "resend";
import type { AiMaturity } from "@/lib/ai/memory/maturity";

// -------------------------------------------------------
// HTML Email Template for Weekly Briefing
// -------------------------------------------------------

export function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error("RESEND_API_KEY is not set");
  }
  return new Resend(key);
}

export function getFromEmail(): string {
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!fromEmail) {
    throw new Error("RESEND_FROM_EMAIL is not set");
  }
  return fromEmail;
}

const ALLOWED_URL_PROTOCOLS = new Set(["https:", "http:"]);

/**
 * Validate and sanitize a dashboard URL to prevent dangerous schemes (e.g., javascript:).
 * Returns the HTML-escaped URL if valid, or '#' as a safe fallback.
 */
export function sanitizeDashboardUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (!ALLOWED_URL_PROTOCOLS.has(parsed.protocol)) {
      return "#";
    }
    return escapeHtml(parsed.href);
  } catch {
    return "#";
  }
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Format currency with defensive handling for NaN/Infinity and proper negative formatting.
 * Returns "₹0.00" for non-finite numbers, "-₹X.XX" for negatives.
 */
export function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) return "₹0.00";
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  return `${sign}₹${abs.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format integer with defensive handling for NaN/Infinity.
 * Returns "0" for non-finite numbers.
 */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return String(Math.round(value));
}

export interface BriefingEmailInput {
  email: string;
  name: string;
  narrative: string;
  revenue: number;
  revenueChangePercent: number;
  orders: number;
  aov: number;
  topProducts: Array<{ title: string; revenue: number; unitsSold: number }>;
  lowStockProducts: Array<{ title: string; inventory: number | null }>;
  maturity: AiMaturity;
  dashboardUrl: string;
  weekLabel: string;
}

// Basic email format validation — catches obviously invalid addresses before calling Resend
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function sendWeeklyBriefingEmail(
  input: BriefingEmailInput
): Promise<void> {
  if (!input.email || !EMAIL_REGEX.test(input.email)) {
    throw new Error(
      `sendWeeklyBriefingEmail: invalid email format "${input.email ? input.email.slice(0, 4) + "***" : "(empty)"}"`
    );
  }

  const resend = getResend();
  const safeName = escapeHtml(input.name);

  // Strip control characters from weekLabel to prevent email header injection
  const safeWeekLabel = input.weekLabel.replace(/[\r\n\t\x00-\x1f\x7f]/g, "");

  // Convert markdown bold → HTML strong, then split into sentences for structured display
  const { markdownBoldToHtml } = await import("./daily-email");
  const narrativeHtml = markdownBoldToHtml(escapeHtml(input.narrative));
  const sentences = narrativeHtml
    .split(/(?<=\.)\s+(?=[A-Z<])/)
    .filter((s) => s.trim().length > 0);

  // Normalize revenue change percent to handle NaN/Infinity
  const safeRevenueChangePercent = Number.isFinite(input.revenueChangePercent)
    ? input.revenueChangePercent
    : 0;

  const changeArrow = safeRevenueChangePercent >= 0 ? "&#9650;" : "&#9660;";
  const changeColor = safeRevenueChangePercent >= 0 ? "#a7f3d0" : "#fecaca";
  const changeLabel = `${changeArrow} ${Math.abs(safeRevenueChangePercent).toFixed(1)}%`;

  // Top products with numbered circles
  const topProductsHtml =
    input.topProducts.length > 0
      ? `<table role="presentation" style="width: 100%; border-collapse: collapse;" cellpadding="0" cellspacing="0">
          ${input.topProducts
            .map(
              (p, i) =>
                `<tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; vertical-align: middle; width: 24px;">
                    <span style="display: inline-block; width: 22px; height: 22px; background: #f3f4f6; border-radius: 50%; text-align: center; line-height: 22px; font-size: 12px; font-weight: 600; color: #6b7280;">${i + 1}</span>
                  </td>
                  <td style="padding: 8px 8px; border-bottom: 1px solid #f3f4f6; vertical-align: middle;">
                    <span style="color: #111827; font-size: 13px; font-weight: 500;">${escapeHtml(p.title)}</span>
                  </td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; vertical-align: middle; text-align: right;">
                    <span style="color: #111827; font-size: 13px; font-weight: 600;">${formatCurrency(p.revenue)}</span><br>
                    <span style="color: #9ca3af; font-size: 11px;">${formatNumber(p.unitsSold)} units</span>
                  </td>
                </tr>`
            )
            .join("")}
        </table>`
      : `<p style="margin: 8px 0; color: #9ca3af; font-size: 13px;">No product sales this week.</p>`;

  // Low stock warning with styled alert
  const stockAlertHtml =
    input.lowStockProducts.length > 0
      ? `
        <div style="background: #fffbeb; border: 1px solid #fbbf24; border-radius: 12px; padding: 16px 20px; margin-bottom: 20px;">
          <p style="margin: 0 0 10px; font-weight: 600; color: #92400e; font-size: 14px;">&#9888;&#65039; Low Stock Alert</p>
          <table role="presentation" style="width: 100%; border-collapse: collapse;" cellpadding="0" cellspacing="0">
            ${input.lowStockProducts
              .map(
                (p) =>
                  `<tr>
                    <td style="padding: 4px 0; vertical-align: middle;">
                      <span style="color: #78350f; font-size: 13px;">${escapeHtml(p.title)}</span>
                    </td>
                    <td style="padding: 4px 0; vertical-align: middle; text-align: right;">
                      <span style="color: ${(p.inventory ?? 0) === 0 ? "#dc2626" : "#92400e"}; font-size: 13px; font-weight: 600;">${formatNumber(p.inventory ?? 0)} units</span>
                    </td>
                  </tr>`
              )
              .join("")}
          </table>
        </div>`
      : "";

  // Build narrative section — each sentence gets its own styled paragraph
  const narrativeSectionHtml = sentences
    .map(
      (sentence, i) =>
        `<p style="margin: ${i === 0 ? "0" : "10px 0 0 0"}; color: #374151; font-size: 14px; line-height: 1.65;">${sentence}</p>`
    )
    .join("");

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background: #f0f2f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 560px; margin: 0 auto; padding: 32px 16px;">

    <!-- Header -->
    <div style="text-align: center; margin-bottom: 24px;">
      <p style="margin: 0; font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 1.5px;">Weekly Briefing</p>
      <h1 style="color: #111827; font-size: 22px; margin: 6px 0 0; font-weight: 700;">${escapeHtml(safeWeekLabel)}</h1>
    </div>

    <!-- Revenue Card -->
    <div style="background: linear-gradient(135deg, #059669, #0d9488); border-radius: 14px; padding: 28px 24px; color: #fff; margin-bottom: 20px;">
      <p style="margin: 0 0 6px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.8px; opacity: 0.75;">Weekly Revenue</p>
      <p style="margin: 0; font-size: 36px; font-weight: 800; letter-spacing: -0.5px;">${formatCurrency(input.revenue)}</p>
      <p style="margin: 10px 0 0; font-size: 14px;">
        <span style="color: ${changeColor}; font-weight: 600;">${changeLabel}</span>
        <span style="opacity: 0.75;"> vs previous week</span>
      </p>
      <table role="presentation" style="margin-top: 18px; border-collapse: collapse;" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding-right: 28px; vertical-align: top;">
            <p style="margin: 0; font-size: 11px; opacity: 0.65; text-transform: uppercase; letter-spacing: 0.5px;">Orders</p>
            <p style="margin: 3px 0 0; font-size: 20px; font-weight: 700;">${formatNumber(input.orders)}</p>
          </td>
          <td style="vertical-align: top;">
            <p style="margin: 0; font-size: 11px; opacity: 0.65; text-transform: uppercase; letter-spacing: 0.5px;">Avg Order</p>
            <p style="margin: 3px 0 0; font-size: 20px; font-weight: 700;">${formatCurrency(input.aov)}</p>
          </td>
        </tr>
      </table>
    </div>

    <!-- Frax's Weekly Analysis -->
    <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 22px 20px; margin-bottom: 20px;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;" cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align: middle; width: 36px;">
            <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #8b5cf6, #6d28d9); border-radius: 8px; text-align: center; line-height: 32px; font-size: 16px;">&#9889;</div>
          </td>
          <td style="vertical-align: middle; padding-left: 10px;">
            <h2 style="color: #111827; font-size: 15px; margin: 0; font-weight: 700;">Frax's Weekly Analysis</h2>
          </td>
        </tr>
      </table>
      <div style="margin-top: 14px; padding: 14px 16px; background: #f9fafb; border-radius: 10px; border-left: 3px solid #8b5cf6;">
        ${narrativeSectionHtml}
      </div>
    </div>

    <!-- Top Products -->
    <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 18px 20px; margin-bottom: 20px;">
      <h2 style="color: #111827; font-size: 14px; margin: 0 0 12px; font-weight: 700;">&#128293; Top Products</h2>
      ${topProductsHtml}
    </div>

    ${stockAlertHtml}

    <!-- Footer -->
    <p style="text-align: center; color: #9ca3af; font-size: 11px; margin-top: 32px; line-height: 1.5;">
      Hello ${safeName} &#128202;<br>
      Your weekly briefing from <strong>Frame</strong>, powered by <strong>Frax</strong>.
    </p>
  </div>
</body>
</html>`;

  const { error } = await resend.emails.send({
    from: getFromEmail(),
    to: input.email,
    subject: `${safeWeekLabel} — Weekly Report Ready`,
    html,
  });

  if (error) {
    throw new Error(
      `sendWeeklyBriefingEmail: Resend API error — ${error.name}: ${error.message}`
    );
  }
}
