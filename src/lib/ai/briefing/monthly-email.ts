import {
  escapeHtml,
  formatCurrency,
  formatNumber,
  sanitizeDashboardUrl,
  getResend,
  getFromEmail,
  EMAIL_REGEX,
} from "./email";
import { markdownBoldToHtml, formatMarketplace } from "./daily-email";

// -------------------------------------------------------
// Monthly Briefing Email Template
// -------------------------------------------------------

export interface MonthlyBriefingEmailInput {
  email: string;
  name: string;
  narrative: string;
  revenue: number;
  revenueChangePercent: number;
  orders: number;
  aov: number;
  winnerPlatform: { marketplace: string; revenue: number } | null;
  marketplaceBreakdown: Array<{
    marketplace: string;
    revenue: number;
    orders: number;
    aov: number;
  }>;
  topProducts: Array<{
    title: string;
    revenue: number;
    unitsSold: number;
    marketplace: string;
  }>;
  weeklyRevenue: Array<{
    weekLabel: string;
    revenue: number;
    orders: number;
  }>;
  lowStockProducts: Array<{
    title: string;
    inventory: number | null;
    marketplace: string;
  }>;
  totalActiveDays: number;
  daysInMonth: number;
  dashboardUrl: string;
  monthLabel: string; // e.g. "February"
}

