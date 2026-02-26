# Frame Analytics — Landing Page Specification

> This document is a complete content and structure specification for Relume.io to generate a professional, conversion-optimized landing page for **Frame Analytics** — an AI-powered multi-marketplace e-commerce analytics platform.

---

## Brand Identity

- **Product Name:** Frame
- **Tagline:** Frame Analytics
- **AI Assistant Name:** Frax
- **Primary Colors:** Teal (#14b8a6) → Emerald (#10b981) gradient
- **Secondary Colors:** Slate (#0f172a for text), Violet (#8b5cf6 for accents)
- **Logo:** Custom logo (logo.png), displayed alongside "Frame" text with "Analytics" subtitle
- **Tone:** Professional, confident, data-driven. Not salesy or fluffy — speaks like a business analyst presenting to a founder.
- **Domain:** app.frame.com

---

## Page Structure (Top to Bottom)

---

### 1. NAVBAR

**Layout:** Fixed top, transparent on load → frosted glass (white/80 + backdrop blur) on scroll.

**Left:** Logo + "Frame" + "Analytics" subtitle
**Center:** Navigation links — Integrations | Features | How it Works | Pricing
**Right:**
- Trust badge pill: "SOC 2" with shield icon (green)
- "Sign in" text link
- "Get Started" button (teal-to-emerald gradient, white text, arrow icon)

**Mobile:** Hamburger menu → full-width slide-down panel with same links + Sign in + Get Started.

---

### 2. HERO SECTION

**Background:** Soft gradient from teal-50/50 → white, with two decorative blur orbs (teal top-right, blue top-left).

**Headline (H1):**
```
The AI Analyst for
All Your Marketplaces
```
"All Your Marketplaces" is in teal-to-emerald gradient text.

**Subheadline:**
```
Connect Shopify, Amazon, eBay, Etsy, Flipkart and more.
Get unified insights across all your sales channels in seconds.
```

**CTA Buttons (side by side):**
1. **Primary:** "Request a Free Trial" → teal gradient button with right arrow icon. Opens a modal form.
2. **Secondary:** "Watch Demo" → outlined white button with play icon. Scrolls to interactive demo.

**Trust Points (below CTAs):**
Three items with green checkmark icons:
- No credit card required
- 2-minute setup
- Cancel anytime

---

### 3. INTERACTIVE DEMO (below Hero)

A browser-chrome mockup (macOS-style window with red/amber/green dots, address bar showing "app.frame.com") containing an auto-rotating AI chat conversation. Shows how the product actually works.

**Rotating conversations (auto-cycles every 6 seconds, also clickable via dot indicators):**

1. **User:** "What was my total revenue across all marketplaces last week?"
   **Frax:** "Your combined revenue was **$47,382**. Amazon $22,450 (47%), Shopify $14,280 (30%), Flipkart $7,890 (17%), Snapdeal $2,762 (6%). You're up **18%** from last week."

2. **User:** "Which products are best sellers on Amazon vs Flipkart?"
   **Frax:** "**Electronics** sell 3x better on Amazon, while **Fashion items** outperform 2.5x on Flipkart. Consider increasing Fashion inventory allocation to Flipkart."

3. **User:** "How can I optimize my inventory across channels?"
   **Frax:** "Move **200 units of Summer Collection** from Shopify to Amazon. Your Snapdeal inventory for Kids Wear is low — restocking could capture **$8,400** in potential sales."

4. **User:** "Show me my customer acquisition costs by marketplace"
   **Frax:** "CAC Analysis: Snapdeal **$2.40** (lowest), Flipkart $4.80, Amazon $6.20, Shopify $8.90 (highest). Snapdeal offers the best ROI for new customers."

This section is critical — it lets visitors instantly understand the conversational AI interface without signing up.

---

### 4. SOCIAL PROOF STATS (below demo)

Four stat cards in a horizontal grid:

| Stat | Label |
|------|-------|
| $2B+ | Revenue Analyzed |
| 50K+ | Active Sellers |
| 10+ | Marketplaces |
| 99.9% | Uptime SLA |

Each stat has a gradient color accent (teal, blue, violet, orange).

---

### 5. INTEGRATIONS SECTION — "Your Command Center"

**Badge:** "Powered by Real-Time Sync" with animated green ping dot
**Headline:** "Your **Command Center**" ("Command Center" in teal gradient text)
**Subheadline:** "Connect once, analyze everywhere. Frame syncs with every major marketplace to give you unified insights across all your sales channels."

**Visual:** A large orbital hub visualization:
- Center: Frame logo in a glowing white circle with animated rings
- 9 marketplace logos arranged in a circle, connected to the center with animated energy particle lines (data flowing in/out)
- Each marketplace node is a white circle with colored border matching the brand, showing the logo, name label, and a green "Live" status indicator

**The 9 Supported Marketplaces (with brand colors):**

| # | Marketplace | Brand Color | Description |
|---|-------------|-------------|-------------|
| 1 | **Shopify** | #95BF47 (Green) | The world's leading e-commerce platform. Full OAuth integration with real-time webhooks for instant order/product sync. |
| 2 | **Amazon** | #FF9900 (Orange) | The largest online marketplace globally. Connect your Seller Central account to unify Amazon data with all other channels. |
| 3 | **eBay** | #E53238 (Red) | Global auction and fixed-price marketplace. OAuth 2.0 integration with automatic token refresh (2-hour token rotation). |
| 4 | **Etsy** | #F56400 (Orange) | The go-to marketplace for handmade, vintage, and creative goods. OAuth 2.0 + PKCE integration with automatic token rotation. |
| 5 | **BigCommerce** | #121118 (Black) | Enterprise-grade e-commerce platform. Real-time webhooks + polling sync with permanent access tokens. |
| 6 | **Square** | #006AFF (Blue) | Omnichannel commerce platform (online + in-store). OAuth 2.0 + PKCE with real-time webhook support and 30-day token lifecycle. |
| 7 | **PrestaShop** | #DF0067 (Pink) | Open-source e-commerce platform popular in Europe. Self-hosted store integration. |
| 8 | **Flipkart** | #2874F0 (Blue) | India's largest e-commerce marketplace. OAuth 2.0 integration with automatic credential refresh. |
| 9 | **Snapdeal** | #E40046 (Red) | Major Indian marketplace with strong value-segment positioning. Token-based integration with polling sync. |

**Key messaging for this section:**
- One-click OAuth connection (no API keys to copy-paste)
- Read-only access (Frame never modifies your store data)
- Real-time webhook sync for supported marketplaces + 15-minute polling fallback for all
- All data normalized into a unified model — orders, products, customers, inventory across every marketplace look the same

---

### 6. FEATURES SECTION — "Everything you need to scale"

**Section Label:** FEATURES
**Headline:** "Everything you need to scale"
**Subheadline:** "Built for multi-channel sellers who want data-driven decisions without complexity"

**6 Feature Cards (2x3 grid):**

#### Feature 1: Unified Dashboard
- **Icon:** Chart/analytics icon (teal)
- **Description:** See revenue, orders, and inventory across all marketplaces in one view. No more switching between tabs.
- **What it actually does:** Aggregates UnifiedOrder, UnifiedProduct, and UnifiedOrderItem data from all connected marketplaces into a single conversational interface. Revenue breakdowns, order counts, AOV — all queryable by marketplace, date range, or product.

#### Feature 2: AI-Powered Insights (Frax)
- **Icon:** Sparkle/AI icon (violet)
- **Description:** Ask questions in plain English. Get instant answers about revenue, products, and customers across all channels.
- **What it actually does:** Frax is a conversational AI assistant powered by function-calling LLM architecture. It has 11 specialized analytics tools it can invoke: revenue metrics, top products, top customers, daily revenue breakdown, store overview, low stock detection, channel comparison, period-over-period comparison, inventory turnover, customer segmentation, and channel-product fit analysis. Users just type a question — Frax picks the right tool(s), queries the unified database, and returns a concise business answer.

#### Feature 3: Cross-Channel Comparison
- **Icon:** Arrows swap icon (blue)
- **Description:** Compare performance between Amazon, Flipkart, Snapdeal, and others. Find what works best where.
- **What it actually does:** The `get_channel_comparison` tool breaks down revenue, order count, and AOV per marketplace for any time period. The `get_channel_product_fit` tool goes deeper — it scores each product's fit on each marketplace (0-100) using 7 signals (revenue velocity, unit velocity, price position, sales trend slope, trend consistency, inventory turnover, return rate). Recommendations include: EXPAND to new channels, RESTOCK low inventory, REPRICE misaligned products, or DEPRIORITIZE underperformers.

#### Feature 4: Inventory Intelligence
- **Icon:** Database/stack icon (amber)
- **Description:** Track stock levels across all channels. Get alerts before stockouts and optimize allocation automatically.
- **What it actually does:** The `get_low_stock_products` tool monitors inventory levels across all connected marketplaces. Proactive alert system runs hourly (via cron), detecting: stockout risk (inventory < 5 + high velocity), demand surges (weekly velocity > 2x baseline), and revenue anomalies. Alerts are categorized by severity (low/medium/high/critical) and surfaced to the user automatically.

#### Feature 5: Automated Reports
- **Icon:** Bar chart icon (rose)
- **Description:** Get daily, weekly, and monthly reports delivered automatically. Track KPIs and growth metrics effortlessly.
- **What it actually does:** Four automated email briefings:
  - **Daily Briefing** ("Morning Coffee") — Sent at 07:00 UTC every day. 3-sentence summary of yesterday's performance: revenue, top products, marketplace breakdown, low stock warnings.
  - **Weekly Briefing** — Sent Monday 00:00 UTC. Full week trend analysis with top performers, sluggish products, customer insights (new repeat buyers), and Frax's AI maturity metrics.
  - **Bi-Weekly Briefing** — Sent every 2 weeks (even ISO weeks, Monday 02:00 UTC). Multi-week momentum indicators and emerging patterns.
  - **Monthly Briefing** — Sent 1st of each month at 03:30 UTC. Comprehensive 200-300 word strategic review: revenue trends, top products, top customers, actionable recommendations.

  On-demand reports can also be generated inside the app in four types: Revenue Summary, Product Analysis, Customer Insights, and Full Analysis.

#### Feature 6: Enterprise Security
- **Icon:** Shield checkmark icon (emerald)
- **Description:** SOC 2 compliant, end-to-end encryption, and read-only API access. Your data stays secure and private.
- **What it actually does:**
  - **Token Encryption:** All marketplace access tokens and refresh tokens encrypted at-rest with AES-256-GCM before database storage.
  - **Webhook Verification:** HMAC-SHA256 timing-safe comparison on all incoming webhooks (Shopify, BigCommerce, Square). Both sides hashed to SHA-256 digests before comparison to prevent length-leak attacks.
  - **Session Security:** JWT tokens in HTTP-only, Secure, SameSite=Lax cookies. No tokens in localStorage (XSS-safe). Session revocation via RevokedToken table with JWT ID claim tracking.
  - **PII Protection:** Customer names and emails encrypted before storage. Automatic PII cleanup cron runs daily — nullifies all PII on orders older than 365 days.
  - **GDPR Compliance:** Full account deletion endpoint with transactional cascade delete. Password re-verification required. Audit logging with 365-day retention.
  - **Rate Limiting:** Per-endpoint rate limits backed by Redis. Protects sign-in, sign-up, password reset, and all API endpoints.

---

### 7. EXAMPLE QUESTIONS SECTION — "Ask anything about your store"

**Badge:** "Examples"
**Headline:** "Ask **anything** about your store" ("anything" in emerald-to-teal gradient)
**Subheadline:** "Here are some questions our users love asking"

**8 example questions in a 2-column grid. Each is an interactive card with a question-mark icon, the question text, and a right-arrow chevron:**

1. "What was my revenue last week?"
2. "Which products are selling best this month?"
3. "Who are my top 10 customers by lifetime value?"
4. "What's my average order value trend?"
5. "Which products have the highest return rate?"
6. "How many new customers did I get this week?"
7. "What time of day do I get the most orders?"
8. "Compare this month's sales to last month"

**Purpose:** Immediately shows visitors the breadth of questions the AI can answer — no training, no complex dashboard navigation, just ask.

---

### 8. HOW IT WORKS SECTION — "Get started in minutes"

**Section Label:** HOW IT WORKS
**Headline:** "Get started in minutes"
**Subheadline:** "Connect your first marketplace in under 2 minutes. No technical setup required."

**3 Steps (horizontal on desktop, stacked on mobile, connected by a gradient line):**

#### Step 01 — Connect Your Stores
- **Color:** Teal
- **Description:** One-click OAuth integration with Shopify, Amazon, Flipkart, eBay, Etsy, and all supported marketplaces. No API keys needed.
- **Feature pills:** Secure OAuth 2.0 | Read-only access | Instant sync
- **How it actually works:** User clicks "Connect" → redirected to marketplace OAuth consent screen → grants read-only permissions → Frame securely stores encrypted tokens → first full sync begins immediately.

#### Step 02 — Ask Anything
- **Color:** Violet
- **Description:** Use natural language to query your data. Compare channels, analyze trends, and get recommendations instantly.
- **Feature pills:** Natural language AI | Cross-channel analysis | Smart recommendations
- **How it actually works:** User types a question in the chat interface → Frax (the AI) determines which analytics tool(s) to call → queries the unified database across all connected marketplaces → returns a formatted answer with specific numbers, comparisons, and actionable advice.

#### Step 03 — Grow Your Business
- **Color:** Orange
- **Description:** Get actionable insights delivered daily. Know exactly where to focus your efforts to maximize sales.
- **Feature pills:** Daily insights | Revenue optimization | Inventory alerts
- **How it actually works:** Automated email briefings arrive daily/weekly/monthly. Proactive alerts fire when stockouts, demand surges, or revenue anomalies are detected. The channel-product fit engine continuously analyzes which products should be on which marketplaces.

**Social proof below steps:** "**2,847 sellers** started this week" with avatar stack + "Request a Free Trial" button.

---

### 9. PRICING SECTION — "One plan. All features. Scale as you grow."

**Section Label:** PRICING
**Subheadline:** "One plan. All features. Scale as you grow."

**Single Pricing Card (centered, prominent):**

**Card Header (teal-to-emerald gradient background):**
- Badge: "Best Value" with pulsing green dot
- Plan name: **Frame Pro**
- Price: **₹999/month**
- Subtext: "+ ₹449/mo per additional marketplace"

**Card Body (white):**
- Section label: "EVERYTHING INCLUDED"
- Checklist (green checkmark circles):
  - 2 marketplace connections included
  - Unlimited AI queries
  - Advanced analytics & reports
  - 1-year data history
  - Cross-channel insights
  - Priority support

**CTA Button:** "Start Free Trial" (full-width, teal gradient)
**Trust line:** "30-day free trial · No credit card · Cancel anytime"

**Pricing Breakdown for Transparency (can be shown as expandable or tooltip):**

| Marketplaces Connected | Monthly Cost |
|------------------------|-------------|
| 2 (included) | ₹999 |
| 3 | ₹1,448 |
| 4 | ₹1,897 |
| 5 | ₹2,346 |
| 6 | ₹2,795 |
| 7 | ₹3,244 |
| 8 | ₹3,693 |
| 9 (all) | ₹4,142 |

---

### 10. FINAL CTA BANNER (dark section)

**Background:** Dark slate gradient (slate-800 → slate-900) with teal and violet blur orbs.
**Headline (white):** "Ready to unify your e-commerce analytics?"
**Subheadline (slate-300):** "Join 10,000+ sellers who manage all their marketplaces from one dashboard."

**CTA Buttons:**
1. "Request a Free Trial" → teal gradient button
2. "Watch Demo" → outlined white button

**Trust Points:** 30-day free trial | No credit card required | Cancel anytime

---

### 11. FOOTER

**Layout:** 5-column grid (brand column spans 2, then Product, Company, Legal)

**Brand Column:**
- Logo + "Frame" + "Analytics"
- Description: "The AI-powered analytics platform for multi-channel e-commerce sellers. Connect all your marketplaces and get unified insights."
- Social links: Twitter (X), LinkedIn, GitHub

**Product Column:**
- Features
- Integrations
- Pricing

**Company Column:**
- About
- Blog
- Careers
- Contact

**Legal Column:**
- Privacy Policy
- Terms of Service
- Cookie Policy
- Security
- GDPR

**Bottom Bar:**
- Copyright: "© 2026 Frame. All rights reserved."
- Cookie Settings link
- Trust badges: "SOC 2 Certified" | "GDPR Compliant" (with green shield/checkmark icons)

---

## Trial Request Modal

Triggered by "Request a Free Trial" buttons throughout the page. A centered modal overlay with:

**Fields:**
- Full Name (required)
- Email Address (required)
- Phone Number (optional)
- Referral Code (optional, hidden field — auto-populated from URL params)

**CTA:** "Request Trial" button
**Fine print:** "We'll set up your account and send login details within 24 hours."

**Backend flow:** Submission creates a `TrialRequest` record. Sales team reviews, sends trial invite with unique token. User clicks invite link → sets up password → connects marketplaces → starts using Frame.

---

## The Product in Detail — What Frame Actually Is

### The Problem Frame Solves

Multi-channel e-commerce sellers today manage their businesses across multiple marketplaces simultaneously — Shopify for their own website, Amazon for reach, Flipkart for the Indian market, eBay for global buyers, Etsy for handmade goods, and so on. Each marketplace has its own:

- **Dashboard** with different layouts, metrics, and terminology
- **Data formats** (Amazon reports look nothing like Shopify analytics)
- **Login credentials** and separate sessions
- **Notification systems** with different alert thresholds
- **Reporting cadences** that don't align with each other

The result: sellers spend hours every day logging into 3-7 different dashboards, manually compiling data in spreadsheets, and trying to answer basic questions like "What was my total revenue this week?" or "Which product is performing best across all channels?"

This is painful, slow, and error-prone. It leads to missed stockouts, pricing misalignment between channels, and blind spots where revenue is leaking.

### What Frame Is

Frame is an **AI-powered unified analytics platform** that connects to all your marketplaces via secure OAuth, syncs your orders/products/inventory in real-time, and lets you ask questions in plain English to an AI assistant named **Frax**.

Instead of opening 7 dashboards, you open one chat. Instead of building pivot tables, you ask: *"Which products on Flipkart should I also list on Amazon?"* — and Frax gives you a specific, data-backed recommendation.

### How Frame Works Under the Hood

1. **Marketplace Connection:** User authenticates via OAuth 2.0 (or OAuth + PKCE for Etsy/Square). Frame receives read-only access tokens, encrypts them with AES-256-GCM, and stores them securely. Frame never writes to or modifies any marketplace data — it is strictly read-only.

2. **Data Sync Pipeline:**
   - **Real-time webhooks** from Shopify, BigCommerce, and Square push order/product updates to Frame the moment they happen.
   - **15-minute polling** syncs data from all other marketplaces (eBay, Etsy, Flipkart, Snapdeal, etc.).
   - **Manual sync** can be triggered anytime from the app.
   - All incoming data is normalized into a unified schema: `UnifiedOrder`, `UnifiedProduct`, `UnifiedOrderItem` — meaning a Shopify order and a Flipkart order look identical in Frame's database.
   - Distributed locking (compare-and-swap on sync version) prevents duplicate syncs across multiple server instances.
   - Webhook deduplication via unique event IDs prevents reprocessing.

3. **AI Conversation Engine (Frax):**
   - User types a question in the chat interface.
   - Frax uses function-calling to select from 11 specialized analytics tools.
   - Each tool queries the unified database and returns structured data.
   - Frax interprets the data and responds in natural language with specific numbers, percentages, and recommendations.
   - Frax has a **working memory system** — it creates notes about the seller's business context, remembers patterns across conversations, and grows smarter over time.

4. **Automated Briefings:**
   - Cron jobs generate and email daily/weekly/bi-weekly/monthly reports automatically.
   - No user action required — insights arrive in their inbox.

5. **Proactive Alerts:**
   - Hourly cron detects stockout risks, demand surges, revenue anomalies, and return patterns.
   - Alerts are deduped (same alert doesn't fire twice) and categorized by severity.
   - Surfaced to the user through Frax in the next conversation.

---

## Frax — The AI Assistant (Detailed Capabilities)

Frax is not a generic chatbot. It is a purpose-built e-commerce analyst with access to the seller's real, live data across all connected marketplaces. Here is exactly what Frax can do:

### 11 Analytics Tools

| # | Tool | What It Does | Example Question |
|---|------|-------------|-----------------|
| 1 | **Revenue Metrics** | Total revenue, order count, average order value for any period | "What was my revenue last month?" |
| 2 | **Top Products** | Best-selling products ranked by revenue or units sold | "Which products are selling best?" |
| 3 | **Top Customers** | Highest-spending customers by lifetime value | "Who are my top 5 customers?" |
| 4 | **Daily Revenue** | Day-by-day revenue breakdown with trends | "Show me daily sales for the last 2 weeks" |
| 5 | **Store Overview** | Connected marketplaces, total products, total orders, sync status | "Give me an overview of my stores" |
| 6 | **Low Stock Detection** | Products with inventory below a threshold | "Which products are running low on stock?" |
| 7 | **Channel Comparison** | Revenue, orders, AOV broken down per marketplace | "Compare my Shopify vs Amazon performance" |
| 8 | **Period Comparison** | Week-over-week or month-over-month growth analysis | "How does this week compare to last week?" |
| 9 | **Inventory Turnover** | Stock velocity, days inventory outstanding, capital efficiency | "What's my inventory turnover rate?" |
| 10 | **Customer Segments** | One-time vs repeat vs VIP segmentation, lifetime value analysis | "Break down my customers by segment" |
| 11 | **Channel-Product Fit** | Scores each product's fit per marketplace (0-100), with specific recommendations | "Where should I sell this product?" |

### Channel-Product Fit Engine (Proprietary)

This is Frame's most unique and powerful feature. No other platform offers this.

The engine analyzes how well each product performs across different marketplaces using **7 signals:**
1. Revenue velocity (revenue per day)
2. Unit velocity (units sold per day)
3. Price position (how seller's price compares to market average)
4. Sales trend slope (upward or downward momentum)
5. Trend consistency (R-squared: how reliable the trend is)
6. Inventory turnover (how fast stock moves)
7. Return rate (percentage of orders returned)

Each signal is scored, weighted, and combined into a **composite fit score (0-100)** with a confidence level.

**5 types of recommendations generated:**

| Type | What It Means | Example |
|------|--------------|---------|
| **EXPAND** | List this product on a new marketplace you're already connected to | "Your wireless earbuds score 87/100 for eBay — list them there" |
| **CONNECT** | This product has high potential on a marketplace you're not on yet | "Electronics like yours have strong demand on Amazon — ~210 similar products sold last week" |
| **RESTOCK** | Inventory is dangerously low for a high-performing product | "Only 3 units left of Summer Dress on Flipkart — restock now" |
| **REPRICE** | Price is misaligned with market demand | "Your price is 22% above market average on Etsy — consider adjusting" |
| **DEPRIORITIZE** | Product is underperforming on a specific channel | "Laptop Bag scores only 18/100 on Snapdeal — consider focusing elsewhere" |

### Frax's Memory & Learning System

Frax has a cognitive architecture that evolves over time:

- **Beliefs:** A confidence graph tracking what Frax knows about the seller's business (e.g., "analyze_revenue" with strength 0.85 means Frax is very confident analyzing this seller's revenue patterns). Beliefs strengthen through validated interactions.
- **Notes:** Short-term memory with configurable TTL (default 24 hours). Frax remembers context across conversations — if you mentioned a product yesterday, Frax may reference it today.
- **AI Maturity Stages:** Frax progresses through: Infant → Apprentice → Professional → Expert. This is tracked via "AI Years" (18,000 validated cycles = 1 AI Year) and shown in weekly briefing emails.
- **Maturity Score:** Geometric mean reliability score (0.0 to 1.0) reflecting Frax's overall confidence across all belief domains for that seller.

---

## Revenue Model — How Frame Earns Money

### Primary Revenue: SaaS Subscription

Frame operates on a **usage-based SaaS subscription model** with a simple, transparent pricing structure:

#### Pricing Structure

| Component | Price | Details |
|-----------|-------|---------|
| **Base Plan** | ₹999/month (~$12/month) | Includes 2 marketplace connections, unlimited AI queries, all analytics tools, all report types, 1-year data history, priority support |
| **Additional Marketplace** | ₹449/month (~$5.40/month) each | Each extra marketplace connection beyond the included 2 |

#### Revenue Per Customer Examples

| Seller Profile | Marketplaces | Monthly Revenue per Customer |
|---------------|-------------|------------------------------|
| Small Seller (2 channels) | Shopify + Flipkart | ₹999 |
| Growing Seller (4 channels) | Shopify + Amazon + Flipkart + eBay | ₹1,897 |
| Enterprise Seller (7 channels) | All major platforms | ₹3,244 |
| Power Seller (all 9) | All 9 marketplaces | ₹4,142 |

#### What's Included in Every Plan (No Tiers — One Plan, All Features)

- Unlimited AI chat queries with Frax
- All 11 analytics tools
- Channel-Product Fit recommendations
- Automated daily, weekly, bi-weekly, and monthly email briefings
- Proactive stockout, demand surge, and revenue anomaly alerts
- On-demand report generation (Revenue, Product, Customer, Full Analysis)
- 1-year data history retention
- AES-256-GCM token encryption
- SOC 2 compliant infrastructure
- GDPR-compliant data handling with automatic PII cleanup
- Priority support

### Acquisition Strategy: Trial-Based Funnel

Frame uses a **sales-assisted trial funnel** with three acquisition paths:

1. **Self-Serve:** Visitor requests a free trial on the landing page → sales team reviews → sends trial invite → 30-day free trial → converts to paid.
2. **Sales Referral:** Sales team member shares a referral link → prospect signs up → trial is auto-linked to sales member for commission tracking.
3. **Direct Sign-Up:** User creates an account, goes through onboarding (connect marketplaces → select plan → pay).

#### Trial System Details

- **Trial Duration:** 30 days (no credit card required)
- **Trial Access:** Full product access — all features, all tools, all reports
- **Conversion:** At trial end, user is prompted to select a paid plan to continue
- **Payment Processor:** Razorpay (Indian payment gateway supporting cards, UPI, net banking, wallets)
- **Auto-Renewal:** Monthly subscription with auto-charge

### Secondary Revenue: Sales Team Commission System

Frame has a built-in commission-based sales infrastructure:

- **Founder Dashboard:** The founder can invite, approve/reject, and manage sales team members.
- **Sales Member Dashboard:** Each approved sales member gets a unique referral code, can view their clients, send trial invites, and track conversions.
- **Commission Tracking:** Commissions are recorded per sales member per client per billing period. Commission rate is configurable per member.
- **SalesClient Model:** Links the sales member → client → trial request → converted user, enabling end-to-end attribution.

This system allows Frame to scale acquisition through a distributed salesforce without traditional enterprise sales overhead.

### Unit Economics Summary

| Metric | Value |
|--------|-------|
| **Starting Price** | ₹999/month |
| **Average Revenue Per User (estimated)** | ₹1,500-2,500/month (most sellers connect 3-5 marketplaces) |
| **Trial Duration** | 30 days free |
| **Payment** | Razorpay (monthly auto-renewal) |
| **CAC Model** | Low-touch sales + self-serve + referral commissions |
| **Retention Lever** | Daily email briefings + AI memory that grows smarter over time = sticky |

---

## Target Audience

### Primary: Multi-Channel E-Commerce Sellers

- Sellers who operate on 2+ marketplaces simultaneously
- Revenue range: ₹5 Lakh to ₹50 Lakh per month
- Pain: Fragmented data, manual reporting, no cross-channel visibility
- Geography: India-first (Flipkart, Snapdeal, Razorpay pricing), expanding globally (Amazon, eBay, Etsy, Shopify)

### Seller Personas

| Persona | Description | Key Need |
|---------|-------------|----------|
| **Solo Founder** | Runs own D2C brand on Shopify + listed on Flipkart/Amazon | Needs unified revenue tracking without hiring an analyst |
| **Small Team (2-5)** | Growing brand across 4-5 marketplaces | Needs automated reporting and stockout prevention |
| **Mid-Size Operation (5-20)** | Mature seller on all major platforms | Needs channel-product fit analysis to optimize allocation |
| **Agency Managing Multiple Brands** | Manages marketplace operations for clients | Needs per-client dashboards and automated briefings |

### Industries Supported (from onboarding flow)

The platform supports these business verticals (tracked via BusinessProfile):
- Fashion & Apparel
- Electronics & Gadgets
- Home & Kitchen
- Health & Beauty
- Food & Beverages
- Sports & Outdoors
- Books & Media
- Toys & Games
- Automotive
- Other

---

## Technical Architecture (for credibility section if needed)

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, React 19, Tailwind CSS |
| **Backend** | Next.js API Routes (serverless) |
| **Database** | PostgreSQL (Supabase) |
| **ORM** | Prisma |
| **AI Engine** | OpenAI function-calling (GPT) with 11 custom tools |
| **Email** | Resend |
| **Payments** | Razorpay |
| **Authentication** | Custom JWT with bcrypt hashing |
| **Encryption** | AES-256-GCM for all tokens at rest |
| **Cron Jobs** | Vercel Cron (sync, briefings, alerts, cleanup) |
| **Rate Limiting** | Redis-backed per-endpoint limits |

---

## Competitive Positioning

### Why Frame Is Different

| Traditional Analytics Tools | Frame |
|----------------------------|-------|
| Complex dashboards with 50+ tabs | One chat interface — just ask |
| Single-marketplace focus (Shopify OR Amazon) | 9 marketplaces unified |
| Manual CSV exports and spreadsheets | Automated daily/weekly/monthly briefings |
| No cross-channel intelligence | Channel-Product Fit engine with market demand signals |
| ₹8,000-80,000+/month | ₹999/month starting |
| Static reports you have to read | AI that learns your business and gets smarter over time |
| Setup takes days/weeks | 2-minute OAuth connection, no technical setup |

### Unique Selling Points (in priority order)

1. **Conversational AI Interface** — No dashboards to learn. Just ask Frax.
2. **True Multi-Marketplace Unification** — 9 platforms, one data model, one answer.
3. **Channel-Product Fit Engine** — Proprietary scoring that tells you WHERE to sell WHAT. No competitor does this.
4. **Automated Briefings** — Insights arrive in your inbox daily, weekly, monthly. Zero effort.
5. **Growing AI Memory** — Frax learns your business patterns and gets better with every interaction.
6. **Affordable** — Starting at ₹999/month vs enterprise-tier competitors.

---

## SEO Keywords to Target

- multi-channel e-commerce analytics
- AI e-commerce assistant
- marketplace analytics platform
- Shopify Amazon analytics combined
- unified e-commerce dashboard
- multi-marketplace inventory management
- AI-powered seller analytics
- Flipkart Shopify analytics
- cross-channel e-commerce insights
- e-commerce AI chatbot for sellers

---

## Page Behavior Notes for Relume

1. **Animations:** Use fade-up-on-scroll (IntersectionObserver) for all sections. Stagger delays (0.1s between items in grids).
2. **Color Palette:** Primary gradient: teal-500 (#14b8a6) → emerald-500 (#10b981). Dark sections: slate-800/900. Accent: violet-500 for secondary highlights.
3. **Typography:** Bold, tight tracking for headlines. Relaxed line-height for body text. Use monospace or code font for metrics/numbers.
4. **Responsiveness:** Mobile-first. The integration hub visualization should scale down proportionally (transform: scale). Feature grid: 1 col mobile → 2 col tablet → 3 col desktop.
5. **Interactions:** Hover effects on all cards (lift, shadow increase, border color change, gradient line at bottom). Marketplace nodes in integration hub should scale up on hover.
6. **CTAs:** Every section should have a clear path to "Request a Free Trial". Primary CTA is the trial modal, secondary CTA is "Watch Demo" scroll.
7. **Performance:** Lazy-load the integration hub SVG animation. Defer non-critical animations. Prioritize hero LCP.
