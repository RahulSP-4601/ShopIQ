import Link from "next/link";
import Image from "next/image";

const posts = [
  {
    title: "How Multi-Channel Sellers Save 10+ Hours a Week with Unified Analytics",
    excerpt:
      "Discover how Frame helps sellers stop switching between dashboards and start making faster, data-driven decisions across all their marketplaces.",
    date: "Feb 5, 2026",
    category: "Product",
    readTime: "5 min read",
  },
  {
    title: "Connecting Your Shopify Store to Frame: A Step-by-Step Guide",
    excerpt:
      "Learn how to connect your Shopify store in under 2 minutes and start syncing your orders, products, and customer data automatically.",
    date: "Jan 28, 2026",
    category: "Tutorial",
    readTime: "3 min read",
  },
  {
    title: "Understanding Your Sales Across Marketplaces: Key Metrics That Matter",
    excerpt:
      "Not all metrics are created equal. Here are the KPIs that top multi-channel sellers track — and how Frame makes it effortless.",
    date: "Jan 20, 2026",
    category: "Insights",
    readTime: "7 min read",
  },
  {
    title: "Why We Built Frame: The Problem with Fragmented E-Commerce Data",
    excerpt:
      "Our founder shares the frustration that led to building Frame and the vision for a unified analytics platform for every seller.",
    date: "Jan 12, 2026",
    category: "Company",
    readTime: "4 min read",
  },
  {
    title: "New Integration: Flipkart Marketplace Now Supported",
    excerpt:
      "Frame now supports Flipkart, India's largest e-commerce marketplace. Connect your seller account and get unified insights instantly.",
    date: "Jan 5, 2026",
    category: "Product",
    readTime: "2 min read",
  },
  {
    title: "E-Commerce Trends to Watch in 2026",
    excerpt:
      "From AI-powered analytics to cross-border selling, here are the trends shaping multi-channel e-commerce this year.",
    date: "Dec 28, 2025",
    category: "Insights",
    readTime: "6 min read",
  },
];

const categoryColors: Record<string, string> = {
  Product: "bg-teal-50 text-teal-700 border-teal-200",
  Tutorial: "bg-blue-50 text-blue-700 border-blue-200",
  Insights: "bg-purple-50 text-purple-700 border-purple-200",
  Company: "bg-amber-50 text-amber-700 border-amber-200",
};

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 sm:gap-3">
              <div className="relative w-9 h-9 sm:w-10 sm:h-10">
                <Image src="/logo.png" alt="Frame" fill className="object-contain" />
              </div>
              <span className="text-base sm:text-lg font-semibold text-slate-900">Frame</span>
            </Link>
            <Link
              href="/"
              className="text-sm font-medium text-slate-600 hover:text-teal-600 transition-colors flex items-center gap-1 sm:gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="hidden sm:inline">Back to Home</span>
              <span className="sm:hidden">Home</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="hidden sm:block absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-24">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-teal-300 mb-6">
              Blog
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4" style={{ color: '#ffffff' }}>
              Insights & Updates
            </h1>
            <p className="text-base sm:text-lg leading-relaxed" style={{ color: '#cbd5e1' }}>
              Tips, tutorials, and product updates to help you get the most out of your multi-channel e-commerce business.
            </p>
          </div>
        </div>
      </section>

      {/* Posts Grid */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {posts.map((post) => (
            <article
              key={post.title}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
            >
              {/* Placeholder image area */}
              <div className="h-40 sm:h-48 bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center">
                <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
                </svg>
              </div>
              <div className="p-5 sm:p-6">
                <div className="flex items-center gap-3 mb-3">
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${categoryColors[post.category] || "bg-slate-50 text-slate-600 border-slate-200"}`}>
                    {post.category}
                  </span>
                  <span className="text-xs text-slate-400">{post.readTime}</span>
                </div>
                <h2 className="text-base sm:text-lg font-semibold text-slate-900 mb-2 line-clamp-2">
                  {post.title}
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed line-clamp-3 mb-4">
                  {post.excerpt}
                </p>
                <span className="text-xs text-slate-400">{post.date}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8 text-center">
          <p className="text-sm text-slate-500">&copy; {new Date().getFullYear()} Frame. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
