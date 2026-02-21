# Frame - AI-Powered Multi-Channel E-Commerce Analytics

Frame is an intelligent analytics platform that transforms complex e-commerce data into actionable insights through conversational AI. Simply ask questions in plain English and get instant, data-driven answers about your store's performance across multiple marketplaces.

## The Problem We Solve

Multi-channel e-commerce sellers face a growing challenge: managing data across multiple platforms (Shopify, eBay, Etsy, Flipkart, and more) is overwhelming. Each marketplace has its own dashboard, metrics, and reporting tools. Sellers spend hours jumping between platforms, manually compiling reports, and trying to make sense of fragmented data.

**The result?** Lost time, missed opportunities, and decisions made on gut feeling instead of data.

## Our Solution

Frame acts as your AI-powered business analyst. Instead of navigating complex dashboards:

- **Ask questions naturally** - "What was my revenue last week?" or "Which products are underperforming?"
- **Get unified insights** - All your marketplace data in one place
- **Receive actionable recommendations** - AI doesn't just show numbers, it tells you what to do next
- **Save hours every week** - Skip manual data analysis and focus on growing your business

## Supported Marketplaces

| Marketplace | Status | Auth Method | Data Sync |
| ----------- | ------ | ----------- | --------- |
| Shopify | Fully Integrated | OAuth 2.0 | Webhooks (real-time) + Polling |
| eBay | Fully Integrated | OAuth 2.0 | Polling (every 15 min) |
| Etsy | Fully Integrated | OAuth 2.0 + PKCE | Polling (every 15 min) |
| Flipkart | Fully Integrated | OAuth 2.0 | Polling (every 15 min) |
| BigCommerce | Fully Integrated | OAuth 2.0 | Webhooks (real-time) + Polling |
| Square | Fully Integrated | OAuth 2.0 + PKCE | Webhooks (real-time) + Polling |
| Snapdeal | Fully Integrated | Redirect-based Auth | Polling (every 15 min) |
| Amazon | Coming Soon | — | — |
| PrestaShop | Coming Soon | — | — |

### Future Target Integrations

Below are the future target integrations we are working to partner with:

- Meesho
- Myntra
- Nykaa
- JioMart
- IndiaMart
- Udaan
- Ajio

## Features

### Conversational Analytics

Ask questions like you would to a business analyst:

- "What was my revenue last week?"
- "Which are my best-selling products?"
- "Who are my top customers?"
- "What time of day do most orders come in?"
- "How is my customer acquisition trending?"

### Multi-Marketplace OAuth Integration

- **Shopify** — Standard OAuth 2.0 with HMAC validation
- **eBay** — OAuth 2.0 with automatic token refresh (~2hr tokens)
- **Etsy** — OAuth 2.0 with PKCE (public client flow, rotating tokens)
- **Flipkart** — OAuth 2.0 with client credentials
- **BigCommerce** — OAuth 2.0 with permanent tokens
- **Square** — OAuth 2.0 with PKCE (30-day tokens)
- **Snapdeal** — Redirect-based implicit grant (seller token)
- One-click connect from a unified onboarding page
- Encrypted token storage (AES-256-GCM)

### Real-Time Data Pipeline

- **Webhooks (Shopify, BigCommerce, Square)** — Instant order/product updates via HMAC-verified webhooks
- **Polling (eBay, Etsy, Flipkart, Snapdeal)** — Automated sync every 15 minutes via Vercel Cron
- **Unified Data Model** — All 7 active marketplaces normalized into cross-platform tables (UnifiedOrder, UnifiedProduct)
- **Delta sync** — Only fetches data since last sync to minimize API calls

### Smart Analytics & Metrics

- **Revenue Metrics**: Total sales, average order value, tax, discounts
- **Product Performance**: Best sellers, underperformers, inventory tracking
- **Customer Insights**: Top customers, lifetime value, geographic distribution
- **Trend Analysis**: Daily/weekly revenue trends, order patterns

### Automated Report Generation

