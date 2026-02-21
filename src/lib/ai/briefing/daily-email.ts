import {
  escapeHtml,
  formatCurrency,
  formatNumber,
  sanitizeDashboardUrl,
  getResend,
  getFromEmail,
  EMAIL_REGEX,
} from "./email";

// -------------------------------------------------------
// Daily Briefing Email Template
// -------------------------------------------------------

export interface DailyBriefingEmailInput {
  email: string;
  name: string;
  narrative: string;
  revenue: number;
  revenueChangePercent: number;
  orders: number;
  aov: number;
  winnerPlatform: { marketplace: string; revenue: number } | null;
  topProducts: Array<{ title: string; revenue: number; unitsSold: number }>;
  lowStockProducts: Array<{ title: string; inventory: number | null }>;
  dashboardUrl: string;
  dateLabel: string; // e.g. "Feb 21, 2026"
}

export async function sendDailyBriefingEmail(
  input: DailyBriefingEmailInput
): Promise<void> {
  if (!input.email || !EMAIL_REGEX.test(input.email)) {
    throw new Error(
      `sendDailyBriefingEmail: invalid email format "${input.email ? input.email.slice(0, 4) + "***" : "(empty)"}"`
    );
  }

  const resend = getResend();
  const safeName = escapeHtml(input.name);
  const safeNarrative = escapeHtml(input.narrative).replace(/\n/g, "<br>");

  // Strip control characters from dateLabel to prevent email header injection
  const safeDateLabel = input.dateLabel.replace(/[\r\n\t\x00-\x1f\x7f]/g, "");

  const safeRevenueChangePercent = Number.isFinite(input.revenueChangePercent)
    ? input.revenueChangePercent
    : 0;

  const changeArrowHtml =
    safeRevenueChangePercent >= 0 ? "&#9650;" : "&#9660;";
  const changeLabel = `${changeArrowHtml} ${Math.abs(safeRevenueChangePercent).toFixed(1)}%`;

  // Winner platform badge (only if there was a winner)
  const winnerBadgeHtml = input.winnerPlatform
    ? `
      <div style="margin-top: 12px; padding: 8px 12px; background: rgba(255,255,255,0.15); border-radius: 8px; display: inline-block;">
        <span style="font-size: 11px; text-transform: uppercase; opacity: 0.8; letter-spacing: 0.5px;">Winner</span><br>
        <span style="font-size: 16px; font-weight: 600;">${escapeHtml(input.winnerPlatform.marketplace)}</span>
        <span style="font-size: 13px; opacity: 0.8;"> &mdash; ${formatCurrency(input.winnerPlatform.revenue)}</span>
      </div>`
    : "";

  // Top products as a compact list
  const topProductsHtml =
    input.topProducts.length > 0
      ? input.topProducts
          .map(
            (p, i) =>
              `<p style="margin: 4px 0; color: #374151; font-size: 13px;">
                <span style="color: #9ca3af; font-weight: 500;">${i + 1}.</span>
                ${escapeHtml(p.title)}
                <span style="color: #6b7280;"> &mdash; ${formatCurrency(p.revenue)} (${formatNumber(p.unitsSold)} units)</span>
              </p>`
          )
          .join("")
      : `<p style="margin: 4px 0; color: #9ca3af; font-size: 13px;">No product sales yesterday.</p>`;

  // Low stock warning
  const stockAlertHtml =
    input.lowStockProducts.length > 0
      ? `
        <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 12px 16px; margin: 16px 0;">
          <p style="margin: 0 0 8px; font-weight: 600; color: #92400e; font-size: 14px;">Low Stock Warning</p>
          ${input.lowStockProducts.map((p) => `<p style="margin: 2px 0; color: #78350f; font-size: 13px;">${escapeHtml(p.title)}: ${formatNumber(p.inventory ?? 0)} units</p>`).join("")}
        </div>`
      : "";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; background: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 560px; margin: 0 auto; padding: 32px 16px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="color: #111827; font-size: 20px; margin: 0;">Daily Briefing</h1>
      <p style="color: #6b7280; font-size: 14px; margin: 4px 0 0;">${escapeHtml(safeDateLabel)}</p>
    </div>

    <!-- Revenue Card + Winner Badge -->
    <div style="background: linear-gradient(135deg, #059669, #0d9488); border-radius: 12px; padding: 24px; color: #fff; margin-bottom: 20px;">
      <p style="margin: 0 0 4px; font-size: 13px; opacity: 0.8;">Yesterday's Revenue</p>
      <p style="margin: 0; font-size: 32px; font-weight: 700;">${formatCurrency(input.revenue)}</p>
      <p style="margin: 8px 0 0; font-size: 14px;">
        <span style="color: ${safeRevenueChangePercent >= 0 ? "#a7f3d0" : "#fecaca"};">${changeLabel}</span>
        <span style="opacity: 0.8;"> vs previous day</span>
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
      ${winnerBadgeHtml}
    </div>

    <!-- AI Morning Briefing (3 sentences) -->
    <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
      <h2 style="color: #111827; font-size: 16px; margin: 0 0 12px;">Frax's Morning Briefing</h2>
      <div style="color: #374151; font-size: 14px; line-height: 1.7;">${safeNarrative}</div>
    </div>

    <!-- Top 3 Products -->
    <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px 20px; margin-bottom: 20px;">
      <h2 style="color: #111827; font-size: 14px; margin: 0 0 8px;">Top Products</h2>
      ${topProductsHtml}
    </div>

    ${stockAlertHtml}

    <!-- CTA -->
    <div style="text-align: center; margin: 24px 0;">
      <a href="${sanitizeDashboardUrl(input.dashboardUrl)}" rel="noreferrer noopener" style="display: inline-block; background: #111827; color: #fff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 500; font-size: 14px;">
        View Dashboard
      </a>
    </div>

    <!-- Footer -->
    <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 32px;">
      Good morning ${safeName}, this is your daily briefing from Frame, powered by Frax.
    </p>
  </div>
</body>
</html>`;

  const { error } = await resend.emails.send({
    from: getFromEmail(),
    to: input.email,
    subject: `${safeDateLabel} — Daily Report Ready`,
    html,
  });

  if (error) {
    throw new Error(
      `sendDailyBriefingEmail: Resend API error — ${error.name}: ${error.message}`
    );
  }
}
