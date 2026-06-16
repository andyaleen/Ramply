import type { LegalSection } from '@/lib/legal/site'
import { LEGAL_SITE } from '@/lib/legal/site'

const { companyName, productName, contactEmail, websiteUrl } = LEGAL_SITE

/** Boilerplate privacy policy sections for the public /privacy page. */
export const PRIVACY_POLICY_SECTIONS: LegalSection[] = [
  {
    id: 'introduction',
    title: 'Introduction',
    paragraphs: [
      `${companyName} ("Ramply," "we," "us," or "our") operates ${websiteUrl} and the ${productName} vendor onboarding platform. This Privacy Policy explains how we collect, use, disclose, and protect information when you use our website and services.`,
      'By creating an account or using Ramply, you agree to this Privacy Policy. If you do not agree, please do not use our services.',
    ],
  },
  {
    id: 'information-we-collect',
    title: 'Information We Collect',
    paragraphs: ['We collect information in the following categories:'],
    bullets: [
      'Account information: name, email address, password (stored in hashed form), and authentication provider identifiers when you sign in with Google or email.',
      'Company profile information: legal business name, DBA, address, tax identifiers, banking details, insurance information, and other fields you choose to store in your profile.',
      'Documents: files you upload (such as W-9s, certificates of insurance, and incorporation documents) and data extracted from those documents.',
      'Usage information: pages viewed, features used, timestamps, and technical logs needed to operate and secure the service.',
      'Device and browser data: IP address, browser type, operating system, and similar technical identifiers.',
      'Payment information: subscription status and billing identifiers. Payment card details are processed by our payment provider and are not stored on Ramply servers.',
      'Communications: messages you send to us, including support requests.',
    ],
  },
  {
    id: 'how-we-use',
    title: 'How We Use Information',
    paragraphs: ['We use collected information to:'],
    bullets: [
      'Provide, maintain, and improve the Ramply platform.',
      'Authenticate users and manage accounts.',
      'Enable you to create, store, and share vendor onboarding profiles and documents.',
      'Process subscriptions and billing.',
      'Send service-related notices, security alerts, and support responses.',
      'Monitor for fraud, abuse, and security incidents.',
      'Comply with legal obligations and enforce our Terms of Service.',
    ],
  },
  {
    id: 'sharing',
    title: 'How We Share Information',
    paragraphs: [
      'We do not sell your personal information. We may share information in these situations:',
    ],
    bullets: [
      'With your direction: when you share a profile or onboarding packet with another party through Ramply.',
      'Service providers: trusted vendors that help us operate the service (for example, hosting, authentication, email delivery, payment processing, document processing, and analytics), subject to contractual confidentiality and security obligations.',
      'Legal and safety: when required by law, regulation, legal process, or to protect the rights, property, or safety of Ramply, our users, or others.',
      'Business transfers: in connection with a merger, acquisition, financing, or sale of assets, subject to appropriate confidentiality protections.',
    ],
  },
  {
    id: 'retention',
    title: 'Data Retention',
    paragraphs: [
      'We retain information for as long as your account is active or as needed to provide the service, comply with legal obligations, resolve disputes, and enforce agreements.',
      'You may request deletion of your account by contacting us. Some information may be retained where required by law or for legitimate business purposes such as security and fraud prevention.',
    ],
  },
  {
    id: 'security',
    title: 'Security',
    paragraphs: [
      'We use administrative, technical, and organizational measures designed to protect information, including encryption in transit, access controls, and monitoring. No method of transmission or storage is completely secure, and we cannot guarantee absolute security.',
    ],
  },
  {
    id: 'your-rights',
    title: 'Your Choices and Rights',
    paragraphs: [
      'Depending on where you live, you may have rights to access, correct, delete, or export certain personal information, or to object to or restrict certain processing.',
      `To make a privacy request, contact us at ${contactEmail}. We may need to verify your identity before responding.`,
    ],
  },
  {
    id: 'cookies',
    title: 'Cookies and Similar Technologies',
    paragraphs: [
      'We use cookies and similar technologies to keep you signed in, remember preferences, and understand how the service is used. You can control cookies through your browser settings, but some features may not function properly if cookies are disabled.',
    ],
  },
  {
    id: 'children',
    title: "Children's Privacy",
    paragraphs: [
      'Ramply is not directed to children under 13 (or the minimum age required in your jurisdiction), and we do not knowingly collect personal information from children. If you believe a child has provided us information, contact us and we will take appropriate steps to delete it.',
    ],
  },
  {
    id: 'international',
    title: 'International Users',
    paragraphs: [
      'If you access Ramply from outside the United States, your information may be processed in the United States or other countries where we or our service providers operate. Those countries may have different data protection laws than your home country.',
    ],
  },
  {
    id: 'changes',
    title: 'Changes to This Policy',
    paragraphs: [
      'We may update this Privacy Policy from time to time. When we do, we will revise the "Effective date" above and, where appropriate, provide additional notice. Your continued use of Ramply after changes become effective constitutes acceptance of the updated policy.',
    ],
  },
  {
    id: 'contact',
    title: 'Contact Us',
    paragraphs: [
      `Questions about this Privacy Policy, privacy practices, or general support may be sent to ${contactEmail}.`,
    ],
  },
]
