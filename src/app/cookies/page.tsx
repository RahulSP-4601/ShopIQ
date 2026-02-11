"use client";

import { LegalLayout, LegalSection, LegalList, InfoCard } from "@/components/legal/LegalLayout";
import { useCookieConsent } from "@/hooks/useCookieConsent";

const sections = [
  { id: "what-are-cookies", title: "What Are Cookies?" },
  { id: "how-we-use", title: "How We Use Cookies" },
  { id: "types-of-cookies", title: "Types of Cookies" },
  { id: "third-party-cookies", title: "Third-Party Cookies" },
  { id: "managing-preferences", title: "Managing Your Preferences" },
  { id: "browser-settings", title: "Browser Cookie Settings" },
  { id: "contact", title: "Contact Us" },
];

export default function CookiePolicyPage() {
  const { openPreferences } = useCookieConsent();

  return (
    <LegalLayout
      title="Cookie Policy"
      subtitle="Learn how Frame uses cookies and similar technologies to improve your experience and analyze site usage."
      lastUpdated="January 26, 2026"
      sections={sections}
    >
      <LegalSection id="what-are-cookies" title="What Are Cookies?">
        <p>
          Cookies are small text files that are placed on your computer or mobile device when you visit a website.
          They are widely used to make websites work more efficiently and to provide information to website owners.
        </p>

        <InfoCard title="How Cookies Work">
          <p>
            When you visit our website, we may place cookies on your device. These cookies help us recognize
            your device on subsequent visits, remember your preferences, and understand how you interact with
            our platform. Cookies can be either &quot;session&quot; cookies (which expire when you close your browser)
            or &quot;persistent&quot; cookies (which remain on your device for a set period).
          </p>
        </InfoCard>

        <p className="mt-4">
          We also use similar technologies like web beacons, pixels, and local storage to collect information
          and improve our services. When we refer to &quot;cookies&quot; in this policy, we include these similar technologies.
        </p>
      </LegalSection>

      <LegalSection id="how-we-use" title="How We Use Cookies">
        <p>
          Frame uses cookies to improve your experience, understand how you use our platform, and to personalize
          content. Specifically, we use cookies to:
        </p>

        <LegalList
          items={[
            "Keep you signed in to your account",
            "Remember your preferences and settings",
            "Understand how you navigate and use our platform",
            "Measure the effectiveness of our marketing campaigns",
            "Improve our services based on usage patterns",
            "Protect your account from unauthorized access",
            "Provide personalized recommendations and content",
          ]}
        />
      </LegalSection>

      <LegalSection id="types-of-cookies" title="Types of Cookies">
        <p>
          We categorize our cookies into the following types based on their purpose:
        </p>

        <div className="space-y-4 mt-6">
          <div className="rounded-xl border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-emerald-50 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Necessary Cookies</h3>
                <span className="text-xs font-medium text-teal-600 bg-teal-100 px-2 py-0.5 rounded-full">Always Active</span>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-3">
              These cookies are essential for the website to function properly. They enable core functionality
              such as security, authentication, and session management. You cannot disable these cookies as
              the website would not work correctly without them.
            </p>
            <div className="text-sm text-slate-600">
              <strong>Examples:</strong>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>Session cookies for authentication</li>
                <li>Security cookies to prevent fraud (CSRF protection)</li>
                <li>Load balancing cookies</li>
                <li>Cookie consent preferences</li>
              </ul>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Analytics Cookies</h3>
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Optional</span>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-3">
              These cookies help us understand how visitors interact with our website by collecting and reporting
              information anonymously. This helps us improve our platform and user experience.
            </p>
            <div className="text-sm text-slate-600">
              <strong>Examples:</strong>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>Page view and navigation tracking</li>
                <li>Feature usage analytics</li>
                <li>Performance monitoring</li>
                <li>Error tracking and diagnostics</li>
                <li>A/B testing cookies</li>
              </ul>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Marketing Cookies</h3>
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Optional</span>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-3">
              These cookies are used to track visitors across websites to display relevant advertisements.
              They help us measure the effectiveness of our marketing campaigns and limit ad frequency.
            </p>
            <div className="text-sm text-slate-600">
              <strong>Examples:</strong>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>Ad targeting and retargeting</li>
                <li>Conversion tracking</li>
                <li>Social media integration</li>
                <li>Campaign attribution</li>
              </ul>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Functional Cookies</h3>
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Optional</span>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-3">
              These cookies enable enhanced functionality and personalization. They may be set by us or by
              third-party providers whose services we use on our pages.
            </p>
            <div className="text-sm text-slate-600">
              <strong>Examples:</strong>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>Language and region preferences</li>
                <li>Theme and display settings</li>
                <li>Live chat functionality</li>
                <li>Video player preferences</li>
              </ul>
            </div>
          </div>
        </div>
      </LegalSection>

      <LegalSection id="third-party-cookies" title="Third-Party Cookies">
        <p>
          Some cookies on our website are placed by third-party services that appear on our pages. We work
          with the following types of third-party providers:
        </p>

        <div className="grid gap-4 mt-6">
          <InfoCard title="Analytics Providers">
            <p>We use analytics services to understand how our platform is used:</p>
            <LegalList
              items={[
                "Google Analytics - Website traffic analysis",
                "Mixpanel - Product analytics and user behavior",
                "Hotjar - Heatmaps and session recordings",
              ]}
            />
          </InfoCard>

          <InfoCard title="Advertising Partners">
            <p>We work with advertising partners to measure campaign effectiveness:</p>
            <LegalList
              items={[
                "Google Ads - Ad delivery and conversion tracking",
                "LinkedIn Ads - B2B advertising and retargeting",
                "Facebook Pixel - Social media advertising",
              ]}
            />
          </InfoCard>

          <InfoCard title="Service Providers">
            <p>We use various service providers to enhance our platform:</p>
            <LegalList
              items={[
                "Razorpay - Payment processing",
                "Intercom - Customer support chat",
                "Cloudflare - Security and performance",
              ]}
            />
          </InfoCard>
        </div>

        <p className="mt-4">
          These third parties have their own privacy policies governing their use of cookies. We encourage
          you to review their policies for more information.
        </p>
      </LegalSection>

      <LegalSection id="managing-preferences" title="Managing Your Preferences">
        <p>
          You have control over which cookies we use. You can change your cookie preferences at any time
          using the button below.
        </p>

        <div className="mt-6 p-6 rounded-xl bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-200">
          <h3 className="font-semibold text-slate-900 mb-2">Cookie Preferences</h3>
          <p className="text-sm text-slate-600 mb-4">
            Click the button below to review and customize which types of cookies you allow. Your preferences
            will be saved and applied across all pages of our website.
          </p>
          <button
            onClick={openPreferences}
            className="px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-teal-500 to-emerald-500 rounded-xl hover:from-teal-600 hover:to-emerald-600 shadow-lg shadow-teal-500/25 transition-all"
          >
            Manage Cookie Preferences
          </button>
        </div>

        <InfoCard title="What Happens When You Change Preferences" variant="highlight">
          <LegalList
            items={[
              "Necessary cookies will always remain active",
              "Disabling analytics cookies stops us from collecting usage data",
              "Disabling marketing cookies stops targeted advertisements",
              "Your preferences are stored in a cookie (ironic, we know!)",
              "Changes take effect immediately",
            ]}
          />
        </InfoCard>
      </LegalSection>

      <LegalSection id="browser-settings" title="Browser Cookie Settings">
        <p>
          You can also manage cookies through your web browser settings. Most browsers allow you to view,
          delete, and block cookies. Here are links to cookie management instructions for popular browsers:
        </p>

        <div className="grid sm:grid-cols-2 gap-4 mt-6">
          <a
            href="https://support.google.com/chrome/answer/95647"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-white hover:border-teal-200 hover:shadow-md transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="#4285F4"/>
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-slate-900">Google Chrome</h3>
              <p className="text-sm text-slate-500">Manage cookies in Chrome</p>
            </div>
          </a>

          <a
            href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-white hover:border-teal-200 hover:shadow-md transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#FF7139">
                <circle cx="12" cy="12" r="10"/>
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-slate-900">Mozilla Firefox</h3>
              <p className="text-sm text-slate-500">Manage cookies in Firefox</p>
            </div>
          </a>

          <a
            href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-white hover:border-teal-200 hover:shadow-md transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#007AFF">
                <circle cx="12" cy="12" r="10"/>
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-slate-900">Safari</h3>
              <p className="text-sm text-slate-500">Manage cookies in Safari</p>
            </div>
          </a>

          <a
            href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-white hover:border-teal-200 hover:shadow-md transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#0078D7">
                <circle cx="12" cy="12" r="10"/>
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-slate-900">Microsoft Edge</h3>
              <p className="text-sm text-slate-500">Manage cookies in Edge</p>
            </div>
          </a>
        </div>

        <InfoCard title="Important Note" variant="warning">
          <p>
            Please note that blocking all cookies may affect the functionality of our website and other
            websites you visit. Some features may not work correctly if cookies are disabled.
          </p>
        </InfoCard>
      </LegalSection>

      <LegalSection id="contact" title="Contact Us">
        <p>
          If you have any questions about our use of cookies or this Cookie Policy, please contact us:
        </p>

        <div className="mt-6 rounded-xl bg-gradient-to-br from-slate-50 to-teal-50 border border-slate-200 p-6">
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Email</h3>
              <a href="mailto:privacy@frame.com" className="text-teal-600 hover:underline">
                privacy@frame.com
              </a>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Data Protection Officer</h3>
              <a href="mailto:dpo@frame.com" className="text-teal-600 hover:underline">
                dpo@frame.com
              </a>
            </div>
            <div className="sm:col-span-2">
              <h3 className="font-semibold text-slate-900 mb-2">Mailing Address</h3>
              <p className="text-slate-600">
                Frame Inc.<br />
                123 Commerce Street, Suite 500<br />
                San Francisco, CA 94105<br />
                United States
              </p>
            </div>
          </div>
        </div>
      </LegalSection>
    </LegalLayout>
  );
}
