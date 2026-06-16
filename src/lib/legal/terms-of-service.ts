import type { LegalSection } from '@/lib/legal/site'
import { LEGAL_SITE } from '@/lib/legal/site'

const { companyName, productName, contactEmail, websiteUrl } = LEGAL_SITE

/** Boilerplate terms of service sections for the public /terms page. */
export const TERMS_OF_SERVICE_SECTIONS: LegalSection[] = [
  {
    id: 'agreement',
    title: 'Agreement to Terms',
    paragraphs: [
      `These Terms of Service ("Terms") govern your access to and use of ${websiteUrl} and the ${productName} platform operated by ${companyName} ("Ramply," "we," "us," or "our").`,
      'By creating an account or using Ramply, you agree to these Terms and our Privacy Policy. If you are using Ramply on behalf of a company, you represent that you have authority to bind that company.',
    ],
  },
  {
    id: 'eligibility',
    title: 'Eligibility',
    paragraphs: [
      'You must be at least 18 years old and capable of forming a binding contract to use Ramply. You may not use the service if you are barred from doing so under applicable law.',
    ],
  },
  {
    id: 'accounts',
    title: 'Accounts and Security',
    paragraphs: [
      'You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account.',
      'You agree to provide accurate information and to keep your account information up to date. Notify us promptly at the contact address below if you suspect unauthorized access.',
    ],
  },
  {
    id: 'service',
    title: 'The Service',
    paragraphs: [
      'Ramply helps businesses collect, store, and share vendor onboarding information and documents. Features may change over time, and we may add, modify, or discontinue features with reasonable notice where practicable.',
      'We strive to keep Ramply available and reliable, but we do not guarantee uninterrupted or error-free operation.',
    ],
  },
  {
    id: 'your-content',
    title: 'Your Content and Sharing',
    paragraphs: [
      'You retain ownership of information and documents you submit to Ramply. You grant Ramply a limited license to host, process, display, and transmit your content solely to operate and improve the service.',
      'You are responsible for the accuracy, legality, and appropriateness of content you upload or share. When you share information with third parties through Ramply, you control what is shared and with whom.',
      'Do not upload content you do not have the right to share, or content that violates law or the rights of others.',
    ],
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable Use',
    paragraphs: ['You agree not to:'],
    bullets: [
      'Use Ramply for unlawful, fraudulent, or harmful purposes.',
      'Attempt to gain unauthorized access to accounts, systems, or data.',
      'Interfere with or disrupt the integrity or performance of the service.',
      'Upload malware or content that infringes intellectual property or privacy rights.',
      'Scrape, reverse engineer, or misuse the service except as permitted by law.',
      'Resell or commercially exploit the service without our written consent.',
    ],
  },
  {
    id: 'subscriptions',
    title: 'Subscriptions and Payment',
    paragraphs: [
      'Some features require a paid subscription. Fees, billing intervals, and plan limits are described on our pricing page or in your account.',
      'Subscriptions renew automatically unless canceled before the renewal date. Payments are processed by our third-party payment provider and are subject to their terms.',
      'Except where required by law, fees are non-refundable. We may change pricing with advance notice; continued use after a price change constitutes acceptance.',
    ],
  },
  {
    id: 'third-party',
    title: 'Third-Party Services',
    paragraphs: [
      'Ramply may integrate with third-party services such as authentication providers, payment processors, and document processing tools. Your use of those services may be subject to separate terms and privacy policies.',
    ],
  },
  {
    id: 'disclaimers',
    title: 'Disclaimers',
    paragraphs: [
      'Ramply is provided on an "as is" and "as available" basis. To the fullest extent permitted by law, we disclaim all warranties, express or implied, including merchantability, fitness for a particular purpose, and non-infringement.',
      'Ramply does not provide legal, tax, accounting, or compliance advice. You are responsible for determining whether information collected or shared through Ramply meets your regulatory and contractual obligations.',
    ],
  },
  {
    id: 'liability',
    title: 'Limitation of Liability',
    paragraphs: [
      'To the fullest extent permitted by law, Ramply and its affiliates, officers, employees, and suppliers will not be liable for any indirect, incidental, special, consequential, or punitive damages, or for loss of profits, data, goodwill, or business interruption.',
      'Our total liability for any claim arising out of or relating to these Terms or the service will not exceed the greater of (a) the amount you paid Ramply in the twelve months before the event giving rise to the claim, or (b) one hundred U.S. dollars (USD $100).',
    ],
  },
  {
    id: 'indemnity',
    title: 'Indemnification',
    paragraphs: [
      'You will defend, indemnify, and hold harmless Ramply from claims, damages, losses, and expenses (including reasonable attorneys\' fees) arising from your content, your use of the service, or your violation of these Terms or applicable law.',
    ],
  },
  {
    id: 'termination',
    title: 'Termination',
    paragraphs: [
      'You may stop using Ramply at any time. We may suspend or terminate access if you violate these Terms, create risk for other users, or if required by law.',
      'Upon termination, your right to use the service ends. Provisions that by their nature should survive termination will survive, including ownership, disclaimers, limitations of liability, and indemnification.',
    ],
  },
  {
    id: 'governing-law',
    title: 'Governing Law and Disputes',
    paragraphs: [
      'These Terms are governed by the laws of the State of Delaware, without regard to conflict-of-law principles, except where mandatory consumer protection laws in your jurisdiction apply.',
      'Any dispute arising from these Terms or the service will be resolved in the state or federal courts located in Delaware, unless applicable law requires a different forum.',
    ],
  },
  {
    id: 'changes',
    title: 'Changes to These Terms',
    paragraphs: [
      'We may update these Terms from time to time. When we do, we will revise the effective date and, where appropriate, provide additional notice. Continued use after changes become effective constitutes acceptance of the updated Terms.',
    ],
  },
  {
    id: 'contact',
    title: 'Contact',
    paragraphs: [
      `Questions about these Terms may be sent to ${contactEmail}.`,
    ],
  },
]