export async function sendMonthlyBriefingEmail(
  input: MonthlyBriefingEmailInput
): Promise<void> {
  if (!input.email || !EMAIL_REGEX.test(input.email)) {
    throw new Error(
      `sendMonthlyBriefingEmail: invalid email format "${input.email ? input.email.slice(0, 4) + "***" : "(empty)"}"`
    );
  }

  const resend = getResend();
  const safeName = escapeHtml(input.name);

  const safeMonthLabel = input.monthLabel.replace(
    /[\r\n\t\x00-\x1f\x7f]/g,
    ""
  );

  // Convert markdown bold → HTML strong, then split into paragraphs
  const narrativeHtml = markdownBoldToHtml(escapeHtml(input.narrative));
  // For monthly narratives (multi-paragraph), split on double newlines first, then sentence breaks
  const paragraphs = narrativeHtml
    .split(/\n\n+/)
    .filter((p) => p.trim().length > 0);

  const safeRevenueChangePercent = Number.isFinite(input.revenueChangePercent)
    ? input.revenueChangePercent
    : 0;

  const changeArrow = safeRevenueChangePercent >= 0 ? "&#9650;" : "&#9660;";
  const changeColor = safeRevenueChangePercent >= 0 ? "#a7f3d0" : "#fecaca";
  const changeLabel = `${changeArrow} ${Math.abs(safeRevenueChangePercent).toFixed(1)}%`;

  // Active days badge
  const safeTotalActiveDays = Number.isFinite(input.totalActiveDays)
    ? input.totalActiveDays
    : 0;
  const safeDaysInMonth = Number.isFinite(input.daysInMonth)
    ? input.daysInMonth
    : 30;

  // Winner platform badge
  const winnerBadgeHtml = input.winnerPlatform
    ? `
      <div style="margin-top: 16px; padding: 10px 14px; background: rgba(255,255,255,0.15); border-radius: 8px; display: inline-block;">
        <span style="font-size: 10px; text-transform: uppercase; opacity: 0.7; letter-spacing: 1px;">&#127942; Winner Platform</span><br>
        <span style="font-size: 17px; font-weight: 700;">${escapeHtml(formatMarketplace(input.winnerPlatform.marketplace))}</span>
        <span style="font-size: 13px; opacity: 0.85;"> &mdash; ${formatCurrency(input.winnerPlatform.revenue)}</span>
      </div>`
    : "";

  // Marketplace breakdown table
  const marketplaceTableHtml =
    input.marketplaceBreakdown.length > 0
      ? `
        <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 18px 20px; margin-bottom: 20px;">
          <h2 style="color: #111827; font-size: 14px; margin: 0 0 12px; font-weight: 700;">&#127760; Marketplace Breakdown</h2>
          <table role="presentation" style="width: 100%; border-collapse: collapse; font-size: 13px;" cellpadding="0" cellspacing="0">
            <tr style="border-bottom: 2px solid #e5e7eb;">
              <th style="padding: 6px 0; text-align: left; color: #6b7280; font-weight: 500; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Platform</th>
              <th style="padding: 6px 0; text-align: right; color: #6b7280; font-weight: 500; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Revenue</th>
              <th style="padding: 6px 0; text-align: right; color: #6b7280; font-weight: 500; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Orders</th>
              <th style="padding: 6px 0; text-align: right; color: #6b7280; font-weight: 500; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">AOV</th>
            </tr>
            ${input.marketplaceBreakdown
              .map(
                (m) =>
                  `<tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #111827; font-weight: 500;">${escapeHtml(formatMarketplace(m.marketplace))}</td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; text-align: right; color: #111827; font-weight: 600;">${formatCurrency(m.revenue)}</td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; text-align: right; color: #6b7280;">${formatNumber(m.orders)}</td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; text-align: right; color: #6b7280;">${formatCurrency(m.aov)}</td>
                  </tr>`
              )
              .join("")}
          </table>
        </div>`
      : "";

  // Weekly trend table
  const weeklyTrendHtml =
    input.weeklyRevenue.length > 0
      ? `
        <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 18px 20px; margin-bottom: 20px;">
          <h2 style="color: #111827; font-size: 14px; margin: 0 0 12px; font-weight: 700;">&#128200; Weekly Trend</h2>
          <table role="presentation" style="width: 100%; border-collapse: collapse; font-size: 13px;" cellpadding="0" cellspacing="0">
            <tr style="border-bottom: 2px solid #e5e7eb;">
              <th style="padding: 6px 0; text-align: left; color: #6b7280; font-weight: 500; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Week</th>
              <th style="padding: 6px 0; text-align: right; color: #6b7280; font-weight: 500; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Revenue</th>
              <th style="padding: 6px 0; text-align: right; color: #6b7280; font-weight: 500; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Orders</th>
            </tr>
            ${input.weeklyRevenue
              .map(
                (w) =>
                  `<tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #111827; font-weight: 500;">${escapeHtml(w.weekLabel)}</td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; text-align: right; color: #111827; font-weight: 600;">${formatCurrency(w.revenue)}</td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; text-align: right; color: #6b7280;">${formatNumber(w.orders)}</td>
                  </tr>`
              )
              .join("")}
          </table>
        </div>`
      : "";

  // Narrative section — split by paragraphs for multi-paragraph monthly analysis
  const narrativeSectionHtml = paragraphs
    .map(
      (para, i) =>
        `<p style="margin: ${i === 0 ? "0" : "12px 0 0 0"}; color: #374151; font-size: 14px; line-height: 1.65;">${para.replace(/\n/g, " ")}</p>`
    )
    .join("");

  // Top products
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
                    <span style="color: #111827; font-size: 13px; font-weight: 500;">${escapeHtml(p.title)}</span><br>
                    <span style="display: inline-block; margin-top: 2px; padding: 1px 6px; background: #eff6ff; color: #1d4ed8; border-radius: 4px; font-size: 10px; font-weight: 500; letter-spacing: 0.3px;">${escapeHtml(formatMarketplace(p.marketplace))}</span>
                  </td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; vertical-align: middle; text-align: right;">
                    <span style="color: #111827; font-size: 13px; font-weight: 600;">${formatCurrency(p.revenue)}</span><br>
                    <span style="color: #9ca3af; font-size: 11px;">${formatNumber(p.unitsSold)} units</span>
                  </td>
                </tr>`
            )
            .join("")}
        </table>`
      : `<p style="margin: 8px 0; color: #9ca3af; font-size: 13px;">No product sales this month.</p>`;

  // Low stock warning
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
                      <span style="display: inline-block; margin-left: 6px; padding: 1px 5px; background: rgba(146,64,14,0.1); color: #92400e; border-radius: 3px; font-size: 10px; font-weight: 500;">${escapeHtml(formatMarketplace(p.marketplace))}</span>
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

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background: #f0f2f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 560px; margin: 0 auto; padding: 32px 16px;">

    <!-- Header -->
    <div style="text-align: center; margin-bottom: 24px;">
      <p style="margin: 0; font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 1.5px;">Monthly Briefing</p>
      <h1 style="color: #111827; font-size: 22px; margin: 6px 0 0; font-weight: 700;">${escapeHtml(safeMonthLabel)}</h1>
    </div>

    <!-- Revenue Card -->
    <div style="background: linear-gradient(135deg, #059669, #0d9488); border-radius: 14px; padding: 28px 24px; color: #fff; margin-bottom: 20px;">
      <p style="margin: 0 0 6px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.8px; opacity: 0.75;">Monthly Revenue</p>
      <p style="margin: 0; font-size: 36px; font-weight: 800; letter-spacing: -0.5px;">${formatCurrency(input.revenue)}</p>
      <p style="margin: 10px 0 0; font-size: 14px;">
        <span style="color: ${changeColor}; font-weight: 600;">${changeLabel}</span>
        <span style="opacity: 0.75;"> vs previous month</span>
      </p>
      <table role="presentation" style="margin-top: 18px; border-collapse: collapse;" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding-right: 28px; vertical-align: top;">
            <p style="margin: 0; font-size: 11px; opacity: 0.65; text-transform: uppercase; letter-spacing: 0.5px;">Orders</p>
            <p style="margin: 3px 0 0; font-size: 20px; font-weight: 700;">${formatNumber(input.orders)}</p>
          </td>
          <td style="padding-right: 28px; vertical-align: top;">
            <p style="margin: 0; font-size: 11px; opacity: 0.65; text-transform: uppercase; letter-spacing: 0.5px;">Avg Order</p>
            <p style="margin: 3px 0 0; font-size: 20px; font-weight: 700;">${formatCurrency(input.aov)}</p>
          </td>
          <td style="vertical-align: top;">
            <p style="margin: 0; font-size: 11px; opacity: 0.65; text-transform: uppercase; letter-spacing: 0.5px;">Active Days</p>
            <p style="margin: 3px 0 0; font-size: 20px; font-weight: 700;">${formatNumber(safeTotalActiveDays)}/${formatNumber(safeDaysInMonth)}</p>
          </td>
        </tr>
      </table>
      ${winnerBadgeHtml}
    </div>

    ${marketplaceTableHtml}

    ${weeklyTrendHtml}

    <!-- Frax's Monthly Analysis -->
    <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 22px 20px; margin-bottom: 20px;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;" cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align: middle; width: 36px;">
            <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #8b5cf6, #6d28d9); border-radius: 8px; text-align: center; line-height: 32px; font-size: 16px;">&#9889;</div>
          </td>
          <td style="vertical-align: middle; padding-left: 10px;">
            <h2 style="color: #111827; font-size: 15px; margin: 0; font-weight: 700;">Frax's Monthly Analysis</h2>
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

    <!-- CTA -->
    <div style="text-align: center; margin: 28px 0;">
      <a href="${sanitizeDashboardUrl(input.dashboardUrl)}" rel="noreferrer noopener" style="display: inline-block; background: linear-gradient(135deg, #111827, #1f2937); color: #fff; text-decoration: none; padding: 14px 40px; border-radius: 10px; font-weight: 600; font-size: 14px; letter-spacing: 0.3px;">
        Open Dashboard &rarr;
      </a>
    </div>

    <!-- Footer -->
    <p style="text-align: center; color: #9ca3af; font-size: 11px; margin-top: 32px; line-height: 1.5;">
      Hello ${safeName} &#128202;<br>
      Your monthly briefing from <strong>Frame</strong>, powered by <strong>Frax</strong>.
    </p>
  </div>
</body>
</html>`;

  const { error } = await resend.emails.send({
    from: getFromEmail(),
    to: input.email,
    subject: `${safeMonthLabel} — Monthly Report Ready`,
    html,
  });

  if (error) {
    throw new Error(
      `sendMonthlyBriefingEmail: Resend API error — ${error.name}: ${error.message}`
    );
  }
}
