import { LegalLayout, LegalSection, LegalList, InfoCard } from "@/components/legal/LegalLayout";

const sections = [
  { id: "commitment", title: "Our Commitment to Security" },
  { id: "infrastructure", title: "Infrastructure Security" },
  { id: "data-protection", title: "Data Protection" },
  { id: "application-security", title: "Application Security" },
  { id: "compliance", title: "Compliance & Certifications" },
  { id: "incident-response", title: "Incident Response" },
  { id: "employee-security", title: "Employee Security" },
  { id: "vendor-security", title: "Vendor Security" },
  { id: "responsible-disclosure", title: "Responsible Disclosure" },
  { id: "contact", title: "Contact Security Team" },
];

export default function SecurityPage() {
  return (
    <LegalLayout
      title="Security"
      subtitle="At Frame, security is fundamental to everything we do. Learn how we protect your data and maintain the trust you place in us."
      lastUpdated="January 26, 2026"
      sections={sections}
    >
      <LegalSection id="commitment" title="Our Commitment to Security">
        <p>
          Security is not just a feature at Frame—it&apos;s a core principle that guides every decision we make.
          We understand that you trust us with sensitive business data, and we take that responsibility seriously.
        </p>

        <div className="grid sm:grid-cols-3 gap-4 mt-6">
          <div className="text-center p-6 rounded-xl bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-100">
            <div className="text-3xl font-bold text-teal-600 mb-2">99.99%</div>
            <div className="text-sm text-slate-600">Uptime SLA</div>
          </div>
          <div className="text-center p-6 rounded-xl bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-100">
            <div className="text-3xl font-bold text-teal-600 mb-2">SOC 2</div>
            <div className="text-sm text-slate-600">Type II Certified</div>
          </div>
          <div className="text-center p-6 rounded-xl bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-100">
            <div className="text-3xl font-bold text-teal-600 mb-2">256-bit</div>
            <div className="text-sm text-slate-600">AES Encryption</div>
          </div>
        </div>

        <p className="mt-6">
          Our security program is built on industry best practices and continuously evolves to address emerging
          threats. We maintain a defense-in-depth strategy with multiple layers of protection.
        </p>
      </LegalSection>

      <LegalSection id="infrastructure" title="Infrastructure Security">
        <p>
          Our infrastructure is designed with security as the foundation, utilizing industry-leading cloud
          providers and security technologies.
        </p>

        <div className="grid gap-4 mt-6">
          <InfoCard title="Cloud Infrastructure">
            <LegalList
              items={[
                "Hosted on AWS with multi-region redundancy",
                "Virtual Private Cloud (VPC) with network segmentation",
                "Web Application Firewall (WAF) protection",
                "DDoS mitigation through AWS Shield",
                "Automated scaling and load balancing",
              ]}
            />
          </InfoCard>

          <InfoCard title="Network Security">
            <LegalList
              items={[
                "Encrypted connections (TLS 1.3) for all data in transit",
                "Intrusion Detection and Prevention Systems (IDS/IPS)",
                "Network traffic monitoring and anomaly detection",
                "Regular vulnerability scanning and penetration testing",
                "Strict firewall rules with deny-by-default policy",
              ]}
            />
          </InfoCard>

          <InfoCard title="Physical Security">
            <LegalList
              items={[
                "AWS data centers with 24/7 security personnel",
                "Biometric access controls and video surveillance",
                "Environmental controls and fire suppression",
                "Redundant power and cooling systems",
                "Regular third-party audits of physical security",
              ]}
            />
          </InfoCard>
        </div>
      </LegalSection>

      <LegalSection id="data-protection" title="Data Protection">
        <p>
          Your data is protected at every stage—at rest, in transit, and during processing. We implement
          comprehensive data protection measures to ensure confidentiality and integrity.
        </p>

        <div className="grid gap-4 mt-6">
          <InfoCard title="Encryption at Rest" variant="highlight">
            <LegalList
              items={[
                "AES-256 encryption for all stored data",
                "Database encryption using AWS RDS encryption",
                "Encrypted backup storage with separate key management",
                "Secure key management using AWS KMS",
                "Regular key rotation policies",
              ]}
            />
          </InfoCard>

          <InfoCard title="Encryption in Transit" variant="highlight">
            <LegalList
              items={[
                "TLS 1.3 for all external communications",
                "Certificate pinning for mobile applications",
                "HSTS enforcement with long max-age",
                "Perfect Forward Secrecy (PFS) enabled",
                "Regular SSL/TLS configuration audits",
              ]}
            />
          </InfoCard>

          <InfoCard title="Access Controls">
            <LegalList
              items={[
                "Role-based access control (RBAC) throughout the platform",
                "Principle of least privilege for all access",
                "Multi-factor authentication (MFA) required",
                "Session management with automatic timeouts",
                "Comprehensive audit logging of all access",
              ]}
            />
          </InfoCard>
        </div>
      </LegalSection>

      <LegalSection id="application-security" title="Application Security">
        <p>
          Security is integrated into every phase of our software development lifecycle, from design to deployment.
        </p>

        <div className="grid gap-4 mt-6">
          <InfoCard title="Secure Development">
            <LegalList
              items={[
                "Security-focused code reviews for all changes",
                "Static Application Security Testing (SAST)",
                "Dynamic Application Security Testing (DAST)",
                "Dependency vulnerability scanning",
                "Secure coding guidelines and training",
              ]}
            />
          </InfoCard>

          <InfoCard title="Vulnerability Management">
            <LegalList
              items={[
                "Annual third-party penetration testing",
                "Continuous automated vulnerability scanning",
                "Bug bounty program for responsible disclosure",
                "Rapid patch deployment for critical vulnerabilities",
                "Regular security assessments and audits",
              ]}
            />
          </InfoCard>

          <InfoCard title="API Security">
            <LegalList
              items={[
                "OAuth 2.0 and JWT-based authentication",
                "Rate limiting and throttling protection",
                "Input validation and sanitization",
                "API versioning and deprecation policies",
                "Comprehensive API documentation",
              ]}
            />
          </InfoCard>
        </div>
      </LegalSection>

      <LegalSection id="compliance" title="Compliance & Certifications">
        <p>
          We maintain compliance with industry standards and regulations to ensure our security practices
          meet the highest benchmarks.
        </p>

        <div className="grid sm:grid-cols-2 gap-4 mt-6">
          <div className="p-6 rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">SOC 2 Type II</h3>
                <p className="text-sm text-slate-500">Certified</p>
              </div>
            </div>
            <p className="text-sm text-slate-600">
              Independently audited for security, availability, processing integrity, confidentiality, and privacy.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">GDPR</h3>
                <p className="text-sm text-slate-500">Compliant</p>
              </div>
            </div>
            <p className="text-sm text-slate-600">
              Full compliance with European data protection regulations for all EU customers.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">ISO 27001</h3>
                <p className="text-sm text-slate-500">In Progress</p>
              </div>
            </div>
            <p className="text-sm text-slate-600">
              Working towards ISO 27001 certification for information security management systems.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">CCPA</h3>
                <p className="text-sm text-slate-500">Compliant</p>
              </div>
            </div>
            <p className="text-sm text-slate-600">
              Meeting California Consumer Privacy Act requirements for California residents.
            </p>
          </div>
        </div>
      </LegalSection>

      <LegalSection id="incident-response" title="Incident Response">
        <p>
          We maintain a comprehensive incident response program to quickly detect, respond to, and recover
          from security incidents.
        </p>

        <div className="grid gap-4 mt-6">
          <InfoCard title="Detection & Monitoring">
            <LegalList
              items={[
                "24/7 Security Operations Center (SOC) monitoring",
                "Real-time alerting for suspicious activities",
                "Automated threat detection and response",
                "Security Information and Event Management (SIEM)",
                "Regular log analysis and anomaly detection",
              ]}
            />
          </InfoCard>

          <InfoCard title="Response Process">
            <LegalList
              items={[
                "Documented incident response procedures",
                "Dedicated incident response team",
                "Clear escalation paths and communication plans",
                "Regular incident response drills and tabletop exercises",
                "Post-incident reviews and lessons learned",
              ]}
            />
          </InfoCard>

          <InfoCard title="Notification" variant="highlight">
            <p>
              In the event of a security incident affecting your data, we will notify you within 72 hours
              of becoming aware of the incident, as required by applicable regulations. Notifications will
              include details about the incident and steps you can take to protect your account.
            </p>
          </InfoCard>
        </div>
      </LegalSection>

      <LegalSection id="employee-security" title="Employee Security">
        <p>
          Our employees are our first line of defense. We maintain rigorous security standards for all team members.
        </p>

        <LegalList
          items={[
            "Background checks for all employees with system access",
            "Mandatory security awareness training upon hire and annually",
            "Phishing simulation and training programs",
            "Clear security policies and acceptable use guidelines",
            "Principle of least privilege for all internal access",
            "Regular access reviews and deprovisioning procedures",
            "Secure workstation configurations and endpoint protection",
            "Non-disclosure agreements for all employees and contractors",
          ]}
        />
      </LegalSection>

      <LegalSection id="vendor-security" title="Vendor Security">
        <p>
          We carefully evaluate and monitor all third-party vendors who have access to our systems or data.
        </p>

        <LegalList
          items={[
            "Security assessments for all vendors before engagement",
            "Data Processing Agreements (DPAs) with all data processors",
            "Regular vendor security reviews and questionnaires",
            "Contractual security requirements and SLAs",
            "Limited data sharing based on business necessity",
            "Continuous monitoring of vendor security posture",
          ]}
        />
      </LegalSection>

      <LegalSection id="responsible-disclosure" title="Responsible Disclosure">
        <p>
          We value the security research community and encourage responsible disclosure of vulnerabilities.
        </p>

        <InfoCard title="Bug Bounty Program" variant="highlight">
          <p>
            We maintain a bug bounty program to reward security researchers who help us identify and fix
            vulnerabilities. If you discover a security issue, please report it to us at{" "}
            <a href="mailto:security@frame.com" className="text-teal-600 hover:underline">
              security@frame.com
            </a>
            .
          </p>
        </InfoCard>

        <div className="mt-6">
          <h3 className="font-semibold text-slate-900 mb-3">Reporting Guidelines</h3>
          <LegalList
            items={[
              "Provide detailed information about the vulnerability",
              "Include steps to reproduce the issue",
              "Give us reasonable time to address the issue before public disclosure",
              "Do not access or modify other users' data",
              "Do not perform denial-of-service attacks",
            ]}
          />
        </div>

        <p className="mt-6">
          We commit to acknowledging receipt of your report within 24 hours and providing regular updates
          on our progress. We will not take legal action against researchers who follow these guidelines.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="Contact Security Team">
        <p>
          Have questions about our security practices or need to report a security concern? Reach out to our team.
        </p>

        <div className="mt-6 rounded-xl bg-gradient-to-br from-slate-50 to-teal-50 border border-slate-200 p-6">
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Security Team</h3>
              <a href="mailto:security@frame.com" className="text-teal-600 hover:underline">
                security@frame.com
              </a>
              <p className="text-sm text-slate-500 mt-1">For security reports and inquiries</p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">PGP Key</h3>
              <p className="text-sm text-slate-600">
                For encrypted communications, our PGP key fingerprint is available on our{" "}
                <a href="/security/pgp" className="text-teal-600 hover:underline">security page</a>.
              </p>
            </div>
          </div>
        </div>

        <p className="mt-6 text-sm text-slate-500">
          For non-security-related inquiries, please contact{" "}
          <a href="mailto:support@frame.com" className="text-teal-600 hover:underline">
            support@frame.com
          </a>
          .
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
