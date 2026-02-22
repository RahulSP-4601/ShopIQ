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
  const safeNarrative = escapeHtml(input.narrative).replace(/\n/g, "<br>");

  // Normalize revenue change percent to handle NaN/Infinity
  const safeRevenueChangePercent = Number.isFinite(input.revenueChangePercent)
    ? input.revenueChangePercent
    : 0;

  const changeArrowHtml = safeRevenueChangePercent >= 0 ? "&#9650;" : "&#9660;";
  const changeLabel = `${changeArrowHtml} ${Math.abs(safeRevenueChangePercent).toFixed(1)}%`;
  const topProductRows = input.topProducts
    .map(
      (p, i) =>
        `<tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #f3f4f6; color: #374151;">${i + 1}. ${escapeHtml(p.title)}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #f3f4f6; text-align: right; color: #374151;">${formatCurrency(p.revenue)}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #f3f4f6; text-align: right; color: #6b7280;">${formatNumber(p.unitsSold)}</td>
        </tr>`
    )
    .join("");

  const stockAlertSection =
    input.lowStockProducts.length > 0
      ? `
        <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 12px 16px; margin: 16px 0;">
          <p style="margin: 0 0 8px; font-weight: 600; color: #92400e; font-size: 14px;">Stock Alerts</p>
          ${input.lowStockProducts.map((p) => `<p style="margin: 2px 0; color: #78350f; font-size: 13px;">${escapeHtml(p.title)}: ${formatNumber(p.inventory ?? 0)} units</p>`).join("")}
        </div>`
      : "";

  const maturityBadge = `${input.maturity.stage} (${input.maturity.aiYears} AI Years)`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; background: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 560px; margin: 0 auto; padding: 32px 16px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="color: #111827; font-size: 22px; margin: 0;">Weekly Briefing</h1>
      <p style="color: #6b7280; font-size: 14px; margin: 4px 0 0;">${escapeHtml(input.weekLabel)}</p>
    </div>

    <!-- Revenue Card -->
    <div style="background: linear-gradient(135deg, #059669, #0d9488); border-radius: 12px; padding: 24px; color: #fff; margin-bottom: 20px;">
      <p style="margin: 0 0 4px; font-size: 13px; opacity: 0.8;">Total Revenue</p>
      <p style="margin: 0; font-size: 32px; font-weight: 700;">${formatCurrency(input.revenue)}</p>
      <p style="margin: 8px 0 0; font-size: 14px;">
        <span style="color: ${safeRevenueChangePercent >= 0 ? "#a7f3d0" : "#fecaca"};">${changeLabel}</span>
        <span style="opacity: 0.8;"> vs previous week</span>
      </p>
      <table role="presentation" style="margin-top: 16px; border-collapse: collapse;" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding-right: 24px; vertical-align: top;">
            <p style="margin: 0; font-size: 12px; opacity: 0.7;">Orders</p>
            <p style="margin: 2px 0 0; font-size: 18px; font-weight: 600;">${formatNumber(input.orders)}</p>
          </td>
          <td style="vertical-align: top;">
            <p style="margin: 0; font-size: 12px; opacity: 0.7;">Avg Order</p>
            <p style="margin: 2px 0 0; font-size: 18px; font-weight: 600;">${formatCurrency(input.aov)}</p>
          </td>
        </tr>
      </table>
    </div>

    <!-- Narrative -->
    <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
      <h2 style="color: #111827; font-size: 16px; margin: 0 0 12px;">Frax's Analysis</h2>
      <div style="color: #374151; font-size: 14px; line-height: 1.7;">${safeNarrative}</div>
    </div>

    <!-- Top Products -->
    <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
      <h2 style="color: #111827; font-size: 16px; margin: 0 0 12px;">Top Products</h2>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <thead>
          <tr style="border-bottom: 2px solid #e5e7eb;">
            <th style="padding: 8px 12px; text-align: left; color: #6b7280; font-weight: 500;">Product</th>
            <th style="padding: 8px 12px; text-align: right; color: #6b7280; font-weight: 500;">Revenue</th>
            <th style="padding: 8px 12px; text-align: right; color: #6b7280; font-weight: 500;">Units</th>
          </tr>
        </thead>
        <tbody>${topProductRows}</tbody>
      </table>
    </div>

    ${stockAlertSection}

    <!-- Maturity Badge -->
    <div style="text-align: center; margin: 20px 0;">
      <span style="display: inline-block; background: #ecfdf5; color: #065f46; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 500;">
        Frax Maturity: ${escapeHtml(maturityBadge)}
      </span>
    </div>

    <!-- CTA -->
    <div style="text-align: center; margin: 24px 0;">
      <a href="${sanitizeDashboardUrl(input.dashboardUrl)}" rel="noreferrer noopener" style="display: inline-block; background: #111827; color: #fff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 500; font-size: 14px;">
        View Full Dashboard
      </a>
    </div>

    <!-- Footer -->
    <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 32px;">
      Hello ${safeName}, this is your weekly briefing from Frame, powered by Frax.
    </p>
  </div>
</body>
</html>`;

  const { error } = await resend.emails.send({
    from: getFromEmail(),
    to: input.email,
    subject: `${input.weekLabel} — Weekly Report Ready`,
    html,
  });

  if (error) {
    throw new Error(
      `sendWeeklyBriefingEmail: Resend API error — ${error.name}: ${error.message}`
    );
  }
}
