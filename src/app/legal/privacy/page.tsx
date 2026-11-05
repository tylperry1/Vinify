import type { Metadata } from "next";
import { DraftNotice, PageIntro, PageShell } from "@/components/PageShell";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function Privacy() {
  return (
    <PageShell>
      <PageIntro eyebrow="Legal" title="Privacy Policy" />
      <section className="prose-vinify mx-auto max-w-3xl px-5 py-12 sm:px-8">
        <DraftNotice>
          <strong>Working draft — not in effect.</strong> This policy has not been reviewed by a lawyer and will be
          finalised before Vinify accepts accounts or payments.
        </DraftNotice>
        <h2>What we collect</h2>
        <ul>
          <li><strong>VINs you enter.</strong> Used to decode the vehicle and, when you buy one, to build your report.</li>
          <li><strong>Account details</strong> (when accounts launch): name, email, sign-in method.</li>
          <li><strong>Support requests:</strong> the contact address, topic and message you submit when ticketing is enabled.</li>
          <li><strong>Payment details</strong> are handled by our payment processor. We don’t store full card numbers.</li>
          <li><strong>Usage data:</strong> basic logs and analytics to keep the service secure and working.</li>
        </ul>
        <h2>What we don’t do</h2>
        <ul>
          <li>We don’t sell your personal information.</li>
          <li>We don’t provide previous owners’ names, addresses or other personal details in reports.</li>
        </ul>
        <h2>Who we share data with</h2>
        <p>
          Service providers that help us run Vinify — hosting, payments, email, and vehicle data partners (who receive
          the VIN needed to produce a report). They may only use it to provide services to us.
        </p>
        <h2>Your choices</h2>
        <p>
          You’ll be able to export your data, change email preferences, and delete your account from your dashboard. You
          can also contact us with privacy requests.
        </p>
        <h2>Retention</h2>
        <p>We keep data only as long as needed for the purposes above and our legal obligations.</p>
      </section>
    </PageShell>
  );
}
