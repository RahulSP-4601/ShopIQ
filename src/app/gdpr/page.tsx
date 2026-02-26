import { LegalLayout, LegalSection, LegalList, InfoCard } from "@/components/legal/LegalLayout";

const sections = [
  { id: "commitment", title: "Our GDPR Commitment" },
  { id: "legal-basis", title: "Legal Basis for Processing" },
  { id: "your-rights", title: "Your Rights Under GDPR" },
  { id: "data-protection-officer", title: "Data Protection Officer" },
  { id: "data-transfers", title: "Cross-Border Data Transfers" },
  { id: "data-processing", title: "Data Processing Agreements" },
  { id: "data-retention", title: "Data Retention" },
  { id: "exercising-rights", title: "Exercising Your Rights" },
  { id: "contact", title: "Contact Us" },
];

export default function GDPRPage() {
  return (
    <LegalLayout
      title="GDPR Compliance"
      subtitle="Frame is committed to protecting your privacy and ensuring compliance with the General Data Protection Regulation (GDPR)."
      lastUpdated="January 26, 2026"
      sections={sections}
    >
      <LegalSection id="commitment" title="Our GDPR Commitment">
        <p>
          The General Data Protection Regulation (GDPR) is a comprehensive data protection law that applies to
          organizations processing personal data of individuals in the European Union (EU) and European Economic
          Area (EEA).
        </p>

        <InfoCard title="Our Commitment" variant="highlight">
          <p>
            At Frame, we are fully committed to GDPR compliance. We have implemented comprehensive measures to
            ensure that we process personal data lawfully, fairly, and transparently. This includes:
          </p>
          <LegalList
            items={[
              "Processing data only with a valid legal basis",
              "Implementing data protection by design and default",
              "Maintaining records of all processing activities",
              "Conducting regular data protection impact assessments",
              "Appointing a Data Protection Officer",
              "Ensuring data subject rights are easily exercisable",
            ]}
          />
        </InfoCard>

        <p className="mt-6">
          Whether you&apos;re based in the EU/EEA or we process your data there, we apply GDPR-level protections
          to all personal data we handle.
        </p>
      </LegalSection>

      <LegalSection id="legal-basis" title="Legal Basis for Processing">
        <p>
          Under GDPR, we must have a valid legal basis for processing your personal data. We rely on the following
          legal bases depending on the context:
        </p>

        <div className="grid gap-4 mt-6">
          <InfoCard title="Contract Performance (Article 6(1)(b))">
            <p>
              We process data necessary to fulfill our contract with you, including:
            </p>
            <LegalList
              items={[
                "Providing access to our analytics platform",
                "Processing your marketplace data for insights",
                "Managing your account and subscription",
                "Providing customer support",
              ]}
            />
          </InfoCard>

          <InfoCard title="Legitimate Interests (Article 6(1)(f))">
            <p>
              We process data based on our legitimate business interests, such as:
            </p>
            <LegalList
              items={[
                "Improving and developing our services",
                "Preventing fraud and ensuring security",
                "Understanding usage patterns and analytics",
                "Marketing our services (with opt-out option)",
              ]}
            />
          </InfoCard>

          <InfoCard title="Consent (Article 6(1)(a))">
            <p>
              For certain processing activities, we rely on your explicit consent:
            </p>
            <LegalList
              items={[
                "Marketing communications and newsletters",
                "Non-essential cookies and tracking",
                "Sharing data with third-party partners",
                "Participation in research or surveys",
              ]}
            />
            <p className="mt-2 text-slate-500">
              You can withdraw your consent at any time without affecting the lawfulness of prior processing.
            </p>
          </InfoCard>

          <InfoCard title="Legal Obligation (Article 6(1)(c))">
            <p>
              We may process data to comply with legal requirements:
            </p>
            <LegalList
              items={[
                "Tax and accounting obligations",
                "Responding to lawful requests from authorities",
                "Compliance with e-commerce regulations",
              ]}
            />
          </InfoCard>
        </div>
      </LegalSection>

      <LegalSection id="your-rights" title="Your Rights Under GDPR">
        <p>
          GDPR provides you with specific rights regarding your personal data. We are committed to facilitating
          the exercise of these rights.
        </p>

        <div className="grid gap-4 mt-6">
          <div className="p-6 rounded-xl border border-slate-200 bg-white">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Right to Access (Article 15)</h3>
                <p className="text-sm text-slate-600">
                  You have the right to obtain confirmation of whether we process your personal data and to access
                  that data along with information about how it is processed.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-xl border border-slate-200 bg-white">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Right to Rectification (Article 16)</h3>
                <p className="text-sm text-slate-600">
                  You have the right to request correction of inaccurate personal data and to have incomplete
                  data completed.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-xl border border-slate-200 bg-white">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Right to Erasure (Article 17)</h3>
                <p className="text-sm text-slate-600">
                  Also known as the &quot;right to be forgotten,&quot; you can request deletion of your personal data
                  in certain circumstances, such as when the data is no longer necessary or you withdraw consent.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-xl border border-slate-200 bg-white">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Right to Data Portability (Article 20)</h3>
                <p className="text-sm text-slate-600">
                  You have the right to receive your personal data in a structured, commonly used, machine-readable
                  format and to transmit that data to another controller.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-xl border border-slate-200 bg-white">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Right to Object (Article 21)</h3>
                <p className="text-sm text-slate-600">
                  You have the right to object to processing based on legitimate interests, direct marketing,
                  and processing for research or statistical purposes.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-xl border border-slate-200 bg-white">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Right to Restrict Processing (Article 18)</h3>
                <p className="text-sm text-slate-600">
                  You can request restriction of processing in certain circumstances, such as when you contest
                  accuracy or object to processing.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-xl border border-slate-200 bg-white">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Right Related to Automated Decision-Making (Article 22)</h3>
                <p className="text-sm text-slate-600">
                  You have the right not to be subject to decisions based solely on automated processing that
                  significantly affect you, with certain exceptions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </LegalSection>

      <LegalSection id="data-protection-officer" title="Data Protection Officer">
        <p>
          We have appointed a Data Protection Officer (DPO) to oversee our GDPR compliance and serve as your
          point of contact for data protection matters.
        </p>

        <InfoCard title="DPO Responsibilities" variant="highlight">
          <LegalList
            items={[
              "Informing and advising on GDPR obligations",
              "Monitoring compliance with data protection policies",
              "Providing advice on data protection impact assessments",
              "Cooperating with supervisory authorities",
              "Acting as the contact point for data subjects",
            ]}
          />
        </InfoCard>

        <div className="mt-6 rounded-xl bg-gradient-to-br from-slate-50 to-teal-50 border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-2">Contact Our DPO</h3>
          <p className="text-slate-600 mb-3">
            You can contact our Data Protection Officer directly for any GDPR-related inquiries:
          </p>
          <div className="space-y-2">
            <p>
              <span className="font-medium text-slate-700">Email: </span>
              <a href="mailto:dpo@frame.com" className="text-teal-600 hover:underline">dpo@frame.com</a>
            </p>
            <p>
              <span className="font-medium text-slate-700">Address: </span>
              <span className="text-slate-600">Frame Inc., Attn: Data Protection Officer, 123 Commerce Street, Suite 500, San Francisco, CA 94105</span>
            </p>
          </div>
        </div>
      </LegalSection>

      <LegalSection id="data-transfers" title="Cross-Border Data Transfers">
        <p>
          As a global company, we may transfer personal data outside the EU/EEA. We ensure that such transfers
          comply with GDPR requirements.
        </p>

        <div className="grid gap-4 mt-6">
          <InfoCard title="Transfer Mechanisms">
            <p>We use the following mechanisms to ensure lawful data transfers:</p>
            <LegalList
              items={[
                "Standard Contractual Clauses (SCCs) approved by the European Commission",
                "Adequacy decisions for transfers to countries with adequate protection",
                "Binding Corporate Rules where applicable",
                "Derogations under Article 49 when no other mechanism is available",
              ]}
            />
          </InfoCard>

          <InfoCard title="Additional Safeguards">
            <p>
              In light of the Schrems II decision, we implement supplementary measures including:
            </p>
            <LegalList
              items={[
                "Data encryption during transfer and at rest",
                "Access controls limiting who can access EU data",
                "Regular assessments of third-country laws",
                "Transparency reports on government access requests",
              ]}
            />
          </InfoCard>
        </div>
      </LegalSection>

      <LegalSection id="data-processing" title="Data Processing Agreements">
        <p>
          When we engage third-party processors, we ensure GDPR-compliant Data Processing Agreements (DPAs)
          are in place.
        </p>

        <InfoCard title="DPA Requirements">
          <p>Our Data Processing Agreements include:</p>
          <LegalList
            items={[
              "Subject matter and duration of processing",
              "Nature and purpose of processing",
              "Type of personal data and categories of data subjects",
              "Obligations and rights of the controller",
              "Technical and organizational security measures",
              "Sub-processor approval and flow-down requirements",
              "Assistance with data subject requests",
              "Audit rights and compliance verification",
            ]}
          />
        </InfoCard>

        <p className="mt-6">
          Enterprise customers can request a copy of our standard DPA by contacting{" "}
          <a href="mailto:legal@frame.com" className="text-teal-600 hover:underline">legal@frame.com</a>.
        </p>
      </LegalSection>

      <LegalSection id="data-retention" title="Data Retention">
        <p>
          We retain personal data only for as long as necessary to fulfill the purposes for which it was
          collected, unless longer retention is required by law.
        </p>

        <div className="overflow-x-auto mt-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 font-semibold text-slate-900">Data Type</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-900">Retention Period</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-900">Legal Basis</th>
              </tr>
            </thead>
            <tbody className="text-slate-600">
              <tr className="border-b border-slate-100">
                <td className="py-3 px-4">Account data</td>
                <td className="py-3 px-4">Duration of account + 3 years</td>
                <td className="py-3 px-4">Contract, Legal obligation</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-3 px-4">Transaction records</td>
                <td className="py-3 px-4">7 years</td>
                <td className="py-3 px-4">Legal obligation (tax)</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-3 px-4">Support tickets</td>
                <td className="py-3 px-4">3 years after resolution</td>
                <td className="py-3 px-4">Legitimate interest</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-3 px-4">Marketing preferences</td>
                <td className="py-3 px-4">Until consent withdrawn</td>
                <td className="py-3 px-4">Consent</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-3 px-4">Analytics data</td>
                <td className="py-3 px-4">2 years (then anonymized)</td>
                <td className="py-3 px-4">Legitimate interest</td>
              </tr>
            </tbody>
          </table>
        </div>
      </LegalSection>

      <LegalSection id="exercising-rights" title="Exercising Your Rights">
        <p>
          We have made it easy for you to exercise your GDPR rights. You can submit requests through multiple channels.
        </p>

        <div className="grid gap-4 mt-6">
          <InfoCard title="How to Submit a Request">
            <LegalList
              items={[
                "Email our DPO at dpo@frame.com with your request",
                "Use the privacy settings in your account dashboard",
                "Contact our support team for assistance",
                "Submit a formal written request to our mailing address",
              ]}
            />
          </InfoCard>

          <InfoCard title="What We Need From You">
            <p>
              To process your request, we may need to verify your identity. Please provide:
            </p>
            <LegalList
              items={[
                "Your full name and email address associated with your account",
                "Specific details about your request",
                "Any relevant account identifiers",
                "Proof of identity (for sensitive requests)",
              ]}
            />
          </InfoCard>

          <InfoCard title="Response Timeline" variant="highlight">
            <p>
              We will respond to your request within <strong>30 days</strong>. If your request is complex or
              we receive many requests, we may extend this by an additional 60 days, but we will inform you
              within the first 30 days.
            </p>
          </InfoCard>
        </div>

        <InfoCard title="Right to Complain" variant="warning">
          <p>
            If you are not satisfied with our response or believe we are processing your data unlawfully,
            you have the right to lodge a complaint with your local supervisory authority. In Ireland, this
            is the Data Protection Commission (DPC). In Germany, this is the relevant state data protection
            authority (Landesdatenschutzbeauftragter).
          </p>
        </InfoCard>
      </LegalSection>

      <LegalSection id="contact" title="Contact Us">
        <p>
          For any questions about GDPR compliance or to exercise your rights, please contact us:
        </p>

        <div className="mt-6 rounded-xl bg-gradient-to-br from-slate-50 to-teal-50 border border-slate-200 p-6">
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Data Protection Officer</h3>
              <a href="mailto:dpo@frame.com" className="text-teal-600 hover:underline">
                dpo@frame.com
              </a>
              <p className="text-sm text-slate-500 mt-1">For GDPR and privacy inquiries</p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Privacy Team</h3>
              <a href="mailto:privacy@frame.com" className="text-teal-600 hover:underline">
                privacy@frame.com
              </a>
              <p className="text-sm text-slate-500 mt-1">For general privacy questions</p>
            </div>
            <div className="sm:col-span-2">
              <h3 className="font-semibold text-slate-900 mb-2">EU Representative</h3>
              <p className="text-slate-600">
                Frame EU Ltd.<br />
                123 Data Street<br />
                Dublin, Ireland<br />
                <a href="mailto:eu-representative@frame.com" className="text-teal-600 hover:underline">
                  eu-representative@frame.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </LegalSection>
    </LegalLayout>
  );
}
