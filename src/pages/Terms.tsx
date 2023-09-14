import { Component } from 'solid-js';
import styles from './Terms.module.scss';


const Terms: Component = () => {
  return (
    <div class={styles.terms} >
      <h1>
        Primal Terms of Service and Privacy Policy
      </h1>
      <p>
        Last updated on: September 14, 2023
      </p>
      <p>
        This is an agreement between you and Primal Systems Inc., an Ontario corporation (“Primal”), pertaining to the use of Primal’s applications and services, including but not limited to the Primal web app, Primal iOS app, and Primal Android app (collectively referred to as “Product”).
      </p>


      <h2>
        Prohibited Content
      </h2>
      <p>
        You agree not to use our Product to create, upload, post, send, store, or share any content that is illegal, infringing, fraudulent, harmful, threatening, abusive, hateful, harassing, defamatory, obscene, or invasive of another's privacy. Such content includes, but is not limited to, content that is harmful to minors, pornographic material, violent images, hate speech, discriminatory content, and content that promotes terrorism or other criminal activities.
      </p>


      <h2>
        Prohibited Conduct
      </h2>
      <p>
        You also agree not to engage in any conduct that harasses others, impersonates others, is intended to intimidate or threaten others, or is intended to promote or incite violence.
      </p>

      <h2>
        Consequences of Violation
      </h2>
      <p>
        Any violation of this agreement may result in the termination of your access to our Product.
      </p>

      <h2>
        Privacy Policy
      </h2>
      <p>
        Primal does not collect information about you. The posts and actions you make using our Product are recorded on the public Nostr network.
      </p>

      <h2>
        Disclaimer of Warranty
      </h2>
      <p>
        You acknowledge that our Product is provided on an "as is" and "as available" basis without any warranty of any kind, express or implied. We make no guarantees that our Product will be error-free or run without interruptions, and we do not make any warranty regarding the quality, accuracy, reliability, or suitability of our Product for any particular purpose.
      </p>

      <h2>
        Disclaimer of Liability
      </h2>
      <p>
        You acknowledge that we are not responsible for any content posted on our Product by our users. We do not endorse or guarantee the accuracy, completeness, or reliability of any content posted on our Product, and we will not be liable for any damages or losses that may arise from your use of our Product.
      </p>

      <h2>
        Changes to this Agreement
      </h2>
      <p>
        We reserve the right to update or modify this agreement at any time and without prior notice. Your continued use of our Product following any changes to this agreement will be deemed to be your acceptance of such changes.
      </p>

      <h2>
        Governing Law
      </h2>
      <p>
        This agreement shall be governed by and in accordance with the laws of the jurisdiction in which our Product is registered.
      </p>

      <h2>
        Acceptance of Terms
      </h2>
      <p>
        By using our Product, you signify your acceptance of this agreement. If you do not agree to the terms of this agreement, you may not use our Product.
      </p>

      <h2>
        Contact Information
      </h2>
      <p>
        If you have any questions regarding this agreement, you may contact us at support@primal.net.
      </p>
    </div>
  );
}

export default Terms;