| Report Type       | What's Included                                  |
| ----------------- | ------------------------------------------------ |
| Revenue Summary   | Sales trends, AOV analysis, top products         |
| Product Analysis  | Best sellers, inventory status, low stock alerts |
| Customer Insights | Customer segments, top buyers, geographic data   |
| Full Analysis     | Comprehensive store overview with all metrics    |

Each report includes AI-generated summaries with actionable recommendations.

### Sales Team Management

- Founder dashboard for managing sales members
- Sales member onboarding with approval flow
- Client tracking and trial management
- Commission calculation and tracking

### Additional Features

- Conversation history with file attachments
- Cookie consent and GDPR compliance
- Legal pages (Terms, Privacy, Security, GDPR, Cookies)
- Rate limiting on API endpoints
- Subscription management with trial support

## How It Works

1. **Sign Up** - Create an account on Frame
2. **Connect** - Link your marketplaces (Shopify, eBay, Etsy, Flipkart, BigCommerce, Square, Snapdeal) via OAuth or credentials
3. **Sync** - Your data is automatically imported, normalized, and kept up to date
4. **Ask** - Start asking questions and generating reports across all your stores

## Business Model

### Pricing Structure

Frame operates on a **subscription-based SaaS model** with transparent, scalable pricing:

| Plan | Price | Includes |
| ---- | ----- | -------- |
| Base | ₹999/month | 2 marketplace connections |
| Additional Marketplace | +₹449/month | Per additional channel |

**Example pricing:**
- Shopify + eBay: ₹999/month
- Shopify + eBay + Etsy: ₹1,448/month
- 4 marketplaces: ₹1,897/month

### Target Market

- **Primary:** Multi-channel e-commerce sellers on Shopify, eBay, Etsy, Flipkart, BigCommerce, Square, and Snapdeal
- **Secondary:** Growing sellers expanding to multiple marketplaces
- **TAM:** 30M+ active e-commerce sellers globally
- **Sweet Spot:** Sellers doing ₹5L-₹50L/month who need insights but can't afford dedicated analysts

### Competitive Advantage

| Traditional Analytics | Frame |
| --------------------- | ------ |
| Complex dashboards | Conversational AI |
| Single platform focus | Multi-marketplace unified |
| Raw data exports | Actionable recommendations |
| ₹8,000-80,000+/month | Starting at ₹999/month |
| Requires training | Ask questions naturally |

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL (Supabase)
- **AI**: Google Gemini 1.5 Flash
- **Marketplace APIs**: Shopify Admin API (2025-10), eBay REST API, Etsy Open API v3, Flipkart Seller API, BigCommerce API, Square API, Snapdeal Seller API
- **Infrastructure**: Vercel (hosting + cron jobs)
- **Email**: Resend
- **Storage**: Supabase Storage

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (Supabase recommended)
- Marketplace developer accounts (Shopify, eBay, Etsy, Flipkart, BigCommerce, Square, Snapdeal)
- Google Gemini API key

### Environment Variables

Create a `.env` file based on `.env.example`:

```env
# Database
DATABASE_URL="postgresql://..."

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
APP_URL="http://localhost:3000"
SESSION_SECRET="your_32_character_random_string"
TOKEN_ENCRYPTION_KEY="your_64_hex_char_key"

# Shopify OAuth
SHOPIFY_API_KEY="your_shopify_api_key"
SHOPIFY_API_SECRET="your_shopify_api_secret"
SHOPIFY_SCOPES="read_orders,read_products,read_customers"

# eBay OAuth
EBAY_CLIENT_ID="your_ebay_client_id"
EBAY_CLIENT_SECRET="your_ebay_client_secret"
EBAY_RU_NAME="your_ebay_ru_name"

# Etsy OAuth (PKCE — no client secret needed)
ETSY_API_KEY="your_etsy_api_key"

# Flipkart OAuth
FLIPKART_APP_ID="your_flipkart_app_id"
FLIPKART_APP_SECRET="your_flipkart_app_secret"

# BigCommerce OAuth
BIGCOMMERCE_CLIENT_ID="your_bigcommerce_client_id"
BIGCOMMERCE_CLIENT_SECRET="your_bigcommerce_client_secret"

# Square OAuth
SQUARE_APPLICATION_ID="your_square_application_id"
SQUARE_APPLICATION_SECRET="your_square_application_secret"

# Snapdeal Auth
SNAPDEAL_CLIENT_ID="your_snapdeal_client_id"
SNAPDEAL_AUTH_TOKEN="your_snapdeal_auth_token"

# Google Gemini AI
GEMINI_API_KEY="your_gemini_api_key"

# Vercel Cron
CRON_SECRET="your_cron_secret"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://your-project-ref.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your_anon_key"
SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"

# Email (Resend)
RESEND_API_KEY="your_resend_key"
RESEND_FROM_EMAIL="onboarding@yourdomain.com"
```

