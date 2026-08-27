import { Component } from 'solid-js';

import LegalPage, { LegalSection } from './LegalPage';

const intro = [
  'This Privacy Policy explains how Primal Systems Inc. and its affiliates, (“Primal”, “we”, “us”, or “our”) process information about you. This Privacy Policy applies when you use any Primal products and services, including but not limited to the Primal web app, Primal iOS app, Primal Android app, Primal browser extension, Primal Premium Service, or Primal Hosted Wallet Service (collectively referred to as “Services”). It also applies when you contact our customer service team, engage with us on social media, or otherwise interact with us or our Services.',
];

const sections: LegalSection[] = [
  {
    heading: 'Policy Overview',
    body: [
      'Primal doesn’t monetize your personal information. We don’t generate revenue via advertising, we don’t monetize user attention, and we don’t sell personal information we collect from our users. Primal’s policy is to maximize user privacy by collecting only the minimum amount of personal information required to provide quality Services to our users and be compliant with the relevant laws.',
    ],
  },
  {
    heading: 'Information We Collect',
    clauses: [
      {
        heading: 'Account Creation',
        body: [
          'Primal Services enable you to create an account on the public Nostr network. All information you provide during the account creation process is optional, except for the desired username. Any personal information you disclose during the account creation process is published to the relays on the public Nostr network as a normal manner of course for all Nostr accounts. This information is public and can be seen by anyone on the Nostr network. Primal does not collect any further information about you during the account creation process.',
        ],
      },
      {
        heading: 'Primal Mobile Apps',
        body: [
          'Primal does not collect any data via our mobile apps – Primal for iOS and Primal for Android – beyond the data you specifically submit for publishing on the public Nostr network and when activating the optional Hosted Wallet Service, as described in section 2.4. Privacy and data collection notices on the public Apple App Store and Google Play Store listings display data collection settings for our mobile apps.',
        ],
      },
      {
        heading: 'Premium Service',
        body: [
          "Primal Premium Service is an optional, subscription-based, paid tier offered to you, which includes Primal Orange Check as defined in our Terms of Service agreement, and certain premium features, as defined on Primal's Website. Our Premium Service is specifically designed for maximum protection of user privacy, and as such, does not require disclosing any personal information.",
        ],
      },
      {
        heading: 'Hosted Wallet Service',
        body: [
          'Primal Hosted Wallet Service is an optional service offered to you, which includes storing small amounts of bitcoin on your behalf, the ability to send and receive bitcoin transactions on your behalf, the display of your transaction history, and hosting a Bitcoin Lightning Address assigned to you. In order to activate the Hosted Wallet Service in a legally compliant manner, we collect the minimum amount of personal information required by law, as shown on the Wallet Activation screen.',
        ],
      },
      {
        heading: 'Support Services',
        body: [
          'Primal provides support via email and over social media. The information you provide during the regular course of communication with us will be stored in our email systems and otherwise be recorded on the various social media systems we use to communicate with you.',
        ],
      },
    ],
  },
  {
    heading: 'How We Use Your Information',
    body: [
      'We use your personal information to provide high quality service to you, including offering Support Services, and to generally operate Primal Services and communicate with you as necessary.',
    ],
  },
  {
    heading: 'Sharing Your Information',
    body: [
      'Primal will not share your information with third parties, except when required by law. We may share your personal data with law enforcement, data protection authorities, government officials and other authorities when: (i) compelled by subpoena, court order or other legal procedure; (ii) we believe that disclosure is necessary to prevent damage or financial loss; (iii) disclosure is necessary to report suspected illegal activity; or (iv) disclosure is necessary to investigate violations of our Terms of Service or Privacy Policy.',
      'Primal’s Hosted Wallet Service is offered in partnership with our affiliate Zap Solutions, Inc. ("Strike"). In order to provide a legally compliant service, we are required to share your information related to the Hosted Wallet Service with Strike.',
    ],
  },
  {
    heading: 'Your Rights and Choices',
    body: [
      'You have rights and choices with respect to your personal information, including: (i) accessing and updating your information: you can review and change your personal information by logging into your account; (ii) deactivation and deletion: you can deactivate your account or request the deletion of your information.',
    ],
  },
  {
    heading: 'Security of Your Information',
    body: [
      'Primal implements robust security measures, based on industry best practices, to protect the confidentiality, integrity, and availability of your personal and financial information. However, no system is completely secure, and we cannot guarantee the absolute security of your information.',
    ],
  },
  {
    heading: 'Changes to This Privacy Policy',
    body: [
      'We may change this Privacy Policy from time to time. If we make changes, we will notify you by revising the date at the top of this notice and, in some cases, we may provide you with additional notice (such as adding a statement to our Website or sending you a notification). We encourage you to review this Privacy Policy regularly to stay informed about our information handling practices and the choices available to you.',
    ],
  },
  {
    heading: 'Contact Us',
    body: [
      'If you have any questions regarding this Privacy Policy, you may contact us at support@primal.net.',
    ],
  },
];

const Privacy: Component = () => {

  return (
    <LegalPage
      index="03"
      kicker="LEGAL"
      title="Privacy Policy"
      updated="FEBRUARY 21, 2024"
      intro={intro}
      sections={sections}
    />
  );
}

export default Privacy;
