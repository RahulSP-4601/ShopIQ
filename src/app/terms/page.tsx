import { LegalLayout, LegalSection, LegalList, InfoCard } from "@/components/legal/LegalLayout";

const sections = [
  { id: "acceptance", title: "Acceptance of Terms" },
  { id: "description", title: "Description of Service" },
  { id: "accounts", title: "User Accounts" },
  { id: "responsibilities", title: "User Responsibilities" },
  { id: "acceptable-use", title: "Acceptable Use Policy" },
  { id: "intellectual-property", title: "Intellectual Property" },
  { id: "payment", title: "Payment and Billing" },
  { id: "termination", title: "Termination" },
  { id: "disclaimers", title: "Disclaimers and Limitations" },
  { id: "indemnification", title: "Indemnification" },
  { id: "governing-law", title: "Governing Law" },
  { id: "dispute-resolution", title: "Dispute Resolution" },
  { id: "changes", title: "Changes to Terms" },
  { id: "contact", title: "Contact Us" },
];

export default function TermsOfServicePage() {
  return (
    <LegalLayout
      title="Terms of Service"
      subtitle="Please read these terms carefully before using Frame. By accessing our platform, you agree to be bound by these terms."
      lastUpdated="January 26, 2026"
      sections={sections}
    >
      <LegalSection id="acceptance" title="Acceptance of Terms">
        <p>
          Welcome to Frame. By accessing or using our platform, website, or any of our services
          (collectively, the &quot;Service&quot;), you agree to be bound by these Terms of Service
          (&quot;Terms&quot;). If you do not agree to these Terms, you may not access or use the Service.
        </p>
        <InfoCard title="Agreement" variant="highlight">
          <p>
            By creating an account, clicking &quot;I Agree,&quot; or otherwise accessing or using the Service,
            you acknowledge that you have read, understood, and agree to be bound by these Terms and our
            <a href="/privacy" className="text-teal-600 hover:underline ml-1">Privacy Policy</a>.
          </p>
        </InfoCard>
        <p>
          If you are using the Service on behalf of an organization, you represent and warrant that you have
          the authority to bind that organization to these Terms.
        </p>
      </LegalSection>

      <LegalSection id="description" title="Description of Service">
        <p>
          Frame is an AI-powered analytics platform designed for multi-channel e-commerce sellers. Our Service provides:
        </p>
        <LegalList
          items={[
            "Unified dashboard for managing multiple marketplace accounts",
            "AI-driven insights and analytics for sales, inventory, and performance",
            "Automated reporting and data visualization tools",
            "Integration with major e-commerce platforms (Amazon, Shopify, eBay, etc.)",
            "Inventory management and forecasting capabilities",
            "Customer analytics and behavior insights",
          ]}
        />
        <p>
          We reserve the right to modify, suspend, or discontinue any aspect of the Service at any time,
          with or without notice.
        </p>
      </LegalSection>

      <LegalSection id="accounts" title="User Accounts">
        <p>
          To access certain features of the Service, you must create an account. When creating an account, you agree to:
        </p>
        <LegalList
          items={[
            "Provide accurate, current, and complete information",
            "Maintain and promptly update your account information",
            "Keep your password secure and confidential",
            "Accept responsibility for all activities under your account",
            "Notify us immediately of any unauthorized access",
          ]}
        />

        <InfoCard title="Account Security" variant="warning">
          <p>
            You are responsible for safeguarding your account credentials. Frame will not be liable for any
            loss or damage arising from your failure to maintain account security. We strongly recommend
            enabling two-factor authentication.
          </p>
        </InfoCard>
      </LegalSection>

      <LegalSection id="responsibilities" title="User Responsibilities">
        <p>
          As a user of Frame, you are responsible for:
        </p>
        <LegalList
          items={[
            "Ensuring your use of the Service complies with all applicable laws",
            "Maintaining accurate and up-to-date marketplace credentials",
            "Reviewing and verifying data and insights before making business decisions",
            "Backing up your own data and business records",
            "Reporting any bugs, errors, or security vulnerabilities you discover",
          ]}
        />
        <p>
          You acknowledge that Frame provides tools and insights to assist your business decisions, but
          ultimate responsibility for those decisions remains with you.
        </p>
      </LegalSection>

      <LegalSection id="acceptable-use" title="Acceptable Use Policy">
        <p>
          You agree not to use the Service to:
        </p>
        <LegalList
          items={[
            "Violate any applicable laws, regulations, or third-party rights",
            "Transmit malware, viruses, or other harmful code",
            "Attempt to gain unauthorized access to our systems or other users' accounts",
            "Interfere with or disrupt the Service or its infrastructure",
            "Scrape, harvest, or collect data without authorization",
            "Use automated systems (bots) except as expressly permitted",
            "Resell or redistribute the Service without our written consent",
            "Engage in fraudulent or deceptive practices",
            "Circumvent any security measures or access controls",
          ]}
        />

        <InfoCard title="Enforcement" variant="warning">
          <p>
            Violation of this Acceptable Use Policy may result in immediate suspension or termination of your
            account, without refund. We reserve the right to report illegal activities to law enforcement.
          </p>
        </InfoCard>
      </LegalSection>

      <LegalSection id="intellectual-property" title="Intellectual Property">
        <div className="space-y-6">
          <InfoCard title="Our Intellectual Property">
            <p>
              The Service, including all content, features, and functionality (including but not limited to
              software, algorithms, designs, graphics, and documentation), is owned by Frame and protected
              by copyright, trademark, and other intellectual property laws.
            </p>
          </InfoCard>

          <InfoCard title="Limited License">
            <p>
              We grant you a limited, non-exclusive, non-transferable, revocable license to access and use
              the Service for your internal business purposes, subject to these Terms. This license does not
              include the right to:
            </p>
            <LegalList
              items={[
                "Modify, copy, or create derivative works of the Service",
                "Reverse engineer, decompile, or disassemble any part of the Service",
                "Remove any proprietary notices or labels",
                "Use our trademarks without written permission",
              ]}
            />
          </InfoCard>

          <InfoCard title="Your Content">
            <p>
              You retain ownership of all data and content you upload to the Service. By using the Service,
              you grant us a license to use, process, and display your content solely to provide the Service
              to you.
            </p>
          </InfoCard>
        </div>
      </LegalSection>

      <LegalSection id="payment" title="Payment and Billing">
        <p>
          Certain features of the Service require payment of fees. By subscribing to a paid plan, you agree to:
        </p>

        <div className="grid gap-4 mt-6">
          <InfoCard title="Subscription Fees">
            <LegalList
              items={[
                "Pay all applicable fees at the rates in effect when charges are incurred",
                "Provide accurate and complete billing information",
                "Authorize us to charge your payment method on a recurring basis",
                "Fees are non-refundable except as expressly stated in these Terms",
              ]}
            />
          </InfoCard>

          <InfoCard title="Price Changes">
            <p>
              We may change our prices at any time. Price changes will be communicated at least 30 days in
              advance and will apply to subsequent billing cycles. Continued use of the Service after a price
              change constitutes acceptance of the new pricing.
            </p>
          </InfoCard>

          <InfoCard title="Taxes">
            <p>
              You are responsible for all applicable taxes, except for taxes based on Frame&apos;s net income.
              If we are required to collect or pay taxes, they will be added to your invoice.
            </p>
          </InfoCard>
        </div>
      </LegalSection>

      <LegalSection id="termination" title="Termination">
        <p>
          Either party may terminate this agreement at any time:
        </p>

        <div className="grid gap-4 mt-6">
          <InfoCard title="Termination by You">
            <p>
              You may cancel your account at any time through your account settings or by contacting support.
              Upon cancellation, you will retain access until the end of your current billing period.
            </p>
          </InfoCard>

          <InfoCard title="Termination by Us">
            <p>
              We may suspend or terminate your account immediately if you violate these Terms, engage in
              fraudulent activity, or fail to pay fees when due. We may also terminate with 30 days&apos; notice
              for any reason.
            </p>
          </InfoCard>

          <InfoCard title="Effect of Termination">
            <LegalList
              items={[
                "Your right to access the Service will cease immediately",
                "We will delete your data within 30 days (unless legally required to retain)",
                "You may request a data export before termination",
                "Sections that by nature should survive will remain in effect",
              ]}
            />
          </InfoCard>
        </div>
      </LegalSection>

      <LegalSection id="disclaimers" title="Disclaimers and Limitations">
        <InfoCard title="Disclaimer of Warranties" variant="warning">
          <p className="uppercase text-xs font-semibold mb-2">
            THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND.
          </p>
          <p>
            To the fullest extent permitted by law, Frame disclaims all warranties, express or implied,
            including warranties of merchantability, fitness for a particular purpose, and non-infringement.
            We do not warrant that the Service will be uninterrupted, error-free, or secure.
          </p>
        </InfoCard>

        <InfoCard title="Limitation of Liability" variant="warning">
          <p>
            To the maximum extent permitted by law, Frame shall not be liable for any indirect, incidental,
            special, consequential, or punitive damages, including loss of profits, data, or goodwill,
            regardless of the cause of action.
          </p>
          <p className="mt-2">
            Our total liability for any claims arising from these Terms or the Service shall not exceed the
            amount you paid us in the 12 months preceding the claim.
          </p>
        </InfoCard>
      </LegalSection>

      <LegalSection id="indemnification" title="Indemnification">
        <p>
          You agree to indemnify, defend, and hold harmless Frame, its affiliates, officers, directors,
          employees, and agents from and against any claims, damages, losses, liabilities, costs, and
          expenses (including reasonable attorneys&apos; fees) arising from:
        </p>
        <LegalList
          items={[
            "Your use of the Service",
            "Your violation of these Terms",
            "Your violation of any third-party rights",
            "Your content or data uploaded to the Service",
            "Your violation of any applicable laws or regulations",
          ]}
        />
      </LegalSection>

      <LegalSection id="governing-law" title="Governing Law">
        <p>
          These Terms shall be governed by and construed in accordance with the laws of the State of
          California, United States, without regard to its conflict of law provisions.
        </p>
        <p>
          Any legal action or proceeding arising under these Terms shall be brought exclusively in the
          federal or state courts located in San Francisco County, California, and the parties consent
          to personal jurisdiction and venue therein.
        </p>
      </LegalSection>

      <LegalSection id="dispute-resolution" title="Dispute Resolution">
        <div className="space-y-6">
          <InfoCard title="Informal Resolution">
            <p>
              Before initiating any formal dispute resolution, you agree to contact us at{" "}
              <a href="mailto:legal@frame.com" className="text-teal-600 hover:underline">legal@frame.com</a>{" "}
              to attempt to resolve the dispute informally. We will make good-faith efforts to resolve any
              dispute within 30 days.
            </p>
          </InfoCard>

          <InfoCard title="Arbitration Agreement">
            <p>
              If we cannot resolve a dispute informally, you agree that any dispute, claim, or controversy
              arising from these Terms or the Service shall be resolved through binding arbitration administered
              by JAMS under its Commercial Arbitration Rules, rather than in court.
            </p>
          </InfoCard>

          <InfoCard title="Class Action Waiver">
            <p>
              You agree that any dispute resolution proceedings will be conducted only on an individual basis
              and not as a class, consolidated, or representative action. You waive any right to participate
              in class actions against Frame.
            </p>
          </InfoCard>
        </div>
      </LegalSection>

      <LegalSection id="changes" title="Changes to Terms">
        <p>
          We reserve the right to modify these Terms at any time. When we make material changes:
        </p>
        <LegalList
          items={[
            "We will notify you via email or prominent notice on the Service",
            "We will update the \"Last updated\" date at the top of these Terms",
            "Changes will be effective 30 days after posting (or sooner for urgent changes)",
            "Continued use of the Service after changes constitutes acceptance",
          ]}
        />
        <p>
          If you do not agree to the modified Terms, you must discontinue use of the Service before the
          changes take effect.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="Contact Us">
        <p>
          If you have any questions about these Terms of Service, please contact us:
        </p>

        <div className="mt-6 rounded-xl bg-gradient-to-br from-slate-50 to-teal-50 border border-slate-200 p-6">
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Legal Inquiries</h3>
              <a href="mailto:legal@frame.com" className="text-teal-600 hover:underline">
                legal@frame.com
              </a>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">General Support</h3>
              <a href="mailto:support@frame.com" className="text-teal-600 hover:underline">
                support@frame.com
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
