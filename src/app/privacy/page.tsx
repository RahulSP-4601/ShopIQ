import { LegalLayout, LegalSection, LegalList, InfoCard } from "@/components/legal/LegalLayout";

const sections = [
  { id: "information-we-collect", title: "Information We Collect" },
  { id: "how-we-use", title: "How We Use Your Information" },
  { id: "data-sharing", title: "Data Sharing and Disclosure" },
  { id: "data-security", title: "Data Security" },
  { id: "your-rights", title: "Your Rights" },
  { id: "data-retention", title: "Data Retention" },
  { id: "international-transfers", title: "International Data Transfers" },
  { id: "childrens-privacy", title: "Children's Privacy" },
  { id: "changes", title: "Changes to This Policy" },
  { id: "contact", title: "Contact Us" },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      subtitle="Your privacy is important to us. This policy explains how we collect, use, and protect your personal information."
      lastUpdated="January 26, 2026"
      sections={sections}
    >
      <LegalSection id="information-we-collect" title="Information We Collect">
        <p>
          We collect information to provide better services to our users. The types of information we collect include:
        </p>

        <div className="grid gap-4 mt-6">
          <InfoCard title="Personal Information">
            <p>Information you provide directly to us, including:</p>
            <LegalList
              items={[
                "Name, email address, and contact details",
                "Account credentials and profile information",
                "Billing and payment information",
                "Business information (company name, marketplace accounts)",
                "Communications you send to us",
              ]}
            />
          </InfoCard>

          <InfoCard title="Usage Data">
            <p>Information collected automatically when you use our services:</p>
            <LegalList
              items={[
                "Log data (IP address, browser type, pages visited)",
                "Device information (hardware model, operating system)",
                "Analytics data (feature usage, performance metrics)",
                "Marketplace data you connect (sales, inventory, orders)",
              ]}
            />
          </InfoCard>

          <InfoCard title="Cookies and Tracking">
            <p>We use cookies and similar technologies to:</p>
            <LegalList
              items={[
                "Remember your preferences and settings",
                "Understand how you use our platform",
                "Provide personalized content and recommendations",
                "Measure the effectiveness of our marketing",
              ]}
            />
            <p className="mt-2">
              For more details, please see our <a href="/cookies" className="text-teal-600 hover:underline">Cookie Policy</a>.
            </p>
          </InfoCard>
        </div>
      </LegalSection>

      <LegalSection id="how-we-use" title="How We Use Your Information">
        <p>
          We use the information we collect for the following purposes:
        </p>
        <LegalList
          items={[
            "Provide, maintain, and improve our services",
            "Process transactions and send related information",
            "Send technical notices, updates, and support messages",
            "Respond to your comments, questions, and requests",
            "Analyze usage patterns to enhance user experience",
            "Detect, investigate, and prevent fraudulent activities",
            "Comply with legal obligations and enforce our terms",
            "Communicate about products, services, and promotions",
          ]}
        />

        <InfoCard title="Legal Basis for Processing" variant="highlight">
          <p>
            We process your data based on: (1) your consent, (2) performance of our contract with you,
            (3) compliance with legal obligations, and (4) our legitimate business interests.
          </p>
        </InfoCard>
      </LegalSection>

      <LegalSection id="data-sharing" title="Data Sharing and Disclosure">
        <p>
          We do not sell your personal information. We may share your information in the following circumstances:
        </p>

        <div className="grid gap-4 mt-6">
          <InfoCard title="Service Providers">
            <p>
              We work with trusted third-party service providers who assist us in operating our platform,
              including cloud hosting, payment processing, analytics, and customer support. These providers
              are contractually obligated to protect your data.
            </p>
          </InfoCard>

          <InfoCard title="Business Transfers">
            <p>
              If Frame is involved in a merger, acquisition, or sale of assets, your information may be
              transferred as part of that transaction. We will notify you of any such change.
            </p>
          </InfoCard>

          <InfoCard title="Legal Requirements">
            <p>
              We may disclose your information if required by law, regulation, legal process, or governmental
              request, or to protect the rights, property, or safety of Frame, our users, or others.
            </p>
          </InfoCard>

          <InfoCard title="With Your Consent">
            <p>
              We may share your information for other purposes with your explicit consent.
            </p>
          </InfoCard>
        </div>
      </LegalSection>

      <LegalSection id="data-security" title="Data Security">
        <p>
          We implement robust security measures to protect your personal information:
        </p>
        <LegalList
          items={[
            "Encryption of data in transit (TLS 1.3) and at rest (AES-256)",
            "Regular security audits and penetration testing",
            "Access controls and authentication mechanisms",
            "Employee security training and background checks",
            "Incident response and disaster recovery procedures",
            "SOC 2 Type II certification for our infrastructure",
          ]}
        />

        <InfoCard title="Your Responsibility" variant="warning">
          <p>
            While we take extensive measures to protect your data, security also depends on you. Please keep
            your account credentials confidential, use strong passwords, and enable two-factor authentication.
          </p>
        </InfoCard>
      </LegalSection>

      <LegalSection id="your-rights" title="Your Rights">
        <p>
          Depending on your location, you may have the following rights regarding your personal information:
        </p>

        <div className="grid sm:grid-cols-2 gap-4 mt-6">
          <InfoCard title="Right to Access">
            <p>Request a copy of the personal information we hold about you.</p>
          </InfoCard>

          <InfoCard title="Right to Rectification">
            <p>Request correction of inaccurate or incomplete information.</p>
          </InfoCard>

          <InfoCard title="Right to Erasure">
            <p>Request deletion of your personal information in certain circumstances.</p>
          </InfoCard>

          <InfoCard title="Right to Portability">
            <p>Receive your data in a structured, commonly used format.</p>
          </InfoCard>

          <InfoCard title="Right to Object">
            <p>Object to processing of your information for certain purposes.</p>
          </InfoCard>

          <InfoCard title="Right to Restrict">
            <p>Request limitation of how we process your information.</p>
          </InfoCard>
        </div>

        <p className="mt-6">
          To exercise these rights, please contact us at{" "}
          <a href="mailto:privacy@frame.com" className="text-teal-600 hover:underline">
            privacy@frame.com
          </a>
          . We will respond to your request within 30 days.
        </p>
      </LegalSection>

      <LegalSection id="data-retention" title="Data Retention">
        <p>
          We retain your personal information for as long as necessary to fulfill the purposes outlined in
          this policy, unless a longer retention period is required by law.
        </p>
        <LegalList
          items={[
            "Account data: Retained while your account is active and for 3 years after closure",
            "Transaction records: Retained for 7 years for tax and legal compliance",
            "Analytics data: Retained in aggregated, anonymized form indefinitely",
            "Marketing preferences: Retained until you opt out or request deletion",
          ]}
        />
        <p>
          When data is no longer needed, we securely delete or anonymize it in accordance with our
          data retention policies.
        </p>
      </LegalSection>

      <LegalSection id="international-transfers" title="International Data Transfers">
        <p>
          Frame operates globally, and your information may be transferred to and processed in countries
          other than your own. We ensure appropriate safeguards are in place:
        </p>
        <LegalList
          items={[
            "Standard Contractual Clauses (SCCs) approved by the European Commission",
            "Data Processing Agreements with all third-party providers",
            "Compliance with applicable data protection laws in each jurisdiction",
            "Privacy Shield certification where applicable",
          ]}
        />
      </LegalSection>

      <LegalSection id="childrens-privacy" title="Children's Privacy">
        <p>
          Our services are not intended for children under the age of 16. We do not knowingly collect
          personal information from children. If you are a parent or guardian and believe your child has
          provided us with personal information, please contact us immediately at{" "}
          <a href="mailto:privacy@frame.com" className="text-teal-600 hover:underline">
            privacy@frame.com
          </a>
          , and we will take steps to delete such information.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time to reflect changes in our practices or for
          legal, operational, or regulatory reasons. When we make material changes:
        </p>
        <LegalList
          items={[
            "We will notify you via email or prominent notice on our platform",
            "We will update the \"Last updated\" date at the top of this policy",
            "We may ask for your consent if required by applicable law",
          ]}
        />
        <p>
          We encourage you to review this policy periodically to stay informed about how we protect your information.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="Contact Us">
        <p>
          If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices,
          please contact us:
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

        <p className="mt-6 text-sm text-slate-500">
          For EU residents, you also have the right to lodge a complaint with your local data protection authority.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
