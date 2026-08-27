import { Component } from 'solid-js';

import LegalPage, { LegalSection } from './LegalPage';

const sections: LegalSection[] = [
  {
    heading: 'Acceptance of Terms',
    body: [
      'By accessing or using any Primal product, including the Primal consumer apps and Primal Studio, you agree to be bound by these Terms of Service and all applicable laws and regulations.',
      'If you do not agree with any part of these terms, you must not use our products.',
    ],
  },
  {
    heading: 'The Nostr Protocol',
    body: [
      'Primal builds software that interacts with Nostr, an open and decentralized protocol. Content you publish to Nostr is broadcast to independent relays that Primal does not own or control, and may be publicly and permanently accessible.',
      'You are solely responsible for the content you create, publish, and distribute over the network. Primal does not guarantee the availability, delivery, or retention of any content on third-party relays.',
    ],
  },
  {
    heading: 'Your Account and Keys',
    body: [
      'Nostr identities are secured by cryptographic key pairs. Your private key is the sole means of controlling your identity and, where applicable, your funds. Primal cannot recover, reset, or restore your private key on your behalf.',
      'You are responsible for safeguarding your keys. Any activity conducted using your keys is your responsibility.',
    ],
  },
  {
    heading: 'Bitcoin and Wallet Features',
    body: [
      'Certain Primal products include a bitcoin wallet and related features. Digital assets are volatile and transactions on the Bitcoin network are generally irreversible.',
      'You are responsible for verifying transaction details before confirming them. Primal is not liable for losses arising from user error, network conditions, or third-party services.',
    ],
  },
  {
    heading: 'Acceptable Use',
    body: [
      'You agree not to use Primal products for any unlawful purpose, to infringe the rights of others, to distribute malicious software, or to interfere with the operation of the network or our services.',
      'We reserve the right to restrict access to our hosted services for conduct that violates these terms.',
    ],
  },
  {
    heading: 'Intellectual Property',
    body: [
      'The Primal name, logo, and the design of our applications are the property of Primal Inc. Our open-source components are licensed under their respective licenses, which govern their use.',
    ],
  },
  {
    heading: 'Disclaimers and Limitation of Liability',
    body: [
      'Primal products are provided on an "as is" and "as available" basis without warranties of any kind, express or implied.',
      'To the maximum extent permitted by law, Primal Inc. shall not be liable for any indirect, incidental, or consequential damages arising from your use of our products.',
    ],
  },
  {
    heading: 'Changes to These Terms',
    body: [
      'We may update these Terms of Service from time to time. Continued use of our products after changes take effect constitutes acceptance of the revised terms.',
    ],
  },
];

const Terms: Component = () => {

  return (
    <LegalPage
      index="02"
      kicker="LEGAL"
      title="Terms of Service"
      updated="AUG 2026"
      intro="These Terms of Service govern your access to and use of the products, applications, and services provided by Primal Inc. By using our products, you agree to these terms."
      sections={sections}
    />
  );
}

export default Terms;
