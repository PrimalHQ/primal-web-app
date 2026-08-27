import { Component } from 'solid-js';

import LegalPage, { LegalSection } from './LegalPage';

const sections: LegalSection[] = [
  {
    heading: 'Our Approach to Privacy',
    body: [
      'Nostr is designed so that you control your identity and your data. Primal aims to collect as little information as possible and to keep you in control of what you share.',
      "Content you publish to Nostr is public by nature of the protocol and is stored on independent relays outside of Primal's control.",
    ],
  },
  {
    heading: 'Information We Handle',
    body: [
      'We do not require an email address, phone number, or real name to use our apps. Your Nostr public key serves as your identity.',
      'When you use our hosted services — such as caching, media hosting, or the bitcoin wallet — we may process technical data necessary to provide those features, including public keys, transaction data required for wallet operation, and media you choose to upload.',
    ],
  },
  {
    heading: 'Private Keys',
    body: [
      'Your private key never needs to leave your device to use core features. Primal does not store or have access to your private key, and cannot recover it for you.',
    ],
  },
  {
    heading: 'Analytics and Diagnostics',
    body: [
      'We may collect aggregated, non-identifying diagnostic information to understand app performance and improve reliability. Where analytics are used, we minimize the data collected and avoid tying it to your identity wherever possible.',
    ],
  },
  {
    heading: 'Third Parties',
    body: [
      'Nostr relays, Lightning service providers, and app store platforms are independent third parties with their own privacy practices. We encourage you to review their policies.',
      'We do not sell your personal information.',
    ],
  },
  {
    heading: 'Data Retention',
    body: [
      'We retain hosted data only as long as necessary to provide the relevant service. You can remove media you have uploaded and disconnect from our hosted services at any time.',
    ],
  },
  {
    heading: 'Your Choices',
    body: [
      'Because you hold your own keys, you can move to another Nostr client at any time and take your identity and social graph with you. You are never locked into Primal.',
    ],
  },
  {
    heading: 'Contact',
    body: [
      'If you have questions about this Privacy Policy or how your information is handled, please reach out to us and we will be glad to help.',
    ],
  },
];

const Privacy: Component = () => {

  return (
    <LegalPage
      index="03"
      kicker="LEGAL"
      title="Privacy Policy"
      updated="AUG 2026"
      intro="Primal is built on an open, decentralized protocol, and privacy is central to how we design our products. This policy explains what information we handle and how we treat it."
      sections={sections}
    />
  );
}

export default Privacy;
