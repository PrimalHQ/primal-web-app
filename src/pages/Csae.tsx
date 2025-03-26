import { Component, onMount } from 'solid-js';
import styles from './Terms.module.scss';


const Csae: Component = () => {

  onMount(() => {
    const container = document.querySelector('#root');
    container && container.setAttribute('style', 'background-color: black');
  })

  return (
    <div class={styles.terms} >
      <h1>
        Primal Child Sexual Abuse and Exploitation (CSAE) Policy
      </h1>
      <p>
        Last updated: March 26, 2025
      </p>

        <h2>
          1. Policy Statement
        </h2>

        <section>
          PRIMAL SYSTEMS INC. (“Primal”, “we”, “us”, or “our”) is committed to the protection and safety of children. We have zero tolerance for child sexual abuse, exploitation, or any related content or behavior, whether in digital or physical form. Our company actively works to ensure that our platforms and services are not used to exploit or harm minors in any way.
        </section>

        <h2>
          2. Scope
        </h2>

        <section>
          This policy applies to all digital products, services, applications, platforms, employees, contractors, partners, and users of Primal. It covers the prevention, detection, reporting, and removal of any content or behavior related to Child Sexual Abuse Material (CSAM) or exploitation of minors.
        </section>

        <h2>
          3. Prohibited Content and Behavior
        </h2>

        <section>
          <p>We strictly prohibit:</p>
          <ul>
            <li>Any form of Child Sexual Abuse Material (CSAM), including imagery, videos, text, audio, or digitally created content that depicts or promotes the sexual abuse or exploitation of minors.</li>
            <li>Any grooming behavior, attempts to solicit minors for sexual purposes, or communication with the intent to exploit.</li>
            <li>Any content that sexualizes minors, including artistic or fictional content that may appear suggestive or inappropriate.</li>
            <li>Links, comments, or uploads that direct to external platforms or websites containing CSAM or exploitative material.</li>
          </ul>
        </section>

        <h2>
          4. Monitoring and Enforcement
        </h2>

        <section>
          <p>Primal employs automated and manual content moderation practices to monitor for CSAE-related content, including:</p>
          <ul>
            <li>Use of content filters and detection tools, including hash-matching technology.</li>
            <li>Human review processes for flagged or reported content.</li>
            <li>Immediate removal and reporting of violating content to relevant authorities.</li>
          </ul>
        </section>

        <h2>
          5. Reporting CSAE Violations
        </h2>

        <section>
          <p>We take all reports seriously. Anyone can report suspected CSAE content or behavior on our platforms using the following contact:</p>
          <p>Email: <a href="mailto:safety@primal.net">safety@primal.net</a></p>
          <p>Response Time: We aim to review and respond to reports within 24 hours.</p>
          <p>We report confirmed CSAE content to:</p>
          <ul>
            <li>National Center for Missing and Exploited Children (NCMEC)</li>
            <li>Relevant local law enforcement authorities</li>
            <li>Platform partners or app stores as required</li>
          </ul>
        </section>

        <h2>
          6. Employee and Moderator Responsibilities
        </h2>

        <section>
          <p>All Primal employees and contractors must:</p>
          <ul>
            <li>Complete mandatory child safety and CSAE awareness training annually.</li>
            <li>Promptly report any suspected CSAE content or behavior observed during their work.</li>
            <li>Follow established incident response protocols in coordination with our Trust & Safety team.</li>
          </ul>
        </section>

        <h2>
          7. User Education and Cooperation
        </h2>

        <section>
          <p>We encourage our users to:</p>
          <ul>
            <li>Be vigilant and report any suspicious or inappropriate behavior.</li>
            <li>Avoid sharing any content that could be misconstrued as inappropriate or harmful to minors.</li>
            <li>Understand that violations may result in account suspension, permanent bans, or legal consequences.</li>
          </ul>
        </section>

        <h2>
          8. Collaboration with Authorities and Partners
        </h2>

        <section>
          Primal cooperates fully with law enforcement and child protection organizations to ensure that offenders are prosecuted, and victims are protected.
        </section>

        <h2>
          9. Policy Review and Updates
        </h2>

        <section>
          <p>This policy is reviewed at least annually or whenever necessary due to changes in laws, regulations, or platform standards. The latest version is always publicly accessible at:</p>
          <p><a href="https://primal.net/csae-policy">https://primal.net/csae-policy</a></p>
        </section>

    </div>
  );
}

export default Csae;
