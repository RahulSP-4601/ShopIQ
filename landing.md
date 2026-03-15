# FRAX Analytics — Landing Page Specification

> This document is a complete content and structure specification for Relume.io to generate a professional, conversion-optimized landing page for **FRAX Analytics** — an AI-powered multi-marketplace e-commerce analytics platform.
>
> **Design Philosophy:** Every section should feel like it was built by a team that obsesses over craft. Clean whitespace, purposeful animation, typographic hierarchy, and data-rich visuals. The page should immediately communicate: *"This is a serious, premium product built by people who understand e-commerce."*

---

## Brand Identity

- **Product Name:** FRAX
- **Tagline:** "Your AI-Powered Commerce Intelligence Platform"
- **AI Assistant Name:** Frax
- **Primary Colors:** Teal (#14b8a6) → Emerald (#10b981) gradient
- **Secondary Colors:** Slate (#0f172a for text), Violet (#8b5cf6 for accents), Amber (#f59e0b for highlights/alerts)
- **Logo:** Custom logo (logo.png), displayed alongside "FRAX" text with "Analytics" subtitle
- **Tone:** Professional, confident, data-driven. Not salesy or fluffy — speaks like a business analyst presenting to a founder. Use specific numbers wherever possible. Every claim should feel backed by data.
- **Domain:** app.frax.com
- **Typography:**
  - Headlines: Inter (or equivalent sans-serif), bold (700), tight tracking (-0.02em)
  - Body: Inter, regular (400), relaxed line-height (1.6)
  - Metrics/Numbers: JetBrains Mono (or equivalent monospace), semi-bold — gives data a "live dashboard" feel
  - Section Labels: Uppercase, letter-spacing 0.1em, text-xs, teal-600
- **Motion Principles:**
  - Subtle, purposeful — never decorative for its own sake
  - Fade-up-on-scroll (IntersectionObserver) for all sections, stagger 0.1s between grid items
  - Numbers animate in (count-up) when they enter the viewport
  - Hover states: cards lift 4px with shadow expansion + subtle border glow
  - Prefer opacity + transform transitions (GPU-accelerated) over layout shifts

---

## Page Structure (Top to Bottom)

---

### 1. NAVBAR

**Layout:** Fixed top, transparent on load → frosted glass (white/80 + backdrop-blur-xl + subtle bottom border slate-200/50) on scroll. Height: 64px. z-index: 50.

**Left:** Logo + "FRAX" (font-bold text-xl) + "Analytics" (text-sm text-slate-500 font-medium) — logo and text vertically centered.

**Center:** Navigation links — Features | Integrations | How it Works | Pricing
- Links: text-sm font-medium text-slate-600, hover:text-teal-600 with underline slide-in animation from left
- Active link detection based on scroll position (highlight current section)

**Right:**
- Trust badge pill: "SOC 2 Certified" with shield icon (emerald-600 bg, white text, rounded-full) — small, subtle
- "Sign in" text link (text-slate-600 hover:text-slate-900)
- "Get Started" button (teal-to-emerald gradient, white text, rounded-lg, right arrow icon, hover: shadow-lg shadow-teal-500/25 + slight scale(1.02))

**Mobile:** Hamburger icon (3-line) → full-screen overlay with backdrop blur. Navigation links stacked vertically, large tap targets (48px height). "Sign in" and "Get Started" at bottom. Smooth slide-in from right animation.

---

### 2. HERO SECTION

**Goal:** In 3 seconds, the visitor should understand: (1) what FRAX does, (2) who it's for, and (3) why it's different. This is the single most important section on the page.

**Background:** Full-width section. Soft radial gradient from teal-50/30 center → white edges. Three decorative blur orbs:
- Teal orb (400x400px, opacity 20%) — top-right, slightly off-screen
- Blue/violet orb (300x300px, opacity 15%) — top-left
- Emerald orb (200x200px, opacity 10%) — bottom-center, behind the CTA area
- Subtle dot-grid pattern overlay (slate-200, opacity 5%) for texture

**Layout:** Two columns on desktop (60/40 split). Left: Copy + CTAs. Right: Hero visual. Stacked on mobile (copy first, visual below).

**Eyebrow Badge (above headline):**
A small pill/chip that draws attention:
```
[sparkle icon] Powered by AI  ·  Trusted by 10,000+ sellers
```
Style: bg-teal-50 border border-teal-200 text-teal-700 text-sm rounded-full px-4 py-1. The sparkle icon has a subtle shimmer animation (CSS keyframe).

**Headline (H1):**
```
Stop Guessing.
Start Knowing.
```
Style: text-5xl (desktop) / text-3xl (mobile), font-bold, tracking-tight, text-slate-900.
"Start Knowing." is in teal-to-emerald gradient text (background-clip: text).

**Alternative headline option (if above feels too abstract):**
```
One AI. Every Marketplace.
Total Clarity.
```

**Subheadline:**
```
FRAX connects Shopify, Amazon, eBay, Etsy, Flipkart and 4 more marketplaces
into one AI-powered command center. Ask questions in plain English — get
instant, data-backed answers across all your sales channels.
```
Style: text-lg text-slate-600, max-w-xl, leading-relaxed. Marketplace names in semi-bold.

**CTA Buttons (side by side, gap-4):**
1. **Primary:** "Start Free Trial" → teal-to-emerald gradient, white text, rounded-lg, px-8 py-3.5, font-semibold. Right arrow icon (→) with hover slide-right animation. Shadow: shadow-lg shadow-teal-500/25. Hover: shadow-xl shadow-teal-500/30 + scale(1.02). Opens trial modal.
2. **Secondary:** "See It In Action" → white bg, slate-800 text, border border-slate-200, rounded-lg, px-8 py-3.5. Play circle icon. Hover: bg-slate-50 + border-slate-300. Smooth-scrolls to interactive demo section.

**Trust Signals (below CTAs, inline row, gap-6):**
Four items with muted green checkmark circles (bg-emerald-50 text-emerald-600):
- No credit card required
- 2-minute setup
- 30-day free trial
- Cancel anytime

**Hero Visual (right column):**
A 3D-perspective tilted screenshot of the FRAX dashboard/chat interface, floating with a subtle shadow. The screenshot should show:
- The Frax chat interface with a sample conversation
- A mini revenue chart visible in the sidebar
- Marketplace connection indicators (green dots) for Shopify, Amazon, Flipkart
- Styled inside a macOS-style browser chrome (subtle, minimal)

The screenshot should have:
- Slight perspective transform (rotateY(-5deg) rotateX(2deg))
- Layered drop shadow for depth
- Subtle floating animation (translateY oscillating 8px over 6s, ease-in-out)
- Small decorative elements around it: a floating notification badge ("Revenue up 18%"), a small chart sparkline, a green "synced" indicator — these float around the main visual and add visual interest

---

### 3. LOGO BAR — "Trusted by Sellers On"

**Purpose:** Immediately establish credibility by showing the marketplace logos the user already knows and trusts. This is not about FRAX's customers — it's about the marketplaces FRAX integrates with. Subtle but effective trust transfer.

**Layout:** Full-width, bg-white, py-12. Subtle top/bottom border (slate-100).

**Label (centered above logos):**
```
Connecting sellers across the world's top marketplaces
```
Style: text-sm text-slate-400 uppercase tracking-widest font-medium.

**Marketplace Logos (horizontal row, evenly spaced, vertically centered):**
All logos in grayscale (opacity 40%), transitioning to full color on hover. Logos:
Shopify · Amazon · eBay · Etsy · Flipkart · BigCommerce · Square · Wix · WooCommerce

On mobile: horizontal auto-scroll (marquee-style, CSS animation, no JS) with seamless loop. Desktop: static row.

---

### 4. INTERACTIVE DEMO — "See Frax in Action"

**Purpose:** This is the "aha moment" section. Visitors should watch the AI conversation and immediately think: *"I need this for my business."* It replaces the need for a video demo.

**Section Label:** "LIVE DEMO"
**Badge:** Small pill: "Interactive" with a pulsing green dot
**Headline:** "See **Frax** in Action" — "Frax" in violet gradient text
**Subheadline:** "Watch how sellers use conversational AI to get instant answers about their business. No dashboards to learn. Just ask."

**Visual:** A centered, large browser-chrome mockup (macOS-style window with red/amber/green dots, address bar showing "app.frax.com/chat").

**Layout inside the mockup — two panels:**
- **Left panel (30%):** A sidebar showing:
  - User avatar + name ("Rahul's Store")
  - Connected marketplaces with green status dots: Shopify, Amazon, Flipkart, eBay
  - Quick stats: "4 stores · 1,247 products · Last synced: 2 min ago"
  - A "New Chat" button
- **Right panel (70%):** The AI chat conversation area

**Rotating conversations (auto-cycles every 7 seconds, smooth cross-fade transition. Also manually navigable via dot indicators + left/right arrows below):**

Each conversation appears with a typing animation — user message slides in from right, then Frax's reply types in with a brief "Frax is thinking..." indicator before the answer appears.

**Conversation 1 — Revenue Intelligence:**
**User:** "What was my total revenue across all channels last week?"
**Frax:** "Last week across all 4 marketplaces:

| Channel | Revenue | Share | vs Prev Week |
|---------|---------|-------|-------------|
| Amazon | $22,450 | 47% | +24% |
| Shopify | $14,280 | 30% | +12% |
| Flipkart | $7,890 | 17% | +8% |
| eBay | $2,762 | 6% | -3% |

**Total: $47,382** — up **18%** from the prior week. Amazon drove most of the growth. Your eBay channel dipped slightly — want me to dig into why?"

**Conversation 2 — Channel-Product Fit:**
**User:** "Where should I sell my wireless earbuds?"
**Frax:** "I ran a channel-product fit analysis on your Wireless Earbuds Pro:

**Best fit: Amazon** — Score 92/100
Your earbuds already do well on Shopify ($4,200/mo) but Amazon's electronics category has 3x the demand velocity. Similar products on Amazon average $6,800/mo.

**Recommendation:** EXPAND to Amazon. Estimated uplift: **+$2,600/month** in additional revenue.

Your Flipkart listing scores 74/100 — solid, but your price is 18% above market average there. Consider a small price adjustment."

**Conversation 3 — Automated Alerts:**
**User:** "Any alerts I should know about?"
**Frax:** "3 alerts flagged this morning:

1. **CRITICAL** — Summer Dress (Flipkart): Only **3 units** left. Selling 8/day. Stockout in ~9 hours. Restock immediately.
2. **HIGH** — Wireless Earbuds (Amazon): Demand surge detected. Weekly velocity jumped from 45 to 112 units. Consider increasing inventory allocation.
3. **MEDIUM** — Laptop Bag (eBay): Return rate hit 12% this week (was 4%). Possible quality or listing issue — worth investigating.

Want me to draft a restock plan?"

**Conversation 4 — Customer Intelligence:**
**User:** "Who are my top customers and what are they buying?"
**Frax:** "Your top 5 customers by lifetime value:

1. **Priya M.** — $4,280 LTV · 23 orders · Mostly Fashion (Flipkart)
2. **James K.** — $3,920 LTV · 18 orders · Electronics (Amazon + Shopify)
3. **Ankit S.** — $3,100 LTV · 31 orders · Home & Kitchen (Flipkart)
4. **Sarah L.** — $2,890 LTV · 12 orders · High-AOV Electronics (Shopify)
5. **Ravi P.** — $2,450 LTV · 27 orders · Mixed categories (Amazon)

**Insight:** 68% of your top customers buy from multiple categories. Cross-selling could increase LTV by an estimated 15-20%."

**Conversation 5 — Daily Briefing Preview:**
**User:** "Give me my morning briefing"
**Frax:** "Good morning! Here's your daily briefing for Feb 25:

**Yesterday's Performance:**
Revenue: **$6,847** across 4 channels (+11% vs 7-day avg)
Orders: **94** (Amazon 41, Flipkart 28, Shopify 19, eBay 6)
Top seller: Wireless Earbuds Pro — 34 units, $2,380

**Attention needed:**
- Flipkart Summer Dress is critically low (3 units left)
- Amazon conversion rate dipped to 3.2% (was 4.1%) — listing may need refresh
- New repeat buyer milestone: 500th repeat customer this month

Your full briefing was also sent to your email at 7:00 AM."

**Navigation below mockup:** 5 dot indicators (active dot = teal, others = slate-300) + subtle left/right arrow buttons. Below dots, five category labels users can click: "Revenue" · "Product Fit" · "Alerts" · "Customers" · "Briefings"

---

### 5. SOCIAL PROOF METRICS

**Purpose:** Quantify credibility. Numbers sell.

**Layout:** Full-width section, bg-slate-900 (dark). Py-16. Four stat cards in a horizontal grid with generous spacing.

**Visual treatment:** Each stat has a large number in white with monospace font (JetBrains Mono), a label below in slate-400, and a subtle gradient accent line (4px) at the top of each card matching its theme color. Numbers animate in (count-up from 0) when they scroll into view.

| Stat | Label | Accent Color | Icon |
|------|-------|-------------|------|
| $2B+ | Revenue Analyzed | Teal | Chart trending up |
| 50K+ | Active Sellers | Blue | Users group |
| 9 | Marketplace Integrations | Violet | Grid/puzzle |
| 99.9% | Uptime SLA | Emerald | Shield check |

**Subtle background:** Dark mesh gradient or very faint topographic pattern in slate-800 for texture.

---

### 6. INTEGRATIONS SECTION — "Your Command Center"

**Section Label:** INTEGRATIONS
**Badge:** "Real-Time Sync" with animated green ping dot (CSS animation: scale pulse 0→1 with opacity fade)
**Headline:** "One Dashboard. **Every Marketplace.**" — "Every Marketplace." in teal-to-emerald gradient text
**Subheadline:** "Connect once with secure OAuth. FRAX syncs your orders, products, and inventory in real-time — normalizing data from every channel into one unified view. No API keys. No CSV exports. No manual work."

**Visual — Orbital Hub Animation:**
A large, centered orbital visualization (min 600px wide on desktop):

- **Center:** FRAX logo inside a glowing white circle (box-shadow: 0 0 60px rgba(20,184,166,0.3)) with two concentric animated rings (rotating slowly, opposite directions, dashed/dotted stroke, teal-200 opacity 30%)
- **9 marketplace nodes** arranged in a circle around the center, each connected to the hub with animated particle lines (small dots traveling along the connection lines from node → center, representing data flow)
- **Each node:** White circle (64px) with subtle shadow, colored border (2px) matching the marketplace brand color. Contains: marketplace logo (32px), name label below, and a small green "Live" badge (bg-emerald-500, text-white, text-[10px])
- **Hover behavior:** Node scales to 1.15x, shadow deepens, a tooltip appears showing: marketplace name, integration type, and a one-line description
- **Mobile adaptation:** Nodes arranged in a 3x3 grid instead of orbital circle. Center logo at top. Connection lines become subtle gradient lines from each node upward.

**The 9 Supported Marketplaces:**

| # | Marketplace | Brand Color | Integration Type | Description |
|---|-------------|-------------|-----------------|-------------|
| 1 | **Shopify** | #95BF47 | OAuth 2.0 + Webhooks | The world's leading e-commerce platform. Real-time webhook sync for instant order and product updates. |
| 2 | **Amazon** | #FF9900 | OAuth 2.0 + Polling | The largest online marketplace globally. Connect your Seller Central account to unify Amazon data. |
| 3 | **eBay** | #E53238 | OAuth 2.0 + Polling | Global auction and fixed-price marketplace. Automatic token refresh with 2-hour rotation. |
| 4 | **Etsy** | #F56400 | OAuth 2.0 + PKCE | The go-to marketplace for handmade, vintage, and creative goods. Automatic token rotation. |
| 5 | **Flipkart** | #2874F0 | OAuth 2.0 + Polling | India's largest e-commerce marketplace. Automatic credential refresh. |
| 6 | **BigCommerce** | #121118 | Webhooks + Polling | Enterprise-grade e-commerce. Real-time webhooks with permanent access tokens. |
| 7 | **Square** | #006AFF | OAuth 2.0 + PKCE + Webhooks | Omnichannel commerce (online + POS). Real-time webhook sync with 30-day token lifecycle. |
| 8 | **Wix** | #0C6EFC | OAuth 2.0 + Polling | Popular website builder with integrated e-commerce. |
| 9 | **WooCommerce** | #96588A | API Key + Polling | WordPress-based e-commerce plugin. Self-hosted store integration. |

**Three key points below the visualization (horizontal cards):**

| Icon | Title | Description |
|------|-------|-------------|
| Lock | **One-Click Secure Connect** | OAuth 2.0 authentication — no API keys to copy-paste. Read-only access means FRAX never modifies your store. |
| Zap | **Real-Time Sync** | Webhooks push updates instantly (Shopify, BigCommerce, Square). All others sync every 15 minutes automatically. |
| Layers | **Unified Data Model** | Orders, products, customers, and inventory from every marketplace normalized into one consistent schema. |

---

### 7. AI SHOWCASE — "Meet Frax, Your AI Analyst"

**Purpose:** This is a dedicated section to sell the AI — the core differentiator. Visitors need to understand that Frax is not a chatbot with canned responses. It's a sophisticated analytics engine with real tools, memory, and evolving intelligence.

**Section Label:** AI ENGINE
**Badge:** "Proprietary AI" with sparkle icon
**Headline:** "Meet **Frax** — Your AI Commerce Analyst" — "Frax" in violet-to-purple gradient
**Subheadline:** "Frax isn't a generic chatbot. It's a purpose-built analytics engine with 11 specialized tools, a growing memory system, and deep understanding of multi-channel commerce. Ask anything. Get specific, data-backed answers in seconds."

**Layout:** Two columns on desktop. Left: feature list. Right: visual.

**Left Column — Frax's Capabilities (stacked cards with icons):**

**Card 1 — 11 Specialized Analytics Tools**
- Icon: Wrench/tool (teal)
- Description: "Revenue metrics, top products, customer segments, inventory turnover, channel comparison, and more. Frax selects the right tool for your question automatically."
- Visual accent: A horizontal row of 11 small tool icons (like a toolbar), each with a tooltip on hover showing the tool name

**Card 2 — Natural Language Understanding**
- Icon: MessageSquare (blue)
- Description: "No query language. No filters to configure. Ask in plain English: *'How did my electronics do on Amazon this month vs last month?'* — Frax understands context, time ranges, products, and channels."

**Card 3 — Working Memory**
- Icon: Brain (violet)
- Description: "Frax remembers your business context across conversations. Mention a product today, and Frax may reference it tomorrow. Over time, it builds a deeper understanding of your operations — evolving from Apprentice to Expert."

**Card 4 — Proactive Intelligence**
- Icon: Bell/alert (amber)
- Description: "Don't wait for problems. Frax detects stockout risks, demand surges, and revenue anomalies automatically — and alerts you before they impact your business."

**Right Column — Visual:**
A stylized "Frax brain" visualization or an animated schematic showing:
- Center: Frax avatar/icon (the AI)
- Connected to 11 tool nodes in a semicircle (each labeled: Revenue, Products, Customers, Stock, Channels, etc.)
- Animated lines showing data flowing from tools → Frax → user response
- A "memory" section showing small note cards fading in/out (representing working memory)
- A confidence/maturity meter showing "Professional" stage with a progress bar

**Below the two columns — The 11 Tools Grid:**
A compact 3-column grid (4-3-4 arrangement) showing all 11 tools as small interactive cards:

| # | Tool | Icon | One-Line Description |
|---|------|------|---------------------|
| 1 | Revenue Metrics | TrendingUp | Total revenue, order count, AOV for any period |
| 2 | Top Products | Package | Best sellers ranked by revenue or units |
| 3 | Top Customers | Users | Highest-spending customers by lifetime value |
| 4 | Daily Revenue | BarChart | Day-by-day breakdown with trend detection |
| 5 | Store Overview | LayoutDashboard | Connected stores, sync status, product count |
| 6 | Low Stock | AlertTriangle | Products at risk of stockout |
| 7 | Channel Compare | ArrowLeftRight | Performance comparison across marketplaces |
| 8 | Period Compare | Calendar | Week-over-week, month-over-month growth |
| 9 | Inventory Turnover | RefreshCw | Stock velocity and capital efficiency |
| 10 | Customer Segments | PieChart | One-time vs repeat vs VIP breakdown |
| 11 | Channel-Product Fit | Target | Where to sell what — scored 0-100 |

Each card: hover → scale(1.03) + teal border glow. Clicking a card shows a sample question and answer for that tool in a small popover.

---

### 8. CHANNEL-PRODUCT FIT — "Know Where to Sell What"

**Purpose:** This is FRAX's most unique, proprietary feature. No competitor offers this. It deserves its own prominent section to drive differentiation and "I need this" reactions.

**Section Label:** EXCLUSIVE FEATURE
**Badge:** "Only on FRAX" with a star icon — bg-violet-50, text-violet-700
**Headline:** "Know Exactly **Where to Sell What**" — "Where to Sell What" in emerald gradient
**Subheadline:** "FRAX's Channel-Product Fit Engine analyzes 7 performance signals to score how well each product fits each marketplace — then gives you specific, actionable recommendations."

**Layout:** Full-width section with light teal-50/30 background and subtle dot pattern.

**Visual — The Score Card Mockup:**
A large, centered product card showing a real-looking example:

```
┌─────────────────────────────────────────────────────────┐
│  Wireless Earbuds Pro                                   │
│  SKU: WEP-2024  ·  Connected on: Shopify, Flipkart     │
│                                                         │
│  Channel Fit Scores:                                    │
│  ┌──────────┬───────┬────────────┬──────────────────┐   │
│  │ Channel  │ Score │ Confidence │ Recommendation   │   │
│  ├──────────┼───────┼────────────┼──────────────────┤   │
│  │ Amazon   │ 92    │ HIGH       │ ★ EXPAND         │   │
│  │ Shopify  │ 85    │ HIGH       │   Active         │   │
│  │ Flipkart │ 74    │ MEDIUM     │   REPRICE (-18%) │   │
│  │ eBay     │ 61    │ MEDIUM     │   Monitor        │   │
│  │ Etsy     │ 23    │ LOW        │   DEPRIORITIZE   │   │
│  └──────────┴───────┴────────────┴──────────────────┘   │
│                                                         │
│  Estimated uplift from expanding to Amazon: +$2,600/mo  │
└─────────────────────────────────────────────────────────┘
```

This should be rendered as a polished, styled card component — not raw ASCII. Use colors: green for high scores (80+), amber for medium (50-79), red for low (<50). Recommendation badges should be colored pills.

**The 7 Signals (below the card, in a horizontal row with icons):**

| Signal | Icon | Description |
|--------|------|-------------|
| Revenue Velocity | DollarSign | Revenue generated per day on this channel |
| Unit Velocity | Package | Units sold per day — demand indicator |
| Price Position | Tag | Your price vs market average on this channel |
| Sales Trend | TrendingUp | Upward or downward momentum (slope) |
| Trend Consistency | Target | R-squared reliability of the trend |
| Inventory Turnover | RefreshCw | How fast your stock moves |
| Return Rate | RotateCcw | Percentage of orders returned |

Style: Each signal is a compact card (icon + name + one-line description). Row scrolls horizontally on mobile. Desktop: all 7 visible.

**5 Recommendation Types (below signals, as colored cards):**

| Type | Color | Icon | Description | Example |
|------|-------|------|-------------|---------|
| **EXPAND** | Emerald | ArrowUpRight | List this product on a new marketplace | "Your earbuds score 92 for Amazon — list them there" |
| **CONNECT** | Blue | Link | High potential on a marketplace you haven't connected | "Electronics have strong demand on Amazon — connect to capture it" |
| **RESTOCK** | Amber | AlertTriangle | Inventory critically low for a high performer | "Only 3 units left on Flipkart — restock immediately" |
| **REPRICE** | Violet | Tag | Price is misaligned with market demand | "18% above Etsy market average — consider adjusting" |
| **DEPRIORITIZE** | Slate | TrendingDown | Underperforming on this channel — reallocate effort | "Laptop Bag scores 18/100 on Snapdeal — focus elsewhere" |

---

### 9. REPORTS & ALERTS — "Insights That Come to You"

**Purpose:** Showcase that FRAX doesn't just answer questions — it proactively delivers intelligence to your inbox and alerts you to problems before they hurt your business.

**Section Label:** AUTOMATION
**Badge:** "Zero Effort" with a mail icon
**Headline:** "Insights Delivered. **Automatically.**" — "Automatically." in teal gradient
**Subheadline:** "Get daily briefings, weekly trend analysis, and real-time alerts — all delivered to your inbox without lifting a finger."

**Layout:** Two visual blocks side by side on desktop, stacked on mobile.

**Left Block — Email Briefings:**
A stylized email mockup (like a floating email card with subtle shadow and tilt) showing a preview of the Daily Briefing:

```
┌─────────────────────────────────────────────────┐
│  From: Frax <frax@frax.com>                    │
│  Subject: Your Morning Briefing — Feb 25        │
│─────────────────────────────────────────────────│
│                                                 │
│  Good morning! Here's yesterday's snapshot:     │
│                                                 │
│  Revenue: $6,847 (+11% vs 7-day avg)            │
│  Orders: 94 across 4 channels                   │
│  Top Seller: Wireless Earbuds Pro (34 units)    │
│                                                 │
│  ⚠ Summer Dress (Flipkart): 3 units left        │
│  📈 Amazon conversion rate needs attention       │
│                                                 │
│  [Open Full Report →]                           │
└─────────────────────────────────────────────────┘
```

Below the email mockup, four small timeline badges showing the briefing schedule:

| Time | Briefing | Frequency |
|------|----------|-----------|
| 07:00 UTC | **Morning Coffee** | Every day — yesterday's performance snapshot |
| Monday 00:00 | **Weekly Trends** | Every Monday — full week analysis with growth metrics |
| Bi-Weekly | **Momentum Report** | Every 2 weeks — multi-week patterns and emerging trends |
| 1st of Month | **Monthly Strategy** | Monthly — comprehensive 200-300 word strategic review |

**Right Block — Proactive Alerts:**
A notification stack showing 3 alert cards, slightly overlapping (like iOS notification stack), each with severity color coding:

**Alert 1 (Critical — Red left border):**
```
🔴 STOCKOUT RISK
Summer Dress · Flipkart
3 units left · Selling 8/day · Stockout in ~9 hours
[Action: Restock Now]
```

**Alert 2 (High — Amber left border):**
```
🟡 DEMAND SURGE
Wireless Earbuds · Amazon
Weekly velocity: 45 → 112 units (+149%)
[Action: Increase Allocation]
```

**Alert 3 (Medium — Blue left border):**
```
🔵 RETURN ANOMALY
Laptop Bag · eBay
Return rate: 4% → 12% this week
[Action: Investigate Listing]
```

**Key messaging below (three compact points):**
- **Hourly monitoring** — Stockouts, demand surges, revenue anomalies, return patterns
- **Smart deduplication** — Same alert never fires twice
- **Severity classification** — Low / Medium / High / Critical with clear action items

---

### 10. FEATURES SECTION — "Everything You Need to Scale"

**Section Label:** FEATURES
**Headline:** "Built for Sellers Who **Think in Data**" — "Think in Data" in teal gradient
**Subheadline:** "Every feature designed to replace hours of manual work with seconds of intelligent automation."

**Layout:** 2x3 grid on desktop, single column on mobile. Each card has generous padding, subtle border (slate-100), rounded-xl, and a colored icon area at the top.

**Card hover state:** translateY(-4px) + shadow-lg + top border becomes a 3px gradient line matching the card's accent color.

#### Feature 1: Unified Dashboard
- **Icon:** LayoutDashboard (teal, inside teal-50 rounded-lg icon box)
- **Title:** "All Channels, One View"
- **Description:** "Revenue, orders, inventory, and customers from every marketplace — unified into one conversational interface. Stop switching between 7 tabs."
- **Micro-stat:** "Replaces ~3 hours of daily manual reporting"

#### Feature 2: AI-Powered Insights
- **Icon:** Sparkles (violet, inside violet-50 icon box)
- **Title:** "Ask in English, Get Numbers"
- **Description:** "Frax understands natural language and has 11 specialized analytics tools. Ask 'How did my electronics do on Amazon this month?' and get a specific, data-backed answer in seconds."
- **Micro-stat:** "11 analytics tools · Unlimited queries"

#### Feature 3: Channel-Product Fit
- **Icon:** Target (emerald, inside emerald-50 icon box)
- **Title:** "Know Where to Sell What"
- **Description:** "Proprietary 7-signal scoring engine rates every product's fit on every marketplace (0-100). Get EXPAND, RESTOCK, REPRICE, and DEPRIORITIZE recommendations backed by real data."
- **Micro-stat:** "Only available on FRAX"
- **Badge:** "Exclusive" pill (violet)

#### Feature 4: Inventory Intelligence
- **Icon:** AlertTriangle (amber, inside amber-50 icon box)
- **Title:** "Never Miss a Stockout"
- **Description:** "Hourly monitoring across all channels. Proactive alerts for stockout risks, demand surges, and return anomalies — classified by severity and delivered before they impact revenue."
- **Micro-stat:** "Hourly checks · 4 severity levels"

#### Feature 5: Automated Reports
- **Icon:** Mail (rose, inside rose-50 icon box)
- **Title:** "Insights in Your Inbox"
- **Description:** "Daily morning briefings, weekly trend analysis, bi-weekly momentum reports, and monthly strategic reviews — delivered automatically. Plus on-demand report generation inside the app."
- **Micro-stat:** "4 report cadences · Zero manual effort"

#### Feature 6: Enterprise Security
- **Icon:** Shield (emerald, inside emerald-50 icon box)
- **Title:** "Bank-Grade Security"
- **Description:** "AES-256-GCM token encryption, HMAC-SHA256 webhook verification, HTTP-only JWT sessions, automatic PII cleanup, and GDPR-compliant data handling. Read-only access to your stores — FRAX never modifies your data."
- **Micro-stat:** "SOC 2 Certified · GDPR Compliant"

---

### 11. EXAMPLE QUESTIONS — "Ask Anything About Your Business"

**Section Label:** EXAMPLES
**Badge:** "Try These" with a lightbulb icon
**Headline:** "Ask **Anything** About Your Business" — "Anything" in emerald-to-teal gradient
**Subheadline:** "From revenue breakdowns to customer segments to inventory alerts — Frax handles it all. Here are some of our sellers' favorite questions."

**Layout:** 2-column grid on desktop (4 per column), single column stacked on mobile.

**Card style:** Each card has a subtle left border accent (alternating colors from the palette), a question-mark icon (muted), the question text, and a right-arrow chevron. Hover: bg-slate-50 + left border becomes teal gradient + slight translateX(4px) on the arrow.

**12 example questions (expanded from 8 to show breadth):**

**Revenue & Sales:**
1. "What was my total revenue across all channels last week?"
2. "Compare this month's Amazon sales to last month"
3. "What time of day do I get the most orders?"

**Products & Inventory:**
4. "Which products are selling best on Flipkart this month?"
5. "Which products are running low on stock?"
6. "What's my inventory turnover rate for electronics?"

**Customers:**
7. "Who are my top 10 customers by lifetime value?"
8. "How many new customers did I get this week?"
9. "Break down my customers: one-time vs repeat vs VIP"

**Cross-Channel Intelligence:**
10. "Where should I sell my wireless earbuds?"
11. "Compare my Shopify vs Amazon performance"
12. "Which products have the highest return rate on eBay?"

---

### 12. HOW IT WORKS — "Get Started in 3 Steps"

**Section Label:** HOW IT WORKS
**Headline:** "Up and Running in **Under 2 Minutes**" — "Under 2 Minutes" in teal gradient
**Subheadline:** "No technical setup. No API keys. No spreadsheets. Connect your first marketplace and start asking questions immediately."

**Layout:** Three steps in a horizontal row on desktop, connected by a gradient line (teal → violet → amber) that flows through all three step numbers. On mobile: vertical stack with the gradient line running down the left side.

Each step has: a large step number (01, 02, 03) in the accent color, a title, description, feature pills, and a small illustrative icon/visual.

#### Step 01 — Connect Your Stores
- **Accent Color:** Teal
- **Icon/Visual:** A small animation of a marketplace logo connecting to the FRAX hub with a "click" effect
- **Title:** "Connect in One Click"
- **Description:** "Choose any of 9 supported marketplaces, click Connect, authorize via OAuth, and you're done. FRAX securely stores your encrypted tokens and begins syncing your data immediately. Read-only access — we never modify your store."
- **Feature pills:** `Secure OAuth 2.0` · `Read-Only Access` · `AES-256 Encryption` · `Instant Sync`
- **Time estimate:** "~30 seconds per marketplace"

#### Step 02 — Ask Frax Anything
- **Accent Color:** Violet
- **Icon/Visual:** A chat bubble with a question mark morphing into a chart/answer
- **Title:** "Ask Questions, Get Answers"
- **Description:** "Type any question about your business in plain English. Frax analyzes your unified data across all connected channels and returns specific, actionable insights with real numbers — not vague summaries."
- **Feature pills:** `Natural Language AI` · `11 Analytics Tools` · `Cross-Channel Analysis` · `Working Memory`
- **Time estimate:** "Answers in ~3 seconds"

#### Step 03 — Grow on Autopilot
- **Accent Color:** Amber/Orange
- **Icon/Visual:** An inbox with report emails + alert notifications arriving
- **Title:** "Get Smarter Every Day"
- **Description:** "Automated briefings arrive in your inbox daily. Proactive alerts catch stockouts and surges before they cost you revenue. The Channel-Product Fit engine continuously finds new opportunities. Frax's AI memory grows smarter with every interaction."
- **Feature pills:** `Daily Briefings` · `Proactive Alerts` · `Channel-Product Fit` · `AI That Learns`
- **Time estimate:** "Fully automated — zero effort"

**Below steps — Social proof + CTA:**
"**2,847 sellers** started this week" — with an avatar stack (5-6 overlapping circular avatars with a "+2.8K" badge) positioned left, and a "Start Free Trial" teal gradient button on the right.

---

### 13. COMPETITOR COMPARISON — "Why Sellers Switch to FRAX"

**Purpose:** Directly address the "how is this different?" question. Position FRAX against the alternatives sellers already know (or their current manual workflow).

**Section Label:** COMPARISON
**Headline:** "Traditional Analytics **vs.** FRAX" — "vs." in violet
**Subheadline:** "See why multi-channel sellers are replacing dashboards, spreadsheets, and expensive tools with one AI conversation."

**Layout:** A clean comparison table with two columns. Left column (gray/muted) = "Traditional Tools / Manual Workflow". Right column (highlighted, subtle teal background) = "FRAX". Checkmark/X icons for quick visual scanning.

| Capability | Traditional Tools | FRAX |
|-----------|------------------|-------|
| **Multi-marketplace support** | Single platform focus (Shopify OR Amazon) | 9 marketplaces unified in one view |
| **Data consolidation** | Manual CSV exports + spreadsheets | Automatic real-time sync + unified data model |
| **Analytics interface** | Complex dashboards with 50+ tabs | Conversational AI — just ask in plain English |
| **Cross-channel intelligence** | Not available | Channel-Product Fit engine (7 signals, scored 0-100) |
| **Automated reporting** | Manual report building | Daily, weekly, bi-weekly, monthly briefings — auto-delivered |
| **Proactive alerts** | None — you discover problems after they happen | Hourly monitoring for stockouts, demand surges, anomalies |
| **AI memory & learning** | Static reports that never evolve | Frax remembers your business and gets smarter over time |
| **Setup time** | Days to weeks of configuration | 2 minutes — OAuth connect and go |
| **Typical cost** | ₹8,000 – ₹80,000+/month | Starting at ₹999/month |

**Style:** The "FRAX" column should have a subtle teal-50 background, green checkmarks, and slightly bolder text. The "Traditional" column should have a white/gray background with red X marks or gray dashes. Add a subtle "Winner" crown/star icon on the FRAX column header.

---

### 14. TESTIMONIALS — "What Sellers Are Saying"

**Purpose:** Social proof from real (or realistic placeholder) sellers. These should feel authentic — specific, detailed, and mentioning concrete results.

**Section Label:** TESTIMONIALS
**Headline:** "Loved by Sellers **Everywhere**" — "Everywhere" in teal gradient
**Subheadline:** "From solo founders to growing brands — here's what our sellers say about FRAX."

**Layout:** 3 testimonial cards in a horizontal row on desktop. On mobile, horizontal scroll (snap-to-card) with dot indicators.

**Card style:** White bg, rounded-xl, shadow-sm, border border-slate-100. Generous padding. 5-star rating at top (amber-400 stars). Quote text in slate-700 italic. Below: avatar (circular), name (bold), role, and a small marketplace badge showing which channels they use.

**Testimonial 1:**
> "I used to spend 2 hours every morning checking 4 different dashboards. Now I just ask Frax 'How did yesterday go?' and get the full picture in 10 seconds. The daily email briefings alone are worth the subscription."

— **Ankit Mehta**, Founder, Urban Craft Co.
Marketplaces: Shopify + Flipkart + Amazon
Result: "Saved 12+ hours/week on reporting"

**Testimonial 2:**
> "The Channel-Product Fit feature told me to expand my electronics line to eBay. I did, and it's now my third-highest revenue channel. No other tool gave me that recommendation — I wouldn't have thought of it myself."

— **Priya Sharma**, E-Commerce Manager, TechNova
Marketplaces: Amazon + Flipkart + eBay + Shopify
Result: "+32% revenue from channel expansion"

**Testimonial 3:**
> "FRAX caught a stockout risk on my best-selling product 8 hours before it would have run out. That single alert saved me an estimated ₹2.4 lakh in lost sales. The proactive alerts are genuinely a game-changer."

— **Rajesh Kumar**, Operations Head, StyleVault
Marketplaces: Flipkart + Amazon + Snapdeal
Result: "Prevented 3 stockouts in first month"

**Note for production:** Replace with real testimonials when available. These placeholders are written to sound specific and credible.

---

### 15. PRICING SECTION — "Simple, Transparent Pricing"

**Section Label:** PRICING
**Headline:** "One Plan. **All Features.** Scale As You Grow." — "All Features." in teal gradient
**Subheadline:** "No tiers to compare. No features locked behind paywalls. Every seller gets the complete platform."

**Layout:** Single centered pricing card (max-w-lg), prominent and clean. Flanked by subtle trust elements.

**Card Design:**

**Card Header (teal-to-emerald gradient background, rounded-t-2xl, py-8):**
- Badge: "Most Popular" with pulsing green dot — bg-white/20, text-white, rounded-full
- Plan name: **FRAX Pro** (text-white, text-2xl, font-bold)
- Price: **₹999** (text-white, text-5xl, font-bold, monospace) + "/month" (text-white/70, text-lg)
- Subtext: "+ ₹449/mo per additional marketplace" (text-white/60, text-sm)
- Equivalent: "~$12/month" (text-white/50, text-xs)

**Card Body (white, rounded-b-2xl, shadow-xl, py-8 px-8):**
- Section label: "EVERYTHING INCLUDED" (text-xs, uppercase, tracking-widest, text-slate-400, mb-4)
- Checklist (each item: green circle checkmark icon + text-slate-700):
  - 2 marketplace connections included
  - Unlimited AI queries with Frax
  - All 11 analytics tools
  - Channel-Product Fit recommendations
  - Automated daily, weekly & monthly reports
  - Proactive stockout & demand alerts
  - 1-year data history
  - AES-256 encryption + SOC 2 compliance
  - Priority support

**CTA Button:** "Start Your 30-Day Free Trial" (full-width, teal-to-emerald gradient, white text, font-semibold, py-4, rounded-lg, hover: shadow-lg shadow-teal-500/25)
**Trust line (below button):** "No credit card required · Full access · Cancel anytime" (text-sm, text-slate-400, flex with subtle icons)

**Expandable Pricing Calculator (below the card):**
A subtle "Calculate your cost →" link that expands to show:

**Header:** "Pricing Calculator"
**Interactive slider or dropdown:** "How many marketplaces do you sell on?" (range: 2-9)
**Dynamic display based on selection:**

| Marketplaces | Monthly Cost | Cost per Marketplace |
|-------------|-------------|---------------------|
| 2 (included) | ₹999 | ₹500/marketplace |
| 3 | ₹1,448 | ₹483/marketplace |
| 4 | ₹1,897 | ₹474/marketplace |
| 5 | ₹2,346 | ₹469/marketplace |
| 6 | ₹2,795 | ₹466/marketplace |
| 7 | ₹3,244 | ₹463/marketplace |
| 8 | ₹3,693 | ₹462/marketplace |
| 9 (all) | ₹4,142 | ₹460/marketplace |

**Insight text:** "The more you connect, the lower your per-marketplace cost — and the smarter Frax gets with cross-channel data."

---

### 16. FAQ SECTION — "Questions? We've Got Answers."

**Section Label:** FAQ
**Headline:** "Frequently Asked **Questions**" — "Questions" in teal gradient

**Layout:** Single-column accordion (max-w-3xl, centered). Each question is a clickable row that expands to reveal the answer. Only one open at a time. Smooth height animation.

**Style:** Clean, minimal. Question text: font-medium text-slate-900. Answer text: text-slate-600, leading-relaxed. Chevron icon rotates on open. Active question has subtle teal-50 background.

**10 FAQs:**

**Q1: How does the 30-day free trial work?**
A: Sign up, connect your marketplaces, and get full access to every feature — unlimited AI queries, all reports, all analytics tools. No credit card required. At the end of 30 days, choose to continue with a paid plan or your account pauses (no data is deleted).

**Q2: Does FRAX modify or write to my marketplace stores?**
A: No. FRAX uses strictly read-only API access. We sync your orders, products, and inventory data for analytics purposes only. We never create, update, or delete anything on your marketplaces.

**Q3: How long does setup take?**
A: Under 2 minutes. Click "Connect", authorize via OAuth on your marketplace, and FRAX begins syncing immediately. No API keys to copy, no webhooks to configure manually, no technical setup required.

**Q4: How is my data kept secure?**
A: All marketplace tokens are encrypted with AES-256-GCM before storage. Webhooks are verified with HMAC-SHA256 timing-safe comparison. Sessions use HTTP-only JWT cookies (no localStorage). Customer PII is encrypted and automatically cleaned after 365 days. We're SOC 2 certified and GDPR compliant.

**Q5: What marketplaces do you support?**
A: We currently support 9 marketplaces: Shopify, Amazon, eBay, Etsy, Flipkart, BigCommerce, Square, Wix, and WooCommerce. We're actively adding more — PrestaShop and additional platforms are on our roadmap.

**Q6: How often does data sync?**
A: Shopify, BigCommerce, and Square push updates in real-time via webhooks. All other marketplaces sync every 15 minutes automatically. You can also trigger a manual sync anytime from the dashboard.

**Q7: What can I ask Frax?**
A: Anything about your business data. Revenue breakdowns, top products, customer segments, inventory levels, channel comparisons, period-over-period trends, stockout risks, channel-product fit analysis — Frax has 11 specialized analytics tools and understands natural language. Just type your question like you'd ask a human analyst.

**Q8: What makes the Channel-Product Fit feature different?**
A: It's a proprietary engine that scores every product's performance on each marketplace using 7 signals (revenue velocity, unit velocity, price position, sales trend, trend consistency, inventory turnover, return rate). It then generates specific recommendations: EXPAND to new channels, RESTOCK low inventory, REPRICE misaligned products, or DEPRIORITIZE underperformers. No other platform offers this cross-channel intelligence.

**Q9: Can I use FRAX if I only sell on one marketplace?**
A: Yes, but FRAX's true power shines with 2+ marketplaces. With a single channel, you still get AI-powered analytics, automated reports, inventory alerts, and Frax as your analyst. But cross-channel comparison, channel-product fit, and unified reporting become available as soon as you connect a second marketplace.

**Q10: What happens to my data if I cancel?**
A: Your data remains intact for 30 days after cancellation, in case you change your mind. After 30 days, marketplace tokens are revoked and your data is permanently deleted in accordance with our GDPR-compliant data handling policy.

---

### 17. FINAL CTA BANNER

**Purpose:** Last chance to convert. High-impact, dark background, urgent but not pushy.

**Background:** Dark gradient (slate-900 → slate-800) with two large decorative blur orbs: teal (opacity 15%, top-left) and violet (opacity 10%, bottom-right). Subtle noise texture overlay for premium feel.

**Layout:** Centered, max-w-3xl.

**Headline (white, text-4xl, font-bold):**
```
Ready to See Your Business Clearly?
```

**Subheadline (slate-300, text-lg):**
```
Join 10,000+ sellers who replaced spreadsheets and fragmented dashboards
with one AI-powered command center.
```

**CTA Buttons (centered, side by side, gap-4):**
1. "Start Free Trial" → teal-to-emerald gradient, white text, large (px-10 py-4), shadow-lg shadow-teal-500/30. Arrow icon.
2. "See It In Action" → white/10 border, white text, transparent bg. Play icon. Scrolls to demo section.

**Trust Points (below buttons, centered row):**
30-day free trial · No credit card · Cancel anytime · SOC 2 Certified
(text-slate-400, text-sm, flex gap-4 with bullet separators)

---

### 18. FOOTER

**Background:** slate-950 (near-black). Py-16.

**Layout:** 5-column grid on desktop (brand column spans 2, then Product, Company, Legal). On mobile: stack all columns.

**Brand Column (col-span-2):**
- Logo + "FRAX" (text-white font-bold text-xl) + "Analytics" (text-slate-400 text-sm)
- Description (text-slate-400, text-sm, max-w-sm): "The AI-powered analytics platform for multi-channel e-commerce sellers. Connect all your marketplaces. Ask questions in plain English. Grow with data."
- Social links (icon-only, slate-400, hover:white, flex gap-3): Twitter (X), LinkedIn, GitHub
- Trust badges (mt-4): "SOC 2" and "GDPR" small shield badges (bg-slate-800, text-slate-400 text-xs, rounded-md)

**Product Column:**
- Column header: "Product" (text-white font-semibold text-sm uppercase tracking-wider)
- Links (text-slate-400 text-sm hover:text-white, flex-col gap-2): Features, Integrations, Pricing, Changelog, API Documentation

**Company Column:**
- Column header: "Company"
- Links: About, Blog, Careers, Contact, Press Kit

**Legal Column:**
- Column header: "Legal"
- Links: Privacy Policy, Terms of Service, Cookie Policy, Security, GDPR Compliance, Responsible Disclosure

**Bottom Bar (border-t border-slate-800, mt-12 pt-8):**
- Left: "© 2026 FRAX Analytics. All rights reserved." (text-slate-500, text-sm)
- Right: "Cookie Settings" link (text-slate-500 hover:text-slate-300)

---

## Trial Request Modal

Triggered by all "Start Free Trial" / "Request a Free Trial" buttons throughout the page. Modal overlay with backdrop blur (bg-black/50).

**Modal Design:** max-w-md, white bg, rounded-2xl, shadow-2xl. Smooth scale-in animation (0.95 → 1.0 + opacity 0 → 1).

**Header:**
- Headline: "Start Your Free Trial" (text-xl font-bold)
- Subheadline: "Full access for 30 days. No credit card required." (text-sm text-slate-500)

**Fields (clean, well-spaced form):**
- Full Name (required) — label + input with subtle border, focus:ring-teal-500
- Work Email (required) — label + input, validated for format
- Phone Number (optional) — label + input with country code selector
- Referral Code (optional, collapsed by default — "Have a referral code?" link expands it)

**CTA Button:** "Start Free Trial" (full-width, teal gradient, white text, py-3, font-semibold)
**Fine print (text-xs text-slate-400):** "We'll set up your account and send login details within 24 hours. By signing up, you agree to our Terms of Service and Privacy Policy."

**Close:** X button (top-right) + clicking backdrop closes modal. Esc key closes modal.

**Backend flow:** Submission creates a `TrialRequest` record. Sales team reviews, sends trial invite with unique token. User clicks invite link → sets up password → connects marketplaces → starts using FRAX.

---

## The Product in Detail — What FRAX Actually Is

*(This section is reference context for Relume/designers — not displayed on the landing page itself.)*

### The Problem FRAX Solves

Multi-channel e-commerce sellers today manage their businesses across multiple marketplaces simultaneously — Shopify for their own website, Amazon for reach, Flipkart for the Indian market, eBay for global buyers, Etsy for handmade goods, and so on. Each marketplace has its own:

- **Dashboard** with different layouts, metrics, and terminology
- **Data formats** (Amazon reports look nothing like Shopify analytics)
- **Login credentials** and separate sessions
- **Notification systems** with different alert thresholds
- **Reporting cadences** that don't align with each other

The result: sellers spend hours every day logging into 3-7 different dashboards, manually compiling data in spreadsheets, and trying to answer basic questions like "What was my total revenue this week?" or "Which product is performing best across all channels?"

This is painful, slow, and error-prone. It leads to missed stockouts, pricing misalignment between channels, and blind spots where revenue is leaking.

### What FRAX Is

FRAX is an **AI-powered unified analytics platform** that connects to all your marketplaces via secure OAuth, syncs your orders/products/inventory in real-time, and lets you ask questions in plain English to an AI assistant named **Frax**.

Instead of opening 7 dashboards, you open one chat. Instead of building pivot tables, you ask: *"Which products on Flipkart should I also list on Amazon?"* — and Frax gives you a specific, data-backed recommendation.

### How FRAX Works Under the Hood

1. **Marketplace Connection:** User authenticates via OAuth 2.0 (or OAuth + PKCE for Etsy/Square). FRAX receives read-only access tokens, encrypts them with AES-256-GCM, and stores them securely. FRAX never writes to or modifies any marketplace data — it is strictly read-only.

2. **Data Sync Pipeline:**
   - **Real-time webhooks** from Shopify, BigCommerce, and Square push order/product updates to FRAX the moment they happen.
   - **15-minute polling** syncs data from all other marketplaces (eBay, Etsy, Flipkart, etc.).
   - **Manual sync** can be triggered anytime from the app.
   - All incoming data is normalized into a unified schema: `UnifiedOrder`, `UnifiedProduct`, `UnifiedOrderItem` — meaning a Shopify order and a Flipkart order look identical in FRAX's database.
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

*(Reference context — not directly displayed, but informs copy and visuals throughout the page.)*

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

This is FRAX's most unique and powerful feature. No other platform offers this.

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

## Revenue Model — How FRAX Earns Money

*(Reference context — not displayed on landing page.)*

### Primary Revenue: SaaS Subscription

FRAX operates on a **usage-based SaaS subscription model** with a simple, transparent pricing structure:

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

FRAX uses a **sales-assisted trial funnel** with three acquisition paths:

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

FRAX has a built-in commission-based sales infrastructure:

- **Founder Dashboard:** The founder can invite, approve/reject, and manage sales team members.
- **Sales Member Dashboard:** Each approved sales member gets a unique referral code, can view their clients, send trial invites, and track conversions.
- **Commission Tracking:** Commissions are recorded per sales member per client per billing period. Commission rate is configurable per member.
- **SalesClient Model:** Links the sales member → client → trial request → converted user, enabling end-to-end attribution.

This system allows FRAX to scale acquisition through a distributed salesforce without traditional enterprise sales overhead.

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

*(Reference context — informs tone and messaging.)*

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

*(Reference context.)*

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

*(Reference context — informs Section 13 comparison table.)*

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
- channel product fit analysis
- multi-marketplace order management
- automated e-commerce reports
- inventory stockout alerts
- cross-channel selling optimization

---

## Page Behavior Notes for Relume

1. **Animations:** Fade-up-on-scroll (IntersectionObserver, threshold 0.15) for all sections. Stagger delays (0.1s between items in grids). Numbers count-up when entering viewport. Use will-change: transform for GPU acceleration.

2. **Color Palette:**
   - Primary gradient: teal-500 (#14b8a6) → emerald-500 (#10b981)
   - Dark sections: slate-800/900/950
   - Accent: violet-500 for secondary highlights (Frax, AI-related)
   - Alert colors: amber-500 (warnings), red-500 (critical), blue-500 (info)
   - Success: emerald-500

3. **Typography:**
   - Headlines: Bold (700), tight tracking (-0.02em), slate-900
   - Body: Regular (400), relaxed line-height (1.6), slate-600
   - Section labels: Uppercase, tracking-widest (0.1em), text-xs, teal-600 or slate-400
   - Stats/numbers: Monospace (JetBrains Mono), semi-bold
   - Quotes: Italic, slate-700

4. **Responsiveness:** Mobile-first. Key breakpoints:
   - Mobile (<640px): Single column, stacked sections, horizontal scroll for carousels
   - Tablet (640-1024px): 2-column grids, scaled-down hub visualization
   - Desktop (>1024px): Full layouts, orbital hub, side-by-side columns

5. **Interactions:**
   - Card hover: translateY(-4px) + shadow expansion + 3px top border gradient
   - Button hover: shadow deepening + subtle scale(1.02)
   - Link hover: underline slide-in from left (pseudo-element)
   - Marketplace nodes: scale(1.15) + shadow deepen on hover
   - Interactive demo: smooth cross-fade between conversations
   - FAQ accordion: smooth height animation with chevron rotation
   - Pricing calculator: slider interaction with live cost update

6. **CTAs:** Every major section ends with a clear path to "Start Free Trial". Primary CTA is always the trial modal. Secondary CTA is "See It In Action" → scrolls to interactive demo. CTA buttons should be visually consistent throughout the page.

7. **Performance:**
   - Lazy-load below-fold images and the integration hub SVG
   - Defer non-critical animations (below the fold)
   - Prioritize hero LCP (headline + CTA should render in <2.5s)
   - Preload hero visual and critical fonts
   - Use next/image for all images (auto-optimization)
   - Total page weight target: <500KB initial load

8. **Accessibility:**
   - All interactive elements keyboard-navigable
   - Sufficient color contrast (WCAG AA minimum)
   - Aria labels on icon-only buttons
   - Reduced motion media query — disable animations for users who prefer reduced motion
   - Semantic HTML: proper heading hierarchy (single H1, ordered H2s, H3s)

9. **Scroll Behavior:**
   - Smooth scrolling enabled (scroll-behavior: smooth)
   - Navbar active-link highlighting based on scroll position (IntersectionObserver)
   - Back-to-top button appears after scrolling past the hero section (bottom-right, circular, teal gradient)
