import type { Metadata } from "next";
import { PageIntro, PageShell } from "@/components/PageShell";

export const metadata: Metadata = { title: "About Vinify" };

export default function About() {
  return (
    <PageShell>
      <PageIntro eyebrow="About" title="Vehicle history should be clear, fair and affordable.">
        Vinify is being built for people buying used cars who want straight answers without paying premium prices.
      </PageIntro>
      <section className="prose-vinify mx-auto max-w-3xl px-5 py-14 sm:px-8">
        <h2>Why we’re building Vinify</h2>
        <p>
          Buying a used car is one of the biggest purchases most people make, and the history behind it is often hard to
          read and expensive to get. We think a vehicle history report should be fast to get, easy to understand on a
          phone, and honest about its own limits.
        </p>
        <h2>What we believe</h2>
        <ul>
          <li><strong>Show the gaps.</strong> If a category isn’t covered, the report says so.</li>
          <li><strong>Price fairly.</strong> Simple plans with clear terms, no surprise renewals.</li>
          <li><strong>Protect people.</strong> We report on vehicles, not on their previous owners’ personal details.</li>
        </ul>
        <h2>Where we are today</h2>
        <p>
          Vinify is in pre-launch. Our free VIN decoder is live and uses public NHTSA data. Paid history reports will
          launch once our data partnerships are finalised.
        </p>
      </section>
    </PageShell>
  );
}