### Installation

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations (development)
npx prisma migrate dev

# Start development server
npm run dev
```

**Database Migrations (Production):**

```bash
# Deploy migrations in production (CI/CD pipeline)
npx prisma migrate deploy
```

> **Note:** Use `npx prisma migrate dev` during development to create and apply migrations with full migration history. Use `npx prisma migrate deploy` in production for reproducible, forward-only deployments. Avoid `npx prisma db push` in production — it is intended for prototyping only.

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Landing page
│   ├── (auth)/                   # Auth pages (signin, signup, forgot/reset password)
│   ├── onboarding/               # Onboarding flow (connect, payment)
│   ├── chat/                     # Chat interface
│   ├── reports/                  # Reports management
│   ├── sync/                     # Sync progress
│   ├── connect/                  # Marketplace connection
│   ├── account/                  # Account settings
│   ├── founder/                  # Founder dashboard
│   ├── sales/                    # Sales team dashboard
│   ├── trial/                    # Trial access
│   └── api/                      # API routes
│       ├── auth/                 # Auth + OAuth (shopify, ebay, etsy, flipkart, bigcommerce, square, snapdeal)
│       ├── marketplaces/         # Connect/disconnect marketplaces
│       ├── webhooks/             # Webhook receivers (shopify, bigcommerce, square)
│       ├── cron/sync/            # Vercel Cron polling endpoint
│       ├── chat/                 # Chat API
│       ├── reports/              # Reports API
│       ├── sync/                 # Sync API
│       ├── founder/              # Founder management API
│       ├── sales/                # Sales team API
│       ├── subscription/         # Subscription API
│       └── trial/                # Trial API
├── components/                   # React components
│   ├── landing/                  # Marketing pages
│   ├── chat/                     # Chat UI
│   ├── reports/                  # Report views
│   ├── auth/                     # Auth guard
│   ├── cookie-consent/           # GDPR consent
│   └── ui/                       # Shared UI components
├── hooks/                        # Custom React hooks
├── types/                        # TypeScript types
└── lib/                          # Core utilities
    ├── shopify/                  # Shopify client, OAuth, sync, webhooks
    ├── ebay/                     # eBay client, OAuth, token refresh
    ├── etsy/                     # Etsy client, OAuth (PKCE), token refresh
    ├── flipkart/                 # Flipkart client, OAuth, token refresh
    ├── bigcommerce/              # BigCommerce client, OAuth, webhooks
    ├── square/                   # Square client, OAuth (PKCE), token refresh, webhooks
    ├── snapdeal/                 # Snapdeal client, auth
    ├── sync/                     # Unified sync services for all 7 active marketplaces
    ├── gemini/                   # AI integration
    ├── metrics/                  # Analytics calculations
    ├── reports/                  # Report templates
    ├── auth/                     # Session, password, subscription
    ├── marketplace/              # Marketplace config
    └── cookies/                  # Cookie management
```

## Security

- **OAuth 2.0** for marketplace authentication (with PKCE for Etsy and Square)
- **AES-256-GCM** encryption for all stored access/refresh tokens
- **HMAC-SHA256** verification for webhooks (Shopify, BigCommerce, Square)
- **JWT-based** session management with HTTP-only cookies
- **Nonce/CSRF** protection on all OAuth flows
- **Per-user token refresh locking** to prevent concurrent refresh storms
- **Automatic token refresh** for Square (30-day), eBay (2hr), Etsy (1hr)
- **Store-scoped** data isolation
- **Rate limiting** on API endpoints

## License

MIT
